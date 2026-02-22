
import { SCALOGRAM_PERIODS, SCALOGRAM_TIME_POINTS, HISTORICAL_CANDLES_COUNT } from '../constants';
import { AnalysisResult, ScalogramData, Candle, MarketState, TechnicalPatternsAnalysis, ChartPattern, CandlestickPattern, WyckoffAnalysis, WyckoffEventPoint, TradeSetup, GannAnalysis, GannAngle, GannTimeCycle, GannSquareLevel, GannTradeRecommendation, SpectralVerdict, SpectralPhaseState, CompositeCycle, PatternPoint, LiquidityAnalysis } from '../types';
import { analyzeWaves } from './elliottWaveService';
import { analyzeHarmonicPattern } from './harmonicAnalysisService';
import { analyzeFractals } from './fractalAnalysisService';
import { analyzeSmartMoneyConcepts } from './smartMoneyService';
import { analyzeMacd } from './macdAnalysisService';
import { analyzeICT } from './ictAnalysisService';
import { analyzeCotData } from './cotAnalysisService';
import { analyzeTechnicalPatterns } from './technicalPatternService';
import { analyzeFibonacci } from './fibonacciAnalysisService';
import { analyzeShortSqueeze } from './shortSqueezeService';
import { analyzeIchimoku } from './ichimokuService';
import { generateLiquidationMap, calculatePivotPoints, calculateSessionStatus, calculateFlashCrashRisk } from './advancedAnalysisService';
import { analyzeGann } from './gannService';
import { analyzeWhaleActivity } from './whaleWatcherService'; 
import { calculateVolumeProfile } from './volumeProfileService'; 
import { calculateSeasonality } from './seasonalityService'; 
import { analyzeGannFractalNexus } from './gannFractalService'; 
import { analyzeDiverseStrategies } from './diverseStrategyService'; 
import { analyzeQuantStats } from './quantService'; 
import { analyzeDowTheory } from './dowService'; 

// --- HELPER FUNCTIONS ---

const calculateVolatility = (candles: Candle[]) => {
    const closes = candles.map(c => c.close);
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
    const variance = closes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / closes.length;
    return Math.sqrt(variance);
};

const calculateMomentum = (candles: Candle[]) => {
    if (candles.length < 20) return 0;
    const current = candles[candles.length - 1].close;
    const prev = candles[candles.length - 20].close;
    return ((current - prev) / prev) * 100;
};

// --- REAL SPECTRAL ENGINE IMPLEMENTATION (DFT) ---

interface SpectralComponent {
    period: number;
    amplitude: number;
    phase: number;
    power: number;
}

// 1. Discrete Fourier Transform (DFT) to find Dominant Cycles
const performDFT = (data: number[]): { components: SpectralComponent[], entropy: number } => {
    const N = data.length;
    const components: SpectralComponent[] = [];
    
    // Detrend data first to avoid spectral leakage
    // Simple linear regression detrending
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < N; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }
    const slope = (N * sumXY - sumX * sumY) / (N * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / N;
    const detrended = data.map((y, i) => y - (slope * i + intercept));

    // Scan range of periods (e.g., from 8 to N/2)
    const minPeriod = 8;
    const maxPeriod = Math.floor(N / 2);
    
    let totalPower = 0;

    for (let p = minPeriod; p <= maxPeriod; p++) {
        let re = 0;
        let im = 0;
        const freq = (2 * Math.PI) / p;
        
        for (let i = 0; i < N; i++) {
            re += detrended[i] * Math.cos(freq * i);
            im += detrended[i] * Math.sin(freq * i);
        }
        
        re /= N; // Normalization
        im /= N;
        
        const amplitude = Math.sqrt(re * re + im * im);
        const phase = Math.atan2(im, re);
        const power = amplitude * amplitude;
        
        components.push({ period: p, amplitude, phase, power });
        totalPower += power;
    }

    // Calculate Spectral Entropy (Measure of Chaos)
    let entropy = 0;
    if (totalPower > 0) {
        components.forEach(comp => {
            const prob = comp.power / totalPower;
            if (prob > 0) {
                entropy -= prob * Math.log(prob);
            }
        });
    }
    // Normalize entropy to 0-100 scale (approximate based on length)
    const maxEntropy = Math.log(components.length);
    const entropyScore = (entropy / maxEntropy) * 100;

    // Sort by power to find dominant cycles
    components.sort((a, b) => b.power - a.power);
    
    return { components: components.slice(0, 5), entropy: entropyScore }; // Return top 5
};

// 2. Reconstruct Wave and Project Future
const generateRealCompositeCycle = (
    historyLength: number, 
    projectionLength: number, 
    components: SpectralComponent[]
): CompositeCycle[] => {
    const cycles: CompositeCycle[] = [];
    const totalLength = historyLength + projectionLength;
    
    // If no components (flat market), return straight line
    if (components.length === 0) {
        return Array.from({ length: totalLength }, (_, i) => ({
            time: i,
            value: 0,
            dominantComponent: 0,
            noiseComponent: 0,
            isProjection: i >= historyLength
        }));
    }

    const dominant = components[0];

    for (let t = 0; t < totalLength; t++) {
        // Reconstruct signal: Sum of A * cos(wt + phi)
        let signalValue = 0;
        components.forEach(comp => {
            const freq = (2 * Math.PI) / comp.period;
            // We need to adjust t relative to the analysis window end (historyLength)
            // The Phase from DFT is usually relative to t=0 of the window.
            signalValue += comp.amplitude * Math.cos(freq * t + comp.phase);
        });

        // Dominant only for visualization
        const domFreq = (2 * Math.PI) / dominant.period;
        const domValue = dominant.amplitude * Math.cos(domFreq * t + dominant.phase);

        cycles.push({
            time: t,
            value: signalValue,
            dominantComponent: domValue,
            noiseComponent: 0, // Residual noise not calculated here for performance
            isProjection: t >= historyLength
        });
    }
    return cycles;
};

const determinePhaseState = (angle: number): SpectralPhaseState => {
    // Normalize angle 0-360
    let normAngle = angle % 360;
    if (normAngle < 0) normAngle += 360;

    if (normAngle >= 270 || normAngle < 45) return SpectralPhaseState.ACCUMULATION; // Bottoming
    if (normAngle >= 45 && normAngle < 135) return SpectralPhaseState.MARKUP; // Rising
    if (normAngle >= 135 && normAngle < 225) return SpectralPhaseState.DISTRIBUTION; // Topping
    return SpectralPhaseState.MARKDOWN; // Falling
};

const calculateSpectralVerdict = (phaseAngle: number, entropy: number, momentum: number): SpectralVerdict => {
    // Normalize angle
    let angle = phaseAngle % 360;
    if(angle < 0) angle += 360;

    let action: SpectralVerdict['action'] = 'WAIT';
    let confidence = 0;
    let description = '';
    let nextTurnIn = 0;

    // Low entropy = reliable cycles. High entropy = chaotic/noise.
    const reliability = Math.max(0, 100 - entropy); 

    if (angle >= 270 || angle < 45) {
        // Accumulation / Bottom
        if (reliability > 60) {
            action = 'BUY';
            confidence = reliability * 0.9;
            description = "دورة زمنية صاعدة وشيكة. الانتروبيا منخفضة مما يدعم الانعكاس.";
            nextTurnIn = 5;
        } else {
            action = 'WAIT';
            confidence = 40;
            description = "القاع الزمني محتمل، ولكن فوضى السوق عالية (انتروبيا مرتفعة). انتظر التأكيد.";
        }
    } else if (angle >= 45 && angle < 135) {
        // Markup
        action = 'HOLD';
        confidence = reliability > 70 ? 85 : 60;
        description = "السعر في منتصف الدورة الصاعدة.";
        nextTurnIn = 20;
    } else if (angle >= 135 && angle < 225) {
        // Distribution / Top
        if (reliability > 60) {
            action = 'SELL';
            confidence = reliability * 0.9;
            description = "قمة الدورة الزمنية. تشبع شرائي.";
            nextTurnIn = 5;
        } else {
            action = 'WAIT';
            description = "إشارات قمة، لكن الدورة غير واضحة.";
        }
    } else {
        // Markdown
        action = 'WAIT';
        confidence = 70;
        description = "دورة هابطة. لا تلتقط السكاكين الساقطة.";
        nextTurnIn = 15;
    }

    return { action, confidence, description, nextTurnIn };
};

const generateScalogram = (candles: Candle[]): ScalogramData => {
    // Simplified Spectrogram visualization
    // In real DSP, this would be Short-Time Fourier Transform (STFT) or Wavelet
    // Here we simulate energy pockets based on volatility clusters
    const periods = 24;
    const timePoints = 100; // Visualization resolution
    const energy: number[][] = [];
    
    const closes = candles.map(c => c.close);
    const len = closes.length;
    
    for (let p = 0; p < periods; p++) {
        const row: number[] = [];
        const periodLen = 8 + p * 4; // Periods from 8 to ~100
        
        for (let t = 0; t < timePoints; t++) {
            // Map visualization time to data index
            const dataIdx = Math.floor((t / timePoints) * (len - periodLen));
            if(dataIdx < 0) { row.push(0); continue; }
            
            // Calculate simple energy (volatility) at this scale/time
            const slice = closes.slice(dataIdx, dataIdx + periodLen);
            const max = Math.max(...slice);
            const min = Math.min(...slice);
            const range = max - min;
            
            // Normalize somewhat
            const val = Math.min(1, range / (slice[0] * 0.05)); 
            row.push(val);
        }
        energy.push(row);
    }
    return { energy };
};

// --- NEW: Calculate Liquidity Flow ---
const calculateLiquidityFlow = (candles: Candle[]): LiquidityAnalysis => {
    if (candles.length < 20) {
        return { volumeRatio: 0, flowDirection: 'Neutral', moneyFlowRaw: 0, averageVolume: 0, currentVolume: 0, spikeDetected: false };
    }

    const recentCandles = candles.slice(-20);
    const currentCandle = recentCandles[recentCandles.length - 1];
    const previousCandles = recentCandles.slice(0, -1);
    
    const avgVolume = previousCandles.reduce((acc, c) => acc + c.volume, 0) / previousCandles.length;
    const currentVolume = currentCandle.volume;
    
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;
    
    // Determine direction based on price action of current candle
    // Close > Open ? Inflow : Outflow.
    const priceChange = (currentCandle.close - currentCandle.open) / currentCandle.open;
    const isBullish = priceChange > 0;
    
    let flowDirection: 'Inflow' | 'Outflow' | 'Neutral' = 'Neutral';
    if (volumeRatio > 1.2) {
        flowDirection = isBullish ? 'Inflow' : 'Outflow';
    }
    
    // Spike detection: Sudden large volume (> 2.5x average)
    const spikeDetected = volumeRatio > 2.5;
    
    // Money Flow Raw approximation: Volume * %Change
    const moneyFlowRaw = currentVolume * priceChange;

    return {
        volumeRatio,
        flowDirection,
        moneyFlowRaw,
        averageVolume: avgVolume,
        currentVolume,
        spikeDetected
    };
};

export const analyzePair = (pair: string, timeframe: string, candles: Candle[], allCandlesForPair: { [key: string]: Candle[] }): AnalysisResult => {
    const volatility = calculateVolatility(candles);
    const momentum = calculateMomentum(candles);
    
    // --- 1. Run Real DFT ---
    // Use closing prices for spectral analysis
    const prices = candles.map(c => c.close);
    // Use last 128 or 256 candles for optimal FFT/DFT performance (power of 2 not required for simple DFT but good for windows)
    const analysisWindow = prices.slice(-150); 
    const { components, entropy } = performDFT(analysisWindow);
    
    const dominantPeriod = components.length > 0 ? components[0].period : 20;
    const dominantPower = components.length > 0 ? components[0].power : 0;
    
    // --- 2. Calculate Composite Cycle & Projection ---
    const projectionHorizon = 30; // Forecast 30 bars
    const compositeCycle = generateRealCompositeCycle(150, projectionHorizon, components);
    
    // --- 3. Determine Phase State ---
    // Find current angle of the dominant component at the last index (t = 149)
    let currentPhaseAngle = 0;
    if (components.length > 0) {
        const dom = components[0];
        const freq = (2 * Math.PI) / dom.period;
        const t = 149; // End of history window
        const rawPhase = (freq * t + dom.phase) % (2 * Math.PI);
        // Convert radians to degrees (0-360)
        currentPhaseAngle = (rawPhase * 180) / Math.PI;
        if (currentPhaseAngle < 0) currentPhaseAngle += 360;
    }

    const state = momentum > 2.5 ? MarketState.TRENDING_UP : 
                  momentum < -2.5 ? MarketState.TRENDING_DOWN : 
                  Math.abs(momentum) > 6 ? (momentum > 0 ? MarketState.BREAKOUT_UP : MarketState.BREAKOUT_DOWN) :
                  MarketState.CONSOLIDATING;

    const scalogram = generateScalogram(candles);
    const spectralPhaseState = determinePhaseState(currentPhaseAngle);
    const spectralVerdict = calculateSpectralVerdict(currentPhaseAngle, entropy, momentum);

    const marketEnergyIndex = candles.slice(-50).map((c, i) => ({ time: i, value: (c.volume / (Math.max(...candles.slice(-50).map(v=>v.volume)) || 1)) })); 
    
    // Phase Oscillator now tracks the calculated dominant phase
    const cyclePhaseOscillator = candles.slice(-50).map((c, i) => {
        if(components.length === 0) return { time: i, value: 0 };
        const t = 100 + i; // Align with end of window
        const freq = (2 * Math.PI) / components[0].period;
        return { time: i, value: Math.sin(freq * t + components[0].phase) };
    });

    const currentPrice = candles[candles.length - 1].close;
    const priceTargets = [
        { level: 'R1', price: currentPrice * 1.035 },
        { level: 'R2', price: currentPrice * 1.075 },
        { level: 'S1', price: currentPrice * 0.965 },
    ];

    const elliottWave = analyzeWaves(candles);
    const harmonicPattern = analyzeHarmonicPattern(candles, pair, timeframe);
    const fractalAnalysis = analyzeFractals(candles, allCandlesForPair, timeframe);
    const smartMoneyAnalysis = analyzeSmartMoneyConcepts(candles, pair);
    const ictAnalysis = analyzeICT(candles, pair);
    const macdAnalysis = analyzeMacd(candles, pair);
    const cotAnalysis = analyzeCotData(pair, candles);
    const technicalPatterns = analyzeTechnicalPatterns(candles);
    const gannAnalysis = analyzeGann(candles, pair);
    const fibonacciAnalysis = analyzeFibonacci(candles);
    const shortSqueezeAnalysis = analyzeShortSqueeze(candles, pair);
    const ichimokuAnalysis = analyzeIchimoku(candles); 
    const whaleWatcherAnalysis = analyzeWhaleActivity(candles);
    const volumeProfileAnalysis = calculateVolumeProfile(candles); 
    const seasonalityAnalysis = calculateSeasonality(candles); 
    const nexusAnalysis = analyzeGannFractalNexus(candles, gannAnalysis, fractalAnalysis);
    const diverseStrategiesAnalysis = analyzeDiverseStrategies(candles);
    const quantAnalysis = analyzeQuantStats(candles);
    const dowAnalysis = analyzeDowTheory(candles);
    const liquidityAnalysis = calculateLiquidityFlow(candles);
    
    const liquidationMap = generateLiquidationMap(candles, currentPrice);
    const pivotPoints = calculatePivotPoints(candles);
    const sessionStatus = calculateSessionStatus();
    const flashCrashRisk = calculateFlashCrashRisk(candles);

    // Regime Score now incorporates Entropy (Low Entropy = High Regime Clarity)
    const regimeScore = (1 - entropy/100) * (momentum > 0 ? 1 : -1);

    return {
        dominantCyclePeriod: dominantPeriod,
        dominantCyclePower: dominantPower,
        currentPhaseAngle,
        regimeScore,
        scalogram,
        marketEnergyIndex,
        cyclePhaseOscillator,
        spectralVerdict,
        spectralPhaseState,
        compositeCycle,
        signalToNoiseRatio: Math.max(0, 100 - entropy), // Inverse of entropy
        spectralEntropy: entropy, // New Metric
        state,
        momentum,
        priceTargets,
        swingLow: Math.min(...candles.slice(-20).map(c => c.low)),
        swingHigh: Math.max(...candles.slice(-20).map(c => c.high)),
        elliottWave,
        harmonicPattern,
        fractalAnalysis,
        smartMoneyAnalysis,
        ictAnalysis,
        macdAnalysis,
        cotAnalysis,
        technicalPatterns,
        gannAnalysis,
        fibonacciAnalysis,
        shortSqueezeAnalysis,
        liquidationMap, 
        pivotPoints,
        sessionStatus,
        ichimokuAnalysis,
        whaleWatcherAnalysis,
        volumeProfileAnalysis,
        seasonalityAnalysis,
        nexusAnalysis,
        diverseStrategiesAnalysis,
        flashCrashRisk,
        quantAnalysis,
        dowAnalysis,
        liquidityAnalysis, // Added
        rsi: 50 + momentum * 2,
        macdHistogram: momentum / 100,
        bollingerBands: { upper: currentPrice*1.02, middle: currentPrice, lower: currentPrice*0.98 },
        volumeStrength: momentum > 5 ? 'عالية جداً' : 'متوسطة'
    };
};
