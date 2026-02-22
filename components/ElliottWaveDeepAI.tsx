
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { ElliottWaveScenario } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    pair: string;
    scenario: ElliottWaveScenario;
    confidence: number;
}

const ElliottWaveDeepAI: React.FC<Props> = ({ pair, scenario, confidence }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = async () => {
        setIsLoading(true);
        setError(null);
        
        const cacheKey = `ew-ai-v2-${pair}-${scenario.type}`;
        const cached = getCachedAiResponse(cacheKey);
        if(cached) {
            setAnalysis(cached);
            setIsLoading(false);
            return;
        }

        try {
            if (!process.env.API_KEY) throw new Error("API Key missing");
            
            const prompt = `
            بصفتك خبيرًا عالميًا في "موجات إليوت" (Elliott Wave Theorist)، قم بتحليل هذا السيناريو لزوج ${pair}:
            
            **البيانات الفنية:**
            - **النوع:** ${scenario.type}
            - **الموجة الحالية:** ${scenario.currentWaveLabel}
            - **مستوى الإلغاء (Invalidation):** ${scenario.invalidationLevel}
            - **الأهداف (Targets):** ${scenario.targets.map(t => `${t.level} at ${t.price}`).join(', ')}
            
            **المطلوب (تقرير استراتيجي قصير بالعربية):**
            1. **تقييم البنية:** هل هذا التركيب الموجي "مثالي" أم "مشوه"؟ ولماذا؟
            2. **إدارة المخاطر:** كيف يجب التعامل مع مستوى الإلغاء؟ هل هو وقف خسارة صارم؟
            3. **النصيحة:** بناءً على موقعنا في الموجة، هل نحن في مرحلة تجميع، تسارع، أم تصريف؟
            `;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
            
            setAnalysis(response.text);
            setCachedAiResponse(cacheKey, response.text);

        } catch (err: any) {
            if (err.message?.includes('429') || err.status === 429 || err.code === 429) {
                setError("⚠️ تم تجاوز حد الاستخدام (Quota Exceeded).");
            } else {
                setError("تعذر الاتصال بالمحلل الذكي.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-4 border-t border-gray-800 pt-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <span>🧠</span> المحلل الاستراتيجي الذكي (AI Wave Strategist)
                </h4>
                {!analysis && !isLoading && (
                    <button 
                        onClick={runAnalysis}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                    >
                        طلب استشارة
                    </button>
                )}
            </div>

            {isLoading && <div className="text-xs text-cyan-500 animate-pulse">جاري استشارة نموذج الذكاء الاصطناعي...</div>}
            {error && <div className="text-xs text-red-400">{error}</div>}
            
            {analysis && (
                <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {analysis}
                </div>
            )}
        </div>
    );
};

export default ElliottWaveDeepAI;
