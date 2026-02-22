
import type { Candle, LiquidationMap, LiquidationLevel, PivotPoints, SessionStatus, FlashCrashRisk } from '../types';

// --- 1. Liquidation Map Generator ---

// Simulates liquidation levels based on recent swing points and leverage logic.
// Short liquidations are ABOVE price (Buy Stops).
// Long liquidations are BELOW price (Sell Stops).
export const generateLiquidationMap = (candles: Candle[], currentPrice: number): LiquidationMap => {
    const levels: LiquidationLevel[] = [];
    
    // Analyze last 100 candles for swing highs and lows
    const lookback = 100;
    const recentCandles = candles.slice(-lookback);
    
    // Find local extrema
    const highs = [];
    const lows = [];
    for (let i = 5; i < recentCandles.length - 5; i++) {
        const slice = recentCandles.slice(i - 5, i + 5);
        const c = recentCandles[i];
        const max = Math.max(...slice.map(x => x.close));
        const min = Math.min(...slice.map(x => x.close));
        if (c.close === max) highs.push(c.close);
        if (c.close === min) lows.push(c.close);
    }

    // Generate SHORT Liquidations (Above Price)
    // Logic: Traders shorted at local highs. Their liquidation price depends on leverage.
    // 100x -> +0.8-1% move. 50x -> +1.8-2% move. 25x -> +3.8-4% move.
    highs.forEach(high => {
        if (high > currentPrice * 0.98) { // Only consider relevant highs
            // 100x Short Liq
            levels.push({ price: high * 1.008, volume: Math.random() * 500000, leverageTier: '100x', type: 'Short' });
            // 50x Short Liq
            levels.push({ price: high * 1.018, volume: Math.random() * 1500000, leverageTier: '50x', type: 'Short' });
            // 25x Short Liq
            levels.push({ price: high * 1.038, volume: Math.random() * 3000000, leverageTier: '25x', type: 'Short' });
        }
    });

    // Generate LONG Liquidations (Below Price)
    // Logic: Traders longed at local lows.
    // 100x -> -0.8-1% move. 50x -> -1.8-2% move. 25x -> -3.8-4% move.
    lows.forEach(low => {
        if (low < currentPrice * 1.02) {
             // 100x Long Liq
             levels.push({ price: low * 0.992, volume: Math.random() * 500000, leverageTier: '100x', type: 'Long' });
             // 50x Long Liq
             levels.push({ price: low * 0.982, volume: Math.random() * 1500000, leverageTier: '50x', type: 'Long' });
             // 25x Long Liq
             levels.push({ price: low * 0.962, volume: Math.random() * 3000000, leverageTier: '25x', type: 'Long' });
        }
    });

    // Consolidate nearby levels into clusters
    const clusters: { price: number, intensity: 'High' | 'Medium' | 'Low', type: 'Long' | 'Short', volume: number }[] = [];
    const threshold = currentPrice * 0.003; // 0.3% clustering distance

    levels.sort((a, b) => a.price - b.price);

    let currentCluster: any = null;
    levels.forEach(lvl => {
        if (!currentCluster) {
            currentCluster = { ...lvl, count: 1 };
        } else if (Math.abs(lvl.price - currentCluster.price) < threshold && lvl.type === currentCluster.type) {
            // Merge
            currentCluster.volume += lvl.volume;
            currentCluster.price = (currentCluster.price * currentCluster.count + lvl.price) / (currentCluster.count + 1);
            currentCluster.count++;
        } else {
            // Push and reset
            clusters.push(currentCluster);
            currentCluster = { ...lvl, count: 1 };
        }
    });
    if (currentCluster) clusters.push(currentCluster);

    // Clean up clusters
    const finalClusters = clusters
        .filter(c => c.volume > 1000000) // Filter noise
        .map(c => ({
            price: c.price,
            type: c.type,
            intensity: c.volume > 10000000 ? 'High' : c.volume > 4000000 ? 'Medium' : 'Low'
        })) as any; // Casting to match interface

    const summary = `تم رصد ${finalClusters.filter((c: any) => c.type === 'Short').length} مناطق تصفية للبائعين (Shorts) و ${finalClusters.filter((c: any) => c.type === 'Long').length} مناطق تصفية للمشترين (Longs).`;

    return {
        levels,
        clusters: finalClusters,
        summary
    };
};

// --- 2. Pivot Points Calculator ---

export const calculatePivotPoints = (candles: Candle[]): PivotPoints => {
    // We need the previous period's High, Low, Close.
    // Assuming candles are passed for a timeframe, we'll approximate "Daily" pivots 
    // by looking at the last 24 hours (assuming 1h candles or similar).
    // For simplicity in this simulation, we take the High/Low/Close of the last complete 50 candles range as "Previous Period".
    
    const recent = candles.slice(-50, -1); // Exclude current candle
    const impliedHigh = Math.max(...recent.map(c => c.close * 1.002));
    const impliedLow = Math.min(...recent.map(c => c.close * 0.998));
    const close = recent[recent.length - 1].close;

    const P = (impliedHigh + impliedLow + close) / 3;

    // Classic
    const classic = {
        P,
        R1: 2 * P - impliedLow,
        S1: 2 * P - impliedHigh,
        R2: P + (impliedHigh - impliedLow),
        S2: P - (impliedHigh - impliedLow),
        R3: impliedHigh + 2 * (P - impliedLow),
        S3: impliedLow - 2 * (impliedHigh - P)
    };

    // Fibonacci
    const range = impliedHigh - impliedLow;
    const fibonacci = {
        P,
        R1: P + range * 0.382,
        S1: P - range * 0.382,
        R2: P + range * 0.618,
        S2: P - range * 0.618,
        R3: P + range * 1.0,
        S3: P - range * 1.0
    };

    // Camarilla
    const camarilla = {
        P,
        R3: close + range * 1.1 / 4,
        R4: close + range * 1.1 / 2,
        S3: close - range * 1.1 / 4,
        S4: close - range * 1.1 / 2,
        // Fill others approximately
        R1: close + range * 1.1 / 12,
        R2: close + range * 1.1 / 6,
        S1: close - range * 1.1 / 12,
        S2: close - range * 1.1 / 6,
    };

    return { classic, fibonacci, camarilla };
};

// --- 3. Session Status ---

export const calculateSessionStatus = (): SessionStatus => {
    const now = new Date();
    const utcHour = now.getUTCHours();

    let currentSession: SessionStatus['currentSession'] = 'Overlap';
    let nextSessionName = '';
    let timeToNext = '';
    let killZoneActive = false;

    // Simplified Session Logic (UTC)
    // Tokyo: 00:00 - 09:00
    // London: 07:00 - 16:00
    // NY: 12:00 - 21:00
    
    if (utcHour >= 0 && utcHour < 7) {
        currentSession = 'Asian';
        nextSessionName = 'London';
        timeToNext = `${7 - utcHour}h`;
    } else if (utcHour >= 7 && utcHour < 12) {
        currentSession = 'London';
        nextSessionName = 'New York';
        timeToNext = `${12 - utcHour}h`;
        // London Killzone: 07:00 - 10:00
        if (utcHour >= 7 && utcHour <= 10) killZoneActive = true;
    } else if (utcHour >= 12 && utcHour < 16) {
        currentSession = 'Overlap'; // London + NY
        nextSessionName = 'NY Close';
        timeToNext = `${21 - utcHour}h`;
        // NY Killzone: 12:00 - 15:00
        if (utcHour >= 12 && utcHour <= 15) killZoneActive = true;
    } else if (utcHour >= 16 && utcHour < 21) {
        currentSession = 'New York';
        nextSessionName = 'Asian';
        timeToNext = `${24 - utcHour}h`;
    } else {
        currentSession = 'Asian'; // Late NY/Asian open
        nextSessionName = 'London';
        timeToNext = `${7 + (24 - utcHour)}h`;
    }

    // Weekend check
    const day = now.getUTCDay();
    if (day === 0 || day === 6) {
        currentSession = 'Weekend';
        killZoneActive = false;
    }

    return {
        currentSession,
        isActive: true,
        nextSessionName,
        timeToNext,
        killZoneActive
    };
};

// --- 4. Numerology Calculator (New Feature) ---
export const calculateNumerology = (pair: string): { number: number, meaning: string, color: string } => {
    const cleanName = pair.replace(/[^a-zA-Z]/g, '').toUpperCase();
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
        sum += cleanName.charCodeAt(i) - 64; // A=1, B=2...
    }
    
    // Reduce to single digit (1-9)
    while (sum > 9) {
        sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
    }
    
    // Master numbers check (simplified)
    const meanings: {[key: number]: {m: string, c: string}} = {
        1: { m: "البدايات، القيادة، الاستقلال", c: "text-red-400" },
        2: { m: "التوازن، الشراكة، الازدواجية", c: "text-orange-400" },
        3: { m: "الإبداع، التواصل، النمو", c: "text-yellow-400" },
        4: { m: "الاستقرار، النظام، البناء", c: "text-green-400" },
        5: { m: "التغيير، الحرية، عدم الاستقرار", c: "text-blue-400" },
        6: { m: "المسؤولية، الحماية، الانسجام", c: "text-indigo-400" },
        7: { m: "التحليل، الحكمة، الغموض", c: "text-purple-400" },
        8: { m: "القوة، المال، النجاح المادي", c: "text-pink-400" },
        9: { m: "الاكتمال، النهاية، الإنسانية", c: "text-gray-200" }
    };

    return { number: sum, meaning: meanings[sum].m, color: meanings[sum].c };
};

// --- 5. Flash Crash Risk Calculator (New Feature) ---
export const calculateFlashCrashRisk = (candles: Candle[]): FlashCrashRisk => {
    if (candles.length < 50) return { probability: 0, level: 'Low', description: 'Insufficient data' };
    
    const recent = candles.slice(-20);
    
    // 1. Volatility Expansion
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const ranges = highs.map((h, i) => h - lows[i]);
    const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const lastRange = ranges[ranges.length - 1];
    const volExpansion = lastRange / avgRange;

    // 2. Liquidity Thinness (Volume / Range ratio drop)
    const lastVol = recent[recent.length - 1].volume;
    const volPerPip = lastRange > 0 ? lastVol / lastRange : 0;
    const avgVolPerPip = recent.slice(0, -1).reduce((sum, c, i) => {
        const r = ranges[i];
        return sum + (r > 0 ? c.volume / r : 0);
    }, 0) / (recent.length - 1);
    const liquidityThinness = avgVolPerPip / (volPerPip || 1);

    // 3. Acceleration
    const closes = recent.map(c => c.close);
    const mom1 = closes[closes.length-1] - closes[closes.length-2];
    const mom2 = closes[closes.length-2] - closes[closes.length-3];
    const acceleration = Math.abs(mom1) > Math.abs(mom2) * 1.5;

    let riskScore = 10;
    if (volExpansion > 2.5) riskScore += 40;
    if (liquidityThinness > 3) riskScore += 30;
    if (acceleration) riskScore += 20;

    let level: FlashCrashRisk['level'] = 'Low';
    let desc = "استقرار نسبي في السيولة.";
    
    if (riskScore > 80) {
        level = 'Critical';
        desc = "خطر شديد! توسع في النطاق مع انخفاض كثافة السيولة.";
    } else if (riskScore > 50) {
        level = 'High';
        desc = "تحذير: تقلبات حادة قد تؤدي لانزلاقات سعرية.";
    } else if (riskScore > 30) {
        level = 'Moderate';
        desc = "بعض الهشاشة في دفتر الأوامر.";
    }

    return { probability: riskScore, level, description: desc };
};
