import React from 'react';
import type { Explosion } from '../services/deepAnalysisService';
import type { Candle } from '../types';

export interface ChartData {
    candles: Candle[];
    explosions: Explosion[];
    fibPriceLevels: { level: string; value: number }[];
    fibTimeZones: { level: string; value: number }[];
    predictedPath: { timestamp: number, close: number }[];
}

const DeepAnalysisChart: React.FC<ChartData> = (props) => {
    const { candles, explosions, fibPriceLevels, fibTimeZones, predictedPath } = props;

    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 300;
    const PADDING = { top: 20, right: 80, bottom: 30, left: 10 };
    const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
    const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;

    if (!candles || candles.length < 2) {
        return <div className="flex items-center justify-center h-full text-xs text-gray-500">بيانات غير كافية للرسم.</div>;
    }

    const data = candles.map(c => ({ time: c.timestamp, price: c.close }));
    const allPrices = data.map(d => d.price);
    const minX = data[0].time;
    const maxX = data[data.length - 1].time;
    const minY = Math.min(...allPrices) * 0.98;
    const maxY = Math.max(...allPrices) * 1.02;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    const scaleX = (x: number) => PADDING.left + ((x - minX) / (rangeX || 1)) * CHART_WIDTH;
    const scaleY = (y: number) => (SVG_HEIGHT - PADDING.bottom) - ((y - minY) / (rangeY || 1)) * CHART_HEIGHT;

    const areaPathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.time)},${scaleY(d.price)}`).join(' ')
                        + ` L ${scaleX(maxX)},${scaleY(minY)} L ${scaleX(minX)},${scaleY(minY)} Z`;
    
    const linePathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.time)},${scaleY(d.price)}`).join(' ');

    const predictedPathData = predictedPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.timestamp)},${scaleY(p.close)}`).join(' ');

    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = minY + (rangeY / 4) * i;
        return { value: value.toFixed(2), y: scaleY(value) };
    });

    return (
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
            <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00a9ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00a9ff" stopOpacity={0}/>
                </linearGradient>
            </defs>
            
            {/* Grid & Axes */}
            {yAxisLabels.map(label => (
                <g key={`y-axis-${label.value}`}>
                    <line x1={PADDING.left} y1={label.y} x2={CHART_WIDTH + PADDING.left} y2={label.y} stroke="#30363d" strokeWidth="0.5" strokeDasharray="3 3" />
                    <text x={CHART_WIDTH + PADDING.left + 5} y={label.y + 3} fill="#a0aec0" fontSize="10">{label.value}</text>
                </g>
            ))}
            <text x={PADDING.left} y={SVG_HEIGHT - 5} fill="#a0aec0" fontSize="10">{`شمعة ${minX}`}</text>
            <text x={CHART_WIDTH + PADDING.left} y={SVG_HEIGHT - 5} fill="#a0aec0" fontSize="10" textAnchor="end">{`شمعة ${maxX}`}</text>

            {/* Historical Explosions */}
            {explosions.map((exp, index) => (
                <rect key={index} x={scaleX(exp.startIndex)} y={PADDING.top} width={scaleX(exp.endIndex) - scaleX(exp.startIndex)} height={CHART_HEIGHT} fill="#facc15" fillOpacity={0.1} />
            ))}

            {/* Main Price Area & Line */}
            <path d={areaPathData} fill="url(#priceGradient)" />
            <path d={linePathData} stroke="#00a9ff" strokeWidth="1.5" fill="none" />

            {/* Fibonacci Price Levels */}
            {fibPriceLevels.map(level => (
                <g key={`fib-price-${level.level}`}>
                    <line x1={PADDING.left} y1={scaleY(level.value)} x2={CHART_WIDTH + PADDING.left} y2={scaleY(level.value)} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 2" />
                    <text x={CHART_WIDTH + PADDING.left + 5} y={scaleY(level.value) - 4} fill="#9ca3af" fontSize={9}>{`${level.level} (${level.value.toFixed(2)})`}</text>
                </g>
            ))}
            
            {/* Fibonacci Time Zones */}
            {fibTimeZones.map(zone => (
                 <g key={`fib-time-${zone.level}`}>
                    <line x1={scaleX(zone.value)} y1={PADDING.top} x2={scaleX(zone.value)} y2={CHART_HEIGHT + PADDING.top} stroke="#22d3ee" strokeWidth={1} strokeDasharray="4 2" />
                    <text x={scaleX(zone.value) + 4} y={CHART_HEIGHT + PADDING.top - 5} fill="#22d3ee" fontSize={10}>{zone.level}</text>
                 </g>
            ))}
            
            {/* Predicted Path */}
            <path d={predictedPathData} stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" fill="none" />
        </svg>
    );
};

export default DeepAnalysisChart;