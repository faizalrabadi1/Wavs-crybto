import React from 'react';
import type { TvrCandidate } from '../types';
import { TvrBehavioralState } from '../types';

interface TvrScannerProps {
    candidates: TvrCandidate[];
}

const formatVolume = (volume: number): string => {
    if (volume > 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
    if (volume > 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
    if (volume > 1_000) return `${(volume / 1_000).toFixed(2)}K`;
    return volume.toFixed(0);
};

const TvrScanner: React.FC<TvrScannerProps> = ({ candidates }) => {

    const getStateUI = (state: TvrBehavioralState) => {
        switch (state) {
            case TvrBehavioralState.INERTIAL:
                return { text: state, color: 'text-green-400', icon: 'M13 7l5 5m0 0l-5 5m5-5H6' };
            case TvrBehavioralState.AGGRESSIVE:
                return { text: state, color: 'text-red-400', icon: 'M13 10V3L4 14h7v7l9-11h-7z' };
            default:
                return { text: state, color: 'text-yellow-400', icon: 'M5 12h14' };
        }
    };

    const getRecommendationUI = (rec: TvrCandidate['analysis']['recommendation']) => {
        if (rec.includes('شراء')) return 'bg-green-500/20 text-green-300';
        if (rec.includes('بيع')) return 'bg-red-500/20 text-red-300';
        return 'bg-yellow-500/10 text-yellow-400';
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 className="text-xl font-bold text-white">اختبار استجابة الحجم الزمني (TVRT)</h2>
            </div>
            {candidates.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">جاري مراقبة استجابة الحجم عند بداية الشموع الجديدة...</p>
                    <p className="text-xs text-gray-500 mt-1">لا توجد إشارات سلوكية قوية حاليًا على الأطر الزمنية 1h و 4h.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {candidates.map((candidate) => {
                        const { pair, timeframe, analysis } = candidate;
                        const stateUI = getStateUI(analysis.state);
                        const recUI = getRecommendationUI(analysis.recommendation);

                        return (
                            <div key={`${pair}-${timeframe}`}
                                className={`bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 hover:border-cyan-glow hover:shadow-cyan-glow/20`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-lg font-bold text-white">{pair}</p>
                                            <p className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full inline-block mt-1">{timeframe}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 text-sm font-semibold rounded-full ${recUI}`}>{analysis.recommendation}</span>
                                    </div>
                                    <div className="mt-4 text-xs font-mono text-gray-400 space-y-2">
                                        <p className="flex justify-between">الحجم المرجعي (V-Ref): <span className="text-cyan-glow">{formatVolume(analysis.vRef)}</span></p>
                                        <p className="flex justify-between">الحجم الاستجابي (V-Res): <span className="text-cyan-glow">{formatVolume(analysis.vResponse)}</span></p>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-700 flex items-center space-x-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${stateUI.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stateUI.icon} /></svg>
                                        <div>
                                            <p className={`font-semibold ${stateUI.color}`}>{stateUI.text}</p>
                                            <p className="text-xs text-gray-500">{analysis.priceActionContext}</p>
                                        </div>
                                    </div>
                                </div>
                                {analysis.state === TvrBehavioralState.INERTIAL && (
                                    <p className="mt-4 text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded-md border border-yellow-500/20">{analysis.discoveryNote}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TvrScanner;