import React, { useState, useEffect, useMemo } from 'react';
import type { MarketData, MarketAnalysis, AnalysisResult, LiveSignal } from '../types';
import { calculateLiveSignal } from '../services/liveSignalService';
import { GoogleGenAI } from '@google/genai';
import ElliottWaveAnalysisView from './ElliottWaveAnalysisView';
import { fetchAllUSDTFuturesPairs } from '../services/binanceService';

interface CustomAnalysisTerminalProps {
    marketData: MarketData;
    analysisData: MarketAnalysis;
    nextScanCountdown: number;
    initialPair?: string;
}

const CustomAnalysisTerminal: React.FC<CustomAnalysisTerminalProps> = ({ marketData, analysisData, nextScanCountdown, initialPair = 'PHB/USDT' }) => {
    const [pair, setPair] = useState<string>(initialPair);
    const [availablePairs, setAvailablePairs] = useState<string[]>([]);
    const [activeTimeframe, setActiveTimeframe] = useState<string>('1h');
    const [liveSignal, setLiveSignal] = useState<LiveSignal | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const loadPairs = async () => {
            const pairs = await fetchAllUSDTFuturesPairs();
            setAvailablePairs(pairs);
        };
        loadPairs();
    }, []);

    const data = marketData[pair];
    const analysis = analysisData[pair]?.[activeTimeframe];

    useEffect(() => {
        if (analysis && data) {
            const newSignal = calculateLiveSignal(analysis, data.price, data.change24h);
            setLiveSignal(newSignal);
        } else {
            setLiveSignal(null);
        }
    }, [analysis, data]);

    const handleGenerateAiSummary = async () => {
        if (!analysis || !data) return;
        setIsAiLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const prompt = `
                أنت محلل مالي خبير في العملات الرقمية. قم بتحليل عملة ${pair} بناءً على البيانات التالية وأعطني توصية نهائية واضحة (شراء، بيع، أو انتظار) مع الأسباب الرئيسية.
                السعر الحالي: ${data.price}
                التغير في 24 ساعة: ${data.change24h.toFixed(2)}%
                الإطار الزمني: ${activeTimeframe}
                
                المؤشرات الفنية:
                RSI: ${analysis.rsi?.toFixed(2) || 'غير متوفر'}
                MACD Histogram: ${analysis.macdHistogram?.toFixed(4) || 'غير متوفر'}
                
                تحليل ICT (Smart Money):
                ${analysis.ictAnalysis?.summary || 'لا يوجد إعداد حالي'}
                
                تحليل موجات إليوت:
                ${analysis.elliottWave?.summary || 'غير متوفر'}
                
                التحليل الطيفي (Spectral):
                الحالة: ${analysis.state}
                الزخم: ${analysis.momentum.toFixed(2)}
                
                تحليل السيولة:
                نسبة الحجم (RVOL): ${analysis.liquidityAnalysis?.volumeRatio.toFixed(2) || 'غير متوفر'}
                اتجاه التدفق: ${analysis.liquidityAnalysis?.flowDirection || 'غير متوفر'}
                
                يرجى تقديم ملخص احترافي وموجز باللغة العربية، مقسم إلى:
                1. نظرة عامة على السوق
                2. نقاط القوة والضعف
                3. التوصية النهائية (مع مستويات الدخول والأهداف ووقف الخسارة إن أمكن)
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
            });
            
            setAiSummary(response.text || "لم يتمكن الذكاء الاصطناعي من توليد ملخص.");
        } catch (error: any) {
            console.error("Error generating AI summary:", error);
            if (error.message?.includes('429') || error.status === 429 || error.code === 429) {
                setAiSummary("⚠️ تم تجاوز حد الاستخدام المجاني للذكاء الاصطناعي. يرجى المحاولة لاحقاً.");
            } else {
                setAiSummary("حدث خطأ أثناء توليد الملخص بالذكاء الاصطناعي.");
            }
        } finally {
            setIsAiLoading(false);
        }
    };

    if (!data || !analysis) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <div className="text-cyan-glow animate-pulse">جاري تحميل بيانات {pair}...</div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {availablePairs.length > 0 ? availablePairs.slice(0, 10).map(p => (
                        <button key={p} onClick={() => setPair(p)} className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-cyan-500 transition-colors whitespace-nowrap">
                            {p.split('/')[0]}
                        </button>
                    )) : (
                        <div className="text-xs text-gray-500">جاري تحميل قائمة العملات...</div>
                    )}
                </div>
            </div>
        );
    }

    const isPositive = data.change24h >= 0;
    const symbol = pair.split('/')[0];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-gray-800 border border-purple-500/30 rounded-2xl p-6 shadow-lg shadow-purple-900/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-purple-900/50 rounded-full flex items-center justify-center border border-purple-500 relative group cursor-pointer">
                        <span className="text-xl font-bold text-purple-400">{symbol}</span>
                         <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white">تغيير</span>
                        </div>
                        <select 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={pair}
                            onChange={(e) => setPair(e.target.value)}
                        >
                            {availablePairs.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold text-white tracking-tight">{pair}</h1>
                            <div className="relative">
                                <button className="text-gray-400 hover:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <select 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    value={pair}
                                    onChange={(e) => setPair(e.target.value)}
                                >
                                    {availablePairs.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">نظام التحليل المخصص المتكامل</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">السعر الحالي</p>
                        <p className="text-3xl font-mono font-bold text-white">${data.price.toFixed(4)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">التغير (24س)</p>
                        <p className={`text-2xl font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{data.change24h.toFixed(2)}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
                <div className="flex gap-2">
                    {['15m', '1h', '4h', '1d'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setActiveTimeframe(tf)}
                            className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${activeTimeframe === tf ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
                <div className="text-sm text-gray-400 font-mono flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                    تحديث بعد: {nextScanCountdown}ث
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Live Signal & AI */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Live Signal Card */}
                    <div className={`bg-gray-800 border rounded-2xl p-6 relative overflow-hidden ${
                        liveSignal?.side === 'BUY' ? 'border-green-500/50 shadow-lg shadow-green-900/20' :
                        liveSignal?.side === 'SELL' ? 'border-red-500/50 shadow-lg shadow-red-900/20' :
                        'border-gray-600'
                    }`}>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            إشارة التداول المباشرة
                        </h2>
                        
                        <div className="text-center mb-6">
                            <div className={`text-5xl font-black tracking-wider mb-2 ${
                                liveSignal?.side === 'BUY' ? 'text-green-400' :
                                liveSignal?.side === 'SELL' ? 'text-red-400' :
                                'text-gray-400'
                            }`}>
                                {liveSignal?.side === 'BUY' ? 'شراء' : liveSignal?.side === 'SELL' ? 'بيع' : 'انتظار'}
                            </div>
                            <div className="text-sm text-gray-400">
                                نسبة الثقة: <span className="font-mono text-white">{liveSignal?.confidence}%</span>
                            </div>
                        </div>

                        {liveSignal?.side !== 'WAIT' && (
                            <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">نقطة الدخول:</span>
                                    <span className="font-mono text-white">${liveSignal?.entry.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">الهدف الأول:</span>
                                    <span className="font-mono text-green-400">${liveSignal?.tp1.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">الهدف الثاني:</span>
                                    <span className="font-mono text-green-400">${liveSignal?.tp2.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">وقف الخسارة:</span>
                                    <span className="font-mono text-red-400">${liveSignal?.sl.toFixed(4)}</span>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <p className="text-xs text-gray-500 mb-2">أسباب الإشارة:</p>
                            <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                                {liveSignal?.reasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    </div>

                    {/* AI Summary Card */}
                    <div className="bg-gray-800 border border-blue-500/30 rounded-2xl p-6 shadow-lg shadow-blue-900/10">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                            المحلل الذكي (Gemini)
                        </h2>
                        
                        {!aiSummary ? (
                            <button 
                                onClick={handleGenerateAiSummary}
                                disabled={isAiLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                {isAiLoading ? (
                                    <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> جاري التحليل...</>
                                ) : (
                                    'توليد تقرير شامل'
                                )}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                                    {aiSummary}
                                </div>
                                <button 
                                    onClick={handleGenerateAiSummary}
                                    disabled={isAiLoading}
                                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
                                >
                                    {isAiLoading ? 'جاري التحديث...' : 'تحديث التقرير'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Analysis Details */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Technical Indicators */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                        <h3 className="text-md font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">المؤشرات الفنية</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">RSI (14)</span>
                                <span className={`font-mono font-bold ${analysis.rsi && analysis.rsi > 70 ? 'text-red-400' : analysis.rsi && analysis.rsi < 30 ? 'text-green-400' : 'text-white'}`}>
                                    {analysis.rsi?.toFixed(2) || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">MACD Histogram</span>
                                <span className={`font-mono font-bold ${analysis.macdHistogram && analysis.macdHistogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {analysis.macdHistogram?.toFixed(4) || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">قوة الحجم</span>
                                <span className="text-sm font-bold text-cyan-400">{analysis.volumeStrength || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Smart Money (ICT) */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                        <h3 className="text-md font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">الأموال الذكية (ICT)</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-300">{analysis.ictAnalysis?.summary || 'لا توجد بيانات كافية'}</p>
                            {analysis.ictAnalysis?.marketStructure && (
                                <div className="mt-2 text-xs bg-gray-900 p-2 rounded border border-gray-700">
                                    هيكل السوق: <span className={analysis.ictAnalysis.marketStructure === 'Bullish' ? 'text-green-400' : 'text-red-400'}>{analysis.ictAnalysis.marketStructure}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Elliott Wave */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                        <h3 className="text-md font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">موجات إليوت</h3>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-300">{analysis.elliottWave?.summary || 'لا توجد بيانات كافية'}</p>
                            {analysis.elliottWave?.currentWave && (
                                <div className="mt-2 text-xs bg-gray-900 p-2 rounded border border-gray-700">
                                    الموجة الحالية: <span className="text-yellow-400 font-bold">{analysis.elliottWave.currentWave}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Liquidity Analysis */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                        <h3 className="text-md font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">تحليل السيولة</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">RVOL (نسبة الحجم)</span>
                                <span className={`font-mono font-bold ${analysis.liquidityAnalysis && analysis.liquidityAnalysis.volumeRatio > 1.5 ? 'text-green-400' : 'text-white'}`}>
                                    {analysis.liquidityAnalysis?.volumeRatio.toFixed(2) || 'N/A'}x
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">اتجاه التدفق</span>
                                <span className={`text-sm font-bold ${analysis.liquidityAnalysis?.flowDirection === 'Inflow' ? 'text-green-400' : analysis.liquidityAnalysis?.flowDirection === 'Outflow' ? 'text-red-400' : 'text-gray-400'}`}>
                                    {analysis.liquidityAnalysis?.flowDirection || 'N/A'}
                                </span>
                            </div>
                            {analysis.liquidityAnalysis?.spikeDetected && (
                                <div className="mt-2 text-xs bg-yellow-900/30 text-yellow-400 p-2 rounded border border-yellow-700/50 text-center">
                                    ⚠️ تم رصد طفرة في السيولة
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Spectral Analysis */}
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 md:col-span-2">
                        <h3 className="text-md font-bold text-gray-200 mb-4 border-b border-gray-700 pb-2">التحليل الطيفي (Spectral)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 text-center">
                                <p className="text-xs text-gray-500 mb-1">حالة السوق</p>
                                <p className="text-sm font-bold text-cyan-400">{analysis.state}</p>
                            </div>
                            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 text-center">
                                <p className="text-xs text-gray-500 mb-1">الزخم</p>
                                <p className={`text-sm font-bold font-mono ${analysis.momentum > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {analysis.momentum.toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 text-center">
                                <p className="text-xs text-gray-500 mb-1">زاوية الطور</p>
                                <p className="text-sm font-bold font-mono text-white">
                                    {analysis.currentPhaseAngle.toFixed(0)}°
                                </p>
                            </div>
                            <div className="bg-gray-900 p-3 rounded-xl border border-gray-700 text-center">
                                <p className="text-xs text-gray-500 mb-1">قوة الدورة</p>
                                <p className="text-sm font-bold font-mono text-white">
                                    {analysis.dominantCyclePower.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CustomAnalysisTerminal;
