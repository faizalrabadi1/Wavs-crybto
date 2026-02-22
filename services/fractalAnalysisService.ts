
import type { Candle, FractalAnalysisResult, FractalMatch, ChaosMetrics, FractalPivot } from '../types';

// --- UTILITY FUNCTIONS ---

// Normalize a series to [0, 1] range
const normalizeSeries = (series: number[]): number[] => {
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min;
    if (range === 0) return series.map(() => 0.5);
    return series.map(val => (val - min) / range);
};

// Dynamic Time Warping (DTW) calculation
const calculateDtwDistance = (seriesA: number[], seriesB: number[]): number => {
    const n = seriesA.length;
    const m = seriesB.length;
    if (n === 0 || m === 0) return Infinity;

    // Optimization: Use a smaller window or constraint for performance
    const dtwMatrix: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtwMatrix[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = Math.pow(seriesA[i - 1] - seriesB[j - 1], 2);
            dtwMatrix[i][j] = cost + Math.min(
                dtwMatrix[i - 1][j],    // Insertion
                dtwMatrix[i][j - 1],    // Deletion
                dtwMatrix[i - 1][j - 1] // Match
            );
        }
    }
    return Math.sqrt(dtwMatrix[n][m]) / Math.max(n, m);
};

// --- 1. TRUE FRACTAL PATTERN MATCHING (SELF-SIMILARITY) ---
// Finds top 3 "ghost" patterns from history
const findSelfSimilarPatterns = (candles: Candle[]): FractalMatch[] => {
    if (candles.length < 300) return [];

    const lookbackWindow = 40; // Length of the pattern to match (current price action)
    const projectionWindow = 30; // How many candles to project forward
    const searchStart = 0;
    const searchEnd = candles.length - lookbackWindow - projectionWindow - 20;

    const currentSegment = candles.slice(-lookbackWindow).map(c => c.close);
    const normalizedCurrent = normalizeSeries(currentSegment);
    
    const matches: { score: number, startIndex: number }[] = [];

    // Sliding window search through history
    for (let i = searchStart; i < searchEnd; i += 2) { // Skip step for speed
        const historySegment = candles.slice(i, i + lookbackWindow).map(c => c.close);
        const normalizedHistory = normalizeSeries(historySegment);
        
        // Quick filter: Check trend direction first
        const currentTrend = normalizedCurrent[normalizedCurrent.length-1] - normalizedCurrent[0];
        const historyTrend = normalizedHistory[normalizedHistory.length-1] - normalizedHistory[0];
        if (Math.sign(currentTrend) !== Math.sign(historyTrend)) continue;

        const distance = calculateDtwDistance(normalizedCurrent, normalizedHistory);
        const score = Math.max(0, (1 - distance * 3) * 100);
        
        if (score > 60) {
            matches.push({ score, startIndex: i });
        }
    }

    // Sort by score and pick unique top 3 (avoid overlapping matches)
    matches.sort((a, b) => b.score - a.score);
    const uniqueMatches: typeof matches = [];
    matches.forEach(m => {
        if (!uniqueMatches.some(u => Math.abs(u.startIndex - m.startIndex) < lookbackWindow)) {
            uniqueMatches.push(m);
        }
    });
    
    return uniqueMatches.slice(0, 3).map(m => {
        const projectionStart = m.startIndex + lookbackWindow;
        const rawProjection = candles.slice(projectionStart, projectionStart + projectionWindow).map(c => c.close);
        const startPrice = candles[m.startIndex + lookbackWindow - 1].close;
        
        // Calculate outcome type
        const endPrice = rawProjection[rawProjection.length - 1];
        const change = (endPrice - startPrice) / startPrice;
        let type: 'Optimistic' | 'Pessimistic' | 'Neutral' = 'Neutral';
        if (change > 0.02) type = 'Optimistic';
        else if (change < -0.02) type = 'Pessimistic';

        return {
            startIndex: m.startIndex,
            endIndex: m.startIndex + lookbackWindow,
            similarityScore: m.score,
            projection: rawProjection.map(p => p / startPrice),
            timestamp: candles[m.startIndex].timestamp,
            type
        };
    });
};

// --- 2. ROBUST HURST EXPONENT (R/S ANALYSIS) ---
const calculateRobustHurst = (candles: Candle[]): number => {
    const prices = candles.map(c => c.close);
    if (prices.length < 100) return 0.5;

    const returns = [];
    for(let i=1; i<prices.length; i++) returns.push(Math.log(prices[i]/prices[i-1]));

    const scales = [10, 20, 40, 80];
    const rsValues = [];

    for (const n of scales) {
        const chunks = Math.floor(returns.length / n);
        let totalRS = 0;
        
        for (let i=0; i<chunks; i++) {
            const chunk = returns.slice(i*n, (i+1)*n);
            const mean = chunk.reduce((a,b) => a+b, 0) / n;
            let currentSum = 0;
            let maxDev = -Infinity;
            let minDev = Infinity;
            let sumSqDiff = 0;

            for (const r of chunk) {
                const diff = r - mean;
                currentSum += diff;
                maxDev = Math.max(maxDev, currentSum);
                minDev = Math.min(minDev, currentSum);
                sumSqDiff += diff * diff;
            }
            
            const range = maxDev - minDev;
            const stdDev = Math.sqrt(sumSqDiff / n);
            
            if (stdDev > 0) totalRS += range / stdDev;
        }
        rsValues.push(Math.log(totalRS / chunks));
    }

    const logScales = scales.map(s => Math.log(s));
    const n = scales.length;
    const sumX = logScales.reduce((a,b) => a+b, 0);
    const sumY = rsValues.reduce((a,b) => a+b, 0);
    const sumXY = logScales.reduce((a,b, i) => a + b * rsValues[i], 0);
    const sumXX = logScales.reduce((a,b) => a + b*b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return Math.max(0, Math.min(1, slope));
};

// --- 3. CHAOS METRICS (LYAPUNOV & ATTRACTOR) ---
const calculateChaosMetrics = (candles: Candle[]): ChaosMetrics => {
    const prices = candles.map(c => c.close);
    const n = prices.length;
    
    let sumLogDiv = 0;
    const lag = 5;
    let count = 0;
    
    for(let i=0; i<n-lag-1; i++) {
        const distInitial = Math.abs(prices[i] - prices[i+1]);
        if (distInitial === 0) continue;
        const distFuture = Math.abs(prices[i+lag] - prices[i+lag+1]);
        if (distFuture > 0) {
            sumLogDiv += Math.log(distFuture / distInitial);
            count++;
        }
    }
    
    const lyapunov = count > 0 ? (sumLogDiv / count) / lag : 0;
    
    // Calculate Entropy
    const returns = [];
    for(let i=1; i<prices.length; i++) returns.push((prices[i]-prices[i-1])/prices[i-1]);
    const bins = 20;
    const minRet = Math.min(...returns);
    const maxRet = Math.max(...returns);
    const binSize = (maxRet - minRet) / bins;
    const counts = new Array(bins).fill(0);
    
    returns.forEach(r => {
        const bin = Math.min(bins-1, Math.floor((r - minRet) / binSize));
        counts[bin]++;
    });
    
    let entropy = 0;
    counts.forEach(c => {
        if(c > 0) {
            const p = c / returns.length;
            entropy -= p * Math.log(p);
        }
    });

    const dim = 1 + entropy / 3; 

    // Classify Attractor
    let attractorType: ChaosMetrics['attractorType'] = 'Random Walk';
    if (lyapunov < 0 && dim < 1.5) attractorType = 'Limit Cycle'; // Stable periodic
    else if (lyapunov > 0 && dim > 1.5) attractorType = 'Strange Attractor'; // Deterministic Chaos
    else if (lyapunov > 0.02) attractorType = 'Random Walk'; // Highly chaotic/random
    else attractorType = 'Point Attractor'; // Converging

    return { lyapunovExponent: lyapunov, entropy, dimension: dim, attractorType };
};

// --- 4. FRACTAL EFFICIENCY RATIO (FER) ---
const calculateFER = (candles: Candle[], period: number = 20): number => {
    if (candles.length < period) return 0.5;
    const slice = candles.slice(-period);
    
    const netChange = Math.abs(slice[slice.length-1].close - slice[0].close);
    let sumIncrements = 0;
    for(let i=1; i<slice.length; i++) {
        sumIncrements += Math.abs(slice[i].close - slice[i-1].close);
    }
    
    if (sumIncrements === 0) return 0;
    return netChange / sumIncrements; // 1 = straight line, 0 = total noise
};

// --- 5. LOCAL HOLDER EXPONENT (ROUGHNESS) ---
const calculateHolderExponent = (candles: Candle[]): number[] => {
    // Simplified Holder exponent estimation based on local range scaling
    // H(t) ~ log(Range) / log(Scale) locally
    const holders = [];
    const window = 10;
    
    for (let i = window; i < candles.length; i++) {
        const slice = candles.slice(i - window, i);
        const range = Math.max(...slice.map(c => c.high)) - Math.min(...slice.map(c => c.low));
        const avgPrice = slice[0].close;
        const normalizedRange = range / avgPrice;
        
        // Heuristic mapping to 0-1 roughness inverse
        // High range relative to price = Low Holder (Rough)
        // Low range = High Holder (Smooth)
        let h = 1 - Math.min(1, normalizedRange * 20); 
        holders.push(h);
    }
    return holders; // Array of H values over time
};

// --- 6. FRACTAL PIVOTS (S/R) ---
const findFractalPivots = (candles: Candle[]): FractalPivot[] => {
    const pivots: FractalPivot[] = [];
    // A fractal pivot is a high surrounded by N lower highs, or low surrounded by N higher lows.
    // We use Bill Williams' fractal definition (2 candles left, 2 right)
    
    for(let i = 2; i < candles.length - 2; i++) {
        const c = candles[i];
        // Bearish Fractal (Resistance)
        if (c.high > candles[i-1].high && c.high > candles[i-2].high && c.high > candles[i+1].high && c.high > candles[i+2].high) {
            pivots.push({ price: c.high, type: 'Resistance', strength: 1 });
        }
        // Bullish Fractal (Support)
        if (c.low < candles[i-1].low && c.low < candles[i-2].low && c.low < candles[i+1].low && c.low < candles[i+2].low) {
            pivots.push({ price: c.low, type: 'Support', strength: 1 });
        }
    }
    
    // Cluster pivots
    const uniquePivots: FractalPivot[] = [];
    const threshold = candles[candles.length-1].close * 0.002;
    
    pivots.forEach(p => {
        const existing = uniquePivots.find(u => u.type === p.type && Math.abs(u.price - p.price) < threshold);
        if (existing) {
            existing.strength++;
        } else {
            uniquePivots.push(p);
        }
    });
    
    return uniquePivots.filter(p => p.strength >= 1).sort((a,b) => b.strength - a.strength).slice(0, 5);
};


export const analyzeFractals = (
    candles: Candle[], 
    allTimeframeCandles: { [timeframe: string]: Candle[] },
    currentTimeframe: string
): FractalAnalysisResult => {
    
    const hurstExponent = calculateRobustHurst(candles);
    const fractalDimension = 2 - hurstExponent;
    
    // New Features Calculation
    const predictionFan = findSelfSimilarPatterns(candles);
    const historicalMatch = predictionFan.length > 0 ? predictionFan[0] : undefined;
    const chaosMetrics = calculateChaosMetrics(candles);
    const fractalEfficiency = calculateFER(candles);
    const holderExponent = calculateHolderExponent(candles);
    const fractalPivots = findFractalPivots(candles);
    
    // Hurst Slope & Multifractal Width
    const half = Math.floor(candles.length/2);
    const h1 = calculateRobustHurst(candles.slice(0, half));
    const h2 = calculateRobustHurst(candles.slice(half));
    const hurstSlope = (h2 - h1) / h1;
    const multifractalSpectrumWidth = Math.abs(h2 - h1) * 2; 
    const memoryScore = Math.abs(hurstExponent - 0.5) * 2 * 100; // 0 = Random, 100 = Perfect Memory

    let summary = `معامل هيرست (H=${hurstExponent.toFixed(2)}) يشير إلى ${hurstExponent > 0.55 ? 'سوق ذو ذاكرة قوية' : hurstExponent < 0.45 ? 'سوق يميل للارتداد' : 'حركة عشوائية'}. `;
    
    if (chaosMetrics.attractorType === 'Strange Attractor') {
        summary += `تم رصد جاذب غريب (Strange Attractor)، مما يعني أن الفوضى منظمة واحتمالية تكرار الأنماط عالية. `;
    } else if (chaosMetrics.attractorType === 'Limit Cycle') {
        summary += `السوق في دورة حدية مستقرة (Limit Cycle)، توقع تذبذب منتظم. `;
    }

    if (fractalEfficiency > 0.6) {
        summary += `كفاءة الفركتال عالية (${fractalEfficiency.toFixed(2)})، الاتجاه الحالي "ناعم" وقوي. `;
    } else {
        summary += `كفاءة منخفضة (${fractalEfficiency.toFixed(2)})، السوق مليء بالضجيج. `;
    }

    return { 
        hurstExponent, 
        fractalDimension, 
        summary, 
        historicalMatch,
        predictionFan,
        chaosMetrics,
        hurstSlope, 
        levyAlpha: 2 - chaosMetrics.dimension * 0.5, 
        multifractalSpectrumWidth,
        fractalEfficiency,
        holderExponent,
        fractalPivots,
        memoryScore
    };
};
