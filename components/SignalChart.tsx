
import React from 'react';
import type { LiveSignal } from '../types';

interface Props {
    signal: LiveSignal | null;
}

const SignalChart: React.FC<Props> = ({ signal }) => {
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 250;
    const PADDING = { top: 20, right: 100, bottom: 20, left: 10 };
    const CHART_WIDTH = SVG_WIDTH - PADDING.left - PADDING.right;
    const CHART_HEIGHT = SVG_HEIGHT - PADDING.top - PADDING.bottom;
    
    // Generate mock price data around the signal
    const chartData = React.useMemo(() => {
        if (!signal || signal.side === 'WAIT') {
            const price = signal?.price || 50000;
            return Array.from({length: 50}, (_, i) => ({ time: i, price: price * (1 + (Math.random() - 0.5) * 0.01) }));
        }
        
        const data = [];
        let currentPrice = signal.entry * (signal.side === 'BUY' ? 1.01 : 0.99);
        for(let i=0; i<50; i++) {
            if (i > 35 && i < 45) {
                 currentPrice -= (currentPrice - signal.entry) / (10 - (i-35));
            } else {
                 currentPrice *= (1 + (Math.random() - 0.5) * 0.003);
            }
             data.push({ time: i, price: currentPrice });
        }
        data[45] = { time: 45, price: signal.entry };
        return data;
    }, [signal]);
    
    if (!signal) {
         return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
                 <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-400">Waiting for Signal</h3>
                    <p className="mt-1 text-xs text-gray-500">The chart will display the trade setup once a signal is generated.</p>
                </div>
            </div>
        );
    }

    const isBuy = signal.side === 'BUY';
    const allPrices = [signal.entry, signal.tp1, signal.tp2, signal.sl, ...chartData.map(d => d.price)];
    const minY = Math.min(...allPrices) * 0.998;
    const maxY = Math.max(...allPrices) * 1.002;
    const minX = Math.min(...chartData.map(d=>d.time));
    const maxX = Math.max(...chartData.map(d=>d.time));
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    const scaleX = (x: number) => PADDING.left + ((x - minX) / (rangeX || 1)) * CHART_WIDTH;
    const scaleY = (y: number) => (SVG_HEIGHT - PADDING.bottom) - ((y - minY) / (rangeY || 1)) * CHART_HEIGHT;

    const pathData = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(d.time)},${scaleY(d.price)}`).join(' ');
    
    const riskAmount = Math.abs(signal.entry - signal.sl);
    const rewardAmount = Math.abs(signal.tp2 - signal.entry);
    const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : '∞';

    return (
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
            {/* Grid & Y-Axis Labels */}
            {Array.from({ length: 5 }).map((_, i) => {
                const value = minY + (rangeY / 4) * i;
                const y = scaleY(value);
                return (
                    <g key={i}>
                        <line x1={PADDING.left} y1={y} x2={CHART_WIDTH + PADDING.left} y2={y} stroke="#30363d" strokeWidth="0.5" strokeDasharray="3 3" />
                        <text x={CHART_WIDTH + PADDING.left + 5} y={y + 3} fill="#a0aec0" fontSize="10">{value.toFixed(2)}</text>
                    </g>
                )
            })}
            
            {signal.side !== 'WAIT' && <>
                {/* Risk/Reward Areas */}
                <rect x={PADDING.left} y={scaleY(Math.max(signal.entry, signal.sl))} width={CHART_WIDTH} height={Math.abs(scaleY(signal.entry) - scaleY(signal.sl))} fill={isBuy ? "rgba(248, 113, 113, 0.1)" : "rgba(74, 222, 128, 0.1)"} />
                <rect x={PADDING.left} y={scaleY(Math.max(signal.entry, signal.tp2))} width={CHART_WIDTH} height={Math.abs(scaleY(signal.entry) - scaleY(signal.tp2))} fill={isBuy ? "rgba(74, 222, 128, 0.1)" : "rgba(248, 113, 113, 0.1)"} />
                
                {/* Signal Lines */}
                <line x1={PADDING.left} y1={scaleY(signal.entry)} x2={SVG_WIDTH - PADDING.right + 20} y2={scaleY(signal.entry)} stroke="#00a9ff" strokeWidth="1.5" />
                <text x={SVG_WIDTH - PADDING.right + 25} y={scaleY(signal.entry) + 4} fill="#00a9ff" fontSize={10}>{`Entry @ ${signal.entry.toFixed(2)}`}</text>

                <line x1={PADDING.left} y1={scaleY(signal.sl)} x2={SVG_WIDTH - PADDING.right + 20} y2={scaleY(signal.sl)} stroke="#f87171" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x={SVG_WIDTH - PADDING.right + 25} y={scaleY(signal.sl) + 4} fill="#f87171" fontSize={10}>{`SL @ ${signal.sl.toFixed(2)}`}</text>

                <line x1={PADDING.left} y1={scaleY(signal.tp1)} x2={SVG_WIDTH - PADDING.right + 20} y2={scaleY(signal.tp1)} stroke="#4ade80" strokeWidth="1" strokeDasharray="4 4" />
                <text x={SVG_WIDTH - PADDING.right + 25} y={scaleY(signal.tp1) + 4} fill="#4ade80" fontSize={10}>{`TP1 @ ${signal.tp1.toFixed(2)}`}</text>

                <line x1={PADDING.left} y1={scaleY(signal.tp2)} x2={SVG_WIDTH - PADDING.right + 20} y2={scaleY(signal.tp2)} stroke="#4ade80" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x={SVG_WIDTH - PADDING.right + 25} y={scaleY(signal.tp2) + 4} fill="#4ade80" fontSize={10}>{`TP2 @ ${signal.tp2.toFixed(2)} (R:R ${rrRatio})`}</text>
            </>}
            
            {/* Price Line */}
            <path d={pathData} stroke="#a0aec0" strokeWidth="2" fill="none" />
        </svg>
    );
}

export default SignalChart;