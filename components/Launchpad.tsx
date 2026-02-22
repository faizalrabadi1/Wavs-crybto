import React from 'react';
import type { ScannerCandidate } from '../types';

interface LaunchpadProps {
    candidates: ScannerCandidate[];
    onAnalyze: (candidate: ScannerCandidate) => void;
}

const Launchpad: React.FC<LaunchpadProps> = ({ candidates, onAnalyze }) => {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h2 className="text-xl font-bold text-white">منصة الإطلاق - ماسح الاختراقات</h2>
            </div>
            {candidates.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">جاري البحث عن تقارب طيفي...</p>
                    <p className="text-xs text-gray-500 mt-1">لم يتم اكتشاف أي إعدادات ذات احتمالية عالية.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {candidates.map((candidate) => (
                        <div key={`${candidate.pair}-${candidate.timeframe}`}
                             className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 hover:border-yellow-glow hover:shadow-yellow-glow/20">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-lg font-bold text-white">{candidate.pair}</p>
                                        <p className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full inline-block mt-1">{candidate.timeframe}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs text-gray-400">الثقة</p>
                                        <p className="text-lg font-bold text-yellow-glow">{candidate.confidence}%</p>
                                    </div>
                                </div>
                                <div className="mt-4 text-xs font-mono text-gray-400 space-y-1">
                                    <p>زاوية الطور: <span className="text-cyan-glow">{candidate.analysis.currentPhaseAngle.toFixed(0)}°</span></p>
                                    <p>مؤشر النظام: <span className="text-cyan-glow">{candidate.analysis.regimeScore.toFixed(2)}</span></p>
                                </div>
                            </div>
                            <button
                                onClick={() => onAnalyze(candidate)}
                                className="mt-4 w-full bg-cyan-glow/20 text-cyan-glow text-sm font-semibold py-2 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">
                                تحليل
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Launchpad;