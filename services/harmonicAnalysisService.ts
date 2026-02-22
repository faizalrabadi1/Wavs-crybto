
import type { Candle, HarmonicPatternAnalysis, HarmonicPoint, HarmonicRatio } from '../types';

// --- CONFIGURATION & CONSTANTS ---
const TOLERANCE = 0.10; // 10% tolerance for pattern matching

// --- UTILITY FUNCTIONS ---
const calculateRSI = (candles: Candle[], period: number): number => {
    if (candles.length < period + 1) return 50;
    const changes = [];
    for (let i = 1; i < candles.length; i++) {
        changes.push(candles[i].close - candles[i-1].close);
    }
    
    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
    
    // Simple RSI for speed
    const avgGain = gains.slice(-period).reduce((a,b) => a+b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a,b) => a+b, 0) / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const findSwingPoints = (candles: Candle[], lookback: number) => {
    const points: { type: 'high' | 'low'; price: number; index: number }[] = [];
    const window = 3; 
    
    for (let i = window; i < candles.length - window; i++) {
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;
        
        let isHigh = true;
        for (let j = 1; j <= window; j++) {
            if (candles[i-j].high > currentHigh || candles[i+j].high > currentHigh) {
                isHigh = false; break;
            }
        }
        
        let isLow = true;
        for (let j = 1; j <= window; j++) {
            if (candles[i-j].low < currentLow || candles[i+j].low < currentLow) {
                isLow = false; break;
            }
        }

        if (isHigh) points.push({ type: 'high', price: currentHigh, index: i });
        else if (isLow) points.push({ type: 'low', price: currentLow, index: i });
    }

    const filtered: { type: 'high' | 'low'; price: number; index: number }[] = [];
    for (const p of points) {
        if (filtered.length === 0) { filtered.push(p); continue; }
        const last = filtered[filtered.length - 1];
        if (last.type === p.type) {
            if (p.type === 'high' && p.price > last.price) filtered[filtered.length - 1] = p;
            else if (p.type === 'low' && p.price < last.price) filtered[filtered.length - 1] = p;
        } else { filtered.push(p); }
    }
    return filtered;
};

const getRatioScore = (actual: number, ideal: number): number => {
    const diff = Math.abs(actual - ideal);
    return Math.max(0, 100 - (diff / ideal) * 1000);
};

const isRatioMatch = (val: number, target: number, tol: number = TOLERANCE) => Math.abs(val - target) <= target * tol;
const isRatioRange = (val: number, min: number, max: number) => val >= min * (1-TOLERANCE) && val <= max * (1+TOLERANCE);

interface PatternDef {
    name: string;
    type: 'XABCD' | '5-0' | 'ABCD';
    XB?: number | [number, number];
    AC?: number | [number, number];
    BD?: number | [number, number];
    XD?: number | [number, number];
}

const PATTERNS: PatternDef[] = [
    { name: 'Gartley', type: 'XABCD', XB: 0.618, AC: [0.382, 0.886], BD: [1.272, 1.618], XD: 0.786 },
    { name: 'Bat',     type: 'XABCD', XB: [0.382, 0.50], AC: [0.382, 0.886], BD: [1.618, 2.618], XD: 0.886 },
    { name: 'Alt Bat', type: 'XABCD', XB: 0.382, AC: [0.382, 0.886], BD: [2.0, 3.618], XD: 1.13 },
    { name: 'Butterfly', type: 'XABCD', XB: 0.786, AC: [0.382, 0.886], BD: [1.618, 2.24], XD: 1.27 },
    { name: 'Crab',    type: 'XABCD', XB: [0.382, 0.618], AC: [0.382, 0.886], BD: [2.24, 3.618], XD: 1.618 },
    { name: 'Deep Crab', type: 'XABCD', XB: 0.886, AC: [0.382, 0.886], BD: [2.0, 3.618], XD: 1.618 },
    { name: 'Cypher',  type: 'XABCD', XB: [0.382, 0.618], AC: [1.13, 1.414], XD: 0.786 },
    { name: 'Shark',   type: 'XABCD', XB: 0, AC: [1.13, 1.618], XD: [0.886, 1.13] },
    { name: '5-0',     type: '5-0' },
    { name: 'AB=CD',   type: 'ABCD' }
];

export const analyzeHarmonicPattern = (candles: Candle[], pair: string, timeframe: string): HarmonicPatternAnalysis => {
    if (candles.length < 50) return { detected: false };

    const swings = findSwingPoints(candles, 5);
    if (swings.length < 6) return { detected: false };

    const currentPrice = candles[candles.length - 1].close;
    const currentIndex = candles.length - 1;

    const p0 = swings[swings.length - 1];
    const p1 = swings[swings.length - 2];
    const p2 = swings[swings.length - 3];
    const p3 = swings[swings.length - 4];
    const p4 = swings[swings.length - 5];
    const p5 = swings[swings.length - 6];

    let detectedPattern: any = null;
    let patternScore = 0;
    let points: HarmonicPoint[] = [];
    let ratios: HarmonicRatio[] = [];
    let przStart = 0, przEnd = 0;
    let projectedD = 0;
    let stopLoss = 0;
    let targets: any[] = [];
    let timeSymmetryScore = 0;
    let rsiConfirmation: HarmonicPatternAnalysis['rsiConfirmation'] = undefined;
    let entryTrigger = undefined;
    let isBammActive = false;

    // --- 1. CHECK XABCD PATTERNS ---
    if (p4 && p3 && p2 && p1) {
        const X = p4, A = p3, B = p2, C = p1;
        const XA = Math.abs(A.price - X.price);
        const AB = Math.abs(B.price - A.price);
        const BC = Math.abs(C.price - B.price);
        const XB_Ratio = AB / XA;
        const AC_Ratio = BC / AB;
        const type = X.type === 'low' ? 'Bullish' : 'Bearish';

        for (const pat of PATTERNS) {
            if (pat.type !== 'XABCD') continue;

            let validXB = false;
            if (typeof pat.XB === 'number') validXB = isRatioMatch(XB_Ratio, pat.XB, pat.name === 'Shark' ? 100 : TOLERANCE);
            else if (Array.isArray(pat.XB)) validXB = isRatioRange(XB_Ratio, pat.XB[0], pat.XB[1]);

            let validAC = false;
            if (typeof pat.AC === 'number') validAC = isRatioMatch(AC_Ratio, pat.AC);
            else if (Array.isArray(pat.AC)) validAC = isRatioRange(AC_Ratio, pat.AC[0], pat.AC[1]);

            if (validXB && validAC) {
                let d_price_xa = 0;
                let xd_ratio = typeof pat.XD === 'number' ? pat.XD : (Array.isArray(pat.XD) ? pat.XD[0] : 0.886);
                
                if (pat.name === 'Cypher') {
                    d_price_xa = X.price + (C.price - X.price) * 0.786;
                } else if (pat.name === 'Shark') {
                    d_price_xa = type === 'Bullish' ? A.price - XA * xd_ratio : A.price + XA * xd_ratio;
                } else {
                    d_price_xa = type === 'Bullish' ? A.price - XA * xd_ratio : A.price + XA * xd_ratio;
                }

                let bd_ratio = typeof pat.BD === 'number' ? pat.BD : (Array.isArray(pat.BD) ? pat.BD[0] : 1.618);
                let d_price_bc = type === 'Bullish' ? C.price - BC * bd_ratio : C.price + BC * bd_ratio;

                const D_avg = (d_price_xa + d_price_bc) / 2;
                const dist = Math.abs(currentPrice - D_avg) / D_avg;
                const validDirection = type === 'Bullish' ? currentPrice < C.price : currentPrice > C.price;

                if (validDirection && dist < 0.05) {
                    detectedPattern = pat.name;
                    projectedD = D_avg;
                    przStart = Math.min(d_price_xa, d_price_bc);
                    przEnd = Math.max(d_price_xa, d_price_bc);
                    patternScore = getRatioScore(XB_Ratio, typeof pat.XB === 'number' ? pat.XB : pat.XB![0]) + 
                                   getRatioScore(AC_Ratio, typeof pat.AC === 'number' ? pat.AC : pat.AC![0]);
                    patternScore /= 2;
                    
                    points = [
                        { leg: 'X', price: X.price, index: X.index },
                        { leg: 'A', price: A.price, index: A.index },
                        { leg: 'B', price: B.price, index: B.index },
                        { leg: 'C', price: C.price, index: C.index },
                        { leg: 'D', price: projectedD, index: currentIndex + 5 }
                    ];
                    
                    ratios = [
                        { leg: 'XB', value: XB_Ratio, status: 'Good' },
                        { leg: 'AC', value: AC_Ratio, status: 'Good' },
                        { leg: 'XD', value: Math.abs(projectedD - X.price)/XA, status: 'Good' }
                    ];

                    // --- Time Symmetry Calculation ---
                    // Ideal: Time AB = Time CD
                    const timeAB = Math.abs(B.index - A.index);
                    const timeCD = Math.abs(currentIndex - C.index); 
                    if (timeAB > 0) {
                        const diff = Math.abs(timeAB - timeCD);
                        timeSymmetryScore = Math.max(0, 100 - (diff / timeAB) * 100);
                    }

                    break;
                }
            }
        }
    }

    // --- 2. CHECK 5-0 PATTERN ---
    if (!detectedPattern && p5 && p4 && p3 && p2 && p1) {
        const Zero = p5, X = p4, A = p3, B = p2, C = p1;
        const lenXA = Math.abs(A.price - X.price);
        const len0X = Math.abs(X.price - Zero.price);
        const ratioXA = lenXA / len0X;
        const lenAB = Math.abs(B.price - A.price);
        const ratioAB = lenAB / lenXA;
        const lenBC = Math.abs(C.price - B.price);
        const ratioBC = lenBC / lenAB;

        if (isRatioRange(ratioXA, 1.13, 1.618) && isRatioRange(ratioAB, 1.618, 2.24) && isRatioMatch(ratioBC, 0.50, 0.15)) {
             const midAB = (A.price + B.price) / 2;
             if (isRatioMatch(C.price, midAB, 0.05)) {
                 detectedPattern = '5-0';
                 projectedD = C.price;
                 przStart = midAB * 0.995;
                 przEnd = midAB * 1.005;
                 patternScore = 85;
                 points = [
                     { leg: '0', price: Zero.price, index: Zero.index },
                     { leg: 'X', price: X.price, index: X.index },
                     { leg: 'A', price: A.price, index: A.index },
                     { leg: 'B', price: B.price, index: B.index },
                     { leg: 'C', price: C.price, index: C.index }
                 ];
                 ratios = [
                     { leg: 'XA', value: ratioXA, status: 'Good' },
                     { leg: 'AB', value: ratioAB, status: 'Good' },
                     { leg: 'BC', value: ratioBC, status: 'Perfect' }
                 ];
             }
        }
    }

    // --- 3. CHECK AB=CD ---
    if (!detectedPattern && p3 && p2 && p1) {
        const A = p3, B = p2, C = p1;
        const AB = Math.abs(B.price - A.price);
        const BC = Math.abs(C.price - B.price);
        const ratioAC = BC / AB;
        
        if (isRatioMatch(ratioAC, 0.618) || isRatioMatch(ratioAC, 0.786) || isRatioMatch(ratioAC, 0.50) || isRatioMatch(ratioAC, 0.382)) {
            const isBullishABCD = A.price > B.price && C.price < A.price && C.price > B.price;
            projectedD = isBullishABCD ? C.price - AB : C.price + AB;
            const timeAB = Math.abs(B.index - A.index);
            detectedPattern = isBullishABCD ? 'Bullish AB=CD' : 'Bearish AB=CD';
            przStart = projectedD * 0.998;
            przEnd = projectedD * 1.002;
            patternScore = 80;
            points = [
                { leg: 'A', price: A.price, index: A.index },
                { leg: 'B', price: B.price, index: B.index },
                { leg: 'C', price: C.price, index: C.index },
                { leg: 'D', price: projectedD, index: C.index + timeAB }
            ];
            ratios = [{ leg: 'AC', value: ratioAC, status: 'Good' }, { leg: 'AB=CD', value: 1.0, status: 'Projected' }];
            
            // Time Symmetry for AB=CD
            const timeCD = Math.abs(currentIndex - C.index);
            if (timeAB > 0) {
                timeSymmetryScore = Math.max(0, 100 - (Math.abs(timeAB - timeCD) / timeAB) * 100);
            }
        }
    }

    if (!detectedPattern) return { detected: false };

    const isBullish = detectedPattern.includes('Bullish') || (points.length > 0 && points[0].price < points[1].price === false);
    const rangeAD = Math.abs(projectedD - points[points.length-3].price);
    targets = [
        { level: '0.382', price: projectedD + (isBullish ? rangeAD * 0.382 : -rangeAD * 0.382) },
        { level: '0.618', price: projectedD + (isBullish ? rangeAD * 0.618 : -rangeAD * 0.618) }
    ];
    stopLoss = isBullish ? przStart * 0.99 : przEnd * 1.01;

    // --- NEW: RSI Confirmation & BAMM ---
    const rsiVal = calculateRSI(candles, 14);
    if (isBullish) {
        if (rsiVal < 30) rsiConfirmation = { status: 'Oversold', value: rsiVal };
        else rsiConfirmation = { status: 'Neutral', value: rsiVal };
        // BAMM: Price in PRZ + RSI Oversold
        if (rsiVal < 35 && currentPrice >= przStart && currentPrice <= przEnd * 1.01) isBammActive = true;
    } else {
        if (rsiVal > 70) rsiConfirmation = { status: 'Overbought', value: rsiVal };
        else rsiConfirmation = { status: 'Neutral', value: rsiVal };
        // BAMM: Price in PRZ + RSI Overbought
        if (rsiVal > 65 && currentPrice <= przEnd && currentPrice >= przStart * 0.99) isBammActive = true;
    }

    // --- NEW: Entry Trigger Check (Candle Patterns in PRZ) ---
    const lastCandle = candles[candles.length-1];
    const prevCandle = candles[candles.length-2];
    const isInPRZ = currentPrice >= przStart * 0.995 && currentPrice <= przEnd * 1.005;
    
    if (isInPRZ) {
        const body = Math.abs(lastCandle.close - lastCandle.open);
        const isGreen = lastCandle.close > lastCandle.open;
        
        if (isBullish) {
            if (isGreen && lastCandle.close > prevCandle.high) entryTrigger = 'Bullish Engulfing';
            else if (isGreen && (lastCandle.open - lastCandle.low) > body * 2) entryTrigger = 'Hammer';
        } else {
            if (!isGreen && lastCandle.close < prevCandle.low) entryTrigger = 'Bearish Engulfing';
            else if (!isGreen && (lastCandle.high - lastCandle.close) > body * 2) entryTrigger = 'Shooting Star';
        }
    }

    return {
        detected: true,
        patternName: detectedPattern,
        points,
        ratios,
        potentialReversalZone: { start: przStart, end: przEnd, density: [] },
        targets,
        stopLoss,
        hsiScore: patternScore,
        summary: `تم رصد نموذج ${detectedPattern} مع احتمالية انعكاس.`,
        executionType: patternScore > 80 ? 'Type-1 (Reversal)' : 'Type-2 (Continuation)',
        timeSymmetryScore,
        rsiConfirmation,
        entryTrigger,
        isBammActive
    };
};
