import React from 'react';
import type { SniperSignal } from '../types';

interface Props {
    signals: SniperSignal[];
}

const OpportunitySniper: React.FC<Props> = ({ signals }) => {
    // We are only interested in signals that are not just 'Monitoring'
    const activeSignals = signals.filter(s => s.status === 'Armed' || s.status === 'Triggered');
    
    // Sort to show triggered signals first
    activeSignals.sort((a, b) => {
        if (a.status === 'Triggered' && b.status !== 'Triggered') return -1;
        if (b.status === 'Triggered' && a.status !== 'Triggered') return 1;
        return 0;
    });

    const SignalCard: React.FC<{ signal: SniperSignal }> = ({ signal }) => {
        const { status, currentRsi, peakRsi } = signal;
        const isTriggered = status === 'Triggered';
        
        // Calculate the progress of the pullback from the peak (90+) down to the target (50)
        const progress = isTriggered ? 100 : Math.max(0, (peakRsi - currentRsi) / (peakRsi - 50)) * 100;

        let statusText = 'مراقبة الهبوط';
        let statusColor = 'text-yellow-400';
        let borderColor = 'border-gray-700 hover:border-yellow-400';
        let glowStyle = {};

        if (isTriggered) {
            statusText = 'إشارة شراء!';
            statusColor = 'text-green-400';
            borderColor = 'border-green-400 animate-pulse-signal-box';
            glowStyle = { '--glow-color': 'rgba(74, 222, 128, 0.7)' } as React.CSSProperties;
        }

        return (
            <div className={`bg-gray-800 border ${borderColor} rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all`} style={glowStyle}>
                <div>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-lg font-bold text-white">{signal.pair}</p>
                            <p className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full inline-block mt-1">{signal.timeframe}</p>
                        </div>
                        <div className={`px-2.5 py-1 text-sm font-semibold rounded-full ${isTriggered ? 'bg-green-500/20' : 'bg-yellow-500/10'} ${statusColor}`}>
                            {statusText}
                        </div>
                    </div>

                    <div className="my-4 text-center">
                        <p className="text-sm text-gray-400">RSI الحالي</p>
                        <p className="text-4xl font-mono font-bold text-cyan-glow">{currentRsi.toFixed(1)}</p>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                            <span>ذروة RSI ({peakRsi.toFixed(1)})</span>
                            <span>منطقة الشراء (50)</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full transition-all duration-300 ${isTriggered ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(100, progress)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center space-x-3 mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
                <h2 className="text-xl font-bold text-white">مؤشر قنص الفرص (RSI &gt; 90)</h2>
            </div>
            {activeSignals.length === 0 ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">جاري البحث عن عملات ذات تشبع شرائي عالٍ...</p>
                    <p className="text-xs text-gray-500 mt-1">لا توجد فرص متاحة للمراقبة حاليًا على الأطر الزمنية 1m و 5m.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {activeSignals.map(signal => (
                        <SignalCard key={`${signal.pair}-${signal.timeframe}`} signal={signal} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default OpportunitySniper;
