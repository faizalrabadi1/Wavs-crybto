
import type { Candle, IchimokuAnalysis, IchimokuSignal } from '../types';

// Standard Ichimoku settings
const TENKAN_PERIOD = 9;
const KIJUN_PERIOD = 26;
const SENKOU_B_PERIOD = 52;
const DISPLACEMENT = 26;

const getHighLow = (candles: Candle[], period: number, index: number): { high: number; low: number } | null => {
    if (index < period - 1) return null;
    const slice = candles.slice(index - period + 1, index + 1);
    const high = Math.max(...slice.map(c => c.close)); // Using close as proxy for simplicity, ideally use H/L
    const low = Math.min(...slice.map(c => c.close));
    return { high, low };
};

export const analyzeIchimoku = (candles: Candle[]): IchimokuAnalysis | undefined => {
    // Need enough data for calculation + projection
    if (candles.length < SENKOU_B_PERIOD + DISPLACEMENT) return undefined;

    const currentIdx = candles.length - 1;
    const currentPrice = candles[currentIdx].close;

    // --- 1. Calculate Current Lines ---
    const tenkanHL = getHighLow(candles, TENKAN_PERIOD, currentIdx);
    const kijunHL = getHighLow(candles, KIJUN_PERIOD, currentIdx);
    
    if (!tenkanHL || !kijunHL) return undefined;
    
    const tenkanSen = (tenkanHL.high + tenkanHL.low) / 2;
    const kijunSen = (kijunHL.high + kijunHL.low) / 2;
    
    // Chikou (Lagging Span) is current price plotted 26 periods back
    const chikouSpan = currentPrice; 
    
    // --- 2. Calculate Current Cloud (Span A/B at current time) ---
    // Span A/B for *today* were calculated 26 periods ago
    const cloudRefIdx = currentIdx - DISPLACEMENT;
    const tenkanRef = getHighLow(candles, TENKAN_PERIOD, cloudRefIdx);
    const kijunRef = getHighLow(candles, KIJUN_PERIOD, cloudRefIdx);
    const spanBRef = getHighLow(candles, SENKOU_B_PERIOD, cloudRefIdx);
    
    let senkouSpanA = 0;
    let senkouSpanB = 0;

    if (tenkanRef && kijunRef && spanBRef) {
        const t = (tenkanRef.high + tenkanRef.low) / 2;
        const k = (kijunRef.high + kijunRef.low) / 2;
        senkouSpanA = (t + k) / 2;
        senkouSpanB = (spanBRef.high + spanBRef.low) / 2;
    }

    // --- 3. Future Cloud Projection (Next 26 candles) ---
    // Values derived from *current* price are plotted 26 periods *ahead*
    const futureSpanA = (tenkanSen + kijunSen) / 2;
    const futureSpanBHL = getHighLow(candles, SENKOU_B_PERIOD, currentIdx);
    const futureSpanB = futureSpanBHL ? (futureSpanBHL.high + futureSpanBHL.low) / 2 : 0;

    const futureCloud = [];
    // Simulate projection for chart visualization
    // Ideally we would calculate this for every candle, but for a single snapshot summary:
    futureCloud.push({ spanA: futureSpanA, spanB: futureSpanB, index: currentIdx + DISPLACEMENT });

    // --- 4. Signal Analysis & Strength ---
    const signals: IchimokuSignal[] = [];

    // Helper to determine signal strength based on cloud position
    const getSignalStrength = (isBullish: boolean, price: number, spanA: number, spanB: number): 'Strong' | 'Medium' | 'Weak' => {
        const cloudTop = Math.max(spanA, spanB);
        const cloudBottom = Math.min(spanA, spanB);
        
        if (isBullish) {
            if (price > cloudTop) return 'Strong'; // Above Kumo
            if (price < cloudBottom) return 'Weak'; // Below Kumo
            return 'Medium'; // Inside Kumo
        } else {
            if (price < cloudBottom) return 'Strong'; // Below Kumo
            if (price > cloudTop) return 'Weak'; // Above Kumo
            return 'Medium'; // Inside Kumo
        }
    };

    // A. Tenkan-Kijun Cross (TK Cross)
    if (tenkanSen > kijunSen) {
        // Check previous state to confirm crossover
        const prevTenkanHL = getHighLow(candles, TENKAN_PERIOD, currentIdx - 1);
        const prevKijunHL = getHighLow(candles, KIJUN_PERIOD, currentIdx - 1);
        if (prevTenkanHL && prevKijunHL) {
             const prevTenkan = (prevTenkanHL.high + prevTenkanHL.low) / 2;
             const prevKijun = (prevKijunHL.high + prevKijunHL.low) / 2;
             
             if (prevTenkan <= prevKijun) {
                 // Golden Cross
                 signals.push({
                     name: 'TK Cross',
                     type: 'Bullish',
                     strength: getSignalStrength(true, currentPrice, senkouSpanA, senkouSpanB),
                     description: 'تقاطع Tenkan-sen فوق Kijun-sen (إشارة شراء كلاسيكية).'
                 });
             }
        }
    } else if (tenkanSen < kijunSen) {
         const prevTenkanHL = getHighLow(candles, TENKAN_PERIOD, currentIdx - 1);
         const prevKijunHL = getHighLow(candles, KIJUN_PERIOD, currentIdx - 1);
         if (prevTenkanHL && prevKijunHL) {
             const prevTenkan = (prevTenkanHL.high + prevTenkanHL.low) / 2;
             const prevKijun = (prevKijunHL.high + prevKijunHL.low) / 2;
             if (prevTenkan >= prevKijun) {
                 // Death Cross
                 signals.push({
                     name: 'TK Cross',
                     type: 'Bearish',
                     strength: getSignalStrength(false, currentPrice, senkouSpanA, senkouSpanB),
                     description: 'تقاطع Tenkan-sen تحت Kijun-sen (إشارة بيع كلاسيكية).'
                 });
             }
         }
    }

    // B. Kumo Breakout (Edge-to-Edge potential)
    const cloudTop = Math.max(senkouSpanA, senkouSpanB);
    const cloudBottom = Math.min(senkouSpanA, senkouSpanB);
    const prevPrice = candles[currentIdx - 1].close;

    if (currentPrice > cloudTop && prevPrice <= cloudTop) {
        signals.push({
            name: 'Kumo Breakout',
            type: 'Bullish',
            strength: 'Strong',
            description: 'السعر يخترق السحابة للأعلى. إشارة قوة كبيرة.'
        });
    } else if (currentPrice < cloudBottom && prevPrice >= cloudBottom) {
         signals.push({
            name: 'Kumo Breakout',
            type: 'Bearish',
            strength: 'Strong',
            description: 'السعر يكسر السحابة للأسفل. إشارة ضعف كبيرة.'
        });
    } else if (currentPrice > cloudBottom && currentPrice < cloudTop) {
        // Inside Cloud (Edge-to-Edge)
        if (prevPrice <= cloudBottom) {
             signals.push({
                name: 'Edge-to-Edge',
                type: 'Bullish',
                strength: 'Medium',
                description: 'دخول السعر للسحابة. الهدف هو الحافة العلوية.'
            });
        } else if (prevPrice >= cloudTop) {
             signals.push({
                name: 'Edge-to-Edge',
                type: 'Bearish',
                strength: 'Medium',
                description: 'دخول السعر للسحابة. الهدف هو الحافة السفلية.'
            });
        }
    }

    // C. Chikou Span Confirmation
    const pastPrice = candles[currentIdx - DISPLACEMENT].close;
    if (chikouSpan > pastPrice * 1.01) { // 1% buffer
        // Bullish confirmation
    } else if (chikouSpan < pastPrice * 0.99) {
        // Bearish confirmation
    }

    // --- 5. Balance Score Calculation ---
    let balanceScore = 50;
    
    // Price vs Cloud
    if (currentPrice > cloudTop) balanceScore += 25;
    else if (currentPrice < cloudBottom) balanceScore -= 25;
    
    // TK State
    if (tenkanSen > kijunSen) balanceScore += 15;
    else if (tenkanSen < kijunSen) balanceScore -= 15;
    
    // Chikou State
    if (chikouSpan > pastPrice) balanceScore += 10;
    else if (chikouSpan < pastPrice) balanceScore -= 10;
    
    // Future Cloud State
    if (futureSpanA > futureSpanB) balanceScore += 10; // Bullish future
    else if (futureSpanA < futureSpanB) balanceScore -= 10; // Bearish future

    balanceScore = Math.max(0, Math.min(100, balanceScore));

    const trendState = balanceScore >= 60 ? 'Bullish' : balanceScore <= 40 ? 'Bearish' : 'Neutral';
    const cloudState = futureSpanA > futureSpanB ? 'Bullish' : 'Bearish';
    
    let summary = `حالة التوازن: ${trendState} (${balanceScore}/100). `;
    
    let recommendation: 'Buy' | 'Sell' | 'Wait' = 'Wait';
    if (balanceScore >= 75) recommendation = 'Buy';
    else if (balanceScore <= 25) recommendation = 'Sell';
    
    if (signals.length > 0) {
        summary += `أبرز الإشارات: ${signals[0].name} (${signals[0].type}).`;
    } else {
        summary += "استقرار نسبي بدون إشارات اختراق.";
    }

    return {
        lines: { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan },
        futureCloud,
        signals,
        trendState,
        cloudState,
        balanceScore,
        summary,
        recommendation
    };
};
