import type { Candle, BollingerBands } from '../types';

interface IndicatorResult {
    rsi: number;
    macdHistogram: number;
    bollingerBands: BollingerBands;
}

// --- SIMULATION FUNCTIONS ---
// These functions generate plausible-looking indicator values based on recent price action.
// A real implementation would use proper TA library calculations.

const calculateRSI = (candles: Candle[]): number => {
    const period = 14;
    if (candles.length < period) return 50;

    const recentCandles = candles.slice(-period);
    const changes = recentCandles.slice(1).map((candle, i) => candle.close - recentCandles[i].close);
    
    const gains = changes.filter(c => c > 0).reduce((acc, val) => acc + val, 0);
    const losses = changes.filter(c => c < 0).reduce((acc, val) => acc + Math.abs(val), 0);

    if (losses === 0) return 100;
    
    const rs = (gains / period) / (losses / period);
    const rsi = 100 - (100 / (1 + rs));

    // Add some noise to make it less perfect
    const momentum = (candles[candles.length - 1].close - candles[candles.length - period].close) / candles[candles.length - period].close;
    return Math.max(0, Math.min(100, rsi + momentum * 10 + (Math.random() - 0.5) * 5));
};

const calculateMACD = (candles: Candle[]): { macdLine: number, signalLine: number, histogram: number } => {
    if (candles.length < 26) return { macdLine: 0, signalLine: 0, histogram: 0 };

    const ema = (data: number[], period: number) => {
        const k = 2 / (period + 1);
        let ema = data[0];
        for (let i = 1; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
        }
        return ema;
    };

    const prices = candles.map(c => c.close);
    const ema12 = ema(prices.slice(-50), 12);
    const ema26 = ema(prices.slice(-50), 26);
    const macdLine = ema12 - ema26;
    
    // Simulate signal line and histogram
    const signalLine = macdLine * (0.8 + Math.random() * 0.1); 
    const histogram = macdLine - signalLine;

    return { macdLine, signalLine, histogram };
};

const calculateBollingerBands = (candles: Candle[], period = 20, stdDevMultiplier = 2): BollingerBands => {
    if (candles.length < period) {
        const lastPrice = candles[candles.length - 1]?.close || 0;
        return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
    }

    const recentCandles = candles.slice(-period);
    const prices = recentCandles.map(c => c.close);
    const middle = prices.reduce((acc, val) => acc + val, 0) / period; // SMA
    
    const stdDev = Math.sqrt(
        prices.map(p => Math.pow(p - middle, 2)).reduce((acc, val) => acc + val, 0) / period
    );
    
    const upper = middle + (stdDev * stdDevMultiplier);
    const lower = middle - (stdDev * stdDevMultiplier);

    return { upper, middle, lower };
};


export const calculateTechnicalIndicators = (candles: Candle[]): IndicatorResult => {
    const rsi = calculateRSI(candles);
    const { histogram } = calculateMACD(candles);
    const bollingerBands = calculateBollingerBands(candles);

    return {
        rsi,
        macdHistogram: histogram,
        bollingerBands
    };
};