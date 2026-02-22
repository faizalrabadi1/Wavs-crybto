
import React from 'react';
import type { MarketData, MarketAnalysis } from '../types';
import TradeSignalCard from './TradeSignalCard';

interface UltraLightTerminalProps {
    marketData: MarketData;
    analysisData: MarketAnalysis;
    currencyPairs: string[];
    nextScanCountdown: number;
}

const UltraLightTerminal: React.FC<UltraLightTerminalProps> = ({ marketData, analysisData, currencyPairs, nextScanCountdown }) => {
    
    if (currencyPairs.length === 0) {
        return null; // Or a loading state
    }

    const gainers = currencyPairs.slice(0, 5);
    const losers = currencyPairs.slice(5, 10);

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <div>
                        <h2 className="text-2xl font-bold text-white">محطة الإشارات فائقة الخفة</h2>
                         <p className="text-sm text-gray-400">تحليل لحظي لأكثر 10 عملات تقلبًا اليوم (5 صاعدة و 5 هابطة)</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-400 self-end sm:self-center" title="سيتم تحديث البيانات تلقائيًا">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <span className="hidden sm:inline">التحديث القادم في:</span>
                    <span className="font-semibold text-cyan-glow w-6 text-center">{nextScanCountdown}s</span>
                </div>
            </div>

            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold text-green-400 mb-4 border-b-2 border-green-400/30 pb-2">الأكثر ارتفاعًا</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                        {gainers.map(pair => (
                            <TradeSignalCard 
                                key={pair} 
                                pair={pair}
                                marketData={marketData[pair]}
                                analysisData={analysisData[pair]}
                                type="gainer"
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-red-400 mb-4 border-b-2 border-red-400/30 pb-2">الأكثر انخفاضًا</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                        {losers.map(pair => (
                            <TradeSignalCard 
                                key={pair} 
                                pair={pair}
                                marketData={marketData[pair]}
                                analysisData={analysisData[pair]}
                                type="loser"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default UltraLightTerminal;
