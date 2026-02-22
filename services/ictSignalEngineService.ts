
import type { ICTAnalysis, ICTSignal, TradeSetup } from '../types';

// This is a simulation of a Machine Learning model.
// It uses a set of rules based on the ICT analysis to generate a trading signal.

export const generateSignal = (analysis: ICTAnalysis): ICTSignal | null => {
    const { confluencePoints, tradeSetup, marketStructure, premiumDiscount } = analysis;
    
    // --- High-Confidence Entry Signal from Confluence ---
    if (confluencePoints && confluencePoints.length > 0) {
        const point = confluencePoints[0];
        const setup = analysis.tradeSetup;
        if (setup) {
            return {
                signalType: 'Entry',
                direction: setup.direction,
                timeframe: 'Swing', // Confluence is a strong signal, suitable for larger moves
                confidence: Math.floor(85 + Math.random() * 10), // 85-95%
                rationale: `نموذج التعلم الآلي يتوقع انعكاسًا عالي الاحتمال بناءً على نقطة اندماج (${point.confidence === 'very-high' ? 'عالية جداً' : 'عالية'}) وتوافقها مع هيكل السوق.`,
                tradeSetup: setup,
            };
        }
    }

    // --- Medium-Confidence Entry Signal from Standard Trade Setup ---
    if (tradeSetup) {
         return {
            signalType: 'Entry',
            direction: tradeSetup.direction,
            timeframe: 'Scalp', // Standard setups are better for shorter-term trades
            confidence: Math.floor(65 + Math.random() * 10), // 65-75%
            rationale: `نموذج التعلم الآلي يحدد إعداد صفقة قياسي يتوافق مع هيكل السوق الحالي (${marketStructure}) والسعر في منطقة ${tradeSetup.direction === 'Long' ? 'خصم' : 'بريميوم'}.`,
            tradeSetup,
        };
    }
    
    // --- Hold/Wait Signal ---
    if (marketStructure !== 'Ranging') {
        const neutralSetup: TradeSetup = {
            direction: marketStructure === 'Bullish' ? 'Long' : 'Short',
            entry: 0, stopLoss: 0, targets: []
        };
        return {
            signalType: 'Hold',
            direction: marketStructure === 'Bullish' ? 'Long' : 'Short',
            timeframe: 'Swing',
            confidence: Math.floor(50 + Math.random() * 10), // 50-60%
            rationale: `هيكل السوق ${marketStructure === 'Bullish' ? 'صاعد' : 'هابط'}، ولكن لا توجد نقطة دخول واضحة حاليًا. يوصي النموذج بالانتظار ومراقبة تشكل فرصة.`,
            tradeSetup: neutralSetup,
        };
    }

    // --- No Signal ---
    return null;
};
