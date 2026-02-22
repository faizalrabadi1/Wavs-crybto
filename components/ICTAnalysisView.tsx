
import React from 'react';
import type { ICTAnalysis, Candle } from '../types';

interface Props {
    analysis: ICTAnalysis;
    candles: Candle[];
}

const ICTAnalysisView: React.FC<Props> = ({ analysis, candles }) => {
    if (!analysis) return null;

    const { summary, marketStructure, liquidityZones, fairValueGaps, premiumDiscount, tradeSetup } = analysis;

    // --- Charting Logic ---
    const SVG_WIDTH = 600;
    const SVG_HEIGHT = 300;
    const PADDING = { top: 20, bottom: 30, left: 10, right: 60 };

    // Use last 60 candles for a zoomed-in view
    const chartCandleSlice = candles.slice(-60);
    const chartStartIndex = candles.length - 60;
    
    const prices = chartCandleSlice.map(c => c.close);
    // Add zone prices to scale to ensure they fit
    liquidityZones.forEach(z => prices.push(z.priceLevel));
    
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const priceRange = maxPrice - minPrice;

    const scaleX = (index: number) => PADDING.left + ((index - chartStartIndex) / 60) * (SVG_WIDTH - PADDING.left - PADDING.right);
    const scaleY = (price: number) => (SVG_HEIGHT - PADDING.bottom) - ((price - minPrice) / priceRange) * (SVG_HEIGHT - PADDING.top - PADDING.bottom);

    const candlePath = chartCandleSlice.map((c, i) => {
        const x = scaleX(chartStartIndex + i);
        const yOpen = scaleY(c.open);
        const yClose = scaleY(c.close);
        const yHigh = scaleY(c.high);
        const yLow = scaleY(c.low);
        const color = c.close >= c.open ? '#4ade80' : '#f87171';
        
        return (
            <g key={i}>
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                <rect x={x - 2} y={Math.min(yOpen, yClose)} width="4" height={Math.max(1, Math.abs(yClose - yOpen))} fill={color} />
            </g>
        );
    });

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                <span>تحليل ICT (السيولة والفجوات)</span>
            </h3>
            
            <p className="text-sm text-gray-400 mb-4">{summary}</p>

            <div className="relative w-full bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
                <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto">
                    {/* Grid */}
                    <line x1={0} y1={scaleY(premiumDiscount?.equilibrium || 0)} x2={SVG_WIDTH} y2={scaleY(premiumDiscount?.equilibrium || 0)} stroke="#fbbf24" strokeDasharray="4 4" opacity="0.5" />
                    <text x={10} y={scaleY(premiumDiscount?.equilibrium || 0) - 5} fill="#fbbf24" fontSize="10">EQ (50%)</text>

                    {/* Fair Value Gaps */}
                    {fairValueGaps.map((fvg, i) => {
                        if (fvg.startIndex < chartStartIndex) return null;
                        const x = scaleX(fvg.startIndex);
                        const w = scaleX(Math.min(candles.length - 1, fvg.endIndex + 10)) - x; // Extend visibility
                        const yTop = scaleY(fvg.top);
                        const h = scaleY(fvg.bottom) - yTop;
                        const color = fvg.type === 'bullish' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)';
                        return (
                            <rect key={`fvg-${i}`} x={x} y={yTop} width={w} height={Math.abs(h)} fill={color} stroke="none" />
                        );
                    })}

                    {/* Candles */}
                    {candlePath}

                    {/* Liquidity Zones */}
                    {liquidityZones.map((zone, i) => {
                        if (zone.startIndex < chartStartIndex - 20) return null; // Skip old zones
                        const y = scaleY(zone.priceLevel);
                        const color = zone.type === 'buy-side' ? '#ef4444' : '#22c55e'; // Red for BSL (Resistance), Green for SSL (Support)
                        const label = zone.type === 'buy-side' ? 'BSL ($$$)' : 'SSL ($$$)';
                        
                        return (
                            <g key={`liq-${i}`}>
                                <line x1={scaleX(zone.startIndex)} y1={y} x2={SVG_WIDTH} y2={y} stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
                                <text x={SVG_WIDTH - 50} y={y - 4} fill={color} fontSize="10" fontWeight="bold">{label}</text>
                                <circle cx={SVG_WIDTH - 5} cy={y} r="3" fill={color} />
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="text-gray-400 block">هيكل السوق</span>
                    <span className={`font-bold text-lg ${marketStructure === 'Bullish' ? 'text-green-400' : 'text-red-400'}`}>{marketStructure}</span>
                </div>
                {tradeSetup && (
                    <div className="bg-green-900/20 p-2 rounded border border-green-500/30">
                        <span className="text-green-400 block">صفقة مقترحة ({tradeSetup.direction})</span>
                        <span className="text-white">D: {tradeSetup.entry.toFixed(4)} | SL: {tradeSetup.stopLoss.toFixed(4)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ICTAnalysisView;
