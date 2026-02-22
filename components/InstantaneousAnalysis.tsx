
import React, { useState, useEffect, useMemo } from 'react';
import type { FullInstantaneousAnalysis, MicroAnalysisResult, MicroTimeCycle } from '../types';

// ===================================================================
// 1. NEW: TimeSpectrumChart Component (Visual Timeline)
// ===================================================================
const TimeSpectrumChart: React.FC<{ cycles: MicroTimeCycle[] }> = ({ cycles }) => {
    const duration = 60; // 60 minutes view

    return (
        <div className="relative w-full h-16 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden mt-2">
            {/* Grid Lines */}
            {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="absolute top-0 h-full border-r border-gray-800" style={{ left: `${(i + 1) * 8.33}%` }}></div>
            ))}
            
            {/* Current Time Marker */}
            <div className="absolute top-0 left-0 w-0.5 h-full bg-cyan-glow z-10 shadow-[0_0_10px_#22d3ee]"></div>
            
            {/* Cycles */}
            {cycles.map((cycle, i) => {
                const left = (cycle.minutesUntil / duration) * 100;
                if (left > 100) return null;
                
                let color = 'bg-gray-500';
                if (cycle.type === 'Gann') color = 'bg-purple-500';
                if (cycle.type === 'Fibonacci') color = 'bg-yellow-500';
                if (cycle.type === 'Harmonic') color = 'bg-green-500';

                return (
                    <div key={i} className="absolute top-0 flex flex-col items-center group" style={{ left: `${left}%` }}>
                        <div className={`w-1 h-16 ${color} opacity-40 group-hover:opacity-100 transition-opacity`}></div>
                        <div className={`absolute bottom-1 p-1 rounded text-[9px] font-bold text-gray-900 ${color} opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap transform -translate-x-1/2`}>
                            {cycle.minutesUntil}m: {cycle.label}
                        </div>
                        <div className={`absolute top-0 w-3 h-3 -ml-1.5 rounded-full ${color} blur-sm opacity-50 animate-pulse`}></div>
                    </div>
                );
            })}
            
            {/* Labels */}
            <div className="absolute bottom-0 right-1 text-[9px] text-gray-600">60m</div>
            <div className="absolute bottom-0 left-1 text-[9px] text-cyan-glow">NOW</div>
        </div>
    );
};


// ===================================================================
// 2. NEW: ActiveChronometers Component
// ===================================================================
const ActiveChronometers: React.FC<{ cycles: MicroTimeCycle[] }> = ({ cycles }) => {
    const imminentCycles = cycles.filter(c => c.minutesUntil <= 10);
    
    return (
        <div className="space-y-2">
            {imminentCycles.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">لا توجد دورات زمنية وشيكة في الـ 10 دقائق القادمة.</div>
            ) : (
                imminentCycles.map((cycle, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-800/50 p-2 rounded border border-gray-700">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cycle.type === 'Gann' ? 'bg-purple-500' : cycle.type === 'Fibonacci' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                            <span className="text-xs text-gray-300">{cycle.label}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-cyan-glow animate-pulse">
                            {cycle.minutesUntil === 0 ? 'الآن!' : `${cycle.minutesUntil} دقيقة`}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};


// ===================================================================
// 3. UPDATED: AnalysisView Component with Time Tools
// ===================================================================
const AnalysisView: React.FC<{ analysis: MicroAnalysisResult }> = ({ analysis }) => {
    const { side, entryZone, targets, stopLoss, timeExplosionProbability, activeChronometers, confirmationSignals } = analysis;
    
    const rrRatio = (entryZone.end - stopLoss) > 0 
        ? Math.abs(targets[1].price - entryZone.end) / Math.abs(entryZone.end - stopLoss) 
        : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
            
            {/* Left Column: Trade Setup */}
            <div className="lg:col-span-1 space-y-3">
                 <div className={`p-3 rounded-lg border ${side === 'BUY' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <h4 className={`text-base font-bold mb-2 ${side === 'BUY' ? 'text-green-300' : 'text-red-300'}`}>
                         {side === 'BUY' ? 'شراء (LONG)' : 'بيع (SHORT)'}
                    </h4>
                    <div className="space-y-1 font-mono text-xs">
                        <div className="flex justify-between text-gray-300"><span>الدخول:</span><span className="text-white font-bold">{entryZone.start.toFixed(4)}</span></div>
                        <div className="flex justify-between text-red-300"><span>وقف الخسارة:</span><span>{stopLoss.toFixed(4)}</span></div>
                        <div className="flex justify-between text-green-300"><span>هدف 1 (Scalp):</span><span>{targets[0].price.toFixed(4)}</span></div>
                        <div className="flex justify-between text-green-300"><span>هدف 2 (Swing):</span><span>{targets[1].price.toFixed(4)}</span></div>
                    </div>
                </div>
                
                <div className="bg-gray-900/50 p-3 rounded-md border border-gray-700">
                    <div className="flex justify-between items-center mb-1 text-xs text-gray-400"><span>تدفق الحجم</span><span>ترابط الطور</span></div>
                    <div className="flex gap-2 h-1.5">
                        <div className={`flex-1 rounded-full ${confirmationSignals.microVolumeFlow > 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{opacity: Math.abs(confirmationSignals.microVolumeFlow)}}></div>
                        <div className="flex-1 bg-cyan-glow rounded-full" style={{opacity: confirmationSignals.phaseCoherence}}></div>
                    </div>
                </div>
            </div>

            {/* Middle Column: Time Lab */}
            <div className="lg:col-span-2 bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                <div className="flex justify-between items-center mb-2">
                     <h4 className="text-sm font-bold text-yellow-glow flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        مختبر التوقيت (Time Lab)
                    </h4>
                    <div className="flex items-center gap-2 bg-gray-900 px-2 py-1 rounded border border-gray-700">
                        <span className="text-[10px] text-gray-400">احتمالية الانفجار الزمني</span>
                        <span className={`text-sm font-bold ${timeExplosionProbability > 80 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>{timeExplosionProbability}%</span>
                    </div>
                </div>
                
                {/* Timeline */}
                <p className="text-[10px] text-gray-500">الطيف الزمني (القادم 60 دقيقة)</p>
                <TimeSpectrumChart cycles={activeChronometers} />
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-[10px] text-gray-400 mb-1">الكرونومترات النشطة</p>
                        <ActiveChronometers cycles={activeChronometers} />
                    </div>
                    <div className="flex flex-col justify-center items-center text-center bg-gray-900/50 rounded p-2 border border-gray-700 border-dashed">
                        <span className="text-2xl font-bold text-white">{analysis.nextMajorTimeCluster}m</span>
                        <span className="text-[10px] text-gray-400">النافذة الزمنية القادمة</span>
                        <p className="text-[9px] text-gray-500 mt-1">توافق {activeChronometers.filter(c=>c.minutesUntil <= analysis.nextMajorTimeCluster + 2).length} دورات زمنية</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

// ===================================================================
// 4. UPDATED: Main Component
// ===================================================================
const InstantaneousAnalysis: React.FC<{ analysis: FullInstantaneousAnalysis | null }> = ({ analysis }) => {
    const [activeTab, setActiveTab] = useState<'1m' | '5m' | '15m'>('5m');

    const coherenceScore = useMemo(() => {
        if (!analysis) return 0;
        let score = 33;
        if (analysis['1m'].side === analysis['5m'].side) score += 33;
        if (analysis['5m'].side === analysis['15m'].side) score += 34;
        return score;
    }, [analysis]);

    if (!analysis) {
        return <div className="text-center py-4 text-sm text-gray-500">جاري تحميل التحليل اللحظي...</div>;
    }

    const tabs: ('1m' | '5m' | '15m')[] = ['1m', '5m', '15m'];

    return (
        <div className="mt-6">
            <div className="flex justify-between items-start mb-3">
                 <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span>مختبر الانفجارات السعرية اللحظية (Price-Time Matrix)</span>
                </h3>
                 <div className="text-right">
                    <p className="text-xs text-gray-400">توافق الإشارات</p>
                     <p className={`font-bold text-lg ${coherenceScore > 80 ? 'text-green-400' : coherenceScore > 50 ? 'text-yellow-400' : 'text-red-400'}`}>{coherenceScore}%</p>
                </div>
            </div>
            
            <div className="mb-4">
                <div className="flex border-b border-gray-700">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-2 px-4 text-sm font-medium transition-colors ${
                                activeTab === tab
                                    ? 'border-b-2 border-cyan-glow text-cyan-glow'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {activeTab === '1m' && <AnalysisView analysis={analysis['1m']} />}
                {activeTab === '5m' && <AnalysisView analysis={analysis['5m']} />}
                {activeTab === '15m' && <AnalysisView analysis={analysis['15m']} />}
            </div>
        </div>
    );
};

export default InstantaneousAnalysis;
