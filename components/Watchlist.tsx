
import React from 'react';
import { MarketState } from '../types';
import type { MarketData, MarketAnalysis, ScannerCandidate } from '../types';

interface WatchlistProps {
    marketData: MarketData;
    analysisData: MarketAnalysis;
    activeTimeframe: string;
    onAnalyze: (candidate: ScannerCandidate) => void;
    watchlist: Set<string>;
    onToggleWatchlist: (pair: string) => void;
    currencyPairs: string[];
}

const CORE_WATCHLIST = ['PHB/USDT', 'API3/USDT', 'FIL/USDT', 'TAO/USDT', 'UMA/USDT', 'SOL/USDT', 'ENA/USDT', 'PORTAL/USDT', 'HYPE/USDT'];

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

const Watchlist: React.FC<WatchlistProps> = ({ marketData, analysisData, activeTimeframe, onAnalyze, watchlist, onToggleWatchlist, currencyPairs }) => {
    
    const watchedPairs = React.useMemo(() => {
        const core = CORE_WATCHLIST.filter(p => currencyPairs.includes(p));
        const user = currencyPairs.filter(p => watchlist.has(p) && !CORE_WATCHLIST.includes(p));
        return [...core, ...user];
    }, [currencyPairs, watchlist]);


    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h2 className="text-xl font-bold text-white">قائمة المراقبة</h2>
            </div>
            {watchedPairs.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">قائمة المراقبة فارغة.</p>
                    <p className="text-xs text-gray-500 mt-1">أضف عملات من الماسح العام بالضغط على أيقونة النجمة.</p>
                </div>
            ) : (
                 <div className="overflow-x-auto bg-gray-800/50 border border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-800">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6 w-12"></th>
                                <th scope="col" className="py-3.5 px-3 text-right text-sm font-semibold text-white">الزوج</th>
                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">السعر</th>
                                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">تغير 24 س</th>
                                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">الإشارة</th>
                                <th scope="col" className="relative py-3.5 pr-3 pl-4 sm:pl-6">
                                    <span className="sr-only">تحليل</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700 bg-gray-800/30">
                            {watchedPairs.map(pair => {
                                const data = marketData[pair];
                                const analysis = analysisData[pair]?.[activeTimeframe];
                                if (!data || !analysis) return null;
                                
                                const signal = getStateUI(analysis.state);
                                const isWatched = watchlist.has(pair);
                                const isCore = CORE_WATCHLIST.includes(pair);

                                return (
                                    <tr key={pair} className="hover:bg-gray-700/50">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-400 sm:pl-6">
                                            <button 
                                                onClick={() => onToggleWatchlist(pair)} 
                                                disabled={isCore}
                                                className="p-1 rounded-full hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
                                                title={isCore ? "هذه العملة أساسية في قائمة المراقبة" : "إزالة من قائمة المراقبة"}
                                                aria-label={isCore ? "هذه العملة أساسية في قائمة المراقبة" : "إزالة من قائمة المراقبة"}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill={isWatched ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                                className={`h-5 w-5 transition-colors ${isWatched ? 'text-yellow-glow' : 'text-gray-500 hover:text-yellow-glow'}`}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                            </button>
                                        </td>
                                        <td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-white">{pair}</td>
                                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-mono ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPrice(pair, data.price)}</td>
                                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-mono ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${signal.className}`}>
                                                {signal.text}
                                            </span>
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pr-3 pl-4 text-left text-sm font-medium sm:pl-6">
                                            <button onClick={() => onAnalyze({ pair, timeframe: activeTimeframe, confidence: 0, analysis, price: data.price })} className="text-cyan-glow hover:text-cyan-400">تحليل</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Watchlist;
