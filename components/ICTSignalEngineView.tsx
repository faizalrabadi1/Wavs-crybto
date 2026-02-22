
import React from 'react';
import type { ICTSignal } from '../types';

interface Props {
    signal: ICTSignal;
}

const ICTSignalEngineView: React.FC<Props> = ({ signal }) => {
    const { signalType, direction, timeframe, confidence, rationale, tradeSetup } = signal;

    const getSignalUI = () => {
        switch (signalType) {
            case 'Entry':
                if (direction === 'Long') {
                    return { text: 'شراء', glowColor: 'rgba(74, 222, 128, 1)', borderColor: 'border-green-400', textColor: 'text-green-300' };
                }
                return { text: 'بيع', glowColor: 'rgba(248, 113, 113, 1)', borderColor: 'border-red-400', textColor: 'text-red-300' };
            case 'Hold':
                return { text: 'انتظار', glowColor: 'rgba(250, 204, 21, 1)', borderColor: 'border-yellow-400', textColor: 'text-yellow-300' };
            default: // Exit
                return { text: 'خروج', glowColor: 'rgba(34, 211, 238, 1)', borderColor: 'border-cyan-400', textColor: 'text-cyan-300' };
        }
    };
    
    const ui = getSignalUI();

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                <span>محرك إشارات ICT الآلي</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Side: Signal & Dashboard */}
                <div className="flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg">
                    <div 
                        className={`w-40 h-40 rounded-full flex items-center justify-center text-4xl font-bold border-4 animate-pulse-signal-box ${ui.borderColor} ${ui.textColor}`}
                        style={{'--glow-color': ui.glowColor} as React.CSSProperties}
                    >
                        {ui.text}
                    </div>
                    <div className="w-full mt-4 space-y-3 font-mono text-sm">
                        <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded">
                            <span className="text-gray-400">الاتجاه:</span>
                            <span className={`font-semibold ${ui.textColor}`}>{direction}</span>
                        </div>
                         <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded">
                            <span className="text-gray-400">الإطار الزمني:</span>
                            <span className={`font-semibold ${ui.textColor}`}>{timeframe}</span>
                        </div>
                        <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-gray-400">درجة الثقة</span>
                                <span className={`font-semibold ${ui.textColor}`}>{confidence}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="h-2.5 rounded-full" style={{ width: `${confidence}%`, backgroundColor: ui.glowColor }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Rationale & Setup */}
                <div className="flex flex-col justify-between">
                    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex-grow">
                        <h4 className="text-base font-semibold text-white mb-2">السبب المنطقي للمحرك:</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{rationale}</p>
                    </div>
                     {signalType === 'Entry' && tradeSetup.entry > 0 && (
                        <div className="mt-3 bg-gray-800 p-3 rounded-lg border border-gray-700">
                             <h4 className="text-base font-semibold text-white mb-2">تفاصيل الصفقة المقترحة:</h4>
                             <div className="space-y-2 text-sm font-mono">
                                <div className="flex justify-between items-center"><span className="text-gray-400">الدخول:</span><span className="text-cyan-glow">{tradeSetup.entry.toFixed(4)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-gray-400">وقف الخسارة:</span><span className="text-red-400">{tradeSetup.stopLoss.toFixed(4)}</span></div>
                                {tradeSetup.targets.map(t => (<div key={t.level} className="flex justify-between items-center"><span className="text-gray-400">{t.level}:</span><span className="text-green-400">{t.price.toFixed(4)}</span></div>))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ICTSignalEngineView;
