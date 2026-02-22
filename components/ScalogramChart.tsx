
import React, { useState } from 'react';
import type { ScalogramData } from '../types';

interface ScalogramChartProps {
    data: ScalogramData;
}

const energyToColor = (energy: number): string => {
    const clampedEnergy = Math.max(0, Math.min(1, energy));
    // Futuristic Heatmap: Deep Blue -> Cyan -> Yellow -> Red -> White
    if (clampedEnergy < 0.2) {
        const intensity = Math.round(clampedEnergy / 0.2 * 100);
        return `rgb(0, 0, ${50 + intensity})`; // Dark Blue
    } else if (clampedEnergy < 0.4) {
        const intensity = Math.round((clampedEnergy - 0.2) / 0.2 * 255);
        return `rgb(0, ${intensity}, ${255})`; // Cyan
    } else if (clampedEnergy < 0.6) {
        const intensity = Math.round((clampedEnergy - 0.4) / 0.2 * 255);
        return `rgb(${intensity}, 255, ${255 - intensity})`; // Green to Yellow
    } else if (clampedEnergy < 0.8) {
        const intensity = Math.round((clampedEnergy - 0.6) / 0.2 * 255);
        return `rgb(255, ${255 - intensity}, 0)`; // Yellow to Red
    } else {
        const intensity = Math.round((clampedEnergy - 0.8) / 0.2 * 255);
        return `rgb(255, ${intensity}, ${intensity})`; // Red to White
    }
};

const ScalogramChart: React.FC<ScalogramChartProps> = ({ data }) => {
    const [is3D, setIs3D] = useState(false);
    const [hoverPos, setHoverPos] = useState<{x:number, y:number, val:number} | null>(null);

    if (!data || !data.energy || data.energy.length === 0) {
        return <div className="flex items-center justify-center h-full bg-gray-800 rounded-md text-gray-500">لا توجد بيانات طيفية</div>;
    }

    // Downsample for performance if needed, but assuming 24x250 is manageable
    const periods = data.energy;
    const timePoints = periods[0].length;

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col p-2 border border-gray-700">
            <div className="flex justify-between items-center mb-2 px-1 z-10">
                <div className="text-xs text-gray-400 flex gap-4">
                    <span>تردد عالٍ (Fast)</span>
                    <span className="text-cyan-glow">← الزمن →</span>
                </div>
                <button 
                    onClick={() => setIs3D(!is3D)}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${is3D ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-800 text-gray-400 border-gray-600'}`}
                >
                    {is3D ? '2D Flat' : '3D Terrain'}
                </button>
            </div>

            <div 
                className={`flex-grow w-full relative transition-transform duration-1000 ease-in-out perspective-container ${is3D ? 'scale-90' : ''}`}
                style={{ perspective: '800px' }}
            >
                <div 
                    className={`w-full h-full grid transform-style-3d transition-transform duration-1000 ${is3D ? 'rotate-x-60 rotate-z-10 translate-y-10' : ''}`}
                    style={{ gridTemplateColumns: `repeat(${timePoints}, 1fr)` }}
                    onMouseLeave={() => setHoverPos(null)}
                >
                    {Array.from({ length: timePoints }).map((_, tIndex) => (
                        <div key={tIndex} className="flex flex-col-reverse h-full">
                            {periods.map((periodRow, pIndex) => {
                                const val = periodRow[tIndex];
                                return (
                                    <div
                                        key={`${pIndex}-${tIndex}`}
                                        className="flex-1 w-full transition-all duration-300"
                                        style={{ 
                                            backgroundColor: energyToColor(val),
                                            transform: is3D && val > 0.6 ? `translateZ(${val * 20}px)` : 'none',
                                            opacity: is3D ? 0.8 : 1
                                        }}
                                        onMouseEnter={() => setHoverPos({ x: tIndex, y: pIndex, val })}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
                
                {/* Hover Tooltip */}
                {hoverPos && !is3D && (
                    <div className="absolute top-2 left-2 bg-black/80 text-white text-[9px] p-2 rounded border border-gray-600 pointer-events-none z-20">
                        <p>Time: {hoverPos.x}</p>
                        <p>Period: {hoverPos.y}</p>
                        <p className="font-bold text-cyan-glow">Energy: {(hoverPos.val * 100).toFixed(1)}%</p>
                    </div>
                )}

                 {/* 3D Grid Floor effect */}
                {is3D && <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-0" style={{transform: 'translateZ(-1px)'}}></div>}
            </div>
            
             <div className="flex justify-between text-xs text-gray-500 mt-1 px-1">
                <span>الآن</span>
                <span>تردد منخفض (Slow)</span>
            </div>
        </div>
    );
};

export default ScalogramChart;
