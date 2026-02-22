
import React, { useState, useEffect } from 'react';
import type { ScannerCandidate, MarketData, TechnicalPatternsAnalysis, ChartPattern, CandlestickPattern, WyckoffAnalysis, GannAnalysis, Candle, GannAngle, CurrencyData, SpectralVerdict, CompositeCycle, PatternPoint } from '../types';
import ScalogramChart from './ScalogramChart';
import SimpleLineChart from './LineChart';
import SpectralAIAnalysis from './SpectralAIAnalysis';
import ComprehensiveAnalystView from './ComprehensiveAnalystView';
import { MarketState, SpectralPhaseState } from '../types';
import ElliottWaveAnalysisView from './ElliottWaveAnalysisView';
import HarmonicAnalysisView from './HarmonicAnalysisView';
import SpectralStrategies from './SpectralStrategies';
import FractalAnalysisView from './FractalAnalysisView';
import SmartMoneyAnalysisView from './SmartMoneyAnalysisView';
import MacdAnalysisView from './MacdAnalysisView';
import TechnicalIndicatorsView from './TechnicalIndicatorsView';
import ICTAnalysisView from './ICTAnalysisView';
import ICTSignalEngineView from './ICTSignalEngineView';
import CotAnalysisView from './CotAnalysisView';
import WyckoffAnalysisView from './WyckoffAnalysisView';
import GannAnalysisView from './GannAnalysisView';
import FibonacciAnalysisView from './FibonacciAnalysisView';
import FayezIndicator from './FayezIndicator';
import ShortSqueezeAnalysisView from './ShortSqueezeAnalysisView';
import LiquidationHeatmap from './LiquidationHeatmap';
import RiskCalculator from './RiskCalculator';
import IchimokuAnalysisView from './IchimokuAnalysisView';
import WhaleWatcherAnalysisView from './WhaleWatcherAnalysisView';
import VolumeProfileView from './VolumeProfileView'; 
import SeasonalityView from './SeasonalityView'; 
import GannFractalNexusView from './GannFractalNexusView';
import DiverseStrategiesView from './DiverseStrategiesView';
import QuantAnalysisView from './QuantAnalysisView'; 
import DowAnalysisView from './DowAnalysisView'; 
import InteractiveChart from './InteractiveChart'; 

// --- New Sub-component: Spectral Phase Clock ---
const SpectralPhaseClock: React.FC<{ angle: number; state: SpectralPhaseState }> = ({ angle, state }) => {
    return (
        <div className="relative w-48 h-48 flex items-center justify-center bg-gray-800 rounded-full border-4 border-gray-700 shadow-2xl shadow-cyan-900/20">
            {/* Sectors */}
            <div className="absolute inset-0 rounded-full opacity-20" style={{background: 'conic-gradient(from 270deg, #f87171 0deg 90deg, #fbbf24 90deg 180deg, #4ade80 180deg 270deg, #60a5fa 270deg 360deg)'}}></div>
            
            {/* Labels */}
            <div className="absolute top-2 text-[10px] font-bold text-red-300">تصريف (180°)</div>
            <div className="absolute bottom-2 text-[10px] font-bold text-blue-300">تجميع (0°)</div>
            <div className="absolute right-2 text-[10px] font-bold text-green-300">صعود (90°)</div>
            <div className="absolute left-2 text-[10px] font-bold text-yellow-300">هبوط (270°)</div>

            {/* Needle */}
            <div className="absolute w-full h-full flex items-center justify-center transition-transform duration-1000 ease-out" style={{transform: `rotate(${angle}deg)`}}>
                 <div className="w-1 h-1/2 bg-gradient-to-t from-transparent to-white origin-bottom rounded-full shadow-[0_0_10px_white]"></div>
            </div>
            
            {/* Center Hub */}
            <div className="absolute w-16 h-16 bg-gray-900 rounded-full flex flex-col items-center justify-center border-2 border-gray-600 z-10">
                <span className="text-xl font-bold text-white">{angle.toFixed(0)}°</span>
                <span className="text-[8px] text-gray-400">{state}</span>
            </div>
        </div>
    );
};

// --- New Sub-component: Spectral Dashboard ---
const SpectralDashboard: React.FC<{ 
    candidate: ScannerCandidate; 
    verdict?: SpectralVerdict; 
    compositeCycle?: CompositeCycle[];
    snr?: number;
    entropy?: number;
}> = ({ candidate, verdict, compositeCycle, snr, entropy }) => {
    const { analysis } = candidate;
    
    const getActionColor = (action: string) => {
        if (action.includes('BUY')) return 'text-green-400 border-green-500/50 bg-green-500/10';
        if (action.includes('SELL')) return 'text-red-400 border-red-500/50 bg-red-500/10';
        return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
    };

    // Split composite cycle into history and projection
    const cycleHistory = compositeCycle ? compositeCycle.filter(c => !c.isProjection) : [];
    const cycleProjection = compositeCycle ? compositeCycle.filter(c => c.isProjection) : [];
    // We need to overlap the last point of history with projection for smooth line
    if(cycleHistory.length > 0 && cycleProjection.length > 0) {
        cycleProjection.unshift(cycleHistory[cycleHistory.length - 1]);
    }

    return (
        <div className="space-y-4">
            {/* Top Row: Clock & Verdict */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900 p-4 rounded-xl border border-gray-700">
                <div className="flex justify-center">
                    <SpectralPhaseClock angle={analysis.currentPhaseAngle} state={analysis.spectralPhaseState || SpectralPhaseState.ACCUMULATION} />
                </div>
                <div className="flex flex-col justify-center space-y-3">
                     {verdict && (
                        <div className={`p-4 rounded-lg border text-center ${getActionColor(verdict.action)}`}>
                            <h4 className="text-sm opacity-80">الحكم الطيفي (Spectral Verdict)</h4>
                            <div className="text-3xl font-bold my-1">{verdict.action.replace('_', ' ')}</div>
                            <p className="text-xs opacity-90">{verdict.description}</p>
                        </div>
                     )}
                     <div className="grid grid-cols-3 gap-2 text-center">
                         <div className="bg-gray-800 p-2 rounded border border-gray-700">
                             <p className="text-[10px] text-gray-400">نقاء الإشارة (SNR)</p>
                             <p className={`font-mono font-bold ${snr && snr > 70 ? 'text-green-400' : 'text-gray-300'}`}>{snr?.toFixed(0)}%</p>
                         </div>
                         <div className="bg-gray-800 p-2 rounded border border-gray-700">
                             <p className="text-[10px] text-gray-400">فوضى (Entropy)</p>
                             <p className={`font-mono font-bold ${entropy && entropy < 40 ? 'text-green-400' : 'text-red-400'}`}>{entropy?.toFixed(0)}%</p>
                         </div>
                         <div className="bg-gray-800 p-2 rounded border border-gray-700">
                             <p className="text-[10px] text-gray-400">الدورة المسيطرة</p>
                             <p className="font-mono font-bold text-cyan-glow">{analysis.dominantCyclePeriod} شمعة</p>
                         </div>
                     </div>
                </div>
            </div>

            {/* Middle Row: Composite Cycle Chart with Projection */}
            {compositeCycle && (
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                    <div className="flex justify-between mb-2">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span>الموجة المركبة + الإسقاط المستقبلي (Projection)</span>
                        </h4>
                        <span className="text-xs text-cyan-glow animate-pulse">مباشر</span>
                    </div>
                    
                    <div className="h-40 w-full relative">
                        <SimpleLineChart 
                            data={compositeCycle} 
                            lines={[
                                { key: 'value', color: '#a78bfa', strokeWidth: 2 }, 
                                { key: 'dominantComponent', color: '#4b5563', strokeWidth: 1, dashArray: '2 2' }
                            ]}
                            xAxisKey="time"
                        />
                        {/* Visual separator for NOW */}
                        <div className="absolute top-0 bottom-0 border-r border-yellow-500 border-dashed" style={{left: `${(cycleHistory.length / compositeCycle.length) * 100}%`}}></div>
                        <span className="absolute bottom-1 text-[9px] text-yellow-500" style={{left: `${(cycleHistory.length / compositeCycle.length) * 100}%`, transform: 'translateX(-50%)'}}>الآن</span>
                        <span className="absolute top-2 right-2 text-[9px] text-purple-400 bg-black/50 px-1 rounded">توقع (Projection)</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 text-center">الخط البنفسجي يمثل محصلة الدورات. الجزء الأيمن من الخط المتقطع هو الإسقاط الرياضي للمستقبل.</p>
                </div>
            )}

            {/* Bottom Row: Scalogram & Oscillators */}
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-700">
                 <h4 className="text-sm font-bold text-white mb-2">مخطط الطاقة الطيفية (Scalogram 3D)</h4>
                 <div className="h-56 w-full">
                    <ScalogramChart data={analysis.scalogram} />
                 </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-base font-semibold text-white mb-2">مؤشر طاقة السوق</h3>
                    <p className="text-xs text-gray-400 mb-3">إجمالي الطاقة الطيفية. القيم المنخفضة تشير إلى ضغط (Spring).</p>
                    <div className="h-40">
                        <SimpleLineChart data={analysis.marketEnergyIndex} lines={[{key: 'value', color: '#facc15'}]} domain={[0, 1]}/>
                    </div>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-base font-semibold text-white mb-2">مذبذب طور الدورة</h3>
                    <p className="text-xs text-gray-400 mb-3">يتتبع طور الدورة السائدة. الارتفاع من -1 يقترح دورة صعود جديدة.</p>
                    <div className="h-40">
                        <SimpleLineChart data={analysis.cyclePhaseOscillator} lines={[{key: 'value', color: '#22d3ee'}]} domain={[-1, 1]} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- New Component: Pattern Chart Overlay ---
const PatternChart: React.FC<{ pattern: ChartPattern, candles: Candle[] }> = ({ pattern, candles }) => {
    const SVG_WIDTH = 400;
    const SVG_HEIGHT = 200;
    const PADDING = { top: 10, bottom: 10, left: 5, right: 5 };

    // Use recent candles plus pattern points
    const chartCandles = candles.slice(-100);
    const chartStartIndex = candles.length - 100;
    
    const prices = chartCandles.map(c => c.close);
    const points = pattern.points;
    
    // Add target/stop levels to scaling
    if(pattern.targetPrice) prices.push(pattern.targetPrice);
    if(pattern.stopLoss) prices.push(pattern.stopLoss);
    
    const minPrice = Math.min(...prices) * 0.995;
    const maxPrice = Math.max(...prices) * 1.005;
    const priceRange = maxPrice - minPrice;

    const scaleX = (idx: number) => ((idx - chartStartIndex) / 100) * SVG_WIDTH;
    const scaleY = (price: number) => SVG_HEIGHT - ((price - minPrice) / priceRange) * SVG_HEIGHT;

    const linePath = chartCandles.map((c, i) => `${i===0?'M':'L'} ${scaleX(chartStartIndex + i)} ${scaleY(c.close)}`).join(' ');

    return (
        <div className="relative w-full h-48 bg-gray-800 rounded border border-gray-700 overflow-hidden">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
                {/* Price Line */}
                <path d={linePath} stroke="#4b5563" strokeWidth="1.5" fill="none" />
                
                {/* Pattern Overlay */}
                <path 
                    d={`M ${points.map(p => `${scaleX(p.index)} ${scaleY(p.price)}`).join(' L ')}`} 
                    stroke={pattern.type === 'Bullish' ? '#4ade80' : pattern.type === 'Bearish' ? '#f87171' : '#facc15'} 
                    strokeWidth="2" fill="none" strokeDasharray="4 2"
                />
                
                {/* Points */}
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={scaleX(p.index)} cy={scaleY(p.price)} r="3" fill="#fff" />
                        {p.label && <text x={scaleX(p.index)} y={scaleY(p.price) - 5} fontSize="8" fill="#fff" textAnchor="middle">{p.label}</text>}
                    </g>
                ))}

                {/* Trendlines */}
                {pattern.trendlines?.map((line, i) => (
                    <line 
                        key={`tl-${i}`}
                        x1={scaleX(line.start.index)} y1={scaleY(line.start.price)}
                        x2={scaleX(line.end.index)} y2={scaleY(line.end.price)}
                        stroke="#38bdf8" strokeWidth="1"
                    />
                ))}

                {/* Target/SL */}
                {pattern.targetPrice && (
                    <line x1={0} y1={scaleY(pattern.targetPrice)} x2={SVG_WIDTH} y2={scaleY(pattern.targetPrice)} stroke="#4ade80" strokeWidth="1" strokeDasharray="2 2" />
                )}
            </svg>
            {pattern.targetPrice && <div className="absolute top-1 right-1 text-[10px] text-green-400 bg-black/50 px-1 rounded">Target: {pattern.targetPrice.toFixed(2)}</div>}
        </div>
    );
};

// --- Updated TechnicalPatternsView ---
const TechnicalPatternsView: React.FC<{ analysis: TechnicalPatternsAnalysis, candles?: Candle[] }> = ({ analysis, candles }) => {
    const { chartPattern, candlestickPattern, confluence } = analysis;
    
    return (
        <div className="bg-gray-900 p-4 border border-gray-700 rounded-lg mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                الأنماط الفنية الكلاسيكية
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Chart Pattern Card */}
                <div className={`p-3 rounded-md border ${chartPattern ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/30 border-gray-700 border-dashed'}`}>
                    {chartPattern ? (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-white">{chartPattern.name}</span>
                                <div className="flex gap-2">
                                    <span className={`text-xs px-2 py-1 rounded ${chartPattern.status === 'Confirmed' ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'}`}>{chartPattern.status}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${chartPattern.type === 'Bullish' ? 'bg-green-900 text-green-400' : chartPattern.type === 'Bearish' ? 'bg-red-900 text-red-400' : 'bg-gray-700 text-gray-300'}`}>{chartPattern.type}</span>
                                </div>
                            </div>
                            
                            {candles && <PatternChart pattern={chartPattern} candles={candles} />}
                            
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="bg-gray-900 p-1 rounded flex justify-between px-2">
                                    <span className="text-gray-400">Target</span>
                                    <span className="text-green-400">{chartPattern.targetPrice?.toFixed(4)}</span>
                                </div>
                                <div className="bg-gray-900 p-1 rounded flex justify-between px-2">
                                    <span className="text-gray-400">Stop Loss</span>
                                    <span className="text-red-400">{chartPattern.stopLoss?.toFixed(4)}</span>
                                </div>
                                <div className="bg-gray-900 p-1 rounded flex justify-between px-2 col-span-2">
                                    <span className="text-gray-400">Confidence</span>
                                    <div className="w-24 bg-gray-700 rounded-full h-2 mt-1">
                                        <div className="bg-cyan-500 h-2 rounded-full" style={{width: `${chartPattern.confidence}%`}}></div>
                                    </div>
                                    <span className="text-cyan-400">{chartPattern.confidence}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 border-t border-gray-700 pt-2">{chartPattern.summary}</p>
                        </>
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-10">لم يتم رصد نمط شارت كلاسيكي واضح حالياً.</p>
                    )}
                </div>
                
                {/* Candlestick Pattern Card */}
                <div className={`p-3 rounded-md border flex flex-col justify-center ${candlestickPattern ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/30 border-gray-700 border-dashed'}`}>
                    {candlestickPattern ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-white text-lg">شمعة {candlestickPattern.name}</span>
                                <span className={`text-xs px-2 py-1 rounded ${candlestickPattern.type === 'Bullish' ? 'bg-green-900 text-green-400' : candlestickPattern.type === 'Bearish' ? 'bg-red-900 text-red-400' : 'bg-gray-700 text-gray-300'}`}>{candlestickPattern.type}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`w-2 h-16 mx-auto rounded ${candlestickPattern.type === 'Bullish' ? 'bg-green-500' : candlestickPattern.type === 'Bearish' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-300 font-semibold">أهمية النمط: <span className={candlestickPattern.significance === 'High' ? 'text-yellow-400' : 'text-gray-400'}>{candlestickPattern.significance}</span></p>
                                    <p className="text-xs text-gray-400 mt-2">تشكيل شمعة يابانية يشير إلى احتمالية {candlestickPattern.type === 'Bullish' ? 'انعكاس صاعد' : candlestickPattern.type === 'Bearish' ? 'انعكاس هابط' : 'استمرار أو حيرة'}.</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-gray-500 text-center py-2">لم يتم رصد نمط شموع يابانية مميز في آخر شمعة.</p>
                    )}
                </div>
            </div>
            
            {confluence && (
                <div className="mt-3 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded text-xs text-yellow-200 text-center font-bold">
                    ✨ {confluence.summary}
                </div>
            )}
        </div>
    );
};

const SessionStatusWidget: React.FC<{ session: any }> = ({ session }) => <div className="bg-gray-800 p-2 rounded text-xs text-white">{session.currentSession}</div>;
const PivotPointsView: React.FC<{ pivots: any }> = ({ pivots }) => <div className="bg-gray-800 p-2 rounded text-xs text-white">Pivots Available</div>;

// Main Analysis Panel Component
interface AnalysisPanelProps {
    candidate: ScannerCandidate | null;
    onClose: () => void;
    difficulty: 'Basic' | 'Advanced' | 'Expert';
    marketData: MarketData;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ candidate, onClose, difficulty, marketData }) => {
    const [isComprehensiveVisible, setIsComprehensiveVisible] = useState(false);
    const [isFayezVisible, setIsFayezVisible] = useState(false);
    const [godMode, setGodMode] = useState(false); 

    useEffect(() => {
        setIsComprehensiveVisible(false);
        setIsFayezVisible(false);
        setGodMode(false);
    }, [candidate]);

    if (!candidate) return null;
    
    const { pair, timeframe, analysis } = candidate;
    const candles = marketData[pair]?.candles[timeframe];
    const pairMarketData: CurrencyData | undefined = marketData[pair];

    return (
        <div className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity ${candidate ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className={`fixed top-0 right-0 h-full w-full md:max-w-2xl bg-gray-800/90 border-l border-gray-700 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto pb-20 md:pb-0 ${
                    candidate ? 'translate-x-0' : 'translate-x-full'
                } ${godMode ? 'ring-2 ring-green-500 shadow-green-500/20' : ''}`}
            >
                <div className="flex flex-col min-h-full">
                    <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {pair} 
                                {godMode && <span className="text-xs bg-green-500 text-black px-1 rounded font-mono">GOD MODE</span>}
                            </h2>
                            <p className="text-sm text-gray-400">تحليل {timeframe}</p>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="hidden sm:flex items-center gap-1 mr-2" title="نبض السوق">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
                                <svg className="w-12 h-6 text-red-500" viewBox="0 0 50 20">
                                    <path d="M0 10 H15 L20 2 L25 18 L30 10 H50" fill="none" stroke="currentColor" strokeWidth="1.5" className="animate-pulse" />
                                </svg>
                            </div>

                            <button 
                                onClick={() => setGodMode(!godMode)}
                                className={`p-1.5 rounded border text-xs font-mono transition-all ${godMode ? 'bg-green-500 text-black border-green-600' : 'bg-gray-700 text-gray-300 border-gray-600'}`}
                            >
                                {godMode ? 'MATRIX: ON' : 'MATRIX'}
                            </button>

                            {analysis.sessionStatus && <div className="hidden sm:block"><SessionStatusWidget session={analysis.sessionStatus} /></div>}
                            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {analysis.sessionStatus && <div className="p-4 sm:hidden"><SessionStatusWidget session={analysis.sessionStatus} /></div>}

                    <div className={`flex-grow p-4 space-y-4 ${godMode ? 'font-mono text-green-400' : ''}`}>

                        {/* Interactive Price Chart Added Here */}
                        {candles && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-white mb-2">الرسم البياني التفاعلي</h3>
                                <InteractiveChart data={candles} pair={pair} />
                            </div>
                        )}

                        {/* NEW: SPECTRAL DASHBOARD INTEGRATION */}
                        <SpectralDashboard 
                            candidate={candidate} 
                            verdict={analysis.spectralVerdict}
                            compositeCycle={analysis.compositeCycle}
                            snr={analysis.signalToNoiseRatio}
                            entropy={analysis.spectralEntropy}
                        />

                        {/* New Diverse Strategies Section */}
                        {analysis.diverseStrategiesAnalysis && <DiverseStrategiesView analysis={analysis.diverseStrategiesAnalysis} />}

                        {analysis.cotAnalysis && <CotAnalysisView analysis={analysis.cotAnalysis} />}

                        <TechnicalIndicatorsView analysis={analysis} currentPrice={candidate.price} />
                        
                        {analysis.quantAnalysis && <QuantAnalysisView analysis={analysis.quantAnalysis} />}
                        
                        {analysis.dowAnalysis && <DowAnalysisView analysis={analysis.dowAnalysis} />}
                        
                        {analysis.volumeProfileAnalysis && <VolumeProfileView analysis={analysis.volumeProfileAnalysis} currentPrice={candidate.price} />}
                        
                        {analysis.seasonalityAnalysis && <SeasonalityView analysis={analysis.seasonalityAnalysis} />}
                        
                        {analysis.ichimokuAnalysis && <IchimokuAnalysisView analysis={analysis.ichimokuAnalysis} currentPrice={candidate.price} />}
                        
                        {analysis.whaleWatcherAnalysis && <WhaleWatcherAnalysisView analysis={analysis.whaleWatcherAnalysis} />}

                        {analysis.pivotPoints && <PivotPointsView pivots={analysis.pivotPoints} />}

                        <RiskCalculator currentPrice={candidate.price} />
                        
                        {analysis.liquidationMap && <LiquidationHeatmap data={analysis.liquidationMap} currentPrice={candidate.price} />}

                        {analysis.shortSqueezeAnalysis && <ShortSqueezeAnalysisView analysis={analysis.shortSqueezeAnalysis} />}

                        {analysis.technicalPatterns && <TechnicalPatternsView analysis={analysis.technicalPatterns} candles={candles} />}

                        {analysis.fibonacciAnalysis && candles && <FibonacciAnalysisView analysis={analysis.fibonacciAnalysis} candles={candles} />}

                        {/* Price Targets Block */}
                        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M12 21a9 9 0 110-18 9 9 0 010 18z" />
                                </svg>
                                <span>أهداف السعر المحتملة</span>
                            </h3>
                            <div className="space-y-4">
                                {analysis.priceTargets.map((target, index) => {
                                    const currentPrice = candidate.price;
                                    const previousTargetPrice = index === 0 ? analysis.swingLow : analysis.priceTargets[index - 1].price;
                                    const range = target.price - previousTargetPrice;
                                    const progress = range > 0 ? ((currentPrice - previousTargetPrice) / range) * 100 : (currentPrice >= target.price ? 100 : 0);
                                    const isAchieved = currentPrice >= target.price;
                                    const isActive = !isAchieved && (index === 0 || currentPrice >= analysis.priceTargets[index - 1].price);
                                    return (
                                        <div key={target.level}>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className={`font-bold ${isActive ? 'text-yellow-glow' : isAchieved ? 'text-green-400' : 'text-gray-400'}`}>
                                                    {`الهدف ${index + 1}`} {isAchieved && <span className="text-xs font-normal text-green-400/80"> (تم تحقيقه)</span>}
                                                </span>
                                                <span className={`font-mono ${isActive ? 'text-yellow-glow' : isAchieved ? 'text-green-400' : 'text-gray-300'}`}>
                                                    {target.price.toFixed(4)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                                <div className={`h-2 rounded-full transition-all duration-500 ${isAchieved ? 'bg-green-500' : isActive ? 'bg-cyan-glow' : 'bg-cyan-glow/30'}`} style={{width: `${Math.min(100, Math.max(0, progress))}%`}}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {analysis.smartMoneyAnalysis && analysis.smartMoneyAnalysis.tradeSetup && candles && (
                            <SmartMoneyAnalysisView analysis={analysis.smartMoneyAnalysis} candles={candles} pair={pair} />
                        )}

                        {analysis.ictAnalysis && candles && (
                            <ICTAnalysisView analysis={analysis.ictAnalysis} candles={candles} />
                        )}

                        {analysis.macdAnalysis && <MacdAnalysisView analysis={analysis.macdAnalysis} />}
                        
                        {analysis.wyckoffAnalysis && candles && <WyckoffAnalysisView analysis={analysis.wyckoffAnalysis} candles={candles} pair={pair} />}

                        {analysis.gannAnalysis && candles && pairMarketData && <GannAnalysisView analysis={analysis.gannAnalysis} candles={candles} pair={pair} pairMarketData={pairMarketData} />}
                        
                        {analysis.nexusAnalysis && <GannFractalNexusView nexus={analysis.nexusAnalysis} />}

                        {analysis.elliottWave && candles && <ElliottWaveAnalysisView analysis={analysis.elliottWave} candles={candles} pair={pair} />}
                        
                        {analysis.harmonicPattern && candles && <HarmonicAnalysisView analysis={analysis.harmonicPattern} candles={candles} pair={pair} />}

                        {analysis.fractalAnalysis && pairMarketData && (
                            <FractalAnalysisView 
                                initialAnalysis={analysis.fractalAnalysis} 
                                pairData={pairMarketData} 
                                initialTimeframe={timeframe} 
                            />
                        )}

                        <SpectralAIAnalysis candidate={candidate} difficulty={difficulty} />
                        
                        <div className="my-6 text-center p-4 bg-gray-900 rounded-lg border border-yellow-glow/30 shadow-lg shadow-yellow-glow/10">
                             <h3 className="text-lg font-bold text-yellow-glow flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                <span>المحلل الذكي الشامل</span>
                            </h3>
                             <p className="text-sm text-gray-400 my-2">احصل على تقرير متكامل يدمج كافة التحليلات العميقة (تاريخي، فركتالي، استراتيجي) في مقال احترافي واحد مع رسوم بيانية وتوقعات مستقبلية.</p>
                             <button
                                 onClick={() => setIsComprehensiveVisible(true)}
                                 className="w-full bg-yellow-glow/20 text-yellow-glow text-base font-semibold py-2.5 rounded-md border border-yellow-glow/50 hover:bg-yellow-glow/40 transition-colors"
                             >
                                 🚀 تشغيل المحلل الذكي
                             </button>
                         </div>
                        
                        <div className="my-6 text-center p-4 bg-gray-900 rounded-lg border-2 border-dashed border-yellow-glow/50 shadow-lg shadow-yellow-glow/10">
                             <h3 className="text-xl font-bold text-yellow-glow flex items-center justify-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m6 4v4m-2-2h4M12 3v1m0 16v1m-6.364-2.364l.707-.707M6.343 6.343l-.707-.707m12.728 0l.707-.707M17.657 17.657l.707.707M18 12h1M5 12H4" /></svg>
                                <span>مؤشر فايز للتوقع المستقبلي</span>
                            </h3>
                             <p className="text-sm text-gray-400 my-2">شغّل المحرك التنبؤي الأكثر تقدمًا. يقوم مؤشر فايز بدمج جميع التحليلات لتوقع مسار الشموع الـ 30 القادمة وتقديم خطة تداول كاملة.</p>
                             <button
                                 onClick={() => setIsFayezVisible(true)}
                                 className="w-full bg-yellow-glow text-gray-900 text-base font-bold py-2.5 rounded-md border border-yellow-glow/50 hover:bg-yellow-400 transition-colors"
                             >
                                 ✨ تشغيل مؤشر فايز
                             </button>
                         </div>

                        {isFayezVisible && <FayezIndicator candidate={candidate} marketData={marketData} />}

                        {isComprehensiveVisible && <ComprehensiveAnalystView candidate={candidate} onClose={() => setIsComprehensiveVisible(false)} />}

                        <SpectralStrategies candidate={candidate} />

                    </div>
                </div>
            </div>
            {isComprehensiveVisible && <ComprehensiveAnalystView candidate={candidate} onClose={() => setIsComprehensiveVisible(false)} />}
        </div>
    );
};

export default AnalysisPanel;
