
import type { Candle, DiverseStrategiesAnalysis, DiverseStrategyResult, StrategyMetric } from '../types';

// --- Internal Technical Indicator Helpers ---

const calculateSMA = (data: number[], period: number): number[] => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(NaN);
            continue;
        }
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
};

const calculateEMA = (data: number[], period: number): number[] => {
    const ema = [];
    const k = 2 / (period + 1);
    
    // Start with SMA
    const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            ema.push(i === period - 1 ? firstSMA : NaN);
        } else {
            ema.push(data[i] * k + ema[i - 1] * (1 - k));
        }
    }
    return ema;
};

const calculateRSI = (candles: Candle[], period: number): number[] => {
    const rsi = [];
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < candles.length; i++) {
        const change = candles[i].close - candles[i-1].close;
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Need at least period data points
    let avgGain = gains.slice(0, period).reduce((a,b)=>a+b,0) / period;
    let avgLoss = losses.slice(0, period).reduce((a,b)=>a+b,0) / period;
    
    // Initial fill
    for(let i=0; i<period; i++) rsi.push(NaN);
    
    rsi.push(100 - (100 / (1 + avgGain/avgLoss)));
    
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi; // length is candles.length - 1 (roughly aligned)
};

const calculateBollingerBands = (candles: Candle[], period: number, stdDevMult: number) => {
    const closes = candles.map(c => c.close);
    const sma = calculateSMA(closes, period);
    const bands = [];
    
    for (let i = 0; i < closes.length; i++) {
        if (isNaN(sma[i])) {
            bands.push({ upper: NaN, lower: NaN, middle: NaN });
            continue;
        }
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        bands.push({
            middle: mean,
            upper: mean + (stdDev * stdDevMult),
            lower: mean - (stdDev * stdDevMult)
        });
    }
    return bands;
};

const calculateADX = (candles: Candle[], period: number) => {
    // Simplified ADX calculation
    const tr = [];
    const dmPlus = [];
    const dmMinus = [];
    
    for(let i=1; i<candles.length; i++) {
        const h = candles[i].high;
        const l = candles[i].low;
        const cPrev = candles[i-1].close;
        const hPrev = candles[i-1].high;
        const lPrev = candles[i-1].low;
        
        tr.push(Math.max(h-l, Math.abs(h-cPrev), Math.abs(l-cPrev)));
        
        const moveUp = h - hPrev;
        const moveDown = lPrev - l;
        
        dmPlus.push(moveUp > moveDown && moveUp > 0 ? moveUp : 0);
        dmMinus.push(moveDown > moveUp && moveDown > 0 ? moveDown : 0);
    }
    
    // Smooth
    const smoothTR = calculateEMA(tr, period); // Using EMA instead of Wilders for simplicity/speed
    const smoothPlus = calculateEMA(dmPlus, period);
    const smoothMinus = calculateEMA(dmMinus, period);
    
    const adxValues = [];
    const diPlusValues = [];
    const diMinusValues = [];

    for(let i=0; i<smoothTR.length; i++) {
        if (!smoothTR[i]) {
            adxValues.push(NaN); diPlusValues.push(NaN); diMinusValues.push(NaN);
            continue;
        }
        const dip = (smoothPlus[i] / smoothTR[i]) * 100;
        const dim = (smoothMinus[i] / smoothTR[i]) * 100;
        const dx = (Math.abs(dip - dim) / (dip + dim)) * 100;
        
        diPlusValues.push(dip);
        diMinusValues.push(dim);
        adxValues.push(dx); // Should smooth DX to get ADX, but DX often used as proxy in rapid algos
    }
    
    // Smooth DX to get final ADX
    const finalADX = calculateEMA(adxValues.filter(v => !isNaN(v)), period);
    
    // Padding to match array lengths is tricky, we'll just return the last values
    return {
        adx: finalADX,
        diPlus: diPlusValues.filter(v => !isNaN(v)),
        diMinus: diMinusValues.filter(v => !isNaN(v))
    };
};

const calculateCCI = (candles: Candle[], period: number) => {
    const tp = candles.map(c => (c.high + c.low + c.close) / 3);
    const smaTP = calculateSMA(tp, period);
    const cci = [];
    
    for(let i=0; i<tp.length; i++) {
        if(isNaN(smaTP[i])) {
            cci.push(NaN); continue;
        }
        const slice = tp.slice(i - period + 1, i + 1);
        const meanDev = slice.reduce((acc, val) => acc + Math.abs(val - smaTP[i]), 0) / period;
        
        cci.push(meanDev === 0 ? 0 : (tp[i] - smaTP[i]) / (0.015 * meanDev));
    }
    return cci;
};

const calculateMomentum = (candles: Candle[], period: number) => {
    const mom = [];
    for(let i=period; i<candles.length; i++) {
        mom.push((candles[i].close / candles[i-period].close) * 100);
    }
    return mom;
};

const calculateMACD = (candles: Candle[]) => {
    const closes = candles.map(c => c.close);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMA(macdLine.filter(v => !isNaN(v)), 9); // This alignment is simplified
    return { macd: macdLine, signal: signalLine }; // Note: arrays might have different padding
}

// --- STRATEGY IMPLEMENTATIONS ---

const analyzeBBScalping = (candles: Candle[]): DiverseStrategyResult => {
    const bb = calculateBollingerBands(candles, 20, 2);
    const rsi = calculateRSI(candles, 7);
    const adxData = calculateADX(candles, 14);
    
    const lastIdx = candles.length - 1;
    const c = candles[lastIdx];
    const b = bb[lastIdx];
    const r = rsi[rsi.length - 1];
    const a = adxData.adx[adxData.adx.length - 1];

    let signal: DiverseStrategyResult['signal'] = 'Neutral';
    let strength = 0;
    let reasoning = '';

    if (b && r && a) {
        // Buy Logic
        if (c.low <= b.lower && r < 30 && a < 30) {
            signal = 'Buy';
            strength = 85;
            reasoning = "ملامسة للحد السفلي للبولنجر مع تشبع بيعي (RSI < 30) وضعف في الاتجاه (ADX < 30).";
        }
        // Sell Logic
        else if (c.high >= b.upper && r > 70 && a < 30) {
            signal = 'Sell';
            strength = 85;
            reasoning = "ملامسة للحد العلوي للبولنجر مع تشبع شرائي (RSI > 70) وضعف في الاتجاه (ADX < 30).";
        } else {
            reasoning = "لا توجد إشارات سكالبينغ واضحة. السوق قد يكون في ترند قوي أو في منتصف النطاق.";
        }
    }

    return {
        id: 'bb_scalping',
        name: 'خطف النقاط (BB Scalping)',
        signal,
        strength,
        reasoning,
        metrics: [
            { label: 'RSI (7)', value: r?.toFixed(2) || 'N/A', isConditionMet: r < 30 || r > 70 },
            { label: 'ADX (14)', value: a?.toFixed(2) || 'N/A', isConditionMet: a < 30 },
            { label: 'Price vs BB', value: c.close > b.upper ? 'Above Upper' : c.close < b.lower ? 'Below Lower' : 'Inside', isConditionMet: c.low <= b.lower || c.high >= b.upper }
        ],
        timeframeRecommendation: '5m - 15m'
    };
};

const analyzeADXMomentum = (candles: Candle[]): DiverseStrategyResult => {
    const adxData = calculateADX(candles, 14);
    const mom = calculateMomentum(candles, 14);
    
    const lastADX = adxData.adx[adxData.adx.length - 1];
    const lastDIPlus = adxData.diPlus[adxData.diPlus.length - 1];
    const lastDIMinus = adxData.diMinus[adxData.diMinus.length - 1];
    const lastMom = mom[mom.length - 1];
    
    let signal: DiverseStrategyResult['signal'] = 'Neutral';
    let strength = 0;
    let reasoning = '';

    if (lastADX > 25) {
        if (lastDIPlus > lastDIMinus && lastMom > 100) {
            signal = 'Buy';
            strength = 90;
            reasoning = "ترند قوي (ADX > 25) مع سيطرة المشترين (DI+ > DI-) وزخم إيجابي (Momentum > 100).";
        } else if (lastDIMinus > lastDIPlus && lastMom < 100) {
            signal = 'Sell';
            strength = 90;
            reasoning = "ترند قوي (ADX > 25) مع سيطرة البائعين (DI- > DI+) وزخم سلبي (Momentum < 100).";
        } else {
            reasoning = "الترند قوي ولكن الزخم أو اتجاه السيولة غير متوافق.";
        }
    } else {
        reasoning = "الاتجاه ضعيف (ADX < 25). الاستراتيجية تتطلب ترند قوي.";
    }

    return {
        id: 'adx_momentum',
        name: 'الزخم القوي (ADX Momentum)',
        signal,
        strength,
        reasoning,
        metrics: [
            { label: 'ADX', value: lastADX?.toFixed(2) || 'N/A', isConditionMet: lastADX > 25 },
            { label: 'DI+ / DI-', value: `${lastDIPlus?.toFixed(1)} / ${lastDIMinus?.toFixed(1)}`, isConditionMet: Math.abs(lastDIPlus - lastDIMinus) > 5 },
            { label: 'Momentum', value: lastMom?.toFixed(2) || 'N/A', isConditionMet: signal === 'Buy' ? lastMom > 100 : lastMom < 100 }
        ],
        timeframeRecommendation: '5m - 15m'
    };
};

const analyzeTrendScalping = (candles: Candle[]): DiverseStrategyResult => {
    const closes = candles.map(c => c.close);
    const ema10 = calculateEMA(closes, 10);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const cci = calculateCCI(candles, 200);
    
    const lastIdx = candles.length - 1;
    const e10 = ema10[lastIdx];
    const e21 = ema21[lastIdx];
    const e50 = ema50[lastIdx];
    const cVal = cci[cci.length - 1];
    const currentPrice = candles[lastIdx].close;

    let signal: DiverseStrategyResult['signal'] = 'Neutral';
    let strength = 0;
    let reasoning = '';

    if (e10 && e21 && e50 && cVal) {
        if (cVal > 0 && e10 > e21 && e21 > e50 && candles[lastIdx].low > e50) {
            signal = 'Buy';
            strength = 80;
            reasoning = "ترتيب إيجابي للمتوسطات (10>21>50) و CCI فوق الصفر، السعر يحترم EMA 50.";
        } else if (cVal < 0 && e10 < e21 && e21 < e50 && candles[lastIdx].high < e50) {
            signal = 'Sell';
            strength = 80;
            reasoning = "ترتيب سلبي للمتوسطات (10<21<50) و CCI تحت الصفر، السعر أدنى EMA 50.";
        } else {
            reasoning = "المتوسطات غير مرتبة بشكل مثالي أو أن CCI يعطي إشارة معاكسة.";
        }
    }

    return {
        id: 'trend_scalping',
        name: 'سكالبينغ المتوسطات (Trend Scalping)',
        signal,
        strength,
        reasoning,
        metrics: [
            { label: 'EMA Arrangement', value: signal === 'Buy' ? '10>21>50' : signal === 'Sell' ? '10<21<50' : 'Mixed', isConditionMet: signal !== 'Neutral' },
            { label: 'CCI (200)', value: cVal?.toFixed(2) || 'N/A', isConditionMet: signal === 'Buy' ? cVal > 0 : cVal < 0 },
            { label: 'Price vs EMA50', value: currentPrice > e50 ? 'Above' : 'Below', isConditionMet: true }
        ],
        timeframeRecommendation: '5m'
    };
};

const analyzeDualOscillators = (candles: Candle[]): DiverseStrategyResult => {
    const { macd, signal: macdSignal } = calculateMACD(candles);
    const cci = calculateCCI(candles, 14);
    
    // Align arrays (MACD calc produces fewer results)
    const lastMacd = macd[macd.length - 1];
    const lastSignal = macdSignal[macdSignal.length - 1];
    const lastCCI = cci[cci.length - 1];
    
    const prevMacd = macd[macd.length - 2];
    const prevSignal = macdSignal[macdSignal.length - 2];

    let signal: DiverseStrategyResult['signal'] = 'Neutral';
    let strength = 0;
    let reasoning = '';

    const crossUp = prevMacd < prevSignal && lastMacd > lastSignal;
    const crossDown = prevMacd > prevSignal && lastMacd < lastSignal;
    
    // Check if cross happened recently (within last 3 candles) to allow some lag
    const macdCrossUpRecent = crossUp || (macd[macd.length-3] < macdSignal[macdSignal.length-3] && macd[macd.length-2] > macdSignal[macdSignal.length-2]);

    if (lastCCI && lastMacd) {
        if (lastMacd > lastSignal && lastCCI > 100) {
            signal = 'Buy';
            strength = 88;
            reasoning = "تقاطع MACD إيجابي مع اختراق CCI لمستوى 100 (زخم قوي).";
        } else if (lastMacd < lastSignal && lastCCI < -100) {
            signal = 'Sell';
            strength = 88;
            reasoning = "تقاطع MACD سلبي مع كسر CCI لمستوى -100 (ضغط بيعي قوي).";
        } else {
            reasoning = "ننتظر توافق إشارة الماكدي مع اختراق مستويات 100/-100 في CCI.";
        }
    }

    return {
        id: 'dual_osc',
        name: 'المذبذبات المزدوجة (MACD + CCI)',
        signal,
        strength,
        reasoning,
        metrics: [
            { label: 'MACD Hist', value: (lastMacd - lastSignal).toFixed(4), isConditionMet: Math.abs(lastMacd - lastSignal) > 0 },
            { label: 'CCI (14)', value: lastCCI?.toFixed(2) || 'N/A', isConditionMet: Math.abs(lastCCI) > 100 }
        ],
        timeframeRecommendation: '5m - 1h'
    };
};

const analyzeMidnightBreakout = (candles: Candle[]): DiverseStrategyResult => {
    // This usually requires Daily candles context, but we act on the passed candles.
    // We'll simulate the logic: Check trend via EMA24, check breakout of previous high/low.
    const closes = candles.map(c => c.close);
    const ema24 = calculateEMA(closes, 24);
    
    const lastIdx = candles.length - 1;
    const currentPrice = candles[lastIdx].close;
    const e24 = ema24[lastIdx];
    const prevCandle = candles[lastIdx - 1];
    
    // ATR for volatility context
    const trs = [];
    for(let i=1; i<candles.length; i++) trs.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i-1].close)));
    const atr = trs.slice(-14).reduce((a,b)=>a+b,0)/14;

    let signal: DiverseStrategyResult['signal'] = 'Neutral';
    let strength = 0;
    let reasoning = '';

    if (e24) {
        if (currentPrice > e24) {
            if (currentPrice > prevCandle.high) {
                signal = 'Buy';
                strength = 75;
                reasoning = "السعر فوق EMA 24 (ترند صاعد) وكسر قمة الشمعة السابقة.";
            } else {
                reasoning = "السعر في ترند صاعد (فوق EMA 24) لكنه لم يكسر قمة الشمعة السابقة للدخول.";
            }
        } else if (currentPrice < e24) {
             if (currentPrice < prevCandle.low) {
                signal = 'Sell';
                strength = 75;
                reasoning = "السعر تحت EMA 24 (ترند هابط) وكسر قاع الشمعة السابقة.";
            } else {
                reasoning = "السعر في ترند هابط (تحت EMA 24) لكنه لم يكسر قاع الشمعة السابقة.";
            }
        }
    }

    return {
        id: 'midnight_breakout',
        name: 'الاختراق اليومي (Daily/Hourly Breakout)',
        signal,
        strength,
        reasoning,
        metrics: [
            { label: 'Price vs EMA24', value: currentPrice > e24 ? 'Above' : 'Below', isConditionMet: true },
            { label: 'Breakout Status', value: currentPrice > prevCandle.high ? 'High Broken' : currentPrice < prevCandle.low ? 'Low Broken' : 'Inside', isConditionMet: signal !== 'Neutral' },
            { label: 'ATR', value: atr.toFixed(2), isConditionMet: true }
        ],
        timeframeRecommendation: '1h - 4h'
    };
};

export const analyzeDiverseStrategies = (candles: Candle[]): DiverseStrategiesAnalysis => {
    if (candles.length < 200) {
        return { strategies: [], summary: "بيانات غير كافية لتحليل الاستراتيجيات." };
    }

    const strategies: DiverseStrategyResult[] = [
        analyzeBBScalping(candles),
        analyzeADXMomentum(candles),
        analyzeTrendScalping(candles),
        analyzeDualOscillators(candles),
        analyzeMidnightBreakout(candles)
    ];

    const activeBuy = strategies.filter(s => s.signal === 'Buy').length;
    const activeSell = strategies.filter(s => s.signal === 'Sell').length;
    
    let summary = "لا توجد إشارات قوية موحدة حالياً.";
    if (activeBuy > activeSell && activeBuy >= 2) {
        summary = `هناك ${activeBuy} استراتيجيات تعطي إشارة شراء، مما يعزز احتمالية الصعود.`;
    } else if (activeSell > activeBuy && activeSell >= 2) {
        summary = `هناك ${activeSell} استراتيجيات تعطي إشارة بيع، الحذر من الهبوط.`;
    }

    return { strategies, summary };
};
