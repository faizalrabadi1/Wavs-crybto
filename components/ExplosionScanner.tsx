
import React, { useState, useEffect } from 'react';
import type { ScannerCandidate } from '../types';
import { MarketState } from '../types';

interface ExplosionScannerProps {
    candidates: ScannerCandidate[];
    onAnalyze: (candidate: ScannerCandidate) => void;
    isLoading: boolean;
    nextScanCountdown: number;
}

const Gauge: React.FC<{ value: number }> = ({ value }) => {
    const rotation = (value / 100) * 180; // 0 to 180 degrees
    const color = value > 85 ? '#f87171' : value > 70 ? '#facc15' : '#22d3ee';

    return (
        <div className="relative w-64 h-32">
            <svg viewBox="0 0 100 50" className="w-full h-full">
                {/* Background Arc */}
                <path d="M 10 50 A 40 40 0 0 1 90 50" stroke="#30363d" strokeWidth="8" fill="none" strokeLinecap="round" />
                {/* Value Arc */}
                <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    stroke={color}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    style={{
                        strokeDasharray: 125.6,
                        strokeDashoffset: 125.6 * (1 - value / 100),
                        transition: 'stroke-dashoffset 0.5s ease-out'
                    }}
                />
            </svg>
            {/* Needle */}
            <div
                className="absolute bottom-0 left-1/2 w-px h-28 origin-bottom transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
            >
                <div className="w-1 h-20 bg-gray-200 rounded-t-full absolute bottom-0 left-1/2 -translate-x-1/2"></div>
            </div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-200 rounded-full border-2 border-gray-800"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                 <span className="text-3xl font-bold text-white" style={{color}}>{value}</span>
                 <span className="text-sm font-mono text-gray-400">%</span>
            </div>
        </div>
    );
};


const ExplosionScanner: React.FC<ExplosionScannerProps> = ({ candidates, onAnalyze, isLoading, nextScanCountdown }) => {
    const [selectedCandidate, setSelectedCandidate] = useState<ScannerCandidate | null>(null);
    
    useEffect(() => {
        if (candidates && candidates.length > 0) {
            const currentSelectionStillValid = candidates.find(c => 
                c.pair === selectedCandidate?.pair && c.timeframe === selectedCandidate?.timeframe
            );
            if (!currentSelectionStillValid) {
                setSelectedCandidate(candidates[0]);
            } else {
                 // Update the selected candidate with fresh data
                setSelectedCandidate(currentSelectionStillValid);
            }
        } else {
            setSelectedCandidate(null);
        }
    }, [candidates, selectedCandidate?.pair, selectedCandidate?.timeframe]);

    const InfoCard: React.FC<{ label: string; value: string; color?: string; }> = ({ label, value, color = 'text-cyan-glow' }) => (
        <div className="bg-gray-900/70 p-3 rounded-md text-center border border-gray-700">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-lg font-mono font-bold ${color}`}>{value}</p>
        </div>
    );
    
    const renderSelectedCandidate = () => {
        if (!selectedCandidate) return null;
        
        const { state, regimeScore, marketEnergyIndex } = selectedCandidate.analysis;

        // Calculate energy build-up
        const recentEnergy = marketEnergyIndex.slice(-5).reduce((sum, p) => sum + p.value, 0) / 5;
        const pastEnergy = marketEnergyIndex.slice(-25, -5).reduce((sum, p) => sum + p.value, 0) / 20;
        const energyBuildup = pastEnergy > 0 ? (recentEnergy / pastEnergy - 1) * 100 : 0;
        const stateText = state === MarketState.CONSOLIDATING ? 'ضغط طيفي' : state;

        return (
             <div className="lg:col-span-2 bg-gray-800 border border-yellow-glow/30 rounded-lg p-6 flex flex-col items-center justify-around relative shadow-lg shadow-yellow-glow/10">
                <div className="text-center">
                    <p className="text-3xl font-bold text-white">{selectedCandidate.pair}</p>
                    <p className="text-sm text-gray-400 bg-gray-700 px-3 py-1 rounded-full inline-block mt-2">الإطار الزمني: {selectedCandidate.timeframe}</p>
                </div>
                
                <div className="my-4">
                     <Gauge value={selectedCandidate.confidence} />
                </div>

                <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                    <InfoCard label="الحالة" value={stateText} color="text-yellow-glow" />
                    <InfoCard label="ضغط النظام" value={regimeScore.toFixed(2)} color={regimeScore < -0.5 ? 'text-green-400' : 'text-gray-400'} />
                    <InfoCard label="بناء الطاقة" value={`+${energyBuildup.toFixed(1)}%`} color={energyBuildup > 15 ? 'text-green-400' : 'text-gray-400'} />
                </div>
                 <button
                    onClick={() => onAnalyze(selectedCandidate)}
                    className="mt-6 w-full max-w-md bg-cyan-glow/20 text-cyan-glow text-base font-semibold py-2.5 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">
                    تحليل معمق
                </button>
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h2 className="text-xl font-bold text-white">غرفة الإشعال (ماسح الانفجارات)</h2>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-gray-400 self-end sm:self-center" title="سيتم تحديث البيانات تلقائيًا">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                     <span className="hidden sm:inline">التحديث القادم في:</span>
                    <span className="font-semibold text-cyan-glow w-6 text-center">{nextScanCountdown}s</span>
                </div>
            </div>
            {isLoading && !selectedCandidate ? (
                 <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400 animate-pulse">جاري تحليل جميع الأطر الزمنية...</p>
                    <p className="text-xs text-gray-500 mt-1">قد يستغرق هذا بضع لحظات إضافية.</p>
                </div>
            ) : !selectedCandidate ? (
                <div className="text-center py-10 px-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">جاري البحث عن عملات في مرحلة ضغط طيفي...</p>
                    <p className="text-xs text-gray-500 mt-1">لم يتم اكتشاف إعدادات ذات احتمالية انفجار عالية بعد.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {renderSelectedCandidate()}

                    <div className="flex flex-col space-y-3">
                         <h3 className="text-lg font-semibold text-white px-2">قائمة الانتظار</h3>
                         <div className="flex-grow space-y-2 overflow-y-auto max-h-[400px] bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                            {candidates.map((candidate) => (
                                <button key={`${candidate.pair}-${candidate.timeframe}`}
                                    onClick={() => setSelectedCandidate(candidate)}
                                    className={`w-full text-right p-3 rounded-lg transition-colors border ${selectedCandidate?.pair === candidate.pair && selectedCandidate?.timeframe === candidate.timeframe ? 'bg-gray-700 border-yellow-glow' : 'bg-gray-800 border-gray-700 hover:bg-gray-700/50'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">{candidate.pair}</p>
                                            <p className="text-xs text-gray-400">{candidate.timeframe}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-yellow-glow">{candidate.confidence}%</p>
                                             <p className="text-xs text-gray-500">احتمالية</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
                                        <div className="bg-yellow-glow h-1 rounded-full" style={{width: `${candidate.confidence}%`}}></div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default React.memo(ExplosionScanner);
