import type { Candle, SmartMoneyAnalysis, OrderBlock, StructurePoint, TradeSetup } from '../types';

// This is a simulation service for Smart Money Concepts.

const findSwingPoints = (candles: Candle[], lookback: number): { type: 'high' | 'low'; price: number; index: number }[] => {
    const points: { type: 'high' | 'low'; price: number; index: number }[] = [];
    const window = Math.floor(lookback / 2);
    for (let i = window; i < candles.length - window; i++) {
        const slice = candles.slice(i - window, i + window + 1);
        const currentPrice = candles[i].close;
        const max = Math.max(...slice.map(c => c.close));
        const min = Math.min(...slice.map(c => c.close));

        if (currentPrice === max) {
            points.push({ type: 'high', price: currentPrice, index: i });
        } else if (currentPrice === min) {
            points.push({ type: 'low', price: currentPrice, index: i });
        }
    }
    // Filter out consecutive highs/lows and only keep the most extreme
    const filtered: { type: 'high' | 'low'; price: number; index: number }[] = [];
    for (const point of points) {
        if (filtered.length === 0) {
            filtered.push(point);
            continue;
        }
        const lastFiltered = filtered[filtered.length - 1];
        if (point.type === lastFiltered.type) {
            if (point.type === 'high' && point.price > lastFiltered.price) {
                filtered[filtered.length - 1] = point;
            } else if (point.type === 'low' && point.price < lastFiltered.price) {
                filtered[filtered.length - 1] = point;
            }
        } else {
            filtered.push(point);
        }
    }
    return filtered;
};

export const analyzeSmartMoneyConcepts = (candles: Candle[], pair: string): SmartMoneyAnalysis => {
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // Only generate a pattern for ~70% of pairs to simulate realism
    if (candles.length < 50 || hash % 10 < 3) {
        return {
            summary: "لم يتم تحديد هيكل واضح أو نقطة اهتمام حسب مفاهيم الأموال الذكية.",
            bias: 'Ranging',
        };
    }
    
    const swings = findSwingPoints(candles, 21);
    if (swings.length < 4) {
        return {
            summary: "السوق يتحرك في نطاق عرضي بدون هيكل اتجاهي واضح.",
            bias: 'Ranging',
        };
    }

    const currentPrice = candles[candles.length - 1].close;
    const lastHigh = swings.filter(s => s.type === 'high').slice(-1)[0];
    const lastLow = swings.filter(s => s.type === 'low').slice(-1)[0];
    const prevHigh = swings.filter(s => s.type === 'high').slice(-2)[0];
    const prevLow = swings.filter(s => s.type === 'low').slice(-2)[0];

    // Determine Bias
    const isBullishBias = currentPrice > lastHigh.price && lastHigh.price > prevHigh.price && lastLow.price > prevLow.price;
    const isBearishBias = currentPrice < lastLow.price && lastLow.price < prevLow.price && lastHigh.price < prevHigh.price;

    if (isBullishBias) {
        // Bullish Scenario: Break of Structure (BoS), look for a bullish Order Block (OB)
        const structurePoint: StructurePoint = { type: 'BoS', price: lastHigh.price, index: lastHigh.index };
        
        // Find the last down-candle before the move that broke structure
        const candlesBeforeBreak = candles.slice(0, structurePoint.index);
        let orderBlockCandleIndex = -1;
        for (let i = candlesBeforeBreak.length - 1; i > 0; i--) {
            if (candlesBeforeBreak[i].close < candlesBeforeBreak[i-1].close) { // Find a down candle
                orderBlockCandleIndex = i;
                break;
            }
        }

        if (orderBlockCandleIndex === -1 || orderBlockCandleIndex < prevLow.index) {
             return { summary: "تم كسر الهيكل الصاعد، ولكن لم يتم تحديد منطقة طلب واضحة.", bias: 'Bullish' };
        }

        const obCandle = candles[orderBlockCandleIndex-1]; // The actual down candle
        const orderBlock: OrderBlock = {
            type: 'bullish',
            index: orderBlockCandleIndex-1,
            top: obCandle.close > candles[orderBlockCandleIndex-2].close ? obCandle.close : candles[orderBlockCandleIndex-2].close,
            bottom: obCandle.close < candles[orderBlockCandleIndex-2].close ? obCandle.close : candles[orderBlockCandleIndex-2].close,
        };

        const tradeSetup: TradeSetup = {
            direction: 'Long',
            entry: orderBlock.top,
            stopLoss: orderBlock.bottom * 0.995, // 0.5% below the low
            targets: [
                { level: 'TP1', price: structurePoint.price },
                { level: 'TP2', price: structurePoint.price + (structurePoint.price - lastLow.price) * 0.618 },
            ],
        };

        return {
            summary: `تم تأكيد الاتجاه الصاعد بكسر الهيكل (BoS) عند ${structurePoint.price.toFixed(4)}. تم تحديد منطقة طلب (Order Block) كمنطقة دخول محتملة.`,
            bias: 'Bullish',
            structurePoint,
            orderBlock,
            tradeSetup,
        };
    } else if (isBearishBias) {
        // Bearish Scenario: Break of Structure (BoS), look for a bearish Order Block (OB)
        const structurePoint: StructurePoint = { type: 'BoS', price: lastLow.price, index: lastLow.index };

        const candlesBeforeBreak = candles.slice(0, structurePoint.index);
        let orderBlockCandleIndex = -1;
        for (let i = candlesBeforeBreak.length - 1; i > 0; i--) {
            if (candlesBeforeBreak[i].close > candlesBeforeBreak[i-1].close) { // Find an up candle
                orderBlockCandleIndex = i;
                break;
            }
        }
        
        if (orderBlockCandleIndex === -1 || orderBlockCandleIndex < prevHigh.index) {
            return { summary: "تم كسر الهيكل الهابط، ولكن لم يتم تحديد منطقة عرض واضحة.", bias: 'Bearish' };
        }

        const obCandle = candles[orderBlockCandleIndex-1]; // The actual up candle
        const orderBlock: OrderBlock = {
            type: 'bearish',
            index: orderBlockCandleIndex - 1,
            top: obCandle.close > candles[orderBlockCandleIndex - 2].close ? obCandle.close : candles[orderBlockCandleIndex - 2].close,
            bottom: obCandle.close < candles[orderBlockCandleIndex - 2].close ? obCandle.close : candles[orderBlockCandleIndex - 2].close,
        };

         const tradeSetup: TradeSetup = {
            direction: 'Short',
            entry: orderBlock.bottom,
            stopLoss: orderBlock.top * 1.005, // 0.5% above the high
            targets: [
                { level: 'TP1', price: structurePoint.price },
                { level: 'TP2', price: structurePoint.price - (lastHigh.price - structurePoint.price) * 0.618 },
            ],
        };

         return {
            summary: `تم تأكيد الاتجاه الهابط بكسر الهيكل (BoS) عند ${structurePoint.price.toFixed(4)}. تم تحديد منطقة عرض (Order Block) كمنطقة دخول محتملة.`,
            bias: 'Bearish',
            structurePoint,
            orderBlock,
            tradeSetup,
        };
    }
    
    // Default fallback
    return {
        summary: "السوق في نطاق عرضي، ننتظر كسر هيكل واضح لتحديد الاتجاه.",
        bias: 'Ranging',
    };
};
