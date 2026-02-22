
import React from 'react';
import type { ScannerCandidate, LiquidityAnalysis } from '../types';
import Sparkline from './Sparkline';

interface LiquidityScannerProps {
    candidates: ScannerCandidate[];
}

const formatNumber = (num: number) => {
    if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toFixed(0);
};

const LiquidityItem: React.FC<{ candidate: ScannerCandidate; rank: number }> = ({ candidate, rank }) => {
    const { pair, analysis, price } = candidate;
    const liq = analysis.liquidityAnalysis;
    if (!liq) return null;

    const isFlowPositive = liq.flowDirection === 'Inflow';
    const barColor = isFlowPositive ? 'bg-green-500' : 'bg-red-500';
    const textColor = isFlowPositive ? 'text-green-400' : 'text-red-400';
    const volumeRatioPercent = (liq.volumeRatio * 100).toFixed(0);

    // Get price history for sparkline (last 20 candles)
    // In a real scenario, we'd pass candles directly, but here we might not have access to raw candles inside analysis result easily without passing them down.
    // Assuming analysis doesn't hold candles array to save memory. We will skip sparkline or assume it's passed differently.
    // For now, let's simulate or just show stats.

    return (
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all">
            <div className="flex items-center gap-3 w-1/3">
                <span className="text-gray-500 font-mono text-xs w-4">{rank}</span>
                <div>
                    <div className="font-bold text-white text-sm">{pair}</div>
                    <div className="text-[10px] text-gray-400">{analysis.timeframe}</div>
                </div>
            </div>
            
            <div className="flex flex-col items-center w-1/3">
                <div className="text-xs text-gray-300 font-mono">{price.toFixed(4)}</div>
                <div className={`text-[10px] ${analysis.momentum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {analysis.momentum.toFixed(2)}%
                </div>
            </div>

            <div className="w-1/3 text-right">
                <div className={`font-bold text-sm ${textColor}`}>
                    {isFlowPositive ? '+' : ''}{formatNumber(liq.moneyFlowRaw)}
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                    <div className="text-[10px] text-gray-400">RVOL: {volumeRatioPercent}%</div>
                    {liq.spikeDetected && (
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Volume Spike Detected"></span>
                    )}
                </div>
                <div className="w-full bg-gray-700 h-1 rounded-full mt-1 overflow-hidden">
                    <div 
                        className={`h-full ${barColor}`} 
                        style={{ width: `${Math.min(100, liq.volumeRatio * 20)}%` }} // Cap visualization
                    ></div>
                </div>
            </div>
        </div>
    );
};

const LiquidityScanner: React.FC<LiquidityScannerProps> = ({ candidates }) => {
    // Separate Inflow and Outflow
    const inflows = candidates
        .filter(c => c.analysis.liquidityAnalysis?.flowDirection === 'Inflow')
        .sort((a, b) => (b.analysis.liquidityAnalysis?.moneyFlowRaw || 0) - (a.analysis.liquidityAnalysis?.moneyFlowRaw || 0))
        .slice(0, 5);

    const outflows = candidates
        .filter(c => c.analysis.liquidityAnalysis?.flowDirection === 'Outflow')
        .sort((a, b) => (a.analysis.liquidityAnalysis?.moneyFlowRaw || 0) - (b.analysis.liquidityAnalysis?.moneyFlowRaw || 0)) // Sort ascending (most negative first)
        .slice(0, 5);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div>
                    <h2 className="text-xl font-bold text-white">ماسح تدفق السيولة (Liquidity Flow)</h2>
                    <p className="text-xs text-gray-400">رصد فوري لأقوى 10 عملات من حيث تغير حجم السيولة</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Positive Flow (Inflow) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-green-400 border-b border-green-500/30 pb-2 flex justify-between">
                        <span>🔥 دخول سيولة (Buying Pressure)</span>
                        <span className="text-xs text-gray-500 font-normal">Volume Spike</span>
                    </h3>
                    {inflows.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-gray-700 rounded">لا توجد تدفقات شرائية قوية حالياً</div>
                    ) : (
                        <div className="space-y-2">
                            {inflows.map((c, i) => <LiquidityItem key={c.pair} candidate={c} rank={i + 1} />)}
                        </div>
                    )}
                </div>

                {/* Negative Flow (Outflow) */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-red-400 border-b border-red-500/30 pb-2 flex justify-between">
                        <span>❄️ خروج سيولة (Selling Pressure)</span>
                        <span className="text-xs text-gray-500 font-normal">Panic Dump</span>
                    </h3>
                    {outflows.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-gray-700 rounded">لا توجد تدفقات بيعية قوية حالياً</div>
                    ) : (
                        <div className="space-y-2">
                            {outflows.map((c, i) => <LiquidityItem key={c.pair} candidate={c} rank={i + 1} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiquidityScanner;
