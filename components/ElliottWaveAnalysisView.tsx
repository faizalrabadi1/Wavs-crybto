
import React, { useState } from 'react';
import type { ElliottWaveAnalysis, Candle, ElliottWaveScenario } from '../types';
import ElliottWaveDeepAI from './ElliottWaveDeepAI';

interface Props {
    analysis: ElliottWaveAnalysis;
    candles: Candle[];
    pair: string;
}

// --- Helpers ---
const formatPrice = (p: number) => p < 1 ? p.toFixed(5) : p.toFixed(2);

const WaveChart: React.FC<{ 
    points: any[], 
    targets: any[], 
    invalidation: number, 
    candles: Candle[], 
    fibs?: any[] 
}> = ({ points, targets, invalidation, candles, fibs }) => {
    const width = 600;
    const height = 300;
    const padding = { top: 30, bottom: 30, left: 10, right: 70 };

    // Scale Calculation
    const relevantCandles = candles.slice(-150);
    if (relevantCandles.length < 2) return null;

    const allPrices = [
        ...relevantCandles.map(c => c.high), 
        ...relevantCandles.map(c => c.low),
        ...points.map(p => p.price),
        ...targets.map(t => t.price),
        invalidation
    ].filter(p => p > 0 && isFinite(p)); // Filter out invalid prices

    if (allPrices.length === 0) return null;

    const minPrice = Math.min(...allPrices) * 0.99;
    const maxPrice = Math.max(...allPrices) * 1.01;
    const priceRange = maxPrice - minPrice || 1; // Prevent division by zero
    
    const startIndex = relevantCandles[0].timestamp;
    const endIndex = relevantCandles[relevantCandles.length-1].timestamp;
    const timeRange = endIndex - startIndex || 1; // Prevent division by zero

    const scaleX = (ts: number) => {
        const val = padding.left + ((ts - startIndex) / timeRange) * (width - padding.left - padding.right);
        return isFinite(val) ? val : 0;
    };
    const scaleY = (p: number) => {
        const val = height - padding.bottom - ((p - minPrice) / priceRange) * (height - padding.top - padding.bottom);
        return isFinite(val) ? val : 0;
    };

    // Wave Path
    const wavePath = points.map((p, i) => {
        const candle = candles[p.index];
        if(!candle) return '';
        return `${i===0?'M':'L'} ${scaleX(candle.timestamp)} ${scaleY(p.price)}`;
    }).join(' ');

    return (
        <div className="relative w-full h-[320px] bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {/* Grid */}
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#333" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Price Line */}
                <path 
                    d={relevantCandles.map((c, i) => `${i===0?'M':'L'} ${scaleX(c.timestamp)} ${scaleY(c.close)}`).join(' ')} 
                    stroke="#4b5563" strokeWidth="1" fill="none" opacity="0.5" 
                />

                {/* Wave Path (Thick Neon) */}
                <path d={wavePath} stroke="#22d3ee" strokeWidth="2.5" fill="none" filter="drop-shadow(0 0 3px #22d3ee)" />

                {/* Points Labels */}
                {points.map((p, i) => {
                    const candle = candles[p.index];
                    if(!candle) return null;
                    const x = scaleX(candle.timestamp);
                    const y = scaleY(p.price);
                    const isHigh = p.type === 'Impulse' && i % 2 !== 0; // Rough heuristic
                    return (
                        <g key={i}>
                            <circle cx={x} cy={y} r="4" fill="#000" stroke="#22d3ee" strokeWidth="2" />
                            <text x={x} y={y + (isHigh ? -15 : 20)} textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="14">
                                {p.wave}
                            </text>
                        </g>
                    );
                })}

                {/* Invalidation Line */}
                <line x1={0} y1={scaleY(invalidation)} x2={width} y2={scaleY(invalidation)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 5" />
                <text x={width - 65} y={scaleY(invalidation) - 5} fill="#ef4444" fontSize="10" fontWeight="bold">INVALIDATION</text>

                {/* Targets / Fibs */}
                {targets.map((t, i) => {
                    const y = scaleY(t.price);
                    return (
                        <g key={`t-${i}`}>
                            <line x1={width - 100} y1={y} x2={width} y2={y} stroke="#4ade80" strokeWidth="1" />
                            <text x={width - 5} y={y - 5} textAnchor="end" fill="#4ade80" fontSize="10">{t.level}</text>
                            <rect x={width - 65} y={y - 8} width="60" height="12" fill="#4ade80" opacity="0.1" />
                        </g>
                    );
                })}
                
                {/* Fib Pinball Levels */}
                {fibs?.map((f, i) => (
                    <text key={`f-${i}`} x={15} y={scaleY(f.price)} fill="#fbbf24" fontSize="9" opacity="0.7">Fib {f.level}: {formatPrice(f.price)}</text>
                ))}

            </svg>
        </div>
    );
};

const RulesChecklist: React.FC<{ rules: any[] }> = ({ rules }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <h4 className="text-sm font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">مدقق القواعد الصارمة (Strict Validator)</h4>
        <div className="space-y-2">
            {rules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rule.passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-gray-300">{rule.name}</span>
                    </div>
                    {rule.passed ? 
                        <span className="text-green-400">اجتاز ✅</span> : 
                        <span className="text-red-400 font-bold">فشل ❌</span>
                    }
                </div>
            ))}
            {rules.length === 0 && <p className="text-gray-500 italic">لا توجد قواعد محددة لهذا السيناريو.</p>}
        </div>
    </div>
);

const TargetsPanel: React.FC<{ targets: any[] }> = ({ targets }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
        <h4 className="text-sm font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">أهداف فيبوناتشي (Pinball Targets)</h4>
        <div className="space-y-2">
            {targets.map((t, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-gray-900/30 border border-gray-700/30">
                    <div>
                        <span className="text-xs text-cyan-400 font-bold block">{t.level}</span>
                        <span className="text-[10px] text-gray-500">{t.description}</span>
                    </div>
                    <span className="text-sm font-mono text-white">{formatPrice(t.price)}</span>
                </div>
            ))}
        </div>
    </div>
);

const ElliottWaveAnalysisView: React.FC<Props> = ({ analysis, candles, pair }) => {
    const [activeTab, setActiveTab] = useState<'Primary' | 'Alternate'>('Primary');
    const scenario = activeTab === 'Primary' ? analysis.primaryScenario : analysis.alternateScenario;

    if (!scenario) return <div className="text-center text-gray-500 p-4">لا يتوفر سيناريو موجي صالح حالياً.</div>;

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-cyan-500/30 mt-6 shadow-xl shadow-cyan-900/20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-800 pb-4 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        ترسانة إليوت الاحترافية (Advanced Wave Arsenal)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">تحليل الموجات الفركتالية + فيبوناتشي Pinball</p>
                </div>
                
                <div className="flex bg-gray-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('Primary')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Primary' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        السيناريو الرئيسي ({analysis.primaryScenario?.probability}%)
                    </button>
                    {analysis.alternateScenario && (
                        <button 
                            onClick={() => setActiveTab('Alternate')}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Alternate' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            البديل ({analysis.alternateScenario.probability}%)
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                
                {/* Scenario Summary */}
                <div className={`p-3 rounded-md border-l-4 ${activeTab === 'Primary' ? 'border-cyan-500 bg-cyan-900/10' : 'border-purple-500 bg-purple-900/10'}`}>
                    <h4 className="font-bold text-white text-sm mb-1">{scenario.type}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{scenario.summary}</p>
                </div>

                {/* The Advanced Chart */}
                <WaveChart 
                    points={scenario.points} 
                    targets={scenario.targets} 
                    invalidation={scenario.invalidationLevel} 
                    candles={candles}
                    fibs={scenario.fibLevels}
                />

                {/* Data Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RulesChecklist rules={analysis.validationChecklist || []} />
                    <TargetsPanel targets={scenario.targets} />
                </div>

                {/* AI Integration */}
                <ElliottWaveDeepAI 
                    pair={pair} 
                    scenario={scenario} 
                    confidence={analysis.confidenceScore} 
                />

            </div>
        </div>
    );
};

export default ElliottWaveAnalysisView;
