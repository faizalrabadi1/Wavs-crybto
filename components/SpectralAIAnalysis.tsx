import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { ScannerCandidate } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    candidate: ScannerCandidate;
    difficulty: 'Basic' | 'Advanced' | 'Expert';
}

const formatPrice = (pair: string, price: number): string => {
    if (pair.endsWith('.D')) {
        return `${price.toFixed(2)}%`;
    }
    if (pair.startsWith('TOTAL')) {
        if (price >= 1e12) return `$${(price / 1e12).toFixed(2)}T`;
        if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
        return `$${(price / 1e6).toFixed(2)}M`;
    }
    if (pair.includes('JPY')) {
        return price.toFixed(3);
    }
    if (pair.includes('XAU')) { // Gold
        return price.toFixed(2);
    }
    if (!pair.endsWith('USDT')) { // Assume Forex
        return price.toFixed(5);
    }
    
    // Default Crypto formatting
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toPrecision(4);
};

const getPromptByDifficulty = (
    candidate: ScannerCandidate, 
    difficulty: 'Basic' | 'Advanced' | 'Expert'
): string => {
    const { pair, timeframe, analysis: analysisData, price } = candidate;
    
    const elliottWaveText = analysisData.elliottWave && analysisData.elliottWave.longTermTargets.length > 0 ? `
**التحليل الموجي (طويل المدى):**
*   **الملخص:** ${analysisData.elliottWave.summary}
*   **الأهداف الاستراتيجية:** ${analysisData.elliottWave.longTermTargets.map(t => formatPrice(pair, t.price)).join(', ')}
*   **مستوى الإلغاء:** ${formatPrice(pair, analysisData.elliottWave.invalidationLevel)}
` : '';

    const harmonicText = analysisData.harmonicPattern && analysisData.harmonicPattern.detected ? `
**نموذج الهارمونيك (نقطة انعكاس):**
*   **النموذج المكتشف:** ${analysisData.harmonicPattern.patternName}
*   **منطقة الانعكاس المحتملة (PRZ):** ${analysisData.harmonicPattern.potentialReversalZone ? `${formatPrice(pair, analysisData.harmonicPattern.potentialReversalZone.start)} - ${formatPrice(pair, analysisData.harmonicPattern.potentialReversalZone.end)}` : 'N/A'}
*   **وقف الخسارة:** ${analysisData.harmonicPattern.stopLoss ? formatPrice(pair, analysisData.harmonicPattern.stopLoss) : 'N/A'}
` : '';

    const commonPromptPart = `
أنت خبير في تحليل السوق متخصص في تفسير البيانات الطيفية والموجية ونماذج الهارمونيك لتداول العملات الرقمية. يجب أن يكون تحليلك فنيًا وموضوعيًا ومبنيًا *فقط* على البيانات المقدمة. لا تقدم أي نصيحة مالية. يجب أن يكون الناتج النهائي باللغة العربية.

حلل البيانات التالية لـ ${pair} على الإطار الزمني ${timeframe}:

**البيانات الطيفية (قصيرة المدى):**
*   **السعر الحالي:** ${formatPrice(pair, price)}
*   **حالة السوق المحددة:** ${analysisData.state}
*   **الزخم (آخر 20 شمعة):** ${analysisData.momentum.toFixed(2)}%
*   **زاوية الطور الحالية:** ${analysisData.currentPhaseAngle.toFixed(0)}°
*   **مؤشر النظام (قوة الاتجاه):** ${analysisData.regimeScore.toFixed(2)}
${elliottWaveText}
${harmonicText}
`;

    switch (difficulty) {
        case 'Basic':
            return `${commonPromptPart}
**المهمة:**
قدم ملخصًا بسيطًا جدًا من فقرتين باللغة العربية.
1.  **الوضع الحالي:** صف بكلمات بسيطة. هل يبدو السعر قوياً أم ضعيفاً الآن بناءً على الإشارات قصيرة المدى؟
2.  **النظرة المستقبلية:** بناءً على التحليل الموجي والهارمونيك (إن وجد)، هل هناك فرصة لحركة كبيرة قادمة على المدى الطويل؟`;

        case 'Expert':
            return `${commonPromptPart}
**المهمة:**
قدم تحليلًا طيفيًا-موجيًا-هارمونيكيًا نقديًا ومفصلاً للمحللين الخبراء باللغة العربية.
1.  **تكامل الإشارات (Confluence):** حلل بعمق العلاقة المترابطة بين البيانات الطيفية قصيرة المدى، والسيناريو الموجي طويل المدى، ونقطة انعكاس الهارمونيك. هل هناك توافق يؤكد قوة الإشارة (مثلاً: منطقة PRZ للهارمونيك تتوافق مع نهاية موجة تصحيحية وبداية دورة طيفية صاعدة)؟ أم هناك تباين يحذر من سيناريو خادع؟
2.  **صلاحية السيناريوهات:** بناءً على مؤشر النظام وقوة الزخم، ما مدى احتمالية نجاح كل من السيناريو الموجي ونموذج الهارمونيك؟ هل الظروف الطيفية الحالية تدعم انعكاسًا سعريًا قويًا في منطقة PRZ؟
3.  **نقاط القرار الدقيقة:** حدد نقاط سعرية وزمنية (إن أمكن) حرجة. ما هي الشروط الطيفية التي يجب مراقبتها لتأكيد الانعكاس من منطقة PRZ، وما هي الإشارات التي قد تدل على فشل النموذج قبل الوصول لوقف الخسارة؟`;

        case 'Advanced':
        default:
            return `${commonPromptPart}
**المهمة:**
قدم "ملخص التحليل المتكامل" باللغة العربية. قم بتنظيم إجابتك في ثلاث فقرات:
1.  **حالة السوق الحالية (الرؤية القصيرة):** بناءً على البيانات الطيفية، صف الوضع الحالي.
2.  **الهياكل الفنية الكبرى (الرؤية الطويلة):** ادمج بين التحليل الموجي والهارمونيك. ما هو الهيكل الأكبر الذي يتحرك فيه السعر، وأين تقع نقطة الانعكاس المحتملة؟
3.  **السيناريو المحتمل المتكامل:** ادمج كل الرؤى. هل تدعم الحالة قصيرة المدى الانعكاس المتوقع من نموذج الهارمونيك؟ وهل يتوافق هذا الانعكاس مع المسار المتوقع لموجات إليوت؟ ما هو المسار الأكثر احتمالاً للسعر بناءً على هذا التكامل؟`;
    }
};


const SpectralAIAnalysis: React.FC<Props> = ({ candidate, difficulty }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!candidate) return;

        const generateAnalysis = async () => {
            setIsLoading(true);
            setError(null);
            setAnalysis('');

            const cacheKey = `spectral-${candidate.pair}-${candidate.timeframe}-${difficulty}`;
            const cached = getCachedAiResponse(cacheKey);
            if (cached) {
                setAnalysis(cached);
                setIsLoading(false);
                return;
            }

            try {
                if (!process.env.API_KEY) {
                    throw new Error("API key is not configured.");
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const prompt = getPromptByDifficulty(candidate, difficulty);

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setCachedAiResponse(cacheKey, response.text);
                setAnalysis(response.text);

            } catch (err: any) {
                console.error("Error generating AI analysis:", err);
                 if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
                    setError("تم تجاوز حد الطلبات لواجهة برمجة التطبيقات. يرجى الانتظار لحظة ثم المحاولة مرة أخرى.");
                } else {
                     setError("فشل في توليد التحليل. قد تكون هناك مشكلة في الاتصال بالخدمة.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        generateAnalysis();
    }, [candidate, difficulty]);

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-cyan-glow/30 mt-4">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>ملخص التحليل الطيفي (بواسطة AI)</span>
            </h3>
            {isLoading && (
                 <div className="space-y-3 animate-pulse pt-2">
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!isLoading && !error && (
                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed" dir="rtl">
                    {analysis}
                </div>
            )}
        </div>
    );
};

export default SpectralAIAnalysis;