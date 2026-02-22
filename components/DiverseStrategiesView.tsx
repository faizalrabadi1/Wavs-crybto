
import React from 'react';
import type { DiverseStrategiesAnalysis, DiverseStrategyResult } from '../types';

interface Props {
    analysis: DiverseStrategiesAnalysis;
}

const StrategyCard: React.FC<{ strategy: DiverseStrategyResult }> = ({ strategy }) => {
    const { name, signal, strength, reasoning, metrics, timeframeRecommendation } = strategy;

    const getSignalStyle = () => {
        switch (signal) {
            case 'Buy': return { bg: 'bg-green-500/10', border: 'border-green-500/50', text: 'text-green-400', label: 'شراء' };
            case 'Sell': return { bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400', label: 'بيع' };
            default: return { bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-400', label: 'محايد' };
        }
    };

    const style = getSignalStyle();

    return (
        <div className={`rounded-lg border ${style.border} ${style.bg} p-4 transition-all duration-300 hover:shadow-lg`}>
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white text-sm">{name}</h4>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${style.border} ${style.text}`}>
                    {style.label}
                </span>
            </div>
            
            <p className="text-xs text-gray-300 mb-3 leading-relaxed h-10 overflow-hidden">{reasoning}</p>

            <div className="space-y-1.5 bg-gray-900/50 p-2 rounded border border-gray-800">
                {metrics.map((m, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] items-center">
                        <span className="text-gray-500">{m.label}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-white">{m.value}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.isConditionMet ? (signal === 'Sell' ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-600'}`}></span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-700/50">
                <span className="text-[10px] text-gray-500">الإطار المفضل: <span className="text-cyan-glow">{timeframeRecommendation}</span></span>
                {signal !== 'Neutral' && (
                     <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">القوة:</span>
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${style.text.replace('text-', 'bg-')}`} style={{width: `${strength}%`}}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DiverseStrategiesView: React.FC<Props> = ({ analysis }) => {
    if (!analysis || !analysis.strategies || analysis.strategies.length === 0) return null;

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span>مختبر الاستراتيجيات المنوعة (Advanced Strategy Lab)</span>
            </h3>
            
            <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 mb-4">
                {analysis.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {analysis.strategies.map(strategy => (
                    <StrategyCard key={strategy.id} strategy={strategy} />
                ))}
            </div>
        </div>
    );
};

export default DiverseStrategiesView;
