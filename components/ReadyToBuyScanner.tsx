import React, { useMemo } from 'react';
import type { ConvergenceSignal } from '../types';

interface Props {
    candidates: ConvergenceSignal[];
    onAnalyze: (candidate: any) => void;
    isLoading: boolean;
    nextScanCountdown: number;
}

const ReadyToBuyScanner: React.FC<Props> = ({ candidates, onAnalyze, isLoading, nextScanCountdown }) => {
    
    // Filter for only strong BUY signals (A+ or A tier)
    const readyToBuy = useMemo(() => {
        return candidates.filter(c => 
            (c.signalTier === 'A+' || c.signalTier === 'A') && 
            c.convergenceScore > 75
        );
    }, [candidates]);

    return (
        <div className="p-4 bg-gray-900 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        الماسح الذهبي: عملات جاهزة للشراء
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">يظهر فقط الفرص ذات الثقة العالية (A+ / A) من فحص جميع عملات الفيوتشر.</p>
                </div>
                <div className="text-left">
                    <div className="text-xs text-gray-500">تحديث تلقائي خلال</div>
                    <div className="text-xl font-mono font-bold text-cyan-400">{nextScanCountdown}s</div>
                </div>
            </div>

            {isLoading && readyToBuy.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                    <p className="text-gray-400 animate-pulse">جاري مسح السوق بالكامل (قد يستغرق دقيقة)...</p>
                </div>
            ) : readyToBuy.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-gray-800/30 rounded-2xl border border-gray-700 border-dashed">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-400 text-lg">لا توجد فرص "ذهبية" حالياً.</p>
                    <p className="text-gray-500 text-sm mt-2">السوق قد يكون متذبذباً أو في حالة انتظار. تحقق لاحقاً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {readyToBuy.map((signal) => (
                        <div key={signal.pair} className="bg-gray-800 rounded-xl border border-green-500/30 overflow-hidden hover:border-green-400 transition-all hover:shadow-lg hover:shadow-green-900/20 group">
                            <div className="p-4 border-b border-gray-700 flex justify-between items-start bg-gray-800/50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-white">{signal.pair.split('/')[0]}</h3>
                                        <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">USDT</span>
                                    </div>
                                    <p className="text-2xl font-mono font-bold text-white mt-1">${signal.price.toFixed(4)}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${signal.signalTier === 'A+' ? 'bg-green-500 text-black' : 'bg-green-900 text-green-300'}`}>
                                        Tier {signal.signalTier}
                                    </span>
                                    <span className="text-xs text-green-400 mt-1 font-mono">{signal.convergenceScore}% ثقة</span>
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">الإطار الأفضل:</span>
                                    <span className="text-white font-bold">{signal.bestTimeframe}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">الدافع الرئيسي:</span>
                                    <span className="text-cyan-400">{signal.primaryDriver.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">تأكيد الحجم:</span>
                                    <span className={`${signal.volumeConfirmation === 'Strong' ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {signal.volumeConfirmation}
                                    </span>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t border-gray-700">
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {signal.strategies.map(s => (
                                            <span key={s} className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full text-gray-300 border border-gray-600">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => onAnalyze({ pair: signal.pair, timeframe: signal.bestTimeframe, analysis: signal.analysis, price: signal.price })}
                                        className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        تحليل الصفقة
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReadyToBuyScanner;
