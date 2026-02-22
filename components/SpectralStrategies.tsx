
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { ScannerCandidate, BacktestResult, FullInstantaneousAnalysis } from '../types';
import { PREDEFINED_STRATEGIES, runAllBacktests } from '../services/strategyBacktestService';
import { getInstantaneousAnalysis } from '../services/microExplosionService';
import InstantaneousAnalysis from './InstantaneousAnalysis';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';
import LiveSignalMonitor from './LiveSignalMonitor';

interface Props {
    candidate: ScannerCandidate;
}

const getResultColorClass = (value: number, type: 'winRate' | 'profitFactor') => {
    if (type === 'winRate') {
        if (value >= 65) return 'text-green-400';
        if (value >= 50) return 'text-yellow-400';
        return 'text-red-400';
    }
    if (type === 'profitFactor') {
        if (value >= 2.0) return 'text-green-400';
        if (value >= 1.5) return 'text-yellow-400';
        return 'text-red-400';
    }
    return 'text-white';
};

const getAIAnalysisPrompt = (
    candidate: ScannerCandidate,
    backtestResults: BacktestResult[]
): string => {
    const { pair, timeframe, analysis } = candidate;

    const resultsText = backtestResults.map(r => 
        `- **${r.strategyName}:**
    - **معدل النجاح:** ${r.winRate}%
    - **عامل الربح:** ${r.profitFactor}
    - **صافي الربح:** ${r.netProfit}%`
    ).join('\n');

    const strategiesText = PREDEFINED_STRATEGIES.map(s => `- **${s.name}:** ${s.description}`).join('\n');

    return `
أنت خبير استراتيجي في التداول الكمي. مهمتك هي تحليل نتائج الاختبار التاريخي (Backtesting) لعدة استراتيجيات على زوج ${pair} وابتكار استراتيجية مخصصة ومحسنة.

**1. الاستراتيجيات التي تم اختبارها:**
${strategiesText}

**2. نتائج الاختبار التاريخي:**
${resultsText}

**3. الظروف الحالية للسوق:**
- **الحالة الطيفية:** ${analysis.state}
- **الزخم (20 شمعة):** ${analysis.momentum.toFixed(2)}%
- **زاوية الطور:** ${analysis.currentPhaseAngle.toFixed(0)}°
- **مؤشر النظام (قوة الاتجاه):** ${analysis.regimeScore.toFixed(2)}

**المهمة:**
بناءً على نتائج الاختبار التاريخي والظروف الحالية، قم بإنشاء "استراتيجية WaveSight المثالية" لهذا الزوج.
1.  **اختر أفضل استراتيجية أساسية:** حدد أي من الاستراتيجيات المختبرة هي الأنسب كقاعدة بناءً على نتائجها.
2.  **اقترح تحسينات دقيقة:** اقترح معايير إضافية أو تعديلات على الاستراتيجية الأساسية لجعلها أكثر فعالية. استخدم البيانات الحالية (الزخم، الطور، النظام) كأمثلة.
3.  **لخص الاستراتيجية النهائية:** قدم ملخصًا واضحًا وموجزًا للاستراتيجية النهائية المقترحة في شكل نقاط (شروط الدخول، شروط الخروج/جني الأرباح، وقف الخسارة). يجب أن يكون الناتج باللغة العربية.
`;
};


const SpectralStrategies: React.FC<Props> = ({ candidate }) => {
    const [backtestResults, setBacktestResults] = useState<BacktestResult[] | null>(null);
    const [instantaneousAnalysis, setInstantaneousAnalysis] = useState<FullInstantaneousAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiSuggestion, setAiSuggestion] = useState<string>('');

    useEffect(() => {
        const fetchAllAnalyses = async () => {
            if (!candidate) return;
            setIsLoading(true);
            setError(null);
            setAiSuggestion('');
            setBacktestResults(null);
            setInstantaneousAnalysis(null);

            try {
                // Run backtests and instantaneous analysis in parallel
                const backtestPromise = runAllBacktests(candidate.pair, []);
                // Use candidate.price directly as the mock service only needs the latest price
                const instantaneousPromise = Promise.resolve(getInstantaneousAnalysis(candidate.pair, candidate.price));
                
                const [backtests, instantaneous] = await Promise.all([backtestPromise, instantaneousPromise]);

                setBacktestResults(backtests);
                setInstantaneousAnalysis(instantaneous);

            } catch (err) {
                console.error("Error running spectral strategies analysis:", err);
                setError("فشل في إجراء التحليلات المتقدمة.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllAnalyses();
    }, [candidate]);

    const handleFindBestStrategy = async () => {
        if (!backtestResults) return;
        setIsAiLoading(true);
        setAiSuggestion('');
        setError(null);

        const cacheKey = `strategy-${candidate.pair}-${candidate.timeframe}`;
        const cached = getCachedAiResponse(cacheKey);
        if (cached) {
            setAiSuggestion(cached);
            setIsAiLoading(false);
            return;
        }

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key is not configured.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = getAIAnalysisPrompt(candidate, backtestResults);
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
            });
            
            setCachedAiResponse(cacheKey, response.text);
            setAiSuggestion(response.text);
        } catch (err: any) {
            console.error("Error generating AI strategy:", err);
            if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
                setError("تم تجاوز حد الطلبات لواجهة برمجة التطبيقات. يرجى الانتظار لحظة ثم المحاولة مرة أخرى.");
            } else {
                 setError("فشل في توليد الاستراتيجية المقترحة. قد تكون هناك مشكلة في الاتصال بالخدمة.");
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3" />
                </svg>
                <span>مختبر الاستراتيجيات الطيفية</span>
            </h3>

            <LiveSignalMonitor macdAnalysis={candidate.analysis.macdAnalysis} />

            {isLoading && <p className="text-sm text-gray-400 text-center mt-6">جاري إجراء الاختبار التاريخي والتحليل اللحظي...</p>}
            {error && <p className="text-sm text-red-400 text-center mt-6">{error}</p>}

            {!isLoading && backtestResults && (
                <div className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {backtestResults.map(result => (
                            <div key={result.strategyName} className="bg-gray-800/70 p-3 rounded-md border border-gray-700 text-center">
                                <p className="font-bold text-white text-base">{result.strategyName}</p>
                                <div className="mt-2 text-xs font-mono grid grid-cols-2 gap-x-2 gap-y-1">
                                    <span className="text-gray-400">معدل النجاح:</span>
                                    <span className={getResultColorClass(result.winRate, 'winRate')}>{result.winRate.toFixed(1)}%</span>
                                    <span className="text-gray-400">عامل الربح:</span>
                                    <span className={getResultColorClass(result.profitFactor, 'profitFactor')}>{result.profitFactor.toFixed(2)}</span>
                                    <span className="text-gray-400">صافي الربح:</span>
                                    <span className="text-cyan-glow">{result.netProfit.toFixed(1)}%</span>
                                    <span className="text-gray-400">عدد الصفقات:</span>
                                    <span className="text-white">{result.trades}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4">
                        {!isAiLoading && !aiSuggestion && (
                            <button
                                onClick={handleFindBestStrategy}
                                className="w-full bg-cyan-glow/20 text-cyan-glow text-sm font-semibold py-2.5 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors flex items-center justify-center space-x-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                <span>ابحث عن الاستراتيجية المثالية (بواسطة AI)</span>
                            </button>
                        )}

                        {isAiLoading && (
                             <div className="space-y-3 animate-pulse pt-2 bg-gray-800 p-4 rounded-md">
                                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-700 rounded w-full"></div>
                                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                            </div>
                        )}
                        
                        {aiSuggestion && (
                             <div className="bg-gray-800 p-4 rounded-lg border border-cyan-glow/30 mt-4">
                                <h4 className="text-base font-semibold text-white mb-2">استراتيجية WaveSight المثالية المقترحة</h4>
                                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed" dir="rtl">
                                    {aiSuggestion}
                                </div>
                            </div>
                        )}
                         {error && !isAiLoading && <p className="text-sm text-red-400 text-center mt-4">{error}</p>}
                    </div>
                </div>
            )}
            
            <InstantaneousAnalysis analysis={instantaneousAnalysis} />
        </div>
    );
};

export default SpectralStrategies;
