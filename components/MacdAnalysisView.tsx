
import React, { useState } from 'react';
import type { MacdAnalysis, MacdStrategy, MacdMasterSignal } from '../types';

interface Props {
    analysis: MacdAnalysis;
}

const StrategyCard: React.FC<{ strategy: MacdStrategy }> = ({ strategy }) => {
    const getSignalClasses = () => {
        if (!strategy.isActive) {
            return { bg: 'bg-gray-700/50', text: 'text-gray-400', label: 'محايد' };
        }
        switch (strategy.signal) {
            case 'Buy':
                return { bg: 'bg-green-500/20', text: 'text-green-300', label: 'شراء' };
            case 'Sell':
                return { bg: 'bg-red-500/20', text: 'text-red-300', label: 'بيع' };
            default:
                return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'انتظار' };
        }
    };
    
    const signalUi = getSignalClasses();

    return (
        <div className={`p-3 rounded-lg border transition-all duration-300 ${strategy.isActive ? 'border-cyan-glow/50 bg-gray-800' : 'border-gray-700 bg-gray-800/50'}`}>
            <div className="flex justify-between items-start">
                <h5 className="font-bold text-white">{strategy.id}. {strategy.name}</h5>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${signalUi.bg} ${signalUi.text}`}>
                    {signalUi.label}
                </span>
            </div>
            <p className="text-xs text-gray-400 mt-2"><strong>المنطق:</strong> {strategy.logic}</p>
            {strategy.filter && <p className="text-xs text-gray-500 mt-1"><strong>الفلتر:</strong> {strategy.filter}</p>}
            <div className="flex justify-between items-center mt-3 text-xs font-mono">
                <span className="text-gray-400">الدقة التاريخية:</span>
                <span className="font-semibold text-yellow-glow">{strategy.accuracy}%</span>
            </div>
        </div>
    );
};

const MasterSignalGauge: React.FC<{ signal: MacdMasterSignal }> = ({ signal }) => {
    const { score, strength, signal: type } = signal;
    // Map score -100..100 to 0..180 degrees
    const rotation = ((score + 100) / 200) * 180 - 90;
    
    let color = '#facc15'; // Yellow
    if (score > 20) color = '#4ade80'; // Green
    if (score < -20) color = '#f87171'; // Red
    
    const label = type === 'Buy' ? 'شراء' : type === 'Sell' ? 'بيع' : 'محايد';

    return (
        <div className="flex flex-col items-center justify-center bg-gray-800/80 p-6 rounded-xl border border-gray-700 relative overflow-hidden">
            <div className="relative w-48 h-24 overflow-hidden mb-2">
                 {/* Background Arc */}
                 <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-700 rounded-t-full border-b-0"></div>
                 {/* Value Arc */}
                 <div className={`absolute top-0 left-0 w-full h-full rounded-t-full border-b-0 origin-bottom transition-transform duration-1000 ease-out`}
                    style={{ 
                        transform: `rotate(${rotation}deg)`,
                        border: `8px solid ${color}`,
                        borderBottom: 0,
                        opacity: 0.3
                    }}>
                 </div>
                 {/* Needle */}
                 <div className="absolute bottom-0 left-1/2 w-1 h-20 bg-white origin-bottom transition-transform duration-1000 ease-out rounded-t-full"
                    style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}>
                 </div>
                 <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-gray-300 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
            </div>
            
            <div className="text-center z-10">
                <h2 className="text-3xl font-bold" style={{ color }}>{label}</h2>
                <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">{strength} SIGNAL</p>
                <p className="text-xs text-gray-500 font-mono mt-1">Score: {score.toFixed(0)}</p>
            </div>
            
            {/* Background Pulse */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-10 animate-pulse pointer-events-none`} style={{ backgroundColor: color }}></div>
        </div>
    );
};


const MacdAnalysisView: React.FC<Props> = ({ analysis }) => {
    const [isDetailsVisible, setIsDetailsVisible] = useState(false);

    if (!analysis) return null;
    
    const { masterSignal, basicStrategies, advancedStrategies } = analysis;

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                <span>المؤشر الموحد للماكدي (Unified MACD Engine)</span>
            </h3>
            
            {masterSignal && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Master Gauge */}
                    <div className="lg:col-span-1">
                        <MasterSignalGauge signal={masterSignal} />
                    </div>

                    {/* Summary Stats */}
                    <div className="lg:col-span-2 flex flex-col justify-between">
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 h-full">
                            <h4 className="text-sm font-bold text-gray-300 mb-4">تحليل التوافق الاستراتيجي (Confluence)</h4>
                            
                            <div className="space-y-4">
                                {/* Progress Bars */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-green-400">استراتيجيات شرائية ({masterSignal.bullishCount})</span>
                                        <span className="text-gray-500">{Math.round(masterSignal.bullishCount/masterSignal.activeStrategyCount*100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full" style={{ width: `${masterSignal.bullishCount/masterSignal.activeStrategyCount*100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-red-400">استراتيجيات بيعية ({masterSignal.bearishCount})</span>
                                        <span className="text-gray-500">{Math.round(masterSignal.bearishCount/masterSignal.activeStrategyCount*100)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div className="bg-red-500 h-full" style={{ width: `${masterSignal.bearishCount/masterSignal.activeStrategyCount*100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400">
                                <p>{analysis.summary}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                className="w-full py-2 text-center text-xs text-cyan-glow hover:text-cyan-300 border-t border-gray-700 transition-colors flex items-center justify-center gap-1"
            >
                <span>{isDetailsVisible ? 'إخفاء التفاصيل' : 'عرض تفاصيل الاستراتيجيات الفردية'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isDetailsVisible ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isDetailsVisible && (
                <div className="mt-4 space-y-4 animate-fade-in">
                    <h4 className="text-sm font-semibold text-gray-500 border-b border-gray-700 pb-1">الاستراتيجيات الأساسية</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {basicStrategies.map(strategy => <StrategyCard key={strategy.id} strategy={strategy} />)}
                    </div>

                    <h4 className="text-sm font-semibold text-gray-500 border-b border-gray-700 pb-1 pt-2">الاستراتيجيات المتقدمة</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {advancedStrategies.map(strategy => <StrategyCard key={strategy.id} strategy={strategy} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MacdAnalysisView;
