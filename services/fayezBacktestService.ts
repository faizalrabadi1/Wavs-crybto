
import type { Candle, FayezPredictionResult, FayezScenario, PredictedCandle } from '../types';

/**
 * FAYEZ INFERENCE ENGINE V5.0
 * A hybrid prediction engine combining:
 * 1. Monte Carlo Simulation (The Quant)
 * 2. Pattern Matching / DTW (The Historian)
 * 3. Volatility Analysis
 */

const SIMULATION_STEPS = 30; // Forecast 30 candles ahead
const MONTE_CARLO_ITERATIONS = 500; // Lightweight client-side simulation

// --- Helper: Calculate Volatility ---
const calculateVolatility = (candles: Candle[]): number => {
    const returns = [];
    for (let i = 1; i < candles.length; i++) {
        returns.push(Math.log(candles[i].close / candles[i - 1].close));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
};

// --- Helper: Geometric Brownian Motion for Candle Generation ---
const generateGBMCandle = (lastClose: number, drift: number, vol: number): PredictedCandle => {
    const dt = 1;
    const shock = (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; // Approx Gaussian
    const close = lastClose * Math.exp((drift - 0.5 * vol * vol) * dt + vol * shock * Math.sqrt(dt));
    
    // Synthesize High/Low/Open based on Close volatility
    const range = close * vol * (0.5 + Math.random()); 
    const open = lastClose;
    const high = Math.max(open, close) + range * Math.random();
    const low = Math.min(open, close) - range * Math.random();
    
    return { c: close, o: open, h: high, l: low, timestamp: Date.now() }; // Timestamp placeholder
};

// --- Engine: The Historian (Pattern Matcher) ---
const findHistoricalMatch = (currentCandles: Candle[], allCandles: Candle[]): { matchScore: number, outcome: number, index: number } => {
    if (allCandles.length < 500) return { matchScore: 0, outcome: 0, index: 0 };
    
    const lookback = 30;
    const currentSegment = currentCandles.slice(-lookback).map(c => c.close);
    const currentNorm = normalize(currentSegment);
    
    let bestDist = Infinity;
    let bestIndex = 0;

    // Sliding window search (simplified DTW)
    for (let i = 0; i < allCandles.length - lookback - SIMULATION_STEPS; i+=2) { // Skip step for perf
        const histSegment = allCandles.slice(i, i + lookback).map(c => c.close);
        const histNorm = normalize(histSegment);
        
        let dist = 0;
        for(let j=0; j<lookback; j++) {
            dist += Math.pow(currentNorm[j] - histNorm[j], 2);
        }
        
        if (dist < bestDist) {
            bestDist = dist;
            bestIndex = i;
        }
    }
    
    // Calculate outcome of the match (return % over next 30 bars)
    const matchEndPrice = allCandles[bestIndex + lookback - 1].close;
    const futurePrice = allCandles[bestIndex + lookback + SIMULATION_STEPS - 1].close;
    const outcome = (futurePrice - matchEndPrice) / matchEndPrice;

    return {
        matchScore: Math.max(0, 100 - bestDist * 50),
        outcome,
        index: bestIndex
    };
};

const normalize = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data.map(v => (v - min) / range);
};

// --- Engine: The Quant (Monte Carlo) ---
const runMonteCarlo = (currentPrice: number, vol: number, driftBias: number): FayezScenario => {
    const paths: number[][] = [];
    let finalSum = 0;
    let successCount = 0;

    // Run simulations
    for(let i=0; i<MONTE_CARLO_ITERATIONS; i++) {
        let price = currentPrice;
        const path = [];
        for(let t=0; t<SIMULATION_STEPS; t++) {
            // Add slight drift bias based on trend assumption
            const drift = driftBias * 0.001; 
            price = price * Math.exp((drift - 0.5 * vol * vol) + vol * (Math.random()-0.5)*2);
            path.push(price);
        }
        paths.push(path);
        finalSum += price;
        if(driftBias > 0 && price > currentPrice) successCount++;
        if(driftBias < 0 && price < currentPrice) successCount++;
    }

    // Create "Average Path" candles
    const avgPath: number[] = [];
    for(let t=0; t<SIMULATION_STEPS; t++) {
        let sum = 0;
        for(let i=0; i<MONTE_CARLO_ITERATIONS; i++) sum += paths[i][t];
        avgPath.push(sum / MONTE_CARLO_ITERATIONS);
    }

    // Convert line path to synthetic candles
    const candles: PredictedCandle[] = [];
    let prevClose = currentPrice;
    avgPath.forEach((close, i) => {
        const range = close * vol;
        candles.push({
            o: prevClose,
            c: close,
            h: Math.max(prevClose, close) + range * 0.3,
            l: Math.min(prevClose, close) - range * 0.3,
            timestamp: i
        });
        prevClose = close;
    });

    const probability = (successCount / MONTE_CARLO_ITERATIONS) * 100;
    const target = avgPath[avgPath.length-1];

    return {
        type: driftBias > 0.1 ? 'Bullish' : driftBias < -0.1 ? 'Bearish' : 'Neutral',
        probability,
        path: candles,
        targetPrice: target,
        description: '', // To be filled by AI
        keyLevels: [currentPrice, target]
    };
};


export const runFayezInference = async (
    pair: string,
    candles: Candle[]
): Promise<FayezPredictionResult> => {
    
    // 1. Analyze Market Conditions
    const vol = calculateVolatility(candles.slice(-50));
    const lastPrice = candles[candles.length - 1].close;
    
    // 2. Run Pattern Matching
    const history = findHistoricalMatch(candles, candles.slice(0, -SIMULATION_STEPS)); // Don't match with self immediately
    
    // 3. Define Drifts for Scenarios
    // Base drift on recent momentum + history outcome
    const recentMom = (lastPrice - candles[candles.length - 10].close) / candles[candles.length - 10].close;
    const historyBias = history.outcome;
    
    // Bullish Scenario: assume momentum continues or mean revers if oversold
    const bullDrift = Math.abs(vol) + Math.max(0, recentMom) + Math.max(0, historyBias);
    // Bearish Scenario
    const bearDrift = -Math.abs(vol) + Math.min(0, recentMom) + Math.min(0, historyBias);
    // Neutral Scenario
    const neutralDrift = (recentMom + historyBias) / 4;

    const bullScenario = runMonteCarlo(lastPrice, vol, bullDrift * 5);
    const bearScenario = runMonteCarlo(lastPrice, vol, bearDrift * 5);
    const neutralScenario = runMonteCarlo(lastPrice, vol, neutralDrift);

    // 4. Determine "Main" scenario based on history and momentum
    let main = neutralScenario;
    let alts = [bullScenario, bearScenario];

    const bullScore = (recentMom > 0 ? 1 : 0) + (historyBias > 0 ? 1 : 0);
    if (bullScore >= 1.5) {
        main = bullScenario;
        alts = [neutralScenario, bearScenario];
        main.type = 'Bullish';
    } else if (recentMom < -0.01 && historyBias < 0) {
        main = bearScenario;
        alts = [neutralScenario, bullScenario];
        main.type = 'Bearish';
    } else {
        main.type = 'Neutral';
    }

    // 5. Calculate Volatility Cone (for UI cloud)
    const upperCone = [];
    const lowerCone = [];
    for(let i=1; i<=SIMULATION_STEPS; i++) {
        const stdDev = lastPrice * vol * Math.sqrt(i);
        upperCone.push(lastPrice + stdDev * 1.96); // 95% CI
        lowerCone.push(lastPrice - stdDev * 1.96);
    }

    // 6. Construct Result
    return {
        mainScenario: main,
        alternativeScenarios: alts,
        historicalMatch: {
            similarity: history.matchScore,
            date: new Date(candles[history.index].timestamp).toLocaleDateString(),
            outcome: history.outcome > 0.02 ? 'صعود قوي' : history.outcome < -0.02 ? 'هبوط حاد' : 'تذبذب'
        },
        volatilityCone: { upper: upperCone, lower: lowerCone },
        aiNarrative: '', // Filled by Component
        confidenceScore: history.matchScore > 70 ? 85 : 60 // Base confidence on historical match
    };
};
