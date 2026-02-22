import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { FibonacciAnalysis } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    analysis: FibonacciAnalysis;
}

const buildPrompt = (analysis: FibonacciAnalysis): string => {
    const retracementText = analysis.primaryRetracement
        ? `**الارتداد الرئيسي:** من ${analysis.primaryRetracement.swingLow.price.toFixed(4)} إلى ${analysis.primaryRetracement.swingHigh.price.toFixed(4)}. أهم المستويات: ${[0.382, 0.5, 0.618].map(l => analysis.primaryRetracement!.levels.find(f=>f.level===l)!.price.toFixed(4)).join(', ')}.\n`
        : '';
    
    const extensionText = analysis.trendBasedExtension
        ? `**الامتداد الرئيسي:** أهم المستويات: ${[1, 1.618, 2.618].map(l => analysis.trendBasedExtension!.levels.find(f=>f.level===l)?.price.toFixed(4) || '').filter(Boolean).join(', ')}.\n`
        : '';

    const clustersText = analysis.clusters.map((c, i) => 
        `- **المنطقة ${i+1}:** من ${c.priceBottom.toFixed(4)} إلى ${c.priceTop.toFixed(4)} (قوة: ${c.count} مستويات متوافقة)`
    ).join('\n');

    const timeZonesText = analysis.timeZones
        ? `**مناطق زمنية قادمة:** بالقرب من الشمعة رقم ${analysis.timeZones.filter(z => z.index > 0).slice(0, 3).map(z => z.index).join(', ')}.`
        : '';

    return `
أنت خبير تحليل فني متخصص في تحليل فيبوناتشي المتقدم. مهمتك هي تحليل البيانات التالية وتقديم تقرير استراتيجي عميق باللغة العربية.

**بيانات فيبوناتشي المحسوبة:**
*   **درجة توافق المستويات (Confluence Score):** ${analysis.confluenceScore}%
*   ${retracementText}
*   ${extensionText}
*   **مناطق الالتقاء (Clusters) الأقوى:**
${clustersText}
*   ${timeZonesText}

**المهمة المطلوبة:**
قم بإنشاء "تقرير فيبوناتشي الاستراتيجي". قم بتنظيم إجابتك في ثلاث فقرات مترابطة:

1.  **أهمية مناطق الالتقاء:** اشرح لماذا تعتبر مناطق الالتقاء (Clusters) هي أهم جزء في هذا التحليل. صف أقوى منطقة التقاء وماذا تمثل (هل هي منطقة دعم أم مقاومة محتملة؟).
2.  **دمج السعر مع الزمن:** حلل العلاقة بين مناطق الالتقاء السعرية والمناطق الزمنية المتوقعة. هل هناك توافق زمني قريب يعزز من احتمالية الانعكاس من إحدى مناطق الالتقاء السعرية؟
3.  **السيناريو المحتمل والتوصية:** بناءً على كل ما سبق، صف السيناريو الأكثر احتمالاً لحركة السعر القادمة. حدد أهم مستوى سعري يجب مراقبته كنقطة قرار (لتأكيد السيناريو أو نفيه).
`;
};

const FibonacciDeepAIAnalysis: React.FC<Props> = ({ analysis }) => {
    const [aiReport, setAiReport] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!analysis.isValid) return;

        const generateReport = async () => {
            setIsLoading(true);
            setError(null);
            setAiReport('');

            const cacheKey = `fib-ai-${analysis.summary}`;
            const cached = getCachedAiResponse(cacheKey);
            if (cached) {
                setAiReport(cached);
                setIsLoading(false);
                return;
            }

            try {
                if (!process.env.API_KEY) {
                    throw new Error("API key is not configured.");
                }
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = buildPrompt(analysis);
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setCachedAiResponse(cacheKey, response.text);
                setAiReport(response.text);

            } catch (err: any) {
                console.error("Error generating Fibonacci AI analysis:", err);
                if (err.message?.includes('429') || err.status === 429 || err.code === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
                    setError("⚠️ تم تجاوز حد الاستخدام (Quota Exceeded).");
                } else {
                    setError("فشل في توليد تحليل فيبوناتشي الذكي.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        
        // Use a small delay to avoid overwhelming the API on rapid timeframe changes
        const timer = setTimeout(generateReport, 500);
        return () => clearTimeout(timer);

    }, [analysis]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-cyan-glow/30 mt-4">
            <h4 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                <span>محلل فيبوناتشي الذكي</span>
            </h4>
            {isLoading && (
                 <div className="space-y-2 animate-pulse pt-2">
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!isLoading && !error && (
                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed" dir="rtl">
                    {aiReport}
                </div>
            )}
        </div>
    );
};

export default FibonacciDeepAIAnalysis;