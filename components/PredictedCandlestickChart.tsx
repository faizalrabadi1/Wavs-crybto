import React from 'react';
import type { Candle, PredictedCandle } from '../types';

interface Props {
    historicalCandles: Candle[];
    predictedCandles: PredictedCandle[];
}

const PredictedCandlestickChart: React.FC<Props> = ({ historicalCandles, predictedCandles }) => {
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 250;
    const PADDING = { top: 20, right: 80, bottom: 20, left: 10 };
    
    if (historicalCandles.length === 0 || predictedCandles.length === 0) {
        return <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg"><p className="text-gray-500">لا توجد بيانات للرسم.</p></div>;
    }

    const historicalData = historicalCandles.map((c, i) => ({ ...c, index: i }));
    const predictedData = predictedCandles.map((c, i) => ({ ...c, index: historicalData.length + i }));
    const combinedData = [...historicalData.map(c => c.close), ...predictedData.flatMap(c => [c.h, c.l])];

    const minPrice = Math.min(...combinedData) * 0.99;
    const maxPrice = Math.max(...combinedData) * 1.01;
    const priceRange = maxPrice - minPrice;

    const totalCandles = historicalData.length + predictedData.length;
    
    const scaleX = (index: number) => PADDING.left + (index / (totalCandles - 1)) * (SVG_WIDTH - PADDING.left - PADDING.right);
    const scaleY = (price: number) => (SVG_HEIGHT - PADDING.bottom) - ((price - minPrice) / priceRange) * (SVG_HEIGHT - PADDING.top - PADDING.bottom);
    
    const candleWidth = Math.max(1, (SVG_WIDTH - PADDING.left - PADDING.right) / totalCandles * 0.7);

    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = minPrice + (priceRange / 4) * i;
        return { value: value.toFixed(4), y: scaleY(value) };
    });

    return (
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full bg-gray-800/50 rounded-lg">
            {/* Y-Axis Grid */}
            {yAxisLabels.map(label => (
                <g key={`y-axis-${label.value}`}>
                    <line x1={PADDING.left} y1={label.y} x2={SVG_WIDTH - PADDING.right} y2={label.y} stroke="#30363d" strokeWidth="0.5" />
                    <text x={SVG_WIDTH - PADDING.right + 5} y={label.y + 3} fill="#a0aec0" fontSize="10">{label.value}</text>
                </g>
            ))}

            {/* Historical Candles (as a simplified path) */}
            <path 
                d={historicalData.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(d.index)} ${scaleY(d.close)}`).join(' ')}
                stroke="#4a5568" strokeWidth="1.5" fill="none"
            />
            
            {/* Separator Line */}
            <line 
                x1={scaleX(historicalData.length - 0.5)} y1={PADDING.top}
                x2={scaleX(historicalData.length - 0.5)} y2={SVG_HEIGHT - PADDING.bottom}
                stroke="#facc15" strokeWidth="1" strokeDasharray="4 4"
            />
            <text x={scaleX(historicalData.length - 1)} y={SVG_HEIGHT - 5} fill="#facc15" fontSize="10" textAnchor="end">الآن</text>


            {/* Predicted Candles */}
            {predictedData.map(candle => {
                const x = scaleX(candle.index);
                const y_open = scaleY(candle.o);
                const y_close = scaleY(candle.c);
                const isUp = candle.c > candle.o;
                const color = isUp ? '#4ade80' : '#f87171';

                return (
                    <g key={candle.index}>
                        {/* Wick */}
                        <line x1={x} y1={scaleY(candle.h)} x2={x} y2={scaleY(candle.l)} stroke={color} strokeWidth="1" />
                        {/* Body */}
                        <rect 
                            x={x - candleWidth / 2}
                            y={isUp ? y_close : y_open}
                            width={candleWidth}
                            height={Math.max(1, Math.abs(y_open - y_close))}
                            fill={color}
                        />
                    </g>
                );
            })}
        </svg>
    );
};

export default PredictedCandlestickChart;
