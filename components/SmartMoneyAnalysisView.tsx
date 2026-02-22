import React from 'react';
import type { SmartMoneyAnalysis, Candle } from '../types';

interface Props {
    analysis: SmartMoneyAnalysis;
    candles: Candle[];
    pair: string;
}

const formatPrice = (pair: string, price: number): string => {
    if (pair.endsWith('.D')) {
        return `${price.toFixed(2)}%`;
    }
    if (pair.startsWith('TOTAL')) {
        if (price >= 1e12) return `$${(price / 1e12).toFixed(2)}T`;
        if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
        return `$${(price / 1e6).toFixed(2)}M`;
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

const DataRow: React.FC<{ label: string; value: string | number; valueClass?: string; }> = ({ label, value, valueClass = 'text-white' }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className={`text-sm font-mono font-semibold ${valueClass}`}>{value}</span>
    </div>
);


const SmartMoneyAnalysisView: React.FC<Props> = ({ analysis, candles, pair }) => {
    if (!analysis.tradeSetup) return null;

    const { summary, bias, structurePoint, orderBlock, tradeSetup } = analysis;

    // --- Charting Logic ---
    const SVG_WIDTH = 220;
    const SVG_HEIGHT = 140;
    const PADDING_X = 5;
    const PADDING_Y = 15;

    const relevantIndices = [
        structurePoint?.index,
        orderBlock?.index,
        candles.length - 1
    ].filter((i): i is number => i !== undefined);

    const chartStartIndex = Math.max(0, Math.min(...relevantIndices) - 20);
    const chartEndIndex = Math.min(candles.length, Math.max(...relevantIndices) + 15);
    const chartCandleSlice = candles.slice(chartStartIndex, chartEndIndex);

    const allPrices = [
        ...chartCandleSlice.map(c => c.close),
        ...(structurePoint ? [structurePoint.price] : []),
        ...(orderBlock ? [orderBlock.top, orderBlock.bottom] : []),
        ...(tradeSetup ? [tradeSetup.entry, tradeSetup.stopLoss, ...tradeSetup.targets.map(t => t.price)] : []),
    ];

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const indexRange = chartEndIndex - chartStartIndex;

    if (priceRange === 0 || indexRange <= 0) return null;

    const scaleX = (index: number) => PADDING_X + ((index - chartStartIndex) / indexRange) * (SVG_WIDTH - 2 * PADDING_X);
    const scaleY = (price: number) => (SVG_HEIGHT - PADDING_Y) - ((price - minPrice) / priceRange) * (SVG_HEIGHT - 2 * PADDING_Y);

    const pricePathData = chartCandleSlice.map((candle, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(chartStartIndex + i).toFixed(2)} ${scaleY(candle.close).toFixed(2)}`).join(' ');

    const tradeDirectionColor = tradeSetup.direction === 'Long' ? '#4ade80' : '#f87171';
    const tradeDirectionBg = tradeSetup.direction === 'Long' ? 'bg-green-500/10' : 'bg-red-500/10';
    const tradeDirectionText = tradeSetup.direction === 'Long' ? 'text-green-300' : 'text-red-300';
    const biasColor = bias === 'Bullish' ? 'text-green-400' : bias === 'Bearish' ? 'text-red-400' : 'text-yellow-400';
    
    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
             <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5A6.5 6.5 0 1012 5.5a6.5 6.5 0 000 13z" />
                 </svg>
                <span>تحليل الأموال الذكية (SMC)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="flex items-center justify-center p-2 relative">
                    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto">
                        <path d={pricePathData} stroke="#4a5568" strokeWidth="1.5" fill="none" />
                        
                        {/* Structure Point */}
                        {structurePoint && (
                            <g>
                                <line 
                                    x1={scaleX(structurePoint.index)} y1={scaleY(structurePoint.price)}
                                    x2={SVG_WIDTH} y2={scaleY(structurePoint.price)}
                                    stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3"
                                />
                                <text x={scaleX(structurePoint.index) + 4} y={scaleY(structurePoint.price) - 4} fill="#22d3ee" fontSize="10">{structurePoint.type}</text>
                            </g>
                        )}
                        
                        {/* Order Block */}
                        {orderBlock && (
                             <rect
                                x={scaleX(orderBlock.index - 5)} y={scaleY(orderBlock.top)}
                                width={scaleX(orderBlock.index + 5) - scaleX(orderBlock.index - 5)} height={Math.abs(scaleY(orderBlock.bottom) - scaleY(orderBlock.top))}
                                fill={tradeDirectionColor} fillOpacity={0.2} stroke={tradeDirectionColor} strokeWidth="1" strokeDasharray="2 2"
                            />
                        )}

                        {/* Trade Path */}
                        <g>
                            {/* Entry */}
                            <line x1={scaleX(chartEndIndex - 10)} y1={scaleY(tradeSetup.entry)} x2={SVG_WIDTH} y2={scaleY(tradeSetup.entry)} stroke={tradeDirectionColor} strokeWidth="1" />
                            <text x={SVG_WIDTH - 4} y={scaleY(tradeSetup.entry) - 4} fill={tradeDirectionColor} fontSize="9" textAnchor="end">الدخول</text>
                            
                            {/* Stop Loss */}
                            <line x1={scaleX(chartEndIndex - 10)} y1={scaleY(tradeSetup.stopLoss)} x2={SVG_WIDTH} y2={scaleY(tradeSetup.stopLoss)} stroke="#f87171" strokeWidth="1" />
                            <text x={SVG_WIDTH - 4} y={scaleY(tradeSetup.stopLoss) + 10} fill="#f87171" fontSize="9" textAnchor="end">وقف الخسارة</text>
                            
                            {/* Targets */}
                            {tradeSetup.targets.map(target => (
                                <g key={target.level}>
                                    <line x1={scaleX(chartEndIndex - 10)} y1={scaleY(target.price)} x2={SVG_WIDTH} y2={scaleY(target.price)} stroke="#4ade80" strokeWidth="1" />
                                    <text x={SVG_WIDTH - 4} y={scaleY(target.price) - 4} fill="#4ade80" fontSize="9" textAnchor="end">{target.level}</text>
                                </g>
                            ))}
                        </g>

                    </svg>
                </div>
                 <div>
                    <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                         <p className="text-sm text-gray-400 mb-1">ملخص التحليل:</p>
                        <p className="text-sm font-semibold text-cyan-glow">{summary.replace(/\d+\.\d{4}/, (match) => formatPrice(pair, parseFloat(match)))}</p>
                    </div>

                    <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 divide-y divide-gray-700/50">
                        <DataRow label="اتجاه هيكل السوق" value={bias} valueClass={biasColor} />
                        {structurePoint && <DataRow label={`نقطة الهيكل (${structurePoint.type})`} value={formatPrice(pair, structurePoint.price)} valueClass="text-cyan-glow" />}
                        {orderBlock && <DataRow label={`منطقة الاهتمام (OB)`} value={`${formatPrice(pair, orderBlock.bottom)} - ${formatPrice(pair, orderBlock.top)}`} valueClass={bias === 'Bullish' ? 'text-green-400' : 'text-red-400'} />}
                    </div>

                    <div className={`p-3 rounded-lg border ${tradeDirectionBg} border-gray-700`}>
                        <h4 className={`font-semibold mb-2 ${tradeDirectionText}`}>
                            إعداد صفقة مقترح: {tradeSetup.direction === 'Long' ? 'شراء' : 'بيع'}
                        </h4>
                        <div className="space-y-2 text-sm font-mono">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">الدخول المقترح:</span>
                                <span className="text-white">{formatPrice(pair, tradeSetup.entry)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-gray-400">وقف الخسارة:</span>
                                <span className="text-red-400">{formatPrice(pair, tradeSetup.stopLoss)}</span>
                            </div>
                             {tradeSetup.targets.map(t => (
                                <div key={t.level} className="flex justify-between items-center">
                                    <span className="text-gray-400">{`الهدف ${t.level}:`}</span>
                                    <span className="text-green-400">{formatPrice(pair, t.price)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>

            </div>
        </div>
    );
};

export default SmartMoneyAnalysisView;