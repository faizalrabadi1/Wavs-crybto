import React from 'react';
import type { MarketData, MarketAnalysis, ScannerCandidate, Candle } from '../types';
import { MarketState } from '../types';
import Sparkline from './Sparkline';
import MarketHealthDashboard from './MarketHealthDashboard';

interface MarketIndicesScannerProps {
    marketData: MarketData;
    analysisData: MarketAnalysis;
    activeTimeframe: string;
    onAnalyze: (candidate: ScannerCandidate) => void;
}

const INDICES_CONFIG: { [key: string]: { name: string; description: string; implication: (momentum: number) => string } } = {
    'BTC.D': { name: 'هيمنة البيتكوين', description: 'نسبة القيمة السوقية للبيتكوين من إجمالي السوق.', implication: (momentum) => momentum > 0.1 ? 'سلبي للبديلات' : momentum < -0.1 ? 'إيجابي للبديلات' : 'محايد' },
    'USDT.D': { name: 'هيمنة التيثر', description: 'نسبة التيثر من إجمالي السوق. ارتفاعها يعني خروج السيولة.', implication: (momentum) => momentum > 0.1 ? 'خروج سيولة' : momentum < -0.1 ? 'دخول سيولة' : 'محايد' },
    'TOTAL': { name: 'القيمة السوقية الإجمالية', description: 'القيمة الإجمالية لسوق العملات الرقمية.', implication: (momentum) => momentum > 0.1 ? 'نمو للسوق' : momentum < -0.1 ? 'انكماش للسوق' : 'محايد' },
    'TOTAL2': { name: 'قيمة سوق البديلات', description: 'القيمة الإجمالية للسوق باستثناء البيتكوين.', implication: (momentum) => momentum > 0.1 ? 'نمو للبديلات' : momentum < -0.1 ? 'انكماش للبديلات' : 'محايد' },
};


const formatValue = (pair: string, price: number): string => {
    if (pair.endsWith('.D')) {
        return `${price.toFixed(2)}%`;
    }
    if (pair.startsWith('TOTAL')) {
        if (price >= 1e12) return `$${(price / 1e12).toFixed(2)}T`;
        if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
        return `$${(price / 1e6).toFixed(2)}M`;
    }
    return price.toFixed(2);
};

const getStateUI = (state: MarketState | undefined): { text: string; className: string } => {
    if (!state) {
        return { text: '-', className: 'bg-gray-700/50 text-gray-500 border-gray-700/80' };
    }
    switch (state) {
        case MarketState.TRENDING_UP:
            return { text: 'اتجاه صاعد', className: 'bg-green-500/20 text-green-300 border border-green-500/30' };
        case MarketState.TRENDING_DOWN:
             return { text: 'اتجاه هابط', className: 'bg-red-500/20 text-red-300 border border-red-500/30' };
        case MarketState.BREAKOUT_UP:
            return { text: 'اختراق صاعد', className: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' };
        case MarketState.BREAKOUT_DOWN:
            return { text: 'اختراق هابط', className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' };
        case MarketState.CONSOLIDATING:
            return { text: 'تجميع', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' };
        default:
            return { text: 'محايد', className: 'bg-gray-700/50 text-gray-400 border border-gray-700/80' };
    }
};

const MarketIndicesScanner: React.FC<MarketIndicesScannerProps> = ({ marketData, analysisData, activeTimeframe, onAnalyze }) => {
    
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-9-5.197" /></svg>
                <h2 className="text-xl font-bold text-white">مؤشرات السوق الرئيسية</h2>
            </div>
            
            <MarketHealthDashboard analysisData={analysisData} />

            <div className="overflow-x-auto bg-gray-800/50 border border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                        <tr>
                            <th scope="col" className="py-3.5 px-3 text-right text-sm font-semibold text-white sm:pl-6">المؤشر</th>
                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">القيمة</th>
                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">تغير 24 س</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">اتجاه {activeTimeframe}</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">الحالة الطيفية</th>
                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-white">الزخم %</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-white">الدلالة</th>
                            <th scope="col" className="relative py-3.5 pr-3 pl-4 sm:pl-6">
                                <span className="sr-only">تحليل</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-gray-800/30">
                        {Object.keys(INDICES_CONFIG).map(pair => {
                            const data = marketData[pair];
                            const analysis = analysisData[pair]?.[activeTimeframe];
                            const config = INDICES_CONFIG[pair as keyof typeof INDICES_CONFIG];

                            if (!data || !analysis) return (
                                <tr key={pair} className="opacity-50">
                                     <td className="whitespace-nowrap py-4 px-3 text-sm font-medium text-gray-400 sm:pl-6">{config.name}</td>
                                     <td colSpan={7} className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">جاري تحميل البيانات...</td>
                                </tr>
                            );
                            
                            const signal = getStateUI(analysis.state);
                            const candles = marketData[pair]?.candles[activeTimeframe] || [];
                            const prices = candles.slice(-50).map((c: Candle) => c.close);
                            const implicationText = config.implication(analysis.momentum);
                            const implicationColor = implicationText.includes('إيجابي') || implicationText.includes('دخول') || implicationText.includes('نمو') ? 'text-green-400' : implicationText.includes('سلبي') || implicationText.includes('خروج') ? 'text-red-400' : 'text-gray-400';

                            return (
                                <tr key={pair} className="hover:bg-gray-700/50">
                                    <td className="whitespace-nowrap py-4 px-3 text-sm sm:pl-6">
                                        <div className="font-medium text-white">{config.name}</div>
                                        <div className="text-xs text-gray-500">{pair}</div>
                                    </td>
                                    <td className={`whitespace-nowrap px-3 py-4 text-sm font-mono ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatValue(pair, data.price)}</td>
                                    <td className={`whitespace-nowrap px-3 py-4 text-sm font-mono ${data.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4">
                                        <div className="w-28 h-10 mx-auto">
                                            {prices.length > 2 && <Sparkline data={prices} strokeColor={analysis.momentum > 0 ? '#4ade80' : '#f87171'} />}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${signal.className}`}>
                                            {signal.text}
                                        </span>
                                    </td>
                                    <td className={`whitespace-nowrap px-3 py-4 text-sm font-mono ${analysis.momentum >= 0 ? 'text-green-400' : 'text-red-400'}`}>{analysis.momentum.toFixed(2)}%</td>
                                     <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                         <span className={`font-semibold ${implicationColor}`}>{implicationText}</span>
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
        </div>
    );
};

export default React.memo(MarketIndicesScanner);