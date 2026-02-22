
import type { Candle, WhaleWatcherAnalysis, WhaleCandleAnalysis } from '../types';

// --- Helper: Calculate Volume Delta (Approximation) ---
// Estimates buying vs selling pressure within a candle based on price action
const calculateDelta = (candle: Candle) => {
    const range = candle.high - candle.low;
    if (range === 0) return 0;
    
    // Close relative to range: high close = buy pressure, low close = sell pressure
    const closePosition = (candle.close - candle.low) / range;
    
    // Estimate
    const buyVol = candle.volume * closePosition;
    const sellVol = candle.volume * (1 - closePosition);
    
    return buyVol - sellVol;
};

// --- Helper: Calculate Average True Range (ATR) ---
const calculateATR = (candles: Candle[], period: number) => {
    if (candles.length < period + 1) return 0;
    let sumTR = 0;
    for(let i = candles.length - period; i < candles.length; i++) {
        const c = candles[i];
        const prev = candles[i-1];
        const tr = Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
        sumTR += tr;
    }
    return sumTR / period;
};

// --- MAIN ANALYSIS ---
export const analyzeWhaleActivity = (candles: Candle[]): WhaleWatcherAnalysis => {
    const lookback = 50; // View 50 candles for chart
    const viewCandles = candles.slice(-lookback);
    
    if (candles.length < 50) {
        return {
            manipulationScore: 0,
            whaleActivityLevel: 'Low',
            detectedAnomalies: [],
            summary: "بيانات غير كافية لتحليل نشاط الحيتان.",
            candleAnalysis: []
        };
    }

    // Calc Averages for context
    const avgVolume = candles.slice(-100).reduce((acc, c) => acc + c.volume, 0) / 100;
    const atr = calculateATR(candles, 14);

    const candleAnalysis: WhaleCandleAnalysis[] = [];
    let manipulationScore = 0;
    const detectedAnomaliesSet = new Set<string>();
    let netFlowAccumulator = 0;
    let totalWeightVol = 0;
    let weightedPriceSum = 0;

    viewCandles.forEach((c, i) => {
        const range = c.high - c.low;
        const delta = calculateDelta(c);
        const relVol = c.volume / (avgVolume || 1);
        const relRange = range / (atr || 1);
        
        let anomaly: WhaleCandleAnalysis['anomaly'] = null;
        let desc = '';

        // --- VPA Logic ---
        
        // 1. Churn / Absorption (High Volume, Small Range)
        if (relVol > 1.5 && relRange < 0.8) {
            anomaly = 'Churn';
            desc = 'حجم عالٍ مع مدى ضيق (امتصاص/صراع)';
            detectedAnomaliesSet.add('Absorption/Churn');
            manipulationScore += 2;
        } 
        // 2. Push / Breakout (High Volume, High Range)
        else if (relVol > 1.5 && relRange > 1.5) {
            anomaly = 'Push';
            desc = 'دخول قوي (اندفاع)';
            manipulationScore += 1;
        }
        // 3. Squat (Higher Vol than prev, Smaller Range than prev)
        else if (i > 0) {
            const prev = viewCandles[i-1];
            const prevRange = prev.high - prev.low;
            if (c.volume > prev.volume && range < prevRange) {
                anomaly = 'Absorption'; // Or "Squat"
                desc = 'فقدان الزخم رغم ارتفاع الحجم (Squat)';
            }
        }
        
        // 4. Stop Hunt (Wick Logic)
        // Long wick relative to body
        const body = Math.abs(c.close - c.open);
        const upperWick = c.high - Math.max(c.open, c.close);
        const lowerWick = Math.min(c.open, c.close) - c.low;
        
        if (upperWick > body * 2 && relVol > 1.2) {
            anomaly = 'Stop Hunt';
            desc = 'ذيل علوي طويل مع حجم عالٍ (صيد وقفات بيعي)';
            detectedAnomaliesSet.add('Stop Hunt');
            manipulationScore += 3;
        } else if (lowerWick > body * 2 && relVol > 1.2) {
            anomaly = 'Stop Hunt';
            desc = 'ذيل سفلي طويل مع حجم عالٍ (صيد وقفات شرائي)';
            detectedAnomaliesSet.add('Stop Hunt');
            manipulationScore += 3;
        }

        // Accumulate metrics for summary
        netFlowAccumulator += delta;
        if (c.volume > avgVolume) {
            weightedPriceSum += ((c.high + c.low) / 2) * c.volume;
            totalWeightVol += c.volume;
        }

        candleAnalysis.push({
            timestamp: c.timestamp,
            open: c.open, high: c.high, low: c.low, close: c.close,
            volume: c.volume,
            delta: delta,
            anomaly,
            description: desc,
            effortResultRatio: range > 0 ? c.volume / range : 0
        });
    });

    // Calc Zone
    let accumulationZone: { high: number, low: number, volume: number } | undefined = undefined;
    if (totalWeightVol > 0) {
        const vwapRecent = weightedPriceSum / totalWeightVol;
        accumulationZone = {
            high: vwapRecent + (atr * 0.5),
            low: vwapRecent - (atr * 0.5),
            volume: totalWeightVol
        };
    }

    // Normalize Score
    manipulationScore = Math.min(99, Math.max(10, manipulationScore + (netFlowAccumulator > 0 ? 10 : 0)));

    // Level
    let whaleActivityLevel: WhaleWatcherAnalysis['whaleActivityLevel'] = 'Low';
    if (manipulationScore > 75) whaleActivityLevel = 'Extreme';
    else if (manipulationScore > 50) whaleActivityLevel = 'High';
    else if (manipulationScore > 25) whaleActivityLevel = 'Moderate';

    // Action
    let lastWhaleAction: WhaleWatcherAnalysis['lastWhaleAction'] = undefined;
    if (detectedAnomaliesSet.has('Absorption/Churn')) lastWhaleAction = 'Hidden Accumulation';
    else if (netFlowAccumulator > 0) lastWhaleAction = 'Buying';
    else lastWhaleAction = 'Selling';

    return {
        manipulationScore,
        whaleActivityLevel,
        detectedAnomalies: Array.from(detectedAnomaliesSet),
        accumulationZone,
        summary: `نشاط ${whaleActivityLevel}. صافي الدلتا: ${netFlowAccumulator > 0 ? '+' : ''}${netFlowAccumulator.toFixed(0)}. ${detectedAnomaliesSet.size > 0 ? 'تم رصد أنماط تلاعب.' : 'حركة طبيعية.'}`,
        lastWhaleAction,
        candleAnalysis
    };
};
