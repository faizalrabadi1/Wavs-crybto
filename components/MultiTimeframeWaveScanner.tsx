import React, { useState } from 'react';
import { getProvider } from '../services/binanceService';
import { analyzeWaves } from '../services/elliottWaveService';
import type { ElliottWaveAnalysis, MarketData } from '../types';

const ALL_TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];

interface Props {
    pair: string;
}

interface ScanResult {
    timeframe: string;
    analysis: ElliottWaveAnalysis;
    status: 'loading' | 'success' | 'error';
}

const MultiTimeframeWaveScanner: React.FC<Props> = ({ pair }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<ScanResult[]>([]);

    const handleScan = async () => {
        setIsScanning(true);
        setProgress(0);
        
        // Initialize results with loading state
        const initialResults = ALL_TIMEFRAMES.map(tf => ({
            timeframe: tf,
            analysis: {} as ElliottWaveAnalysis,
            status: 'loading' as const
        }));
        setResults(initialResults);

        try {
            const provider = getProvider();
            // Fetch data for all timeframes
            // We use a smaller limit (e.g., 500) to speed up the scan since we only need recent swings
            await provider.fetchInitialData(
                [pair],
                ALL_TIMEFRAMES,
                (p) => setProgress(p),
                500,
                (partialData: MarketData) => {
                    if (partialData[pair] && partialData[pair].candles) {
                        setResults(prevResults => {
                            const newResults = [...prevResults];
                            Object.entries(partialData[pair].candles).forEach(([tf, candles]) => {
                                const index = newResults.findIndex(r => r.timeframe === tf);
                                if (index !== -1 && newResults[index].status === 'loading') {
                                    const waveAnalysis = analyzeWaves(candles);
                                    newResults[index] = {
                                        timeframe: tf,
                                        analysis: waveAnalysis,
                                        status: 'success'
                                    };
                                }
                            });
                            return newResults;
                        });
                    }
                }
            );
        } catch (error) {
            console.error("Error scanning timeframes:", error);
        } finally {
            setIsScanning(false);
            setProgress(100);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-900/20 mt-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        الماسح الموجي الشامل (جميع الفريمات)
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">يبحث عن النماذج الموجية الحالية من دقيقة إلى شهر لعملة {pair}</p>
                </div>
                <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                        isScanning 
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'
                    }`}
                >
                    {isScanning ? (
                        <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                            جاري المسح... {progress}%
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            بدء المسح
                        </>
                    )}
                </button>
            </div>

            {/* Progress Bar */}
            {isScanning && (
                <div className="w-full bg-gray-700 rounded-full h-1.5 mb-6 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {results.map((result) => {
                        const isSuccess = result.status === 'success';
                        const hasPattern = isSuccess && result.analysis.primaryScenario && result.analysis.primaryScenario.type !== 'Complex / Correction';
                        const scenario = result.analysis.primaryScenario;
                        
                        return (
                            <div 
                                key={result.timeframe} 
                                className={`p-4 rounded-xl border ${
                                    result.status === 'loading' ? 'bg-gray-800 border-gray-700 animate-pulse' :
                                    hasPattern ? 'bg-blue-900/20 border-blue-500/50' : 
                                    'bg-gray-800/50 border-gray-700/50'
                                }`}
                            >
                                <div className="flex justify-between items-center mb-2 border-b border-gray-700/50 pb-2">
                                    <span className="font-bold text-white text-lg">{result.timeframe}</span>
                                    {result.status === 'loading' && <span className="text-xs text-gray-400">جاري...</span>}
                                    {isSuccess && hasPattern && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-bold">{scenario?.probability}% ثقة</span>}
                                </div>
                                
                                {isSuccess ? (
                                    hasPattern ? (
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-blue-300">{scenario?.type}</p>
                                            <p className="text-xs text-gray-400">الموجة الحالية: <span className="text-white font-bold">{scenario?.currentWaveLabel}</span></p>
                                            {scenario?.targets && scenario.targets.length > 0 && (
                                                <p className="text-xs text-green-400">الهدف القادم: {scenario.targets[0].price.toFixed(4)}</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-2">
                                            <p className="text-xs text-gray-500">لا يوجد نموذج واضح</p>
                                        </div>
                                    )
                                ) : result.status === 'loading' ? (
                                    <div className="h-12 flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MultiTimeframeWaveScanner;
