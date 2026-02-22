
import React, { useState } from 'react';
import type { WhaleWatcherAnalysis, WhaleCandleAnalysis } from '../types';

interface Props {
    analysis: WhaleWatcherAnalysis;
}

const AnomalyLegend: React.FC = () => (
    <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mb-2 bg-gray-800/50 p-2 rounded border border-gray-700">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> Churn/Absorption</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Stop Hunt</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> Push</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500"></span> Buying Vol</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500"></span> Selling Vol</div>
    </div>
);

const WhaleChart: React.FC<{ data: WhaleCandleAnalysis[] }> = ({ data }) => {
    const width = 600;
    const height = 300;
    const padding = { top: 20, bottom: 50, left: 10, right: 50 };
    
    if (data.length === 0) return null;

    const maxPrice = Math.max(...data.map(c => c.high));
    const minPrice = Math.min(...data.map(c => c.low));
    const maxVol = Math.max(...data.map(c => c.volume));
    
    const priceRange = maxPrice - minPrice || 1;
    
    const scaleX = (i: number) => padding.left + (i / (data.length - 1)) * (width - padding.left - padding.right);
    const scaleY = (p: number) => (height * 0.7) - ((p - minPrice) / priceRange) * (height * 0.7 - padding.top) + padding.top; // Top 70% for price
    
    const candleWidth = (width - padding.left - padding.right) / data.length * 0.6;

    return (
        <div className="relative w-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {/* Grid */}
                <line x1={0} y1={height * 0.7} x2={width} y2={height * 0.7} stroke="#374151" strokeWidth="1" />

                {/* Candles */}
                {data.map((c, i) => {
                    const x = scaleX(i);
                    const yHigh = scaleY(c.high);
                    const yLow = scaleY(c.low);
                    const yOpen = scaleY(c.open);
                    const yClose = scaleY(c.close);
                    
                    // Determine Color
                    let color = c.close >= c.open ? '#4ade80' : '#f87171'; // Default Green/Red
                    if (c.anomaly === 'Churn' || c.anomaly === 'Absorption') color = '#facc15'; // Yellow
                    if (c.anomaly === 'Stop Hunt') color = '#c084fc'; // Purple
                    if (c.anomaly === 'Push') color = '#60a5fa'; // Blue

                    return (
                        <g key={`c-${i}`}>
                            <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                            <rect x={x - candleWidth/2} y={Math.min(yOpen, yClose)} width={candleWidth} height={Math.max(1, Math.abs(yClose-yOpen))} fill={color} />
                        </g>
                    );
                })}

                {/* Volume Bars (Delta Colored) */}
                {data.map((c, i) => {
                    const x = scaleX(i);
                    const volHeight = (c.volume / maxVol) * (height * 0.25); // Max 25% height
                    const yBase = height - padding.bottom;
                    const color = c.delta > 0 ? '#22c55e' : '#ef4444'; // Green/Red based on Delta
                    
                    return (
                        <rect key={`v-${i}`} x={x - candleWidth/2} y={yBase - volHeight} width={candleWidth} height={volHeight} fill={color} opacity="0.8" />
                    );
                })}
            </svg>
            
            {/* Overlay Info */}
            <div className="absolute top-2 right-2 text-[10px] text-gray-500 font-mono">
                Max Vol: {(maxVol/1000).toFixed(1)}K
            </div>
        </div>
    );
};

const WhaleWatcherAnalysisView: React.FC<Props> = ({ analysis }) => {
    if (!analysis) return null;

    const { manipulationScore, whaleActivityLevel, summary, lastWhaleAction, candleAnalysis, detectedAnomalies } = analysis;
    
    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4 shadow-lg shadow-indigo-900/10">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>كاشف الحيتان (Volume Price Analysis 2.0)</span>
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">التلاعب:</span>
                    <span className={`text-sm font-bold ${manipulationScore > 50 ? 'text-red-400' : 'text-green-400'}`}>{manipulationScore}%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Summary & Stats */}
                <div className="space-y-4">
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">آخر نشاط للحيتان</p>
                        <p className="text-xl font-bold text-white">{lastWhaleAction || 'Neutral'}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">مستوى النشاط</p>
                        <p className={`text-xl font-bold ${whaleActivityLevel === 'Extreme' ? 'text-red-500' : 'text-yellow-400'}`}>{whaleActivityLevel}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">أنماط شاذة:</p>
                        <div className="flex flex-wrap gap-2">
                            {detectedAnomalies.length > 0 ? detectedAnomalies.map((a, i) => (
                                <span key={i} className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded border border-indigo-500/30">{a}</span>
                            )) : <span className="text-[10px] text-gray-500">لا توجد</span>}
                        </div>
                    </div>
                </div>

                {/* Right: Chart */}
                <div className="lg:col-span-2">
                    <AnomalyLegend />
                    <WhaleChart data={candleAnalysis} />
                </div>
            </div>
            
            <div className="mt-3 p-2 bg-gray-800/30 border-t border-gray-700 text-xs text-gray-400 text-center">
                {summary}
            </div>
        </div>
    );
};

export default WhaleWatcherAnalysisView;
