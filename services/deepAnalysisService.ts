
import type { Candle } from '../types';

export interface Explosion {
    startIndex: number;
    endIndex: number;
    peakIndex: number;
    priceChange: number;
    preExplosionState: string;
}

export interface DeepHistoricalData {
    candles: Candle[];
    explosions: Explosion[];
}

// This is a simulation service to generate plausible deep historical data for a given pair.
// In a real application, this would fetch data from a database or a more advanced API.
export const fetchDeepHistoricalData = (pair: string): DeepHistoricalData => {
    const candles: Candle[] = [];
    const totalCandles = 500;
    let currentPrice = 100 + (pair.charCodeAt(0) % 20); // Start price based on pair name
    let trend = 1;
    let volatility = 0.5;

    // Generate base price series with some randomness
    for (let i = 0; i < totalCandles; i++) {
        const open = currentPrice;
        const randomFactor = (Math.random() - 0.49) * volatility;
        const trendFactor = (i / totalCandles) * 0.1 * trend;
        currentPrice += randomFactor + trendFactor;
        
        if (Math.random() < 0.01) trend *= -1; // Randomly change major trend
        if (Math.random() < 0.05) volatility = Math.random() * 1.5 + 0.2; // Change volatility regime

        const close = Math.max(currentPrice, 10);
        const high = Math.max(open, close) + Math.random();
        const low = Math.min(open, close) - Math.random();

        candles.push({
            timestamp: i,
            open,
            high,
            low,
            close,
            volume: (Math.random() * 500 + 100) * 1000,
        });
    }

    // Programmatically create 3 historical "explosions"
    const explosions: Explosion[] = [];
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Explosion 1: Sharp V-shape recovery
    const e1Start = 80 + (hash % 20);
    explosions.push(createExplosion(candles, e1Start, 20, 3.5, "تجميع بحجم منخفض متبوع بضغط شرائي مفاجئ (V-shape recovery)."));

    // Explosion 2: Breakout from consolidation
    const e2Start = 250 + (hash % 30);
    // Create a consolidation period before the explosion
    for (let i = e2Start - 30; i < e2Start; i++) {
        candles[i].close = candles[e2Start - 31].close + (Math.random() - 0.5) * 2;
        // Adjust high/low to match consolidation
        candles[i].high = Math.max(candles[i].close, candles[i].open) + Math.random();
        candles[i].low = Math.min(candles[i].close, candles[i].open) - Math.random();
    }
    explosions.push(createExplosion(candles, e2Start, 30, 2.8, "اختراق بعد فترة تجميع طويلة وضغط طيفي واضح."));

    // Explosion 3: Continuation trend
    const e3Start = 420 + (hash % 15);
    explosions.push(createExplosion(candles, e3Start, 15, 4.5, "استمرار اتجاه صاعد قوي مع تزامن دورات متعددة."));
    
    return { candles, explosions };
};


function createExplosion(
    candles: Candle[],
    startIndex: number,
    duration: number,
    magnitude: number,
    description: string
): Explosion {
    const startPrice = candles[startIndex - 1].close;
    let peakPrice = startPrice;
    let peakIndex = startIndex;

    for (let i = 0; i < duration; i++) {
        const index = startIndex + i;
        if (index >= candles.length) break;
        const progress = i / duration;
        const multiplier = Math.sin(progress * Math.PI); // Creates an arc shape
        const priceIncrease = (Math.random() * 0.5 + 0.5) * magnitude * multiplier;
        candles[index].close = candles[index - 1].close + priceIncrease;
        
        // Maintain OHLC integrity
        if (candles[index].close > candles[index].high) candles[index].high = candles[index].close;
        if (candles[index].close < candles[index].low) candles[index].low = candles[index].close;

        if (candles[index].close > peakPrice) {
            peakPrice = candles[index].close;
            peakIndex = index;
        }
    }
    
    // Add a small pullback after the peak
    for (let i = 0; i < 5; i++) {
        const index = peakIndex + i + 1;
        if (index >= candles.length) break;
        candles[index].close = candles[index-1].close * (1 - (Math.random() * 0.01));
        
        // Maintain OHLC integrity
        if (candles[index].close > candles[index].high) candles[index].high = candles[index].close;
        if (candles[index].close < candles[index].low) candles[index].low = candles[index].close;
    }


    return {
        startIndex: startIndex,
        endIndex: startIndex + duration,
        peakIndex: peakIndex,
        priceChange: ((peakPrice - startPrice) / startPrice) * 100,
        preExplosionState: description,
    };
}
