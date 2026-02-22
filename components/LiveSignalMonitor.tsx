import React from 'react';
import type { MacdAnalysis, MacdStrategy } from '../types';

interface LiveSignalMonitorProps {
    macdAnalysis: MacdAnalysis | undefined;
}

const LiveSignalMonitor: React.FC<LiveSignalMonitorProps> = ({ macdAnalysis }) => {
    if (!macdAnalysis) {
        return null;
    }

    const activeStrategies = [...macdAnalysis.basicStrategies, ...macdAnalysis.advancedStrategies]
        .filter(s => s.isActive && s.signal !== 'Hold');

    let bestSignal: MacdStrategy | null = null;
    if (activeStrategies.length > 0) {
        // Find the strategy with the highest accuracy
        bestSignal = activeStrategies.reduce((best, current) => (current.accuracy > best.accuracy ? current : best));
    }

    const getSignalUI = () => {
        if (!bestSignal) {
            return {
                glowColor: 'shadow-cyan-glow/20',
                borderColor: 'border-cyan-glow/30',
                textColor: 'text-cyan-glow',
                title: 'مراقبة',
                description: 'لا توجد إشارة قوية وعالية الدقة من استراتيجيات MACD حاليًا.',
            };
        }

        switch (bestSignal.signal) {
            case 'Buy':
                return {
                    glowColor: 'shadow-green-400/30',
                    borderColor: 'border-green-400/50',
                    textColor: 'text-green-300',
                    title: 'إشارة شراء نشطة',
                    description: `تم تفعيل استراتيجية "${bestSignal.name}" بدقة تاريخية تبلغ ${bestSignal.accuracy}%.`,
                };
            case 'Sell':
                 return {
                    glowColor: 'shadow-red-400/30',
                    borderColor: 'border-red-400/50',
                    textColor: 'text-red-300',
                    title: 'إشارة بيع نشطة',
                    description: `تم تفعيل استراتيجية "${bestSignal.name}" بدقة تاريخية تبلغ ${bestSignal.accuracy}%.`,
                };
            default: // Should not happen due to filter
                 return {
                    glowColor: 'shadow-cyan-glow/20',
                    borderColor: 'border-cyan-glow/30',
                    textColor: 'text-cyan-glow',
                    title: 'مراقبة',
                    description: 'لا توجد إشارة قوية وعالية الدقة من استراتيجيات MACD حاليًا.',
                };
        }
    };
    
    const ui = getSignalUI();

    return (
        <div className="mt-6">
             <h3 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
                <span>مراقب الإشارات اللحظية (MACD)</span>
            </h3>
            <div className={`p-4 rounded-lg border text-center transition-all duration-300 shadow-lg ${ui.borderColor} ${ui.glowColor}`}>
                <p className={`text-2xl font-bold ${ui.textColor}`}>{ui.title}</p>
                <p className="text-sm text-gray-400 mt-2">{ui.description}</p>
            </div>
        </div>
    );
};

export default LiveSignalMonitor;
