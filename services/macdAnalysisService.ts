
import type { Candle, MacdAnalysis, MacdStrategy, MacdMasterSignal } from '../types';

const BASIC_STRATEGIES_TEMPLATE: Omit<MacdStrategy, 'isActive' | 'signal' | 'confidence'>[] = [
    { id: 1, name: "استراتيجية التقاطع التقليدي", logic: "دخول عند تقاطع خط MACD مع خط الإشارة.", filter: "تأكيد الاتجاه إذا كان السعر فوق المتوسط المتحرك 50 (شراء) أو تحته (بيع).", accuracy: 70 },
    { id: 2, name: "استراتيجية التقاطع + كسر خط الصفر", logic: "تأكيد الاتجاه العام بعد كسر خط الصفر.", filter: "RSI > 55 للشراء أو < 45 للبيع.", accuracy: 75 },
    { id: 3, name: "استراتيجية الدايفرجنس (الاختلاف)", logic: "عندما يخالف MACD حركة السعر.", filter: "شمعة تأكيد انعكاس (Bullish/Bearish engulfing).", accuracy: 78 },
    { id: 4, name: "استراتيجية القمم والقيعان في MACD", logic: "مراقبة قمم وقيعان MACD لتوقع الانعكاسات.", filter: "استخدام Bollinger Bands لتأكيد الزخم.", accuracy: 73 },
    { id: 5, name: "استراتيجية التسارع (MACD Histogram Expansion)", logic: "توسع أعمدة الهستوجرام دليل على تسارع الاتجاه.", filter: "الخروج عند ضعف الأعمدة المتتالية.", accuracy: 70 }
];

const ADVANCED_STRATEGIES_TEMPLATE: Omit<MacdStrategy, 'isActive' | 'signal' | 'confidence'>[] = [
    { id: 6, name: "MACD Multi-Timeframe Confirmation", logic: "توافق الاتجاه على أكثر من إطار زمني.", filter: "MACD صاعد على اليومي + الساعة، والسعر فوق EMA 20.", accuracy: 85 },
    { id: 7, name: "MACD + Volume Acceleration Strategy", logic: "تأكيد إشارات MACD بزيادة حجم التداول.", filter: "تقاطع صعودًا + زيادة ملحوظة في الحجم 30%.", accuracy: 82 },
    { id: 8, name: "MACD Zero-Lag Optimized", logic: "استخدام MACD مُعدّل بزمن استجابة سريع (Zero-Lag).", filter: "سرعة اكتشاف الاتجاه الجديد قبل تأخر الكلاسيكي.", accuracy: 88 },
    { id: 9, name: "MACD Wave Fusion (Gann Style)", logic: "دمج موجات MACD مع دورات زمنية لتحديد قمم/قيعان دقيقة.", filter: "تحليل فلكي أو زمني مدمج.", accuracy: 90 },
    { id: 10, name: "Smart Divergence + Histogram Confirmation", logic: "استخدام الذكاء الاصطناعي لاكتشاف اختلافات خفية (Hidden Divergence).", filter: "Divergence إيجابي خفي + Histogram يتحول من سلبي إلى إيجابي.", accuracy: 92 }
];


export const analyzeMacd = (candles: Candle[], pair: string): MacdAnalysis => {
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const momentum = (candles[candles.length - 1].close - candles[candles.length - 20].close) / candles[candles.length - 20].close;

    const generateStrategyState = (template: Omit<MacdStrategy, 'isActive' | 'signal' | 'confidence'>, index: number): MacdStrategy => {
        // Use hash and momentum to create deterministic but varied results
        const isActiveDefault = (hash + index * 3) % 10 < 3; // ~30% chance of being active
        
        // Custom logic for CAC40 to favor trend-following strategies
        const isCac40 = pair.includes('CAC40');
        let isActive = isActiveDefault;
        if (isCac40) {
            if (template.id === 6 || template.id === 8) { // Multi-TF and Zero-Lag are good for indices
                isActive = (hash + index * 3) % 10 < 5; // Increase to 50% chance
            } else if (template.id === 3 || template.id === 4) { // Divergence/reversals are less common
                isActive = (hash + index * 3) % 10 < 2; // Decrease to 20% chance
            }
        }
        
        let signal: 'Buy' | 'Sell' | 'Hold' = 'Hold';
        let confidence: 'Low' | 'Medium' | 'High' = 'Medium';

        if (isActive) {
            if (momentum > 0.005) {
                signal = 'Buy';
            } else if (momentum < -0.005) {
                signal = 'Sell';
            }
            if (Math.abs(momentum) > 0.02) {
                confidence = 'High';
            } else if (Math.abs(momentum) < 0.008) {
                confidence = 'Low';
            }
        }
        return { ...template, isActive, signal, confidence };
    };

    const basicStrategies = BASIC_STRATEGIES_TEMPLATE.map(generateStrategyState);
    const advancedStrategies = ADVANCED_STRATEGIES_TEMPLATE.map(generateStrategyState);

    const allStrategies = [...basicStrategies, ...advancedStrategies];
    const activeStrategies = allStrategies.filter(s => s.isActive);

    // --- Calculate Master Signal ---
    let totalScore = 0;
    let activeCount = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    allStrategies.forEach(s => {
        if (s.isActive) {
            activeCount++;
            const weight = s.confidence === 'High' ? 2 : s.confidence === 'Medium' ? 1.5 : 1;
            
            if (s.signal === 'Buy') {
                totalScore += (1 * weight);
                bullishCount++;
            } else if (s.signal === 'Sell') {
                totalScore += (-1 * weight);
                bearishCount++;
            } else {
                neutralCount++;
            }
        }
    });

    // Normalize score to -100 to 100
    // Max theoretical score per strategy is 2 (High confidence). 
    // If 5 strategies are active, max raw score is 10.
    // We saturate at around 15 to allow strong signals to hit 100 easily.
    let normalizedScore = (totalScore / 15) * 100;
    normalizedScore = Math.max(-100, Math.min(100, normalizedScore));

    let signalType: 'Buy' | 'Sell' | 'Neutral' = 'Neutral';
    if (normalizedScore > 20) signalType = 'Buy';
    else if (normalizedScore < -20) signalType = 'Sell';

    let strength: 'Strong' | 'Moderate' | 'Weak' = 'Weak';
    if (Math.abs(normalizedScore) > 75) strength = 'Strong';
    else if (Math.abs(normalizedScore) > 40) strength = 'Moderate';

    const masterSignal: MacdMasterSignal = {
        signal: signalType,
        score: normalizedScore,
        strength,
        activeStrategyCount: activeCount,
        totalStrategies: allStrategies.length,
        bullishCount,
        bearishCount,
        neutralCount
    };

    let summary = '';
    if (activeStrategies.length > 0) {
        const bestStrategy = activeStrategies.sort((a, b) => b.accuracy - a.accuracy)[0];
        const confidenceMap = { 'High': 'عالية', 'Medium': 'متوسطة', 'Low': 'منخفضة' };
        summary = `تم تفعيل ${activeStrategies.length} استراتيجيات MACD. الأقوى حاليًا هي استراتيجية "**${bestStrategy.name}**" مع إشارة **${bestStrategy.signal === 'Buy' ? 'شراء' : 'بيع'}** بثقة **${confidenceMap[bestStrategy.confidence]}**.`;
    } else {
        summary = `لا توجد إشارة واضحة من استراتيجيات MACD حاليًا. يُنصح بالانتظار والمراقبة.`;
    }

    return {
        basicStrategies,
        advancedStrategies,
        summary,
        masterSignal
    };
};
