import React, { useState, useEffect } from 'react';
import type { MarketData, MarketAnalysis, LiveSignal } from '../types';
import { calculateLiveSignal } from '../services/liveSignalService';
import ElliottWaveAnalysisView from './ElliottWaveAnalysisView';
import MultiTimeframeWaveScanner from './MultiTimeframeWaveScanner';

interface WaveMasterTerminalProps {
    marketData: MarketData;
    analysisData: MarketAnalysis;
    nextScanCountdown: number;
}

const WAVE_MASTER_PAIRS = [
    'PHB/USDT', 'APT/USDT', 'DASH/USDT', 'UMA/USDT', 'FIL/USDT', 'API3/USDT'
];

const WaveMasterTerminal: React.FC<WaveMasterTerminalProps> = ({ marketData, analysisData, nextScanCountdown }) => {
    const [pair, setPair] = useState<string>(WAVE_MASTER_PAIRS[0]);
    const [activeTimeframe, setActiveTimeframe] = useState<string>('1h');
    const [liveSignal, setLiveSignal] = useState<LiveSignal | null>(null);

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

    if (!data || !analysis) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <div className="text-blue-glow animate-pulse">جاري تحميل بيانات {pair}...</div>
                <div className="flex gap-2">
                    {WAVE_MASTER_PAIRS.map(p => (
                        <button key={p} onClick={() => setPair(p)} className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-blue-500 transition-colors">
                            {p.split('/')[0]}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const isPositive = data.change24h >= 0;
    const symbol = pair.split('/')[0];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-gray-800 border border-blue-500/30 rounded-2xl p-6 shadow-lg shadow-blue-900/20 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-500 relative group cursor-pointer">
                        <span className="text-xl font-bold text-blue-400">{symbol}</span>
                         <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white">تغيير</span>
                        </div>
                        <select 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            value={pair}
                            onChange={(e) => setPair(e.target.value)}
                        >
                            {WAVE_MASTER_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
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
                                    {WAVE_MASTER_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">نظام التحليل الموجي الشامل</p>
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

            {/* Timeframe Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['15m', '1h', '4h', '1d'].map(tf => (
                    <button
                        key={tf}
                        onClick={() => setActiveTimeframe(tf)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                            activeTimeframe === tf 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`}
                    >
                        {tf}
                    </button>
                ))}
            </div>

            {/* Quick Signal Panel */}
            {liveSignal && (
                <div className={`p-4 rounded-xl border ${
                    liveSignal.action === 'BUY' ? 'bg-green-900/20 border-green-500/50' : 
                    liveSignal.action === 'SELL' ? 'bg-red-900/20 border-red-500/50' : 
                    'bg-gray-800 border-gray-700'
                }`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                التوصية السريعة: 
                                <span className={
                                    liveSignal.action === 'BUY' ? 'text-green-400' : 
                                    liveSignal.action === 'SELL' ? 'text-red-400' : 
                                    'text-gray-400'
                                }>{liveSignal.action === 'BUY' ? 'شراء' : liveSignal.action === 'SELL' ? 'بيع' : 'انتظار'}</span>
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">الثقة: {liveSignal.confidence}%</p>
                        </div>
                        {liveSignal.action !== 'HOLD' && liveSignal.entryPrice && (
                            <div className="text-right">
                                <p className="text-sm text-gray-400">الدخول: <span className="text-white font-mono">${liveSignal.entryPrice.toFixed(4)}</span></p>
                                <p className="text-sm text-green-400">الهدف: <span className="font-mono">${liveSignal.takeProfit?.toFixed(4)}</span></p>
                                <p className="text-sm text-red-400">الوقف: <span className="font-mono">${liveSignal.stopLoss?.toFixed(4)}</span></p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Multi-Timeframe Wave Scanner */}
            <MultiTimeframeWaveScanner pair={pair} />

            {/* Elliott Wave Analysis View */}
            {analysis.elliottWave && data.candles[activeTimeframe] ? (
                <ElliottWaveAnalysisView 
                    analysis={analysis.elliottWave} 
                    candles={data.candles[activeTimeframe]} 
                    pair={pair} 
                />
            ) : (
                <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                    <p className="text-gray-400">بيانات التحليل الموجي غير متوفرة لهذا الإطار الزمني.</p>
                </div>
            )}
        </div>
    );
};

export default WaveMasterTerminal;
