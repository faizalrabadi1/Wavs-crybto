
import type { Candle, TechnicalPatternsAnalysis, ChartPattern, CandlestickPattern, PatternPoint } from '../types';

// --- Helper: Find Pivot Points ---
interface Pivot {
    index: number;
    price: number;
    type: 'High' | 'Low';
}

const findPivots = (candles: Candle[], lookback: number = 5): Pivot[] => {
    const pivots: Pivot[] = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
        const slice = candles.slice(i - lookback, i + lookback + 1);
        const high = candles[i].high;
        const low = candles[i].low;
        
        const isHigh = slice.every(c => c.high <= high);
        const isLow = slice.every(c => c.low >= low);
        
        if (isHigh) pivots.push({ index: i, price: high, type: 'High' });
        else if (isLow) pivots.push({ index: i, price: low, type: 'Low' }); // Prioritize High if both (unlikely)
    }
    return pivots;
};

// --- Helper: Calculate Slope ---
const calculateSlope = (p1: Pivot, p2: Pivot) => (p2.price - p1.price) / (p2.index - p1.index);

// --- Pattern Logic: Triangles, Wedges, Rectangles ---
const detectChartPattern = (candles: Candle[], pivots: Pivot[]): ChartPattern | undefined => {
    if (pivots.length < 4) return undefined;

    const lastPivots = pivots.slice(-6); // Look at last few pivots
    const highs = lastPivots.filter(p => p.type === 'High');
    const lows = lastPivots.filter(p => p.type === 'Low');

    if (highs.length < 2 || lows.length < 2) return undefined;

    const lastHigh = highs[highs.length - 1];
    const prevHigh = highs[highs.length - 2];
    const lastLow = lows[lows.length - 1];
    const prevLow = lows[lows.length - 2];

    const resSlope = calculateSlope(prevHigh, lastHigh);
    const supSlope = calculateSlope(prevLow, lastLow);
    const currentPrice = candles[candles.length - 1].close;

    // Identify Pattern based on Slopes
    // Flat slope threshold
    const FLAT = 0.0005 * currentPrice; 

    let name = '';
    let type: ChartPattern['type'] = 'Neutral';
    let status: ChartPattern['status'] = 'Forming';
    let target = 0;
    let stop = 0;
    let confidence = 0;

    // 1. Symmetrical Triangle (Converging)
    if (resSlope < -FLAT && supSlope > FLAT) {
        name = 'Symmetrical Triangle';
        // Breakout direction usually follows prior trend, but can be neutral till breakout
        type = 'Neutral'; 
        confidence = 70;
        // Target is height of base projected from breakout
        const height = Math.abs(prevHigh.price - prevLow.price);
        target = currentPrice + height; // Placeholder
    }
    // 2. Ascending Triangle (Flat Top, Rising Bottom)
    else if (Math.abs(resSlope) < FLAT && supSlope > FLAT) {
        name = 'Ascending Triangle';
        type = 'Bullish';
        confidence = 75;
        const height = Math.abs(prevHigh.price - prevLow.price);
        target = prevHigh.price + height;
        stop = lastLow.price;
    }
    // 3. Descending Triangle (Falling Top, Flat Bottom)
    else if (resSlope < -FLAT && Math.abs(supSlope) < FLAT) {
        name = 'Descending Triangle';
        type = 'Bearish';
        confidence = 75;
        const height = Math.abs(prevHigh.price - prevLow.price);
        target = prevLow.price - height;
        stop = lastHigh.price;
    }
    // 4. Falling Wedge (Both down, top steeper)
    else if (resSlope < -FLAT && supSlope < -FLAT && resSlope < supSlope) {
        name = 'Falling Wedge';
        type = 'Bullish';
        confidence = 80;
        target = prevHigh.price; // Returns to start of wedge
        stop = lastLow.price * 0.99;
    }
    // 5. Rising Wedge (Both up, bottom steeper)
    else if (resSlope > FLAT && supSlope > FLAT && supSlope > resSlope) {
        name = 'Rising Wedge';
        type = 'Bearish';
        confidence = 80;
        target = prevLow.price;
        stop = lastHigh.price * 1.01;
    }
    // 6. Rectangle / Channel
    else if (Math.abs(resSlope) < FLAT && Math.abs(supSlope) < FLAT) {
        name = 'Rectangle';
        type = 'Neutral';
        confidence = 60;
    }
    // 7. Bull Flag (Sharp move up then small consolidation)
    // Simplified check: Look for strong prior move
    else {
        const priorMove = candles[prevHigh.index].close - candles[Math.max(0, prevHigh.index - 10)].close;
        if (priorMove > currentPrice * 0.03 && resSlope < 0 && supSlope < 0) {
             name = 'Bull Flag';
             type = 'Bullish';
             confidence = 85;
             target = currentPrice + priorMove; // Pole projection
             stop = lastLow.price;
        }
    }

    if (!name) return undefined;

    // Determine points for drawing
    const points: PatternPoint[] = [
        { index: prevHigh.index, price: prevHigh.price, label: '1' },
        { index: prevLow.index, price: prevLow.price, label: '2' },
        { index: lastHigh.index, price: lastHigh.price, label: '3' },
        { index: lastLow.index, price: lastLow.price, label: '4' },
    ];

    return {
        name,
        type,
        status,
        confidence,
        summary: `تم رصد نموذج ${name} ${type === 'Bullish' ? 'الاستمراري الصاعد' : type === 'Bearish' ? 'الانعكاسي/الاستمراري الهابط' : 'المحايد'}.`,
        points,
        targetPrice: target || undefined,
        stopLoss: stop || undefined,
        trendlines: [
            { start: { index: prevHigh.index, price: prevHigh.price }, end: { index: candles.length + 5, price: prevHigh.price + resSlope * (candles.length + 5 - prevHigh.index) } },
            { start: { index: prevLow.index, price: prevLow.price }, end: { index: candles.length + 5, price: prevLow.price + supSlope * (candles.length + 5 - prevLow.index) } }
        ]
    };
};

// --- Candlestick Recognition ---
const detectCandlestickPattern = (candles: Candle[]): CandlestickPattern | undefined => {
    const last = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const body = Math.abs(last.close - last.open);
    const range = last.high - last.low;
    const upperWick = last.high - Math.max(last.close, last.open);
    const lowerWick = Math.min(last.close, last.open) - last.low;
    
    // Doji
    if (body <= range * 0.1) {
        return { name: 'Doji', type: 'Neutral', significance: 'Medium' };
    }
    
    // Hammer / Hanging Man
    if (lowerWick > body * 2 && upperWick < body * 0.5) {
        return { 
            name: last.close > last.open ? 'Hammer' : 'Hanging Man', 
            type: last.close > last.open ? 'Bullish' : 'Bearish', 
            significance: 'High' 
        };
    }
    
    // Shooting Star / Inverted Hammer
    if (upperWick > body * 2 && lowerWick < body * 0.5) {
        return { 
            name: 'Shooting Star', 
            type: 'Bearish', 
            significance: 'High' 
        };
    }
    
    // Engulfing
    if (Math.abs(last.close - last.open) > Math.abs(prev.close - prev.open)) {
        if (last.close > last.open && prev.close < prev.open && last.close > prev.high && last.open < prev.low) {
            return { name: 'Bullish Engulfing', type: 'Bullish', significance: 'High' };
        }
        if (last.close < last.open && prev.close > prev.open && last.close < prev.low && last.open > prev.high) {
            return { name: 'Bearish Engulfing', type: 'Bearish', significance: 'High' };
        }
    }

    return undefined;
};

export const analyzeTechnicalPatterns = (candles: Candle[]): TechnicalPatternsAnalysis => {
    if (candles.length < 30) return {};

    const pivots = findPivots(candles);
    const chartPattern = detectChartPattern(candles, pivots);
    const candlestickPattern = detectCandlestickPattern(candles);

    let confluence = undefined;
    if (chartPattern && candlestickPattern) {
        if (chartPattern.type === candlestickPattern.type && chartPattern.type !== 'Neutral') {
            confluence = { summary: `توافق قوي: نموذج ${chartPattern.name} مع شمعة ${candlestickPattern.name} يدعمان الاتجاه ${chartPattern.type}.` };
        }
    }

    return { chartPattern, candlestickPattern, confluence };
};
