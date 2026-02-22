
import React from 'react';
import type { LiquidationMap, LiquidationLevel } from '../types';

interface Props {
    data: LiquidationMap;
    currentPrice: number;
}

const LiquidationHeatmap: React.FC<Props> = ({ data, currentPrice }) => {
    if (!data || data.levels.length === 0) return null;

    const { clusters } = data;
    
    // Find price range for visualization
    const prices = clusters.map(c => c.price).concat(currentPrice);
    const maxPrice = Math.max(...prices) * 1.005;
    const minPrice = Math.min(...prices) * 0.995;
    const range = maxPrice - minPrice;

    const getPosition = (price: number) => {
        return ((maxPrice - price) / range) * 100; // Top to bottom percentage
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
                {/* Feature 5: Holographic Depth */}
                <span>العمق الهولوغرافي للسوق (3D Market Depth)</span>
            </h3>
            
            <p className="text-sm text-gray-400 mb-4">{data.summary}</p>

            {/* 3D Container */}
            <div className="relative h-64 w-full bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex perspective-container" style={{ perspective: '1000px' }}>
                
                {/* Price Axis (Left) */}
                <div className="w-16 h-full border-l border-gray-700 flex flex-col justify-between py-2 text-xs text-gray-500 font-mono text-right px-1 bg-gray-900/50 z-20 relative">
                    <span>{maxPrice.toFixed(2)}</span>
                    <span>{((maxPrice + minPrice) / 2).toFixed(2)}</span>
                    <span>{minPrice.toFixed(2)}</span>
                </div>

                {/* Holographic Heatmap Area */}
                <div className="flex-grow relative transform-style-3d rotate-x-12">
                    
                    {/* Grid Floor */}
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-30"></div>

                    {/* Current Price Laser */}
                    <div 
                        className="absolute w-full h-[2px] bg-white z-20 shadow-[0_0_10px_#fff]"
                        style={{ top: `${getPosition(currentPrice)}%` }}
                    >
                        <span className="absolute right-2 -top-5 text-[10px] text-white font-bold bg-black/50 px-1 rounded">السعر الحالي</span>
                    </div>

                    {/* 3D Clusters */}
                    {clusters.map((cluster, i) => {
                        const top = getPosition(cluster.price);
                        const width = cluster.intensity === 'High' ? '80%' : cluster.intensity === 'Medium' ? '50%' : '30%';
                        // Shorts (Resistance) are usually Red/Orange, Longs (Support) are Green/Blue
                        const baseColor = cluster.type === 'Short' ? '239, 68, 68' : '34, 197, 94'; 
                        const depth = cluster.intensity === 'High' ? '40px' : cluster.intensity === 'Medium' ? '25px' : '10px';
                        
                        return (
                            <div 
                                key={i}
                                className="absolute right-0 transform-gpu transition-all duration-500 group hover:scale-105"
                                style={{ 
                                    top: `calc(${top}% - 10px)`, 
                                    width: width, 
                                    height: '20px',
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                {/* Front Face */}
                                <div 
                                    className="absolute inset-0 rounded-l-sm flex items-center justify-end pr-2"
                                    style={{ 
                                        background: `linear-gradient(90deg, rgba(${baseColor}, 0) 0%, rgba(${baseColor}, 0.8) 100%)`,
                                        boxShadow: `0 0 15px rgba(${baseColor}, 0.4)`,
                                        transform: 'translateZ(0px)'
                                    }}
                                >
                                     <span className="text-[9px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        {cluster.intensity === 'High' ? '100x' : cluster.intensity === 'Medium' ? '50x' : '25x'}
                                    </span>
                                </div>
                                
                                {/* Top/Bottom Glow for 3D effect (Pseudo) */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-white opacity-20"></div>
                                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-black opacity-40"></div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-sm opacity-70 shadow-[0_0_5px_red]"></div><span>تصفية عقود البيع (مقاومة)</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm opacity-70 shadow-[0_0_5px_green]"></div><span>تصفية عقود الشراء (دعم)</span></div>
            </div>
        </div>
    );
};

export default LiquidationHeatmap;
