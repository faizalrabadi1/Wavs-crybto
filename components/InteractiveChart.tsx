
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Candle } from '../types';

interface InteractiveChartProps {
    data: Candle[];
    pair: string;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({ data, pair }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [range, setRange] = useState({ start: 0, end: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, rangeStart: number, rangeEnd: number } | null>(null);
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, candle: Candle } | null>(null);

    // Constants
    const MIN_CANDLES = 10;
    const INITIAL_VIEW = 60; // Initial candles to show
    const HEIGHT = 300;
    const BRUSH_HEIGHT = 40;
    const PADDING = { top: 20, right: 50, bottom: 20, left: 10 };
    const GAP = 20; // Gap between main chart and brush

    // Initialize range
    useEffect(() => {
        if (data.length > 0) {
            const end = data.length;
            const start = Math.max(0, end - INITIAL_VIEW);
            setRange({ start, end });
        }
    }, [data]);

    // Helper: Format Price
    const formatPrice = (price: number) => {
        if (price < 1) return price.toFixed(5);
        if (price < 100) return price.toFixed(3);
        return price.toFixed(2);
    };

    // Derived State
    const visibleData = useMemo(() => data.slice(Math.floor(range.start), Math.ceil(range.end)), [data, range]);
    
    const maxPrice = Math.max(...visibleData.map(c => c.high));
    const minPrice = Math.min(...visibleData.map(c => c.low));
    const priceRange = maxPrice - minPrice || 1;

    const totalRange = data.length;
    const viewRange = range.end - range.start;

    // Scale Functions
    const getX = (index: number, width: number) => {
        return PADDING.left + ((index - range.start) / (viewRange)) * (width - PADDING.left - PADDING.right);
    };

    const getY = (price: number) => {
        return PADDING.top + (1 - (price - minPrice) / priceRange) * (HEIGHT - PADDING.top - PADDING.bottom);
    };

    // Brush Scale
    const allMax = Math.max(...data.map(c => c.close));
    const allMin = Math.min(...data.map(c => c.close));
    const allRange = allMax - allMin || 1;
    
    const getBrushY = (price: number) => {
        return (1 - (price - allMin) / allRange) * BRUSH_HEIGHT;
    };

    // Event Handlers
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const ZOOM_SPEED = 0.1;
        const delta = viewRange * ZOOM_SPEED * Math.sign(e.deltaY);
        
        let newStart = range.start - delta;
        let newEnd = range.end + delta;

        // Clamp
        if (newEnd - newStart < MIN_CANDLES) {
            const center = (range.start + range.end) / 2;
            newStart = center - MIN_CANDLES / 2;
            newEnd = center + MIN_CANDLES / 2;
        }
        if (newStart < 0) newStart = 0;
        if (newEnd > data.length) newEnd = data.length;

        setRange({ start: newStart, end: newEnd });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, rangeStart: range.start, rangeEnd: range.end });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            
            // Pan Logic
            if (isDragging && dragStart) {
                const dxPixels = e.clientX - dragStart.x;
                const dxCandles = (dxPixels / width) * viewRange * -1; // Inverse pan
                
                let newStart = dragStart.rangeStart + dxCandles;
                let newEnd = dragStart.rangeEnd + dxCandles;

                if (newStart < 0) {
                    newStart = 0;
                    newEnd = viewRange;
                }
                if (newEnd > data.length) {
                    newEnd = data.length;
                    newStart = data.length - viewRange;
                }
                setRange({ start: newStart, end: newEnd });
            }

            // Hover Logic
            if (!isDragging && x >= PADDING.left && x <= width - PADDING.right) {
                const index = Math.round(range.start + ((x - PADDING.left) / (width - PADDING.left - PADDING.right)) * viewRange);
                const candle = data[index];
                if (candle) {
                    setHoverInfo({ x, y: getY(candle.close), candle });
                }
            } else {
                setHoverInfo(null);
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
    };

    return (
        <div 
            ref={containerRef} 
            className={`relative w-full bg-gray-900 rounded-lg border border-gray-700 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`} 
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Header info */}
            <div className="absolute top-2 left-2 z-10 flex space-x-4 text-xs font-mono bg-gray-800/80 p-1 rounded border border-gray-700 backdrop-blur-sm">
                <span className="text-white font-bold">{pair}</span>
                {hoverInfo && (
                    <>
                        <span className={hoverInfo.candle.close >= hoverInfo.candle.open ? 'text-green-400' : 'text-red-400'}>
                            O: {formatPrice(hoverInfo.candle.open)}
                        </span>
                        <span className={hoverInfo.candle.close >= hoverInfo.candle.open ? 'text-green-400' : 'text-red-400'}>
                            H: {formatPrice(hoverInfo.candle.high)}
                        </span>
                        <span className={hoverInfo.candle.close >= hoverInfo.candle.open ? 'text-green-400' : 'text-red-400'}>
                            L: {formatPrice(hoverInfo.candle.low)}
                        </span>
                        <span className={hoverInfo.candle.close >= hoverInfo.candle.open ? 'text-green-400' : 'text-red-400'}>
                            C: {formatPrice(hoverInfo.candle.close)}
                        </span>
                    </>
                )}
            </div>

            <svg width="100%" height={HEIGHT + GAP + BRUSH_HEIGHT} className="overflow-visible">
                <defs>
                    <clipPath id="chartClip">
                        <rect x={PADDING.left} y={PADDING.top} width="100%" height={HEIGHT - PADDING.top - PADDING.bottom} />
                    </clipPath>
                </defs>

                {/* Main Chart Area */}
                <g clipPath="url(#chartClip)">
                    {/* Grid */}
                    {Array.from({ length: 5 }).map((_, i) => {
                        const p = minPrice + (priceRange / 4) * i;
                        const y = getY(p);
                        return <line key={i} x1={PADDING.left} y1={y} x2="100%" y2={y} stroke="#374151" strokeWidth="0.5" strokeDasharray="4 4" />;
                    })}

                    {/* Candles */}
                    {visibleData.map((c, i) => {
                        const idx = Math.floor(range.start) + i;
                        const x = getX(idx, containerRef.current?.clientWidth || 800);
                        const candleWidth = Math.max(1, (containerRef.current?.clientWidth || 800 - PADDING.left - PADDING.right) / viewRange * 0.6);
                        const isUp = c.close >= c.open;
                        const color = isUp ? '#4ade80' : '#f87171';
                        const yOpen = getY(c.open);
                        const yClose = getY(c.close);
                        const yHigh = getY(c.high);
                        const yLow = getY(c.low);

                        return (
                            <g key={i}>
                                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" />
                                <rect 
                                    x={x - candleWidth / 2} 
                                    y={Math.min(yOpen, yClose)} 
                                    width={candleWidth} 
                                    height={Math.max(1, Math.abs(yClose - yOpen))} 
                                    fill={color} 
                                />
                            </g>
                        );
                    })}
                </g>

                {/* Price Axis */}
                {Array.from({ length: 5 }).map((_, i) => {
                    const p = minPrice + (priceRange / 4) * i;
                    const y = getY(p);
                    return (
                        <text key={i} x="100%" y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af" className="select-none pointer-events-none">
                            {formatPrice(p)}
                        </text>
                    );
                })}

                {/* Crosshair Lines */}
                {hoverInfo && (
                    <g className="pointer-events-none">
                        <line x1={PADDING.left} y1={hoverInfo.y} x2="100%" y2={hoverInfo.y} stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="2 2" />
                        <line x1={hoverInfo.x} y1={PADDING.top} x2={hoverInfo.x} y2={HEIGHT - PADDING.bottom} stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="2 2" />
                        <text x="100%" y={hoverInfo.y - 5} textAnchor="end" fill="#fbbf24" fontSize="10" fontWeight="bold">
                            {formatPrice(hoverInfo.candle.close)}
                        </text>
                    </g>
                )}

                {/* Brush / Navigator Area */}
                <g transform={`translate(0, ${HEIGHT + GAP})`}>
                    <rect x={PADDING.left} y={0} width="100%" height={BRUSH_HEIGHT} fill="#1f2937" rx="4" />
                    {/* Mini Chart */}
                    <polyline 
                        points={data.map((c, i) => {
                            const x = PADDING.left + (i / (totalRange - 1)) * ((containerRef.current?.clientWidth || 800) - PADDING.left - PADDING.right);
                            const y = getBrushY(c.close);
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#4b5563"
                        strokeWidth="1"
                    />
                    {/* Selection Window */}
                    {(() => {
                        const totalW = (containerRef.current?.clientWidth || 800) - PADDING.left - PADDING.right;
                        const x1 = PADDING.left + (range.start / totalRange) * totalW;
                        const x2 = PADDING.left + (range.end / totalRange) * totalW;
                        return (
                            <rect 
                                x={x1} 
                                y={0} 
                                width={Math.max(2, x2 - x1)} 
                                height={BRUSH_HEIGHT} 
                                fill="#22d3ee" 
                                fillOpacity="0.2" 
                                stroke="#22d3ee" 
                                strokeWidth="1"
                                className="cursor-grab active:cursor-grabbing"
                            />
                        );
                    })()}
                </g>
            </svg>
        </div>
    );
};

export default InteractiveChart;
