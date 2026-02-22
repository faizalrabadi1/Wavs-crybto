
import React from 'react';
import type { IchimokuAnalysis } from '../types';

interface Props {
    analysis: IchimokuAnalysis;
    currentPrice: number;
}

const IchimokuAnalysisView: React.FC<Props> = ({ analysis, currentPrice }) => {
    if (!analysis) return null;
    
    const { lines, signals, trendState, cloudState, balanceScore, summary, recommendation } = analysis;
    
    const getBalanceColor = (score: number) => {
        if (score > 60) return 'text-green-400';
        if (score < 40) return 'text-red-400';
        return 'text-yellow-400';
    };

    const getRecommendationUI = (rec: 'Buy' | 'Sell' | 'Wait') => {
        switch (rec) {
            case 'Buy': return { text: 'شراء قوي', bg: 'bg-green-500/20', textCol: 'text-green-300', border: 'border-green-500/50' };
            case 'Sell': return { text: 'بيع قوي', bg: 'bg-red-500/20', textCol: 'text-red-300', border: 'border-red-500/50' };
            default: return { text: 'انتظار', bg: 'bg-yellow-500/20', textCol: 'text-yellow-300', border: 'border-yellow-500/50' };
        }
    };

    const recUI = getRecommendationUI(recommendation);

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span>نظام سحابة إيشيموكو (Ichimoku Kinko Hyo)</span>
                </h3>
                <div className={`px-3 py-1 rounded-full text-sm font-bold border ${recUI.bg} ${recUI.textCol} ${recUI.border}`}>
                    {recUI.text}
                </div>
            </div>
            
            <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 mb-4">{summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center relative overflow-hidden">
                    <h4 className="text-sm text-gray-400 z-10 relative">حالة التوازن (Balance Score)</h4>
                    <p className={`text-4xl font-bold font-mono mt-2 relative z-10 ${getBalanceColor(balanceScore)}`}>{balanceScore}</p>
                    <div className="w-full bg-gray-700 h-1 mt-2 rounded-full relative z-10">
                        <div className={`h-1 rounded-full transition-all duration-500 ${getBalanceColor(balanceScore).replace('text-', 'bg-')}`} style={{width: `${balanceScore}%`}}></div>
                    </div>
                    {/* Background Pulse */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-current opacity-5 rounded-full animate-pulse-slow pointer-events-none ${getBalanceColor(balanceScore)}`}></div>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
                     <h4 className="text-sm text-gray-400">سحابة المستقبل (Future Cloud)</h4>
                     <p className={`text-xl font-bold mt-2 ${cloudState === 'Bullish' ? 'text-green-400' : 'text-red-400'}`}>
                        {cloudState === 'Bullish' ? 'سحابة خضراء (دعم)' : 'سحابة حمراء (مقاومة)'}
                     </p>
                     <p className="text-xs text-gray-500 mt-1">توقعات الـ 26 شمعة القادمة</p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col justify-center space-y-2 font-mono text-xs">
                    <div className="flex justify-between"><span className="text-blue-300">Tenkan (Conversion):</span> <span className="text-white">{lines.tenkanSen.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-red-300">Kijun (Base):</span> <span className="text-white">{lines.kijunSen.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-green-300">Span A (Cloud Top):</span> <span className="text-white">{lines.senkouSpanA.toFixed(4)}</span></div>
                    <div className="flex justify-between"><span className="text-red-400">Span B (Cloud Base):</span> <span className="text-white">{lines.senkouSpanB.toFixed(4)}</span></div>
                </div>
            </div>
            
            {signals.length > 0 ? (
                <div>
                    <h4 className="text-base font-semibold text-white mb-2">الإشارات النشطة</h4>
                    <div className="space-y-2">
                        {signals.map((signal, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${signal.type === 'Bullish' ? 'bg-green-500/10 border-green-500/30' : signal.type === 'Bearish' ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800 border-gray-600'}`}>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`font-bold ${signal.type === 'Bullish' ? 'text-green-300' : signal.type === 'Bearish' ? 'text-red-300' : 'text-white'}`}>{signal.name}</span>
                                        {signal.strength === 'Strong' && <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-1.5 rounded border border-yellow-500/30">قوية</span>}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{signal.description}</p>
                                </div>
                                <div className="text-right">
                                     <span className={`text-xs font-mono px-2 py-1 rounded ${signal.type === 'Bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{signal.type}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                 <div className="text-center text-gray-500 py-4 border border-dashed border-gray-700 rounded-lg">
                    لا توجد تقاطعات رئيسية أو إشارات اختراق حالياً.
                </div>
            )}
            
            <div className="mt-4 p-3 bg-gray-800/30 rounded border border-gray-700/50 text-xs text-gray-400">
                <p>💡 <strong>استراتيجية:</strong> ابحث عن الصفقات عندما يكون السعر فوق السحابة (للشراء) وتكون السحابة المستقبلية خضراء، مع تقاطع Tenkan فوق Kijun.</p>
            </div>
        </div>
    );
};

export default IchimokuAnalysisView;
