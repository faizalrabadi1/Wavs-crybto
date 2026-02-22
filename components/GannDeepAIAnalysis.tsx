
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { CurrencyData } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    pairMarketData: CurrencyData;
}

const GannDeepAIAnalysis: React.FC<Props> = ({ pairMarketData }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<string>('');

    const handleRunAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setReport('');

        const cacheKey = `gann-deep-ai-v2-${pairMarketData.pair}`;
        const cached = getCachedAiResponse(cacheKey);
        if (cached) {
            setReport(cached);
            setIsLoading(false);
            return;
        }

        try {
            const longTimeframe = ['3d', '1w', '1d', '12h', '4h'].find(tf => pairMarketData.candles[tf] && pairMarketData.candles[tf].length > 200);
            if (!longTimeframe) {
                throw new Error("لا توجد بيانات تاريخية كافية (على الأقل 200 شمعة على إطار 4h أو أعلى) لإجراء هذا التحليل العميق.");
            }

            const prompt = `أنت "W.D. Gann AI"، الأسطورة الحية في التحليل الزمني والهندسي. مهمتك هي إجراء تحليل "نفق جان" (Gann Tunnel) العميق لزوج ${pairMarketData.pair}.

**الهدف:** الكشف عن الزاوية الهندسية "السائدة" تاريخيًا وتحديد موعد التربيع القادم.

**المهمة المطلوبة (تقرير احترافي بالعربية):**

**1. تحليل احترام الزوايا (Gann Angle Respect):**
- **العنوان:** "### 1. بصمة الزاوية التاريخية"
- **المحتوى:** لو افترضنا أننا رسمنا مروحة من أدنى قاع تاريخي، أي زاوية احترمها السعر أكثر في الاتجاهات الصاعدة السابقة؟ (هل هي 1x1 الصارمة، أم 2x1 السريعة، أم 1x2 البطيئة؟). حدد "شخصية" هذا الأصل (سريع/بطيء).

**2. نفق جان (The Gann Tunnel):**
- **العنوان:** "### 2. نفق جان ومناطق الاهتزاز"
- **المحتوى:** تخيل قناة سعرية مبنية على زوايا 1x1 و 1x2. أين يقع السعر الحالي بالنسبة لهذا النفق؟ هل هو في "النصف العلوي" (قوة) أم "النصف السفلي" (ضعف)؟ هل يقترب من جدار النفق (دعم/مقاومة هندسية)؟

**3. التربيع العظيم (The Grand Squaring):**
- **العنوان:** "### 3. موعد التربيع العظيم القادم"
- **المحتوى:** بناءً على القمم والقيعان السابقة، متى تتوقع أن يتساوى السعر مع الزمن في المستقبل القريب (Squaring of Price and Time)؟ حدد تاريخًا تقريبيًا ومستوى سعريًا مستهدفًا لهذا الحدث.

**4. استراتيجية الدورة الزمنية:**
- **العنوان:** "### 4. استراتيجية الدورة القادمة"
- **المحتوى:** هل نحن في دورة توسع أم انكماش؟ قدم نصيحة للمتداول بناءً على موقعنا في "عجلة الوقت".`;

            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });

            setCachedAiResponse(cacheKey, response.text);
            setReport(response.text);

        } catch (err: any) {
            console.error("Error in Gann deep AI analysis:", err);
            setError(err.message.includes('RESOURCE_EXHAUSTED') ? "تم تجاوز حد الطلبات لواجهة برمجة التطبيقات." : err.message || "فشل في إجراء التحليل العميق.");
        } finally {
            setIsLoading(false);
        }

    }, [pairMarketData]);

    return (
        <div className="mt-6 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m6 4v4m-2-2h4M12 3v1m0 16v1m-6.364-2.364l.707-.707M6.343 6.343l-.707-.707m12.728 0l.707-.707M17.657 17.657l.707.707M18 12h1M5 12H4" /></svg>
                <span>محرك جان للتحليل العميق (Gann Tunnel AI)</span>
            </h3>

            <div className="bg-gray-800/50 p-4 rounded-lg">
                {!report && !isLoading && (
                    <div className="text-center">
                        <p className="text-gray-400 mb-4">تحليل ذكاء اصطناعي يكشف الزوايا التاريخية المسيطرة ومواعيد "التربيع العظيم".</p>
                        <button onClick={handleRunAnalysis} className="px-6 py-2 bg-yellow-glow/20 text-yellow-glow rounded-md border border-yellow-glow/50 hover:bg-yellow-glow/40 transition-colors font-semibold">
                            تشغيل تحليل النفق والزوايا
                        </button>
                    </div>
                )}
                {isLoading && (
                    <div className="text-center text-yellow-glow animate-pulse">يقوم "Gann AI" بحساب زوايا الاهتزاز التاريخية...</div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-center text-red-300">{error}</div>
                )}
                {report && (
                    <div className="text-sm text-gray-300">
                        {report.split('###').map((part, index) => {
                            if (index === 0 && !part.trim()) return null;
                            const contentSplit = part.split('\n');
                            const title = contentSplit.shift()?.trim();
                            const content = contentSplit.join('\n').trim();
                            return (
                                <div key={index} className="mt-4">
                                    <h4 className="font-semibold text-cyan-glow mb-2">{title}</h4>
                                    <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{content}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GannDeepAIAnalysis;
