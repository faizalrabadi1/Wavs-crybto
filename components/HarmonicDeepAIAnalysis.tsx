
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { HarmonicPatternAnalysis } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    analysis: HarmonicPatternAnalysis;
    pair: string;
    timeframe: string;
}

const buildPrompt = (analysis: HarmonicPatternAnalysis, pair: string): string => {
    return `
أنت خبير في "نماذج الهارمونيك" والتداول الهندسي (Scott Carney Style). مهمتك هي تحليل النموذج المكتشف التالي لزوج ${pair} وتقديم تقييم استراتيجي دقيق.

**بيانات النموذج:**
- **النموذج:** ${analysis.patternName}
- **منطقة الانعكاس (PRZ):** ${analysis.potentialReversalZone?.start.toFixed(4)} - ${analysis.potentialReversalZone?.end.toFixed(4)}
- **مؤشر جودة النمط (HSI):** ${analysis.hsiScore?.toFixed(0)}/100
- **التماثل الزمني (Time Symmetry):** ${analysis.timeSymmetryScore?.toFixed(0)}%
- **حالة RSI:** ${analysis.rsiConfirmation?.status} (${analysis.rsiConfirmation?.value.toFixed(2)})
- **محفز الدخول (Trigger):** ${analysis.entryTrigger || 'لم يتشكل بعد'}
- **حالة BAMM:** ${analysis.isBammActive ? 'نشطة (تأكيد مغناطيسي)' : 'غير نشطة'}

**المطلوب (تقرير قصير بالعربية):**
1.  **تقييم الصلاحية:** هل يعتبر هذا النموذج "مثالي" أم "قسري" بناءً على درجة HSI والتماثل الزمني؟
2.  **تحليل PRZ:** كيف يجب التعامل مع منطقة الانعكاس الحالية؟ هل ندخل فوراً أم ننتظر تأكيداً إضافياً؟
3.  **نصيحة BAMM:** إذا كانت حالة BAMM نشطة، اشرح كيفية استغلالها. إذا لم تكن، ماذا ينقص لتفعيلها؟
4.  **القرار النهائي:** شراء / بيع / انتظار، مع تحديد مستوى وقف الخسارة المقترح بدقة.
`;
};

const HarmonicDeepAIAnalysis: React.FC<Props> = ({ analysis, pair, timeframe }) => {
    const [aiReport, setAiReport] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!analysis.detected) return;

        const generateReport = async () => {
            setIsLoading(true);
            setError(null);
            setAiReport('');

            const cacheKey = `harmonic-ai-${pair}-${timeframe}-${analysis.patternName}`;
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
                const prompt = buildPrompt(analysis, pair);
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setCachedAiResponse(cacheKey, response.text);
                setAiReport(response.text);

            } catch (err: any) {
                console.error("Error generating Harmonic AI analysis:", err);
                setError("فشل في توليد تحليل الهارمونيك الذكي.");
            } finally {
                setIsLoading(false);
            }
        };
        
        generateReport();

    }, [analysis, pair, timeframe]);

    return (
        <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30 mt-4">
            <h4 className="text-base font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                <span>المحلل الاستراتيجي الذكي (Harmonic Strategist)</span>
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

export default HarmonicDeepAIAnalysis;
