
import React from 'react';
import type { HarmonicPatternAnalysis, Candle } from '../types';
import HarmonicDeepAIAnalysis from './HarmonicDeepAIAnalysis';

interface Props {
    analysis: HarmonicPatternAnalysis;
    candles: Candle[];
    pair: string;
}

const HarmonicAnalysisView: React.FC<Props> = ({ analysis, candles, pair }) => {
    if (!analysis || !analysis.detected || !analysis.points) return null;

    const { patternName, points, potentialReversalZone, targets, stopLoss, hsiScore, ratios, timeSymmetryScore, rsiConfirmation, entryTrigger, isBammActive } = analysis;
    const isBullish = patternName?.includes('Bullish') || (points[0].price > points[1].price && points.length > 4);

    // --- Charting Logic ---
    const SVG_WIDTH = 400;
    const SVG_HEIGHT = 250;
    const PADDING = 30;

    const chartStartIndex = Math.max(0, points[0].index - 10);
    const chartEndIndex = Math.min(candles.length + 15, points[points.length-1].index + 20);
    const chartCandleSlice = candles.slice(chartStartIndex, Math.min(candles.length, chartEndIndex));

    const allPrices = [
        ...chartCandleSlice.map(c => c.high), 
        ...chartCandleSlice.map(c => c.low),
        ...points.map(p => p.price),
        ...(targets ? targets.map(t => t.price) : [])
    ];
    
    const minPrice = Math.min(...allPrices) * 0.998;
    const maxPrice = Math.max(...allPrices) * 1.002;
    const priceRange = maxPrice - minPrice;
    const indexRange = chartEndIndex - chartStartIndex;

    const scaleX = (index: number) => PADDING + ((index - chartStartIndex) / indexRange) * (SVG_WIDTH - 2 * PADDING);
    const scaleY = (price: number) => (SVG_HEIGHT - PADDING) - ((price - minPrice) / priceRange) * (SVG_HEIGHT - 2 * PADDING);

    const normPoints = points.map(p => ({ x: scaleX(p.index), y: scaleY(p.price), price: p.price, leg: p.leg }));

    // Path Generation
    let pathD = "";
    if (normPoints.length === 5) { // XABCD
        pathD = `M ${normPoints[0].x} ${normPoints[0].y} L ${normPoints[1].x} ${normPoints[1].y} L ${normPoints[2].x} ${normPoints[2].y} L ${normPoints[3].x} ${normPoints[3].y} L ${normPoints[4].x} ${normPoints[4].y}`;
        // Triangles for fill
        pathD += ` L ${normPoints[2].x} ${normPoints[2].y} L ${normPoints[0].x} ${normPoints[0].y}`; // Close XAB
        pathD += ` M ${normPoints[2].x} ${normPoints[2].y} L ${normPoints[4].x} ${normPoints[4].y}`; // Close BCD
    } else if (normPoints.length === 4) { // ABCD
        pathD = `M ${normPoints[0].x} ${normPoints[0].y} L ${normPoints[1].x} ${normPoints[1].y} L ${normPoints[2].x} ${normPoints[2].y} L ${normPoints[3].x} ${normPoints[3].y}`;
        pathD += ` L ${normPoints[1].x} ${normPoints[1].y}`; // Close ABC (partial)
    }

    const candlePath = chartCandleSlice.map((c, i) => {
        const x = scaleX(chartStartIndex + i);
        const yH = scaleY(c.high);
        const yL = scaleY(c.low);
        return `M ${x} ${yH} L ${x} ${yL}`;
    }).join(' ');

    const getMidpoint = (p1: any, p2: any) => ({ x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 });

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                    <span>💎</span> نماذج الهارمونيك المتقدمة
                </h3>
                <div className="flex gap-2">
                    <span className="bg-gray-800 text-xs px-2 py-1 rounded border border-gray-600">{patternName}</span>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${hsiScore && hsiScore > 80 ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>
                        DQI: {hsiScore?.toFixed(0)}%
                    </span>
                </div>
            </div>

            {/* Advanced Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="bg-gray-800 p-2 rounded text-center">
                    <p className="text-[10px] text-gray-400">التماثل الزمني</p>
                    <p className={`text-sm font-bold font-mono ${timeSymmetryScore && timeSymmetryScore > 80 ? 'text-green-400' : 'text-yellow-400'}`}>{timeSymmetryScore?.toFixed(0)}%</p>
                </div>
                <div className="bg-gray-800 p-2 rounded text-center">
                    <p className="text-[10px] text-gray-400">RSI Check</p>
                    <p className={`text-sm font-bold ${rsiConfirmation?.status === 'Oversold' || rsiConfirmation?.status === 'Overbought' ? 'text-green-400' : 'text-gray-300'}`}>
                        {rsiConfirmation?.value.toFixed(0)} ({rsiConfirmation?.status})
                    </p>
                </div>
                <div className="bg-gray-800 p-2 rounded text-center">
                    <p className="text-[10px] text-gray-400">BAMM Trigger</p>
                    <p className={`text-sm font-bold ${isBammActive ? 'text-green-400 animate-pulse' : 'text-gray-500'}`}>
                        {isBammActive ? 'ACTIVE' : 'WAIT'}
                    </p>
                </div>
                <div className="bg-gray-800 p-2 rounded text-center">
                    <p className="text-[10px] text-gray-400">إشارة الدخول</p>
                    <p className={`text-xs font-bold mt-1 ${entryTrigger ? 'text-green-400' : 'text-gray-500'}`}>
                        {entryTrigger || 'No Trigger'}
                    </p>
                </div>
            </div>

            <div className="relative bg-gray-800/50 rounded-lg border border-gray-700 h-64 w-full overflow-hidden">
                <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
                    {/* Candles */}
                    <path d={candlePath} stroke="#374151" strokeWidth="1" />
                    
                    {/* Pattern Fill */}
                    <path d={pathD} fill={isBullish ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)"} stroke="none" />
                    
                    {/* Pattern Lines */}
                    <path d={pathD} stroke={isBullish ? "#4ade80" : "#f87171"} strokeWidth="2" fill="none" strokeLinejoin="round" />

                    {/* Points Labels */}
                    {normPoints.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="3" fill="white" />
                            <text x={p.x} y={p.y - 10} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{p.leg}</text>
                        </g>
                    ))}

                    {/* Ratios Labels */}
                    {ratios?.map((r, i) => {
                        let p1, p2;
                        if (r.leg === 'XB' && normPoints.length >= 3) { p1 = normPoints[0]; p2 = normPoints[2]; }
                        else if (r.leg === 'AC' && normPoints.length >= 4) { p1 = normPoints[1]; p2 = normPoints[3]; }
                        else if (r.leg === 'XD' && normPoints.length >= 5) { p1 = normPoints[0]; p2 = normPoints[4]; }
                        else if (r.leg === 'BD' && normPoints.length >= 5) { p1 = normPoints[2]; p2 = normPoints[4]; }
                        
                        if (p1 && p2) {
                            const mid = getMidpoint(p1, p2);
                            return (
                                <text key={`rat-${i}`} x={mid.x} y={mid.y} fill="#fbbf24" fontSize="9" textAnchor="middle" className="bg-black">
                                    {r.value.toFixed(3)}
                                </text>
                            );
                        }
                        return null;
                    })}

                    {/* PRZ Box */}
                    {potentialReversalZone && (
                        <rect 
                            x={normPoints[normPoints.length-1].x - 10} 
                            y={scaleY(potentialReversalZone.end)} 
                            width="40" 
                            height={Math.abs(scaleY(potentialReversalZone.start) - scaleY(potentialReversalZone.end))} 
                            fill={isBullish ? "rgba(0, 255, 0, 0.3)" : "rgba(255, 0, 0, 0.3)"} 
                            stroke="none" 
                        />
                    )}
                </svg>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-800 p-2 rounded">
                    <p className="text-gray-400 mb-1">منطقة الانعكاس (PRZ)</p>
                    <p className="font-mono text-cyan-glow">
                        {potentialReversalZone?.start.toFixed(4)} - {potentialReversalZone?.end.toFixed(4)}
                    </p>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                    <p className="text-gray-400 mb-1">الأهداف (Targets)</p>
                    <div className="flex gap-2">
                        {targets?.map((t, i) => (
                            <span key={i} className="text-green-400 font-mono">{t.price.toFixed(4)}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Analyst Integration */}
            <HarmonicDeepAIAnalysis 
                analysis={analysis}
                pair={pair}
                timeframe="Current"
            />
        </div>
    );
};

export default HarmonicAnalysisView;
