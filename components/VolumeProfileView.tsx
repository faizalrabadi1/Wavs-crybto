
import React, { useState } from 'react';
import type { VolumeProfileAnalysis, PriceLevelVolume } from '../types';

interface Props {
    analysis: VolumeProfileAnalysis;
    currentPrice: number;
}

const StrategyCard: React.FC<{ title: string; signal: string; desc: string }> = ({ title, signal, desc }) => (
    <div className={`p-3 rounded-lg border ${signal === 'Buy' ? 'bg-green-500/10 border-green-500/30' : signal === 'Sell' ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-800 border-gray-600'}`}>
        <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-white text-xs">{title}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded ${signal === 'Buy' ? 'bg-green-500 text-black' : signal === 'Sell' ? 'bg-red-500 text-white' : 'bg-gray-600'}`}>{signal}</span>
        </div>
        <p className="text-[10px] text-gray-300">{desc}</p>
    </div>
);

const StatBox: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-white' }) => (
    <div className="bg-gray-800/50 p-2 rounded border border-gray-700 text-center">
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
    </div>
);

const VolumeProfileView: React.FC<Props> = ({ analysis, currentPrice }) => {
    const [activeTab, setActiveTab] = useState<'Profile' | 'Delta' | 'Strategy'>('Profile');

    if (!analysis || analysis.histogram.length === 0) return null;

    const { histogram, pocPrice, vah, val, summary, vwap, vwapStdDev, profileShape, impliedTrend, strategies } = analysis;

    // Chart config
    const height = 350;
    const width = 250;
    const padding = { top: 20, bottom: 20 };
    
    const minPrice = histogram[0].price;
    const maxPrice = histogram[histogram.length - 1].price;
    const priceRange = maxPrice - minPrice;
    const maxVolume = Math.max(...histogram.map(h => h.volume));
    const maxDelta = Math.max(...histogram.map(h => Math.abs(h.delta)));

    const scaleY = (price: number) => height - padding.bottom - ((price - minPrice) / priceRange) * (height - padding.top - padding.bottom);
    const barHeight = (height - padding.top - padding.bottom) / histogram.length;

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4 shadow-lg shadow-blue-900/10">
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>بروفايل الحجم المتقدم (Volume Vision)</span>
                </h3>
                <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                    {['Profile', 'Delta', 'Strategy'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === tab ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Panel: Profile & Chart */}
                <div className="lg:col-span-2 relative h-[350px] bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex">
                     {/* Price Scale Overlay */}
                     <div className="absolute left-2 top-4 z-20 text-[10px] font-mono text-gray-500 space-y-8">
                        <div>{maxPrice.toFixed(2)}</div>
                        <div>{((maxPrice+minPrice)/2).toFixed(2)}</div>
                        <div>{minPrice.toFixed(2)}</div>
                    </div>

                    {/* Main Visualization */}
                    <svg width="100%" height="100%" className="absolute inset-0 z-10">
                         <defs>
                            <linearGradient id="pocGlow" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#f87171" stopOpacity="0.8"/>
                                <stop offset="100%" stopColor="#f87171" stopOpacity="0"/>
                            </linearGradient>
                        </defs>

                        {/* Bars */}
                        {histogram.map((bar, i) => {
                            const y = scaleY(bar.price) - (barHeight / 2);
                            
                            if (activeTab === 'Delta') {
                                const deltaWidth = (bar.delta / maxDelta) * 40; // 40% width max
                                const center = 50; // Center %
                                const color = bar.delta > 0 ? '#4ade80' : '#f87171';
                                return (
                                    <g key={i}>
                                        <line x1="50%" y1={y + barHeight/2} x2={`${50 + deltaWidth}%`} y2={y + barHeight/2} stroke={color} strokeWidth={barHeight - 1} />
                                        <line x1="50%" y1={0} x2="50%" y2="100%" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
                                    </g>
                                )
                            } else {
                                // Normal Profile (Split Buy/Sell or VA)
                                const totalW = (bar.volume / maxVolume) * 100;
                                // Strategy: Colored by VA
                                let fill = "#374151"; 
                                if (bar.isValueArea) fill = "#3b82f6"; 
                                if (bar.isPOC) fill = "url(#pocGlow)";
                                
                                // If we want detailed breakdown (Buy/Sell)
                                const buyW = (bar.buyVol / maxVolume) * 100;
                                const sellW = (bar.sellVol / maxVolume) * 100;

                                return (
                                    <g key={i}>
                                        {/* Background Bar */}
                                        <rect x={`${100 - totalW}%`} y={y} width={`${totalW}%`} height={barHeight - 1} fill={fill} opacity={bar.isPOC ? 1 : 0.3} />
                                        {/* Detail Overlay (Optional) */}
                                        {bar.type === 'HVN' && !bar.isPOC && <rect x={`${100 - totalW}%`} y={y} width="2px" height={barHeight-1} fill="#fff" opacity="0.5" />}
                                        {bar.type === 'LVN' && <rect x={`${100 - totalW}%`} y={y} width={`${totalW}%`} height={barHeight-1} fill="#000" opacity="0.2" />}
                                    </g>
                                );
                            }
                        })}

                        {/* Levels Lines */}
                        <line x1="0" y1={scaleY(pocPrice)} x2="100%" y2={scaleY(pocPrice)} stroke="#f87171" strokeWidth="1.5" />
                        <text x="5" y={scaleY(pocPrice) - 5} fill="#f87171" fontSize="10" fontWeight="bold">POC</text>

                        <line x1="0" y1={scaleY(vah)} x2="100%" y2={scaleY(vah)} stroke="#34d399" strokeWidth="1" strokeDasharray="4 2"/>
                        <text x="5" y={scaleY(vah) - 5} fill="#34d399" fontSize="10">VAH</text>

                        <line x1="0" y1={scaleY(val)} x2="100%" y2={scaleY(val)} stroke="#34d399" strokeWidth="1" strokeDasharray="4 2"/>
                        <text x="5" y={scaleY(val) + 12} fill="#34d399" fontSize="10">VAL</text>

                        {/* VWAP Line */}
                        {vwap > minPrice && vwap < maxPrice && (
                             <line x1="0" y1={scaleY(vwap)} x2="100%" y2={scaleY(vwap)} stroke="#fbbf24" strokeWidth="2" strokeDasharray="2 2" />
                        )}
                        {vwap > minPrice && vwap < maxPrice && <text x="90%" y={scaleY(vwap) - 5} fill="#fbbf24" fontSize="10" textAnchor="end">VWAP</text>}

                        {/* Current Price Laser */}
                        <line x1="0" y1={scaleY(currentPrice)} x2="100%" y2={scaleY(currentPrice)} stroke="#fff" strokeWidth="1.5" />
                        <circle cx="50%" cy={scaleY(currentPrice)} r="3" fill="#fff" className="animate-ping"/>

                    </svg>
                </div>

                {/* Right Panel: Stats & Strategy */}
                <div className="flex flex-col gap-4">
                    {/* Shape Widget */}
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400">شكل البروفايل</p>
                            <p className="text-lg font-bold text-white">{profileShape}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${impliedTrend === 'Bullish' ? 'bg-green-500/20 text-green-300' : impliedTrend === 'Bearish' ? 'bg-red-500/20 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                            {impliedTrend}
                        </div>
                    </div>

                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <StatBox label="VWAP" value={vwap.toFixed(2)} color="text-yellow-400" />
                        <StatBox label="POC" value={pocPrice.toFixed(2)} color="text-red-400" />
                        <StatBox label="VAH" value={vah.toFixed(2)} color="text-green-400" />
                        <StatBox label="VAL" value={val.toFixed(2)} color="text-green-400" />
                    </div>

                    {/* Strategy Section */}
                    <div className="flex-grow bg-gray-800 p-3 rounded-lg border border-gray-700 overflow-y-auto">
                        <h4 className="text-xs font-bold text-cyan-glow mb-3 uppercase tracking-wider">الاستراتيجيات النشطة</h4>
                        <div className="space-y-2">
                            {strategies.length > 0 ? strategies.map((s, i) => (
                                <StrategyCard key={i} title={s.name} signal={s.signal} desc={s.description} />
                            )) : (
                                <div className="text-center text-gray-500 text-xs py-4">لا توجد إشارات قوية حاليًا. السعر داخل النطاق.</div>
                            )}
                        </div>
                    </div>
                    
                    <div className="text-[10px] text-gray-500 text-center">
                        نطاق القيمة (VA) يمثل 70% من حجم التداول.
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VolumeProfileView;
