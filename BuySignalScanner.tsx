
import React from 'react';
import type { ScannerCandidate, ConvergenceSignal } from './types';

interface BuySignalScannerProps {
    candidates: ConvergenceSignal[];
    onAnalyze: (candidate: ScannerCandidate) => void;
    isLoading: boolean;
    nextScanCountdown: number;
}

const RiskRewardBar: React.FC<{ ratio: number }> = ({ ratio }) => {
    const risk = 1;
    const reward = ratio;
    const total = risk + reward;
    const riskPercent = (risk / total) * 100;
    const rewardPercent = (reward / total) * 100;

    return (
        <div className="w-full flex h-2 rounded-full overflow-hidden bg-gray-700" title={`Risk/Reward Ratio: 1 : ${ratio}`}>
            <div className="bg-red-500" style={{ width: `${riskPercent}%` }}></div>
            <div className="bg-green-500" style={{ width: `${rewardPercent}%` }}></div>
        </div>
    );
};

const SchoolBadge: React.FC<{ name: string }> = ({ name }) => {
    let colorClass = 'bg-gray-700 text-gray-300';
    if (name === 'Elliott') colorClass = 'bg-purple-500/20 text-purple-300 border border-purple-500/50';
    if (name === 'Harmonic') colorClass = 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50';
    if (name === 'Gann') colorClass = 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50';
    if (name === 'ICT') colorClass = 'bg-blue-500/20 text-blue-300 border border-blue-500/50';
    if (name === 'Wyckoff') colorClass = 'bg-pink-500/20 text-pink-300 border border-pink-500/50';
    if (name === 'Fractal') colorClass = 'bg-green-500/20 text-green-300 border border-green-500/50';
    
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colorClass}`}>
            {name}
        </span>
    );
};

const BuySignalScanner: React.FC<BuySignalScannerProps> = ({ candidates, onAnalyze, isLoading, nextScanCountdown }) => {

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div className="flex items-center space-x-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <h2 className="text-xl font-bold text-white">مصفوفة تقارب الإشارات (Signal Convergence Matrix)</h2>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-400 self-end sm:self-center" title="سيتم تحديث البيانات تلقائيًا">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">التحديث القادم في:</span>
                    <span className="font-semibold text-cyan-glow w-6 text-center">{nextScanCountdown}s</span>
                </div>
            </div>
            {isLoading ? (
                 <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400 animate-pulse">جاري تحليل جميع المدارس (Elliott, Gann, ICT, etc)...</p>
                    <p className="text-xs text-gray-500 mt-1">قد يستغرق هذا بضع لحظات إضافية.</p>
                </div>
            ) : candidates.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">جاري البحث عن إشارات شراء قوية ومؤكدة...</p>
                    <p className="text-xs text-gray-500 mt-1">لم يتم اكتشاف أي إشارات شراء واضحة حاليًا.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {candidates.map((candidate) => {
                        const { pair, signalTier, convergenceScore, convergingTimeframes, primaryDriver, riskRewardRatio, marketContext, strategies, analysis, bestTimeframe, price } = candidate;
                        
                        const tierColorMapping = {
                            'A+': 'bg-green-500 text-white shadow-[0_0_10px_#22c55e]',
                            'A': 'bg-green-500/80 text-white',
                            'B+': 'bg-yellow-500/80 text-gray-900',
                            'B': 'bg-yellow-500/50 text-yellow-100',
                        };

                        return (
                            <div key={pair}
                                 className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 hover:border-green-400/80 hover:shadow-green-400/20">
                                <div>
                                    {/* Header */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                                            <span className={`flex items-center justify-center h-10 w-10 rounded-full text-lg font-bold ${tierColorMapping[signalTier]}`}>{signalTier}</span>
                                            <div>
                                                <p className="text-lg font-bold text-white">{pair}</p>
                                                <p className="text-xs text-gray-400">{primaryDriver.type}: {primaryDriver.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-400">{convergenceScore}%</p>
                                            <p className="text-xs text-gray-500">تقارب</p>
                                        </div>
                                    </div>

                                    {/* Active Schools Badges */}
                                    <div className="mt-3">
                                        <h4 className="text-xs font-semibold text-gray-400 mb-1">المدارس المؤكدة</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {strategies && strategies.length > 0 ? strategies.map(s => (
                                                <SchoolBadge key={s} name={s} />
                                            )) : <span className="text-[10px] text-gray-500">تحليل طيفي أساسي</span>}
                                        </div>
                                    </div>

                                    {/* Timeframe Convergence */}
                                    <div className="mt-2">
                                        <div className="flex flex-wrap gap-1">
                                            {convergingTimeframes.sort((a,b) => b.confidence - a.confidence).map(({ tf, confidence }) => (
                                                <div key={tf} className="text-[10px] text-gray-300 bg-gray-700/50 px-1.5 py-0.5 rounded" title={`Confidence: ${confidence}%`}>
                                                    {tf}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* R:R and Market Context */}
                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <h4 className="font-semibold text-gray-400 mb-1">ملف المخاطرة/العائد</h4>
                                            {riskRewardRatio && <RiskRewardBar ratio={riskRewardRatio} />}
                                            <p className="text-right font-mono text-gray-300 mt-1">1 : {riskRewardRatio?.toFixed(1)}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-400 mb-1">سياق السوق</h4>
                                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs">
                                               <span className={`${marketContext.btcDominance === 'Supportive' ? 'text-green-400' : marketContext.btcDominance === 'Headwind' ? 'text-red-400' : 'text-gray-500'}`}>BTC.D</span>
                                               <span className={`${marketContext.altcoinMomentum === 'Supportive' ? 'text-green-400' : 'text-red-400'}`}>TOTAL2</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAnalyze({ pair, timeframe: bestTimeframe, analysis, price, confidence: convergenceScore })}
                                    className="mt-4 w-full bg-green-500/20 text-green-400 text-sm font-semibold py-2 rounded-md border border-green-500/50 hover:bg-green-500/40 transition-colors">
                                    تحليل شامل
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default React.memo(BuySignalScanner);
