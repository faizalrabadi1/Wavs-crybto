
import type { Candle, ICTAnalysis, LiquidityZone, FairValueGap, OrderBlock, PremiumDiscountZones, TradeSetup } from '../types';

const findSwingPoints = (candles: Candle[], lookback: number): { type: 'high' | 'low'; price: number; index: number }[] => {
    const points: { type: 'high' | 'low'; price: number; index: number }[] = [];
    const window = Math.floor(lookback / 2);
    for (let i = window; i < candles.length - window; i++) {
        const slice = candles.slice(i - window, i + window + 1);
        const currentPrice = candles[i].high; // Use High/Low for precise swings
        const currentLow = candles[i].low;
        
        const max = Math.max(...slice.map(c => c.high));
        const min = Math.min(...slice.map(c => c.low));

        if (currentPrice === max) {
            points.push({ type: 'high', price: currentPrice, index: i });
        } else if (currentLow === min) {
            points.push({ type: 'low', price: currentLow, index: i });
        }
    }
    // Simple filter for consecutive points
    const filtered: { type: 'high' | 'low'; price: number; index: number }[] = [];
    for (const point of points) {
        if (filtered.length === 0 || point.type !== filtered[filtered.length - 1].type) {
            filtered.push(point);
        }
    }
    return filtered;
};

// --- Detect Fair Value Gaps (FVG) ---
const findFairValueGaps = (candles: Candle[]): FairValueGap[] => {
    const gaps: FairValueGap[] = [];
    // Need at least 3 candles to form a gap
    if (candles.length < 3) return [];

    for (let i = 1; i < candles.length - 1; i++) {
        const prev = candles[i - 1]; // Candle 1
        // const curr = candles[i];   // Candle 2 (The displacement)
        const next = candles[i + 1]; // Candle 3

        // Bullish FVG: Candle 1 High < Candle 3 Low
        if (prev.high < next.low) {
            gaps.push({
                type: 'bullish',
                top: next.low,
                bottom: prev.high,
                startIndex: i,
                endIndex: i + 5, // Arbitrary visual extension
                isMitigated: false // Logic to check if filled can be added here
            });
        }
        
        // Bearish FVG: Candle 1 Low > Candle 3 High
        if (prev.low > next.high) {
            gaps.push({
                type: 'bearish',
                top: prev.low,
                bottom: next.high,
                startIndex: i,
                endIndex: i + 5,
                isMitigated: false
            });
        }
    }
    
    // Check mitigation (if future price touched the gap)
    return gaps.map(gap => {
        const futureCandles = candles.slice(gap.startIndex + 2);
        const isMitigated = futureCandles.some(c => 
            (gap.type === 'bullish' && c.low <= gap.top) || 
            (gap.type === 'bearish' && c.high >= gap.bottom)
        );
        return { ...gap, isMitigated };
    }).slice(-5); // Return last 5 relevant gaps
};

// --- Detect Liquidity Zones ---
const findLiquidityZones = (candles: Candle[]): LiquidityZone[] => {
    const swings = findSwingPoints(candles, 10); // Tight lookback for local liquidity
    const zones: LiquidityZone[] = [];
    
    const currentPrice = candles[candles.length-1].close;

    // Group nearby swings to form "Pools"
    const tolerance = currentPrice * 0.002; // 0.2% tolerance

    swings.forEach(swing => {
        // Check if this swing hasn't been swept yet (simplified logic)
        // In a real app, we'd check if price has crossed this level *after* the swing index
        const subsequentCandles = candles.slice(swing.index + 1);
        const isSwept = subsequentCandles.some(c => 
            swing.type === 'high' ? c.high > swing.price : c.low < swing.price
        );

        if (!isSwept) {
            zones.push({
                type: swing.type === 'high' ? 'buy-side' : 'sell-side',
                priceLevel: swing.price,
                strength: 'Weak', // Can refine based on double tops etc
                startIndex: swing.index
            });
        }
    });

    return zones.slice(-6); // Last 6 active zones
};

export const analyzeICT = (candles: Candle[], pair: string): ICTAnalysis => {
    if (candles.length < 50) {
        return {
            summary: "بيانات غير كافية.",
            marketStructure: 'Ranging',
            liquidityZones: [], fairValueGaps: [], orderBlocks: [],
            timeBias: { session: 'N/A', bias: 'Neutral' },
        };
    }
    
    const currentPrice = candles[candles.length - 1].close;
    
    // 1. Market Structure
    const swings = findSwingPoints(candles, 20);
    const recentSwings = swings.slice(-4);
    let marketStructure: 'Bullish' | 'Bearish' | 'Ranging' = 'Ranging';
    
    if (recentSwings.length >= 2) {
        const last = recentSwings[recentSwings.length-1];
        const prev = recentSwings[recentSwings.length-2];
        if (last.type === 'high' && last.price > prev.price) marketStructure = 'Bullish';
        else if (last.type === 'low' && last.price < prev.price) marketStructure = 'Bearish';
    }

    // 2. Premium/Discount
    const recentHigh = Math.max(...candles.slice(-50).map(c => c.high));
    const recentLow = Math.min(...candles.slice(-50).map(c => c.low));
    const equilibrium = (recentHigh + recentLow) / 2;
    const premiumDiscount: PremiumDiscountZones = { rangeHigh: recentHigh, rangeLow: recentLow, equilibrium };

    // 3. Features
    const liquidityZones = findLiquidityZones(candles);
    const fairValueGaps = findFairValueGaps(candles);
    
    // Simple Trade Setup Logic based on FVG retest
    let tradeSetup: TradeSetup | undefined = undefined;
    const lastFVG = fairValueGaps[fairValueGaps.length - 1];
    
    if (lastFVG && !lastFVG.isMitigated) {
        if (lastFVG.type === 'bullish' && currentPrice <= lastFVG.top * 1.001 && currentPrice >= lastFVG.bottom) {
            // Buying in a bullish FVG
            tradeSetup = {
                direction: 'Long',
                entry: lastFVG.top,
                stopLoss: lastFVG.bottom,
                targets: [{ level: 'Liquidity', price: liquidityZones.find(z => z.type === 'buy-side')?.priceLevel || recentHigh }]
            };
        } else if (lastFVG.type === 'bearish' && currentPrice >= lastFVG.bottom * 0.999 && currentPrice <= lastFVG.top) {
            // Selling in a bearish FVG
            tradeSetup = {
                direction: 'Short',
                entry: lastFVG.bottom,
                stopLoss: lastFVG.top,
                targets: [{ level: 'Liquidity', price: liquidityZones.find(z => z.type === 'sell-side')?.priceLevel || recentLow }]
            };
        }
    }

    return {
        summary: `هيكل السوق: ${marketStructure}. السعر حالياً في منطقة ${currentPrice > equilibrium ? 'Premium (بيع)' : 'Discount (شراء)'}.`,
        marketStructure,
        liquidityZones,
        fairValueGaps,
        orderBlocks: [], // Placeholder
        timeBias: { session: 'New York', bias: marketStructure },
        premiumDiscount,
        tradeSetup,
    };
};
