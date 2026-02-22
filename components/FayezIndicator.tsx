
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { ScannerCandidate, MarketData, FayezPredictionResult, FayezScenario } from '../types';
import { runFayezInference } from '../services/fayezBacktestService';
import PredictedCandlestickChart from './PredictedCandlestickChart';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    candidate: ScannerCandidate;
    marketData: MarketData;
}

const ScenarioBadge: React.FC<{ type: string, probability: number, isActive: boolean, onClick: () => void }> = ({ type, probability, isActive, onClick }) => {
    const color = type === 'Bullish' ? 'green' : type === 'Bearish' ? 'red' : 'yellow';
    return (
        <button 
            onClick={onClick}
            className={`flex-1 p-3 rounded-lg border transition-all duration-300 flex flex-col items-center justify-center ${isActive ? `bg-${color}-500/20 border-${color}-500 shadow-lg shadow-${color}-500/20` : 'bg-gray-800 border-gray-700 opacity-60 hover:opacity-100'}`}
        >
            <span className={`text-sm font-bold ${type === 'Bullish' ? 'text-green-400' : type === 'Bearish' ? 'text-red-400' : 'text-yellow-400'}`}>
                {type === 'Bullish' ? 'سيناريو الصعود' : type === 'Bearish' ? 'سيناريو الهبوط' : 'سيناريو التذبذب'}
            </span>
            <span className="text-xs text-gray-300 mt-1">احتمالية: {Math.round(probability)}%</span>
        </button>
    );
};

const FayezIndicator: React.FC<Props> = ({ candidate, marketData }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prediction, setPrediction] = useState<FayezPredictionResult | null>(null);
    const [activeScenario, setActiveScenario] = useState<FayezScenario | null>(null);
    const [aiNarrative, setAiNarrative] = useState<string>('');
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current || !candidate) return;
        hasRun.current = true;

        const runEngine = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                const allCandles = marketData[candidate.pair]?.candles[candidate.timeframe];
                if (!allCandles || allCandles.length < 100) throw new Error("بيانات غير كافية.");

                // 1. Run Math Engine
                const result = await runFayezInference(candidate.pair, allCandles);
                setPrediction(result);
                setActiveScenario(result.mainScenario);

                // 2. Run AI Narrative Layer
                const cacheKey = `fayez-v5-narrative-${candidate.pair}-${candidate.timeframe}`;
                const cached = getCachedAiResponse(cacheKey);
                
                if (cached) {
                    setAiNarrative(cached);
                } else if (process.env.API_KEY) {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = `
أنت "مؤشر فايز V5.0"، نظام ذكاء اصطناعي كمي (Quantitative AI). لقد قام محركك الرياضي بحساب التوقعات التالية لزوج ${candidate.pair} (${candidate.timeframe}):

**البيانات الرياضية:**
- **السيناريو الرئيسي:** ${result.mainScenario.type} (احتمالية ${result.mainScenario.probability.toFixed(0)}%)
- **الهدف السعري:** ${result.mainScenario.targetPrice.toFixed(4)}
- **التطابق التاريخي:** ${result.historicalMatch.similarity.toFixed(1)}% مع حركة بتاريخ ${result.historicalMatch.date} (${result.historicalMatch.outcome}).
- **زاوية الطور الحالية:** ${candidate.analysis.currentPhaseAngle.toFixed(0)}°

**المهمة:**
اكتب تقريرًا استراتيجيًا قصيرًا ومكثفًا جدًا (فقرة واحدة أو فقرتين) يشرح *لماذا* اختار النموذج الرياضي هذا السيناريو تحديدًا. اربط بين "الذاكرة التاريخية" للعملة والوضع الحالي. كن حازمًا وواضحًا. اللغة: العربية.
                    `;
                    const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
                    setAiNarrative(response.text);
                    setCachedAiResponse(cacheKey, response.text);
                }

            } catch (err: any) {
                console.error("Fayez Engine Error:", err);
                setError(err.message || "فشل في تشغيل المحرك.");
            } finally {
                setIsLoading(false);
            }
        };

        runEngine();
    }, [candidate, marketData]);

    if (isLoading) {
        return (
            <div className="mt-6 p-8 bg-gray-900 border border-gray-700 rounded-lg text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-glow mb-4"></div>
                <p className="text-cyan-glow font-mono animate-pulse">جاري تشغيل محرك فايز V5.0...</p>
                <p className="text-xs text-gray-500 mt-2">محاكاة مونت كارلو • مطابقة الأنماط التاريخية • الاستنتاج الكمي</p>
            </div>
        );
    }

    if (error || !prediction || !activeScenario) {
        return <div className="mt-6 p-4 bg-red-900/20 text-red-400 text-center rounded border border-red-900/50">{error || "خطأ غير معروف"}</div>;
    }

    const historicalCandles = marketData[candidate.pair]?.candles[candidate.timeframe]?.slice(-40) || [];

    return (
        <div className="mt-6 bg-gray-900 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl shadow-cyan-900/20">
            {/* Header */}
            <div className="bg-gray-800/80 p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">مؤشر فايز للتوقع المستقبلي (V5.0)</span>
                </h3>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">تطابق تاريخي: <span className="text-white font-bold">{prediction.historicalMatch.similarity.toFixed(0)}%</span></span>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">الثقة: <span className={`${prediction.confidenceScore > 75 ? 'text-green-400' : 'text-yellow-400'} font-bold`}>{prediction.confidenceScore}%</span></span>
                </div>
            </div>

            <div className="p-6">
                {/* Main Chart Area */}
                <div className="mb-6 relative">
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                         <span className="px-2 py-1 bg-gray-900/80 text-xs text-cyan-glow border border-cyan-500/30 rounded">مسار السعر المتوقع</span>
                    </div>
                    <div className="h-72 w-full bg-gradient-to-b from-gray-800/50 to-gray-900/50 rounded-lg border border-gray-700/50 p-2">
                         <PredictedCandlestickChart 
                            historicalCandles={historicalCandles} 
                            predictedCandles={activeScenario.path} 
                         />
                    </div>
                </div>

                {/* Scenarios Selector */}
                <div className="flex gap-4 mb-6 overflow-x-auto">
                    <ScenarioBadge 
                        type={prediction.mainScenario.type} 
                        probability={prediction.mainScenario.probability} 
                        isActive={activeScenario.type === prediction.mainScenario.type} 
                        onClick={() => setActiveScenario(prediction.mainScenario)} 
                    />
                    {prediction.alternativeScenarios.map((sc, i) => (
                         <ScenarioBadge 
                            key={i}
                            type={sc.type} 
                            probability={sc.probability} 
                            isActive={activeScenario.type === sc.type} 
                            onClick={() => setActiveScenario(sc)} 
                        />
                    ))}
                </div>

                {/* AI Narrative */}
                <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        التحليل الاستراتيجي الذكي
                    </h4>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        {aiNarrative || "جاري توليد التحليل..."}
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-between text-xs text-gray-500 font-mono">
                        <span>الهدف المتوقع: {activeScenario.targetPrice.toFixed(4)}</span>
                        <span>مستويات التذبذب: ±{((prediction.volatilityCone.upper[0] - prediction.volatilityCone.lower[0])/prediction.volatilityCone.upper[0]*100).toFixed(2)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FayezIndicator;
