
import React from 'react';
import type { DowAnalysis } from '../types';

interface Props {
    analysis: DowAnalysis;
}

const DowAnalysisView: React.FC<Props> = ({ analysis }) => {
    if (!analysis) return null;

    const { primaryTrend, secondaryTrend, phase, volumeConfirmation, higherHighs, higherLows, lowerHighs, lowerLows, summary } = analysis;

    const getTrendColor = (trend: string) => {
        if (trend === 'Bullish' || trend === 'Rally') return 'text-green-400';
        if (trend === 'Bearish' || trend === 'Correction') return 'text-red-400';
        return 'text-yellow-400';
    };

    const getPhaseProgress = (phase: string) => {
        if (phase === 'Accumulation') return 33;
        if (phase === 'Public Participation') return 66;
        if (phase === 'Distribution') return 100;
        return 0;
    };

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>مدرسة داو للتحليل (Dow Theory)</span>
            </h3>

            <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 mb-4">{summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Trend Status */}
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col justify-center items-center">
                    <h4 className="text-xs text-gray-400 mb-2">الاتجاه الأساسي (Primary)</h4>
                    <span className={`text-2xl font-bold ${getTrendColor(primaryTrend)}`}>{primaryTrend === 'Bullish' ? 'صاعد ↗' : primaryTrend === 'Bearish' ? 'هابط ↘' : 'عرضي ➡'}</span>
                    <div className="mt-2 text-[10px] flex gap-2">
                        <span className={higherHighs ? 'text-green-400' : 'text-gray-600'}>HH</span>
                        <span className={higherLows ? 'text-green-400' : 'text-gray-600'}>HL</span>
                        <span className="text-gray-500">|</span>
                        <span className={lowerLows ? 'text-red-400' : 'text-gray-600'}>LL</span>
                        <span className={lowerHighs ? 'text-red-400' : 'text-gray-600'}>LH</span>
                    </div>
                </div>

                {/* Phase Indicator */}
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h4 className="text-xs text-gray-400 mb-2">مرحلة السوق (Market Phase)</h4>
                    <p className="text-white font-bold mb-2">{phase === 'Accumulation' ? 'تجميع' : phase === 'Distribution' ? 'تصريف' : 'مشاركة عامة'}</p>
                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${getPhaseProgress(phase)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                        <span>Accumulation</span>
                        <span>Public</span>
                        <span>Distribution</span>
                    </div>
                </div>

                {/* Volume & Secondary */}
                <div className="space-y-2">
                    <div className="bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center">
                        <span className="text-xs text-gray-400">الاتجاه الثانوي</span>
                        <span className={`text-xs font-bold ${getTrendColor(secondaryTrend)}`}>{secondaryTrend}</span>
                    </div>
                    <div className="bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center">
                        <span className="text-xs text-gray-400">تأكيد الحجم</span>
                        <span className={`text-xs font-bold ${volumeConfirmation ? 'text-green-400' : 'text-red-400'}`}>
                            {volumeConfirmation ? 'مؤكد ✅' : 'غير مؤكد ❌'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DowAnalysisView;
