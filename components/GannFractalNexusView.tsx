
import React, { useState } from 'react';
import type { GannFractalNexusAnalysis, NexusChartData, NexusNode } from '../types';

interface Props {
    nexus: GannFractalNexusAnalysis;
}

// Physics Dashboard Component
const PhysicsDashboard: React.FC<{ physics: any, nodes: NexusNode[] }> = ({ physics, nodes }) => {
    const { velocity, gravity, mass, resilienceScore } = physics;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-gray-800/50 p-2 rounded border border-cyan-500/30 text-center">
                <p className="text-[10px] text-gray-400">السرعة (Velocity)</p>
                <p className="text-lg font-bold font-mono text-cyan-400">{velocity.toFixed(4)}</p>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-purple-500/30 text-center">
                <p className="text-[10px] text-gray-400">الجاذبية (Gravity)</p>
                <p className="text-lg font-bold font-mono text-purple-400">{gravity.toFixed(2)}</p>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-green-500/30 text-center">
                <p className="text-[10px] text-gray-400">الصمود (Resilience)</p>
                <p className="text-lg font-bold font-mono text-green-400">{resilienceScore.toFixed(0)}%</p>
            </div>
            <div className="bg-gray-800/50 p-2 rounded border border-yellow-500/30 text-center">
                <p className="text-[10px] text-gray-400">العقد النجمية</p>
                <p className="text-lg font-bold font-mono text-yellow-400 animate-pulse">{nodes.length}</p>
            </div>
        </div>
    );
};

// Advanced SVG Chart for Nexus
const NexusChart: React.FC<{ data: NexusChartData[], nodes: NexusNode[] }> = ({ data, nodes }) => {
    const width = 600;
    const height = 300;
    const padding = { top: 20, bottom: 30, left: 10, right: 10 };

    if (data.length < 2) return null;

    // Determine scales
    const allPrices = data.flatMap(d => [d.price, d.upperBound || d.price, d.lowerBound || d.price]);
    const minPrice = Math.min(...allPrices) * 0.998;
    const maxPrice = Math.max(...allPrices) * 1.002;
    const priceRange = maxPrice - minPrice;
    const startIdx = data[0].time;
    const endIdx = data[data.length-1].time;
    const timeRange = endIdx - startIdx;

    const scaleX = (time: number) => padding.left + ((time - startIdx) / timeRange) * (width - padding.left - padding.right);
    const scaleY = (price: number) => (height - padding.bottom) - ((price - minPrice) / priceRange) * (height - padding.top - padding.bottom);

    // Path Builders
    const linePath = data.map((d, i) => `${i===0?'M':'L'} ${scaleX(d.time)} ${scaleY(d.price)}`).join(' ');
    
    // Area Path (Cloud)
    const areaPath = data.filter(d => d.type === 'Projection').length > 0 ? 
        data.filter(d => d.type === 'Projection').map((d, i) => `${i===0?'M':'L'} ${scaleX(d.time)} ${scaleY(d.upperBound!)}`).join(' ') + 
        data.filter(d => d.type === 'Projection').reverse().map((d, i) => ` L ${scaleX(d.time)} ${scaleY(d.lowerBound!)}`).join(' ') + ' Z' 
        : '';

    // Energy Gradient Definition
    // We will use multiple line segments for the gradient effect in a real high-perf chart, 
    // but for SVG simplicity, we use a linear gradient based on the trend.
    const isUp = data[data.length-1].price > data[0].price;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-gray-900 rounded-lg border border-gray-800">
            <defs>
                <linearGradient id="nexusCloudGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity="0.05"/>
                </linearGradient>
                <linearGradient id="pathGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6b7280" />
                    <stop offset="40%" stopColor="#6b7280" />
                    <stop offset="40%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            {/* Grid */}
            {Array.from({length: 5}).map((_, i) => (
                <line key={i} x1={0} y1={i*height/5} x2={width} y2={i*height/5} stroke="#374151" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
            ))}

            {/* Quantum Cloud */}
            {areaPath && <path d={areaPath} fill="url(#nexusCloudGradient)" stroke="none" />}

            {/* Main Line */}
            <path d={linePath} stroke="url(#pathGradient)" strokeWidth="2" fill="none" filter="url(#glow)" />

            {/* Nexus Nodes */}
            {nodes.map((node, i) => (
                <g key={i}>
                    <circle cx={scaleX(node.time)} cy={scaleY(node.price)} r="4" fill="#fbbf24" className="animate-pulse">
                        <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={scaleX(node.time)} cy={scaleY(node.price)} r="8" stroke="#fbbf24" strokeWidth="1" fill="none" opacity="0.5" />
                </g>
            ))}

            {/* Current Price Marker */}
            <line x1={scaleX(data.find(d=>d.type==='History')?.time || 0)} y1={0} x2={scaleX(data.find(d=>d.type==='History')?.time || 0)} y2={height} stroke="#ffffff" strokeDasharray="2 2" opacity="0.3" />
        </svg>
    );
};

const GannFractalNexusView: React.FC<Props> = ({ nexus }) => {
    const [activeTab, setActiveTab] = useState<'short' | 'long' | 'explosion'>('short');

    if (!nexus) return null;

    const { confluenceScore, shortTermPath, longTermPath, explosionPath, summary, recommendation, nexusNodes, physics } = nexus;

    const chartData = activeTab === 'short' ? shortTermPath : activeTab === 'long' ? longTermPath : (explosionPath || shortTermPath);

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-purple-500/50 mt-6 shadow-2xl shadow-purple-900/20">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    <span>نظام نيكسوس (الجيل الخامس)</span>
                </h3>
                <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full border border-purple-500/30">
                    <span className="text-xs text-purple-300">التوافق النجمي:</span>
                    <span className={`text-lg font-bold ${confluenceScore > 75 ? 'text-cyan-400' : 'text-yellow-400'}`}>{confluenceScore}%</span>
                </div>
            </div>

            <p className="text-sm text-gray-300 mb-4 bg-gradient-to-r from-gray-800 to-gray-900 p-3 rounded border-l-4 border-cyan-500 leading-relaxed shadow-inner">
                {summary}
            </p>

            {/* Tabs */}
            <div className="flex space-x-2 mb-4 bg-gray-800 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveTab('short')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'short' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}>سحابة الاحتمالات</button>
                <button onClick={() => setActiveTab('long')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'long' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}>الجاذب الفركتالي</button>
                {explosionPath && (
                    <button onClick={() => setActiveTab('explosion')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1 ${activeTab === 'explosion' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/20' : 'text-yellow-500 hover:text-yellow-400'}`}>
                        <span>⚡</span> انفجار سعري
                    </button>
                )}
            </div>

            {/* Nexus Chart 5.0 */}
            <div className="h-72 w-full mb-4 relative">
                <div className="absolute top-2 left-2 z-10 text-[10px] text-cyan-500 font-mono bg-black/50 px-2 rounded">Nexus Quantum Engine v5.0</div>
                <NexusChart data={chartData} nodes={nexusNodes} />
            </div>

            {/* Physics & Radar */}
            <PhysicsDashboard physics={physics} nodes={nexusNodes} />

            {/* Chrono-Sync Radar Strip */}
            <div className="mt-4 bg-black/40 rounded h-8 w-full relative overflow-hidden border border-gray-800 flex items-center px-2">
                <span className="text-[9px] text-gray-500 mr-2">رادار التزامن الزمني:</span>
                <div className="flex-grow h-1 bg-gray-800 rounded-full relative">
                    {nexusNodes.map((n, i) => (
                        <div key={i} className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_5px_#22d3ee]" style={{ left: `${Math.min(100, (i+1)*15)}%` }} title={n.label}></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GannFractalNexusView;
