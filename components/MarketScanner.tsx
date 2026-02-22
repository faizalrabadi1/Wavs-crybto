
import React from 'react';
import { TIME_FRAMES } from '../constants';
import type { MarketData, MarketAnalysis, ScannerCandidate, AnalysisResult } from '../types';
import { MarketState } from '../types';

interface MarketScannerProps {
    marketData: MarketData;
    analysisData: MarketAnalysis;
    activeTimeframe: string;
    setActiveTimeframe: (tf: string) => void;
    onAnalyze: (candidate: ScannerCandidate) => void;
    currencyPairs: string[];
    watchlist: Set<string>;
    onToggleWatchlist: (pair: string) => void;
}

const formatVolume = (volume: number): string => {
    if (volume > 1_000_000_000_000) {
        return `${(volume / 1_000_000_000_000).toFixed(2)}T`;
    }
    if (volume > 1_000_000_000) {
        return `${(volume / 1_000_000_000).toFixed(2)}B`;
    }
    if (volume > 1_000_000) {
        return `${(volume / 1_000_000).toFixed(2)}M`;
    }
    if (volume > 1_000) {
        return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toFixed(0);
};

const formatPrice = (pair: string, price: number): string => {
    if (pair.endsWith('.D')) {
        return `${price.toFixed(2)}%`;
    }
    if (pair.startsWith('TOTAL')) {
        if (price >= 1e12) return `$${(price / 1e12).toFixed(2)}T`;
        if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
        return `$${(price / 1e6).toFixed(2)}M`;
    }
    if (pair.includes('CAC40')) {
        return price.toFixed(2);
    }
    if (pair.includes('JPY')) {
        return price.toFixed(3);
    }
    if (pair.includes('XAU')) { // Gold
        return price.toFixed(2);
    }
    if (!pair.endsWith('USDT')) { // Assume Forex
        return price.toFixed(5);
    }
    
    // Default Crypto formatting
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toPrecision(4);
};


const MarketScanner: React.FC<MarketScannerProps> = ({ marketData, analysisData, activeTimeframe, setActiveTimeframe, onAnalyze, currencyPairs, watchlist, onToggleWatchlist }) => {
    
    const getRegimeColor = (score: number) => {
        if (score > 0.5) return 'text-green-400';
        if (score < -0.5) return 'text-yellow-400';
        return 'text-gray-400';
    }

    const getPhaseColor = (angle: number) => {
        if (angle > 270) return 'text-green-400'; // Rising from bottom
        if (angle > 90 && angle < 270) return 'text-red-400'; // Falling
        return 'text-gray-400'; // Rising to top
    }
    
    const getStateUI = (state: MarketState | undefined): { text: string; className: string } => {
        if (!state) {
            return { text: '-', className: 'bg-gray-700/50 text-gray-500 border-gray-700/80' };
        }
        switch (state) {
            case MarketState.TRENDING_UP:
                return { text: state, className: 'bg-green-500/20 text-green-300 border border-green-500/30' };
            case MarketState.TRENDING_DOWN:
                 return { text: state, className: 'bg-red-500/20 text-red-300 border border-red-500/30' };
            case MarketState.BREAKOUT_UP:
                return { text: state, className: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' };
            case MarketState.BREAKOUT_DOWN:
                return { text: state, className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
            case MarketState.CONSOLIDATING:
                return { text: 'تجميع', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' };
            default:
                return { text: 'محايد', className: 'bg-gray-700/50 text-gray-400 border border-gray-700/80' };
        }
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-xl font-bold text-white mb-2 sm:mb-0">الماسح الطيفي العام</h2>
                <div className="relative">
                    <select
                        value={activeTimeframe}
                        onChange={(e) => setActiveTimeframe(e.target.value)}
                        className="appearance-none bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-md py-1.5 pr-3 pl-8 focus:outline-none focus:ring-2 focus:ring-cyan-glow focus:border-cyan-glow transition"
                        aria-label="اختر الإطار الزمني"
                    >
                        {TIME_FRAMES.map(tf => (
                            <option key={tf} value={tf}>{tf}</option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto bg-gray-800/50 border border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            <th scope="col" className="py-3.5 pl-2 pr-2 text-left text-sm font-semibold text-white w-10 sm:pl-6">
                                <span className="sr-only">مراقبة</span>
                            </th>
                            <th scope="col" className="py-3.5 px-2 text-right text-sm font-semibold text-white whitespace-nowrap">الزوج</th>
                            <th scope="col" className="px-2 py-3.5 text-right text-sm font-semibold text-white whitespace-nowrap">السعر</th>
                            <th scope="col" className="px-2 py-3.5 text-right text-sm font-semibold text-white whitespace-nowrap">تغير</th>
                            <th scope="col" className="px-2 py-3.5 text-right text-sm font-semibold text-white whitespace-nowrap">حجم</th>
                            <th scope="col" className="px-2 py-3.5 text-center text-sm font-semibold text-white whitespace-nowrap">الإشارة</th>
                            <th scope="col" className="px-2 py-3.5 text-right text-sm font-semibold text-white whitespace-nowrap">زخم</th>
                            <th scope="col" className="px-2 py-3.5 text-right text-sm font-semibold text-white whitespace-nowrap">طور</th>
                            <th scope="col" className="px-2 py-3.5 text-right text-sm font-semibold text-white whitespace-nowrap">نظام</th>
                            <th scope="col" className="relative py-3.5 pr-2 pl-2 sm:pl-6">
                                <span className="sr-only">تحليل</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/30">
                        {currencyPairs.map(pair => {
                            const data = marketData[pair];
                            const analysis = analysisData[pair]?.[activeTimeframe];
                            const isWatched = watchlist.has(pair);

                            if (!data || !analysis) return (
                                <tr key={pair} className="opacity-50">
                                     <td className="whitespace-nowrap py-4 pl-2 pr-2 text-sm font-medium text-gray-400 sm:pl-6"></td>
                                     <td className="whitespace-nowrap py-4 px-2 text-sm font-medium text-gray-400">{pair}</td>
                                     <td colSpan={8} className="whitespace-nowrap px-2 py-4 text-sm text-center text-gray-500">جاري تحميل البيانات...</td>
                                </tr>
                            );
                            
                            const signal = getStateUI(analysis.state);

                            return (
                                <tr key={pair} className="hover:bg-gray-700/50">
                                    <td className="whitespace-nowrap py-4 pl-2 pr-2 text-sm text-gray-400 sm:pl-6">
                                        <button onClick={() => onToggleWatchlist(pair)} className="p-1 rounded-full hover:bg-gray-700" aria-label="أضف إلى قائمة المراقبة">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                                className={`h-5 w-5 transition-colors ${isWatched ? 'text-yellow-glow' : 'text-gray-500 hover:text-yellow-glow'}`}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="whitespace-nowrap py-4 px-2 text-sm font-medium text-white">{pair}</td>
                                    <td className={`whitespace-nowrap px-2 py-4 text-sm font-mono ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPrice(pair, data.price)}</td>
                                    <td className={`whitespace-nowrap px-2 py-4 text-sm font-mono ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-4 text-xs font-mono text-gray-300">{formatVolume(data.volume24h)}</td>
                                    <td className="whitespace-nowrap px-2 py-4 text-sm text-center">
                                        <span className={`px-2 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap ${signal.className}`}>
                                            {signal.text}
                                        </span>
                                    </td>
                                    <td className={`whitespace-nowrap px-2 py-4 text-sm font-mono ${analysis.momentum >= 0 ? 'text-green-400' : 'text-red-400'}`}>{analysis.momentum.toFixed(2)}%</td>
                                    <td className={`whitespace-nowrap px-2 py-4 text-sm font-mono ${getPhaseColor(analysis.currentPhaseAngle)}`}>{analysis.currentPhaseAngle.toFixed(0)}°</td>
                                    <td className={`whitespace-nowrap px-2 py-4 text-sm font-mono ${getRegimeColor(analysis.regimeScore)}`}>{analysis.regimeScore.toFixed(2)}</td>
                                    <td className="relative whitespace-nowrap py-4 pr-2 pl-2 text-left text-sm font-medium sm:pl-6">
                                        <button onClick={() => onAnalyze({ pair, timeframe: activeTimeframe, confidence: 0, analysis, price: data.price })} className="text-cyan-glow hover:text-cyan-400 px-2 py-1 rounded hover:bg-gray-700/50">تحليل</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(MarketScanner);
