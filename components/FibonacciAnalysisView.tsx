
import React, { useState } from 'react';
import type { FibonacciAnalysis, Candle } from '../types';
import FibonacciDeepAIAnalysis from './FibonacciDeepAIAnalysis';

interface Props {
    analysis: FibonacciAnalysis;
    candles: Candle[];
}

type ActiveTool = 'retracement' | 'extension' | 'timezones' | 'clusters' | 'fan' | 'arcs' | 'spiral';

const FibonacciAnalysisView: React.FC<Props> = ({ analysis, candles }) => {
    const [activeTools, setActiveTools] = useState<Set<ActiveTool>>(new Set(['clusters', 'retracement']));

    if (!analysis.isValid) {
        return null;
    }

    const toggleTool = (tool: ActiveTool) => {
        setActiveTools(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tool)) {
                newSet.delete(tool);
            } else {
                newSet.add(tool);
            }
            return newSet;
        });
    };

    // --- Charting Logic ---
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 250;
    const PADDING = { top: 20, right: 10, bottom: 20, left: 10 };

    const chartCandleSlice = candles.slice(-250);
    const chartStartIndex = candles.length - 250;

    const allPrices = [
        ...chartCandleSlice.map(c => c.close),
        ...(analysis.primaryRetracement?.levels.map(l => l.price) ?? []),
    ];
    const minPrice = Math.min(...allPrices) * 0.98;
    const maxPrice = Math.max(...allPrices) * 1.02;
    const priceRange = maxPrice - minPrice;
    const indexRange = chartCandleSlice.length;

    const scaleX = (index: number) => PADDING.left + ((index - chartStartIndex) / indexRange) * (SVG_WIDTH - 2 * PADDING.left);
    const scaleY = (price: number) => (SVG_HEIGHT - PADDING.bottom) - ((price - minPrice) / priceRange) * (SVG_HEIGHT - 2 * PADDING.bottom);

    const pricePathData = chartCandleSlice.map((c, i) => `${i === 0 ? 'M' : 'L'}${scaleX(chartStartIndex + i)} ${scaleY(c.close)}`).join(' ');

    const ToolButton: React.FC<{ tool: ActiveTool, label: string }> = ({ tool, label }) => (
        <button
            onClick={() => toggleTool(tool)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${activeTools.has(tool) ? 'bg-cyan-glow text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
            {label}
        </button>
    );

    // --- Spiral Generation ---
    const generateSpiral = () => {
        if (!analysis.primaryRetracement) return '';
        const { swingLow } = analysis.primaryRetracement;
        const cx = scaleX(swingLow.index);
        const cy = scaleY(swingLow.price);
        let path = `M ${cx} ${cy} `;
        
        // Feature 3: Golden Spiral (Logarithmic Spiral)
        for(let theta = 0; theta < 6 * Math.PI; theta += 0.1) {
            const a = 2; // Scale factor
            const b = 0.2; // Expansion factor
            const r = a * Math.exp(b * theta);
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            if (x > SVG_WIDTH || y > SVG_HEIGHT || x < 0 || y < 0) continue;
            path += `L ${x} ${y} `;
        }
        return path;
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                <span>محرك تحليل فيبوناتشي المتقدم</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                 <div className="md:col-span-2 bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-white mb-2">ملخص المحرك</h4>
                    <p className="text-sm text-gray-300">{analysis.summary}</p>
                 </div>
                 <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                    <h4 className="font-semibold text-white mb-2">درجة توافق المستويات</h4>
                    <p className={`text-3xl font-bold font-mono ${analysis.confluenceScore > 75 ? 'text-green-400' : analysis.confluenceScore > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {analysis.confluenceScore}%
                    </p>
                 </div>
            </div>

            <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                <div className="flex flex-wrap gap-2 mb-2 p-2">
                    <ToolButton tool="clusters" label="مناطق الالتقاء" />
                    <ToolButton tool="retracement" label="ارتداد" />
                    <ToolButton tool="extension" label="امتداد" />
                    <ToolButton tool="timezones" label="زمني" />
                    <ToolButton tool="fan" label="مروحة" />
                    <ToolButton tool="spiral" label="اللولب الذهبي" />
                </div>
                 <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto bg-gray-800 rounded-md overflow-hidden">
                    <path d={pricePathData} stroke="#4a5568" strokeWidth="1.5" fill="none" />
                    
                    {activeTools.has('clusters') && analysis.clusters.map((cluster, i) => (
                        <rect key={`c-${i}`} x={PADDING.left} y={scaleY(cluster.priceTop)} width={SVG_WIDTH - 2*PADDING.left} height={scaleY(cluster.priceBottom) - scaleY(cluster.priceTop)} fill="#ffc800" fillOpacity={0.1 + Math.min(0.3, cluster.count * 0.05)} />
                    ))}
                    
                    {activeTools.has('retracement') && analysis.primaryRetracement?.levels.map(l => (
                        <line key={`r-${l.level}`} x1={PADDING.left} y1={scaleY(l.price)} x2={SVG_WIDTH - PADDING.left} y2={scaleY(l.price)} stroke="#22d3ee" strokeWidth="0.5" strokeDasharray="2 2" />
                    ))}

                    {activeTools.has('extension') && analysis.trendBasedExtension?.levels.map(l => (
                         <line key={`e-${l.level}`} x1={PADDING.left} y1={scaleY(l.price)} x2={SVG_WIDTH - PADDING.left} y2={scaleY(l.price)} stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="5 5" />
                    ))}

                    {activeTools.has('timezones') && analysis.timeZones?.map(z => (
                        z.index < (chartStartIndex + indexRange) && <line key={`t-${z.level}`} x1={scaleX(z.index)} y1={PADDING.top} x2={scaleX(z.index)} y2={SVG_HEIGHT - PADDING.bottom} stroke="#facc15" strokeWidth="0.5" strokeDasharray="3 3" />
                    ))}
                    
                    {/* Feature 3: Golden Spiral */}
                    {activeTools.has('spiral') && (
                        <path d={generateSpiral()} stroke="rgba(255, 215, 0, 0.5)" strokeWidth="1.5" fill="none" strokeDasharray="10 5" />
                    )}
                    
                    {activeTools.has('fan') && analysis.primaryRetracement && (() => {
                        const { swingLow, swingHigh } = analysis.primaryRetracement;
                        return [0.382, 0.5, 0.618].map(level => {
                            const y = scaleY(swingLow.price + (swingHigh.price - swingLow.price) * level);
                            return <line key={`f-${level}`} x1={scaleX(swingLow.index)} y1={scaleY(swingLow.price)} x2={SVG_WIDTH - PADDING.left} y2={y - (y-scaleY(swingHigh.price))} stroke="#f87171" strokeWidth="0.5" opacity="0.7" />
                        })
                    })()}
                </svg>
            </div>
            
            <FibonacciDeepAIAnalysis analysis={analysis} />

        </div>
    );
};

export default FibonacciAnalysisView;
