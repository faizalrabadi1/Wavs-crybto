import React from 'react';
import type { ShortSqueezeCandidate, ScannerCandidate, MarketAnalysis } from '../types';

interface ShortSqueezeScannerProps {
    candidates: ShortSqueezeCandidate[];
    onAnalyze: (candidate: ScannerCandidate) => void;
    analysisData: MarketAnalysis;
    nextScanCountdown: number;
}

const PressureGauge: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.max(0, Math.min(100, value));
    const barColor = percentage > 85 ? 'bg-red-500' : percentage > 65 ? 'bg-orange-500' : 'bg-yellow-500';
    const glowColor = percentage > 85 ? 'shadow-red-500/50' : percentage > 65 ? 'shadow-orange-500/50' : 'shadow-yellow-500/50';

    return (
        <div className="w-full">
            <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${barColor} ${glowColor}`}
                    style={{ width: `${percentage}%`, boxShadow: `0 0 8px var(--glow-color)` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">منخفض</span>
                <span className="font-bold" style={{ color: `var(--bar-color, #fff)` }}>{Math.round(percentage)}%</span>
                <span className="text-gray-400">مرتفع</span>
            </div>
        </div>
    );
};

const ShortSqueezeScanner: React.FC<ShortSqueezeScannerProps> = ({ candidates, onAnalyze, analysisData, nextScanCountdown }) => {

    const handleAnalyzeClick = (candidate: ShortSqueezeCandidate) => {
        const fullAnalysis = analysisData[candidate.pair]?.[candidate.timeframe];
        if (fullAnalysis) {
            onAnalyze({
                pair: candidate.pair,
                timeframe: candidate.timeframe,
                analysis: fullAnalysis,
                price: candidate.price,
                confidence: candidate.analysis.squeezePressure // Use squeeze pressure as confidence
            });
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" transform="rotate(-90 12 12)" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7 7 7" />
                    </svg>
                    <h2 className="text-xl font-bold text-white">كاشف Short Squeeze</h2>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-400 self-end sm:self-center" title="سيتم تحديث البيانات تلقائيًا">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="hidden sm:inline">التحديث القادم في:</span>
                    <span className="font-semibold text-cyan-glow w-6 text-center">{nextScanCountdown}s</span>
                </div>
            </div>
            {candidates.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">جاري البحث عن عملات ذات ضغط بيعي عالٍ...</p>
                    <p className="text-xs text-gray-500 mt-1">لا توجد فرص واضحة لـ Short Squeeze حاليًا على الأطر الزمنية 4h و 1d.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {candidates.map((candidate) => {
                        const { pair, timeframe, analysis } = candidate;
                        const pressure = analysis.squeezePressure;

                        return (
                            <div key={`${pair}-${timeframe}`}
                                className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 hover:border-orange-500 hover:shadow-orange-500/20">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-lg font-bold text-white">{pair}</p>
                                            <p className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full inline-block mt-1">{timeframe}</p>
                                        </div>
                                    </div>
                                    <div className="my-4">
                                        <h4 className="text-sm font-semibold text-white mb-2 text-center">مستوى ضغط البائعين</h4>
                                        <PressureGauge value={pressure} />
                                    </div>
                                    <div className="text-xs font-mono text-gray-300 space-y-1 bg-gray-900/50 p-2 rounded-md border border-gray-700/50">
                                        <p className="flex justify-between">مؤشر البيع على المكشوف: <span className="font-bold text-orange-400">{analysis.shortInterestIndex.toFixed(1)}%</span></p>
                                        <p className="flex justify-between">أيام التغطية: <span className="font-bold text-orange-400">{analysis.daysToCover.toFixed(2)}</span></p>
                                        <p className="flex justify-between">معدل التمويل: <span className="font-bold text-orange-400">{analysis.fundingRate.toFixed(4)}%</span></p>
                                        <p className="flex justify-between">تكلفة الاقتراض: <span className="font-bold text-orange-400">{analysis.costToBorrow.toFixed(2)}%</span></p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAnalyzeClick(candidate)}
                                    className="mt-4 w-full bg-orange-500/20 text-orange-400 text-sm font-semibold py-2 rounded-md border border-orange-500/50 hover:bg-orange-500/40 transition-colors">
                                    تحليل معمق
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ShortSqueezeScanner;