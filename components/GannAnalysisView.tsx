
import React, { useState, useMemo, useEffect } from 'react';
import { Body, GeoVector, Ecliptic, SphereFromVector, HelioVector } from 'astronomy-engine';
import type { Candle, GannAnalysis, GannAngle, GannSquareLevel, GannSquaringPoint, GannSwing, AstroEvent, MoonPhase, GannIntersection, GannToolboxData, GannGridLine, PlanetPosition, PlanetaryAspect, SquaringResult, SquareTheCircleLevel, GannHexagonLevel, PlanetaryLine, GannTimeCycle, RangeLevel, CircleOf24Item, ZeroAngle, MasterCycleEvent, AstroModuleAnalysis, AstroSettings, PlanetaryPriceLevel } from '../types';
import FinancialAstrologer from './FinancialAstrologer';
import GannDeepAIAnalysis from './GannDeepAIAnalysis';
import { analyzeGann } from '../services/gannService';

interface Props {
    analysis: GannAnalysis;
    candles: Candle[];
    pair: string;
    pairMarketData: any;
}

// --- Reusable Components ---
const ToolCard: React.FC<{ title: string; icon: string; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = "" }) => (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-4 shadow-lg hover:border-cyan-500/30 transition-all duration-300 ${className}`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700/50">
            <span className="text-lg">{icon}</span>
            <h4 className="text-sm font-bold text-gray-200">{title}</h4>
        </div>
        {children}
    </div>
);

// --- GANN GRID VISUALIZER (NEW) ---
const GannGridChart: React.FC<{ candles: Candle[], gridLines: GannGridLine[], unitScale: number }> = ({ candles, gridLines, unitScale }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [showCandles, setShowCandles] = useState(true);
    
    // SVG Dimensions
    const width = 500;
    const height = 250;
    const padding = { top: 10, bottom: 20, left: 10, right: 10 };

    if (candles.length < 50) return <div className="text-xs text-gray-500">جاري تحميل بيانات الشبكة...</div>;

    // Scale logic
    const viewCandles = candles.slice(-150); // View last 150
    const startIdx = candles.length - 150;
    const endIdx = candles.length - 1;
    const maxPrice = Math.max(...viewCandles.map(c => c.high));
    const minPrice = Math.min(...viewCandles.map(c => c.low));
    const priceRange = maxPrice - minPrice;
    const timeRange = 150;

    const scaleX = (idx: number) => padding.left + ((idx - startIdx) / timeRange) * (width - padding.left - padding.right);
    const scaleY = (price: number) => (height - padding.bottom) - ((price - minPrice) / priceRange) * (height - padding.top - padding.bottom);

    // Line generators
    const candlePath = viewCandles.map((c, i) => {
        const x = scaleX(startIdx + i);
        const yOpen = scaleY(c.open);
        const yClose = scaleY(c.close);
        const yHigh = scaleY(c.high);
        const yLow = scaleY(c.low);
        const color = c.close >= c.open ? '#4ade80' : '#f87171';
        return (
            <g key={i}>
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" opacity="0.8" />
                <rect x={x-1.5} y={Math.min(yOpen, yClose)} width="3" height={Math.max(1, Math.abs(yClose-yOpen))} fill={color} opacity="0.8" />
            </g>
        );
    });

    return (
        <div className="w-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
                <span className="text-xs text-gray-400 font-mono">1x1 Scale: {unitScale.toFixed(5)}</span>
                <div className="flex gap-2">
                    <button onClick={() => setIsVisible(!isVisible)} className={`text-[10px] px-2 py-1 rounded border ${isVisible ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>الشبكة</button>
                    <button onClick={() => setShowCandles(!showCandles)} className={`text-[10px] px-2 py-1 rounded border ${showCandles ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>الشموع</button>
                </div>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 bg-gray-900">
                <clipPath id="chartArea">
                    <rect x={padding.left} y={padding.top} width={width - padding.left - padding.right} height={height - padding.top - padding.bottom} />
                </clipPath>
                
                <g clipPath="url(#chartArea)">
                    {isVisible && gridLines.map((line, i) => {
                        // Filter lines that are completely out of view to save rendering
                        if ((line.p1.index < startIdx && line.p2.index < startIdx) || (line.p1.index > endIdx && line.p2.index > endIdx)) return null;
                        
                        const x1 = scaleX(line.p1.index);
                        const y1 = scaleY(line.p1.price);
                        const x2 = scaleX(line.p2.index);
                        const y2 = scaleY(line.p2.price);
                        
                        return (
                            <line 
                                key={i} 
                                x1={x1} y1={y1} x2={x2} y2={y2} 
                                stroke={line.type === 'Up' ? '#22d3ee' : '#f472b6'} 
                                strokeWidth="0.5" 
                                strokeDasharray="2 2" 
                                opacity="0.4" 
                            />
                        );
                    })}
                    
                    {showCandles && candlePath}
                </g>
            </svg>
        </div>
    );
}

// --- 2. INTERACTIVE GANN WHEEL (HIGH-RES) ---
const InteractiveGannWheel: React.FC<{ currentPrice: number, levels: GannSquareLevel[] }> = ({ currentPrice, levels }) => {
    const [hoveredDegree, setHoveredDegree] = useState<number | null>(null);
    const cx = 200, cy = 200, r = 180;

    const segments = useMemo(() => {
        const segs = [];
        for(let i=0; i<360; i+=45) {
            const rad = (i - 90) * Math.PI / 180;
            const x2 = cx + r * Math.cos(rad);
            const y2 = cy + r * Math.sin(rad);
            segs.push({ deg: i, x2, y2, type: i % 90 === 0 ? 'Cardinal' : 'Ordinal' });
        }
        return segs;
    }, []);

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width="400" height="400" viewBox="0 0 400 400" className="bg-gray-900 rounded-full shadow-2xl border-4 border-gray-800">
                    {/* Base Circles */}
                    <circle cx={cx} cy={cy} r={r} stroke="#374151" strokeWidth="1" fill="none" />
                    <circle cx={cx} cy={cy} r={r * 0.66} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" fill="none" />
                    <circle cx={cx} cy={cy} r={r * 0.33} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" fill="none" />
                    
                    {/* Cross Lines */}
                    {segments.map((seg, i) => (
                        <line 
                            key={i} 
                            x1={cx} y1={cy} x2={seg.x2} y2={seg.y2} 
                            stroke={seg.type === 'Cardinal' ? '#f87171' : '#60a5fa'} 
                            strokeWidth={seg.type === 'Cardinal' ? 2 : 1} 
                            opacity={0.5}
                        />
                    ))}

                    {/* Active Levels from Data */}
                    {levels.slice(0, 16).map((l, i) => {
                        // Map level angle to coordinate
                        const rad = (l.degree - 90) * Math.PI / 180;
                        // Distribute distance based on proximity to price (simulated for spiral effect)
                        const distRatio = 0.4 + ((i % 3) * 0.25); 
                        const x = cx + (r * distRatio) * Math.cos(rad);
                        const y = cy + (r * distRatio) * Math.sin(rad);
                        
                        const isCardinal = l.degree % 90 === 0;
                        const color = l.type === 'Resistance' ? '#f87171' : '#4ade80';
                        
                        return (
                            <g key={i} 
                               onMouseEnter={() => setHoveredDegree(l.degree)} 
                               onMouseLeave={() => setHoveredDegree(null)}
                               className="cursor-pointer hover:opacity-80"
                            >
                                <circle cx={x} cy={y} r={isCardinal ? 6 : 4} fill={color} stroke="#1f2937" strokeWidth="1" />
                                <text x={x} y={y} dx={8} dy={4} fontSize="10" fill="white" fontWeight="bold" className="pointer-events-none">
                                    {l.price.toFixed(l.price < 1 ? 5 : 2)}
                                </text>
                            </g>
                        );
                    })}
                    
                    {/* Center Price */}
                    <circle cx={cx} cy={cy} r={25} fill="#1f2937" stroke="#fbbf24" strokeWidth="2" />
                    <text x={cx} y={cy} dy={4} textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">
                        {currentPrice.toFixed(currentPrice < 1 ? 5 : 2)}
                    </text>
                </svg>
                
                {/* Hover Info Overlay */}
                {hoveredDegree !== null && (
                    <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded border border-gray-600 text-xs">
                        <p>Angle: {hoveredDegree}°</p>
                        <p>Type: {hoveredDegree % 90 === 0 ? 'Cardinal (Strong)' : 'Ordinal (Fast)'}</p>
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-500 mt-2">عجلة جان التفاعلية (Cardinal vs Ordinal)</p>
        </div>
    );
};

// --- 3. VIBRATION CALCULATOR (NEW TOOL) ---
const GannCalculator: React.FC = () => {
    const [inputPrice, setInputPrice] = useState<string>('');
    const [results, setResults] = useState<{ deg360: number, deg180: number, deg90: number } | null>(null);

    const calculate = () => {
        const p = parseFloat(inputPrice);
        if (isNaN(p) || p <= 0) return;
        
        // Handle Zero Coins logic internally for calculator
        let factor = 1;
        let calcP = p;
        while (calcP < 10) { calcP *= 10; factor *= 10; }
        
        const root = Math.sqrt(calcP);
        const r360 = Math.pow(root + 2, 2) / factor;
        const r180 = Math.pow(root + 1, 2) / factor;
        const r90 = Math.pow(root + 0.5, 2) / factor;
        
        setResults({ deg360: r360, deg180: r180, deg90: r90 });
    };

    return (
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-xs">
            <div className="flex gap-2 mb-2">
                <input 
                    type="number" 
                    placeholder="أدخل قاع أو قمة..." 
                    className="bg-gray-800 border border-gray-600 rounded p-1 text-white flex-grow"
                    value={inputPrice}
                    onChange={(e) => setInputPrice(e.target.value)}
                />
                <button onClick={calculate} className="bg-cyan-600 text-white px-3 rounded hover:bg-cyan-500">احسب</button>
            </div>
            {results && (
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                    <div className="bg-gray-800 p-1 rounded"><p className="text-gray-400">90°</p><p className="text-yellow-400 font-mono">{results.deg90.toFixed(4)}</p></div>
                    <div className="bg-gray-800 p-1 rounded"><p className="text-gray-400">180°</p><p className="text-orange-400 font-mono">{results.deg180.toFixed(4)}</p></div>
                    <div className="bg-gray-800 p-1 rounded"><p className="text-gray-400">360°</p><p className="text-green-400 font-mono">{results.deg360.toFixed(4)}</p></div>
                </div>
            )}
        </div>
    );
};

// --- 4. AUTO SIGNALS CARD ---
const GannSignalCard: React.FC<{ levels: GannSquareLevel[], currentPrice: number }> = ({ levels, currentPrice }) => {
    // Find nearest level
    const sorted = [...levels].sort((a,b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice));
    const nearest = sorted[0];
    if (!nearest) return null;

    const distPct = Math.abs(currentPrice - nearest.price) / currentPrice * 100;
    const isTouching = distPct < 0.5; // within 0.5%

    let signal = "Hold";
    let color = "text-gray-400";
    
    if (isTouching) {
        if (nearest.type === 'Support') { signal = "BUY Signal"; color = "text-green-400"; }
        else { signal = "SELL Signal"; color = "text-red-400"; }
    }

    return (
        <div className={`p-3 rounded border ${isTouching ? 'bg-gray-800 border-yellow-500 animate-pulse' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">التوصية الآلية:</span>
                <span className={`font-bold ${color}`}>{signal}</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
                السعر قريب من زاوية {nearest.degree}° ({nearest.price.toFixed(4)}) بنسبة {distPct.toFixed(2)}%
            </p>
        </div>
    );
};

const VibrationMeter: React.FC<{ score: number }> = ({ score }) => (
    <div className="relative w-full h-2 bg-gray-700 rounded-full overflow-hidden my-2">
        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" style={{ width: `${Math.min(100, Math.max(0, score))}%` }}></div>
    </div>
);

// --- ASTRONOMICAL ANALYSIS MODULE ---
const AstroChart: React.FC<{ candles: Candle[], levels: PlanetaryPriceLevel[], settings: AstroSettings }> = ({ candles, levels, settings }) => {
    const [viewSize, setViewSize] = useState(100); // Default zoom level (number of candles)
    
    const width = 600;
    const height = 350;
    const padding = { top: 20, bottom: 30, left: 10, right: 60 }; // Increased right padding for Price Axis

    if (candles.length < 20) return null;

    // Zoom Handlers
    const handleZoomIn = () => setViewSize(prev => Math.max(20, prev - 10));
    const handleZoomOut = () => setViewSize(prev => Math.min(candles.length, prev + 10));

    // 1. Determine Visible Data
    const visibleCandles = candles.slice(-viewSize);
    const startIdx = candles.length - viewSize; // Absolute index relative to full history
    
    // 2. Determine Scales based on VISIBLE data
    const priceMax = Math.max(...visibleCandles.map(c => c.high));
    const priceMin = Math.min(...visibleCandles.map(c => c.low));
    
    // Filter active levels within view range + buffer
    const activeLevels = levels.filter(l => l.price >= priceMin * 0.9 && l.price <= priceMax * 1.1);
    const allPrices = [...visibleCandles.map(c => c.close), ...activeLevels.map(l => l.price)];
    
    const maxY = Math.max(...allPrices) * 1.01;
    const minY = Math.min(...allPrices) * 0.99;
    const rangeY = maxY - minY;
    
    // Scale Functions
    const scaleX = (idx: number) => padding.left + (idx / (visibleCandles.length - 1)) * (width - padding.left - padding.right);
    const scaleY = (price: number) => (height - padding.bottom) - ((price - minY) / rangeY) * (height - padding.top - padding.bottom);

    // 3. Render Candles
    const candlePath = visibleCandles.map((c, i) => {
        const x = scaleX(i);
        const yOpen = scaleY(c.open);
        const yClose = scaleY(c.close);
        const yHigh = scaleY(c.high);
        const yLow = scaleY(c.low);
        const color = c.close >= c.open ? '#4ade80' : '#f87171';
        return (
            <g key={i}>
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1" opacity="0.6" />
                <rect x={x-1} y={Math.min(yOpen, yClose)} width="2" height={Math.max(1, Math.abs(yClose-yOpen))} fill={color} opacity="0.6" />
            </g>
        );
    });

    // 4. Render Planetary Waves
    // The wave function must use the absolute index `startIdx + i` to maintain phase coherence when scrolling/zooming
    const generateWave = (basePrice: number) => {
        let path = `M ${scaleX(0)} ${scaleY(basePrice + settings.waveAmplitude * Math.sin((startIdx) * settings.waveFrequency))} `;
        
        for (let i = 1; i < visibleCandles.length; i++) {
            const absoluteIndex = startIdx + i;
            const x = scaleX(i);
            const y = scaleY(basePrice + settings.waveAmplitude * Math.sin(absoluteIndex * settings.waveFrequency));
            path += `L ${x} ${y} `;
        }
        return path;
    };

    // 5. Generate Axes Data
    const priceTicks = 5;
    const priceStep = rangeY / priceTicks;
    const yAxisLabels = Array.from({length: priceTicks + 1}, (_, i) => {
        const val = minY + i * priceStep;
        return { y: scaleY(val), text: val.toFixed(2) };
    });

    const timeTicks = 6;
    const timeStep = Math.floor(visibleCandles.length / timeTicks);
    const xAxisLabels = Array.from({length: timeTicks}, (_, i) => {
        const idx = i * timeStep;
        if (idx >= visibleCandles.length) return null;
        const date = new Date(visibleCandles[idx].timestamp);
        const dateStr = `${date.getDate()}/${date.getMonth()+1}`;
        return { x: scaleX(idx), text: dateStr };
    }).filter(Boolean) as {x: number, text: string}[];

    return (
        <div className="relative w-full h-full bg-gray-900 rounded-lg border border-gray-800">
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 z-10 flex gap-1">
                <button onClick={handleZoomOut} className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white w-6 h-6 rounded flex items-center justify-center text-xs">-</button>
                <button onClick={handleZoomIn} className="bg-gray-800 border border-gray-600 text-gray-300 hover:text-white w-6 h-6 rounded flex items-center justify-center text-xs">+</button>
                <div className="bg-black/50 px-2 rounded text-[10px] text-gray-400 flex items-center">{viewSize} Candles</div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                <defs>
                    <clipPath id="chartClip">
                        <rect x={padding.left} y={padding.top} width={width - padding.left - padding.right} height={height - padding.top - padding.bottom} />
                    </clipPath>
                </defs>

                {/* Grid & Y-Axis Labels */}
                {yAxisLabels.map((tick, i) => (
                    <g key={i}>
                        <line x1={padding.left} y1={tick.y} x2={width - padding.right} y2={tick.y} stroke="#374151" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                        <text x={width - padding.right + 5} y={tick.y + 3} fill="#6b7280" fontSize="9" fontFamily="monospace">{tick.text}</text>
                    </g>
                ))}

                {/* X-Axis Labels */}
                {xAxisLabels.map((tick, i) => (
                    <g key={i}>
                        <line x1={tick.x} y1={height - padding.bottom} x2={tick.x} y2={height - padding.bottom + 5} stroke="#374151" strokeWidth="1" />
                        <text x={tick.x} y={height - padding.bottom + 12} fill="#6b7280" fontSize="9" textAnchor="middle">{tick.text}</text>
                    </g>
                ))}

                {/* Chart Area (Clipped) */}
                <g clipPath="url(#chartClip)">
                    {/* Planetary Wavy Lines */}
                    {activeLevels.map((lvl, i) => (
                        <g key={`${lvl.planetName}-${i}`}>
                            <path d={generateWave(lvl.price)} stroke={lvl.color} strokeWidth="1.5" fill="none" opacity="0.8" />
                            <text x={width - padding.right - 10} y={scaleY(lvl.price) - 5} fill={lvl.color} fontSize="9" fontWeight="bold" textAnchor="end">
                                {lvl.symbol} {lvl.harmonicLabel || ''}
                            </text>
                        </g>
                    ))}

                    {/* Candles */}
                    {candlePath}
                </g>
            </svg>
        </div>
    );
};

const AstroAnalysisModule: React.FC<{ candles: Candle[], initialAnalysis: GannAnalysis, pair: string }> = ({ candles, initialAnalysis, pair }) => {
    // State for Astro Settings
    const [settings, setSettings] = useState<AstroSettings>({
        coordinateSystem: 'Geocentric',
        zodiacSystem: 'Tropical',
        waveAmplitude: (initialAnalysis.astroModule?.recommendedScale || 1) * 0.05, // Default rough amplitude
        waveFrequency: 0.2,
        scale: initialAnalysis.astroModule?.recommendedScale || 1,
        showHarmonics: false,
        selectedPlanets: ['Sun', 'Mars', 'Jupiter', 'Saturn'] // Defaults
    });

    const [localAnalysis, setLocalAnalysis] = useState(initialAnalysis);

    // Re-run analysis when settings change locally
    useEffect(() => {
        const updated = analyzeGann(candles, pair, settings);
        setLocalAnalysis(updated);
    }, [settings, candles, pair]);

    const handlePlanetToggle = (planet: string) => {
        setSettings(prev => {
            const selected = prev.selectedPlanets.includes(planet) 
                ? prev.selectedPlanets.filter(p => p !== planet)
                : [...prev.selectedPlanets, planet];
            return { ...prev, selectedPlanets: selected };
        });
    };

    if (!localAnalysis.astroModule) return <div>Loading Astro Module...</div>;

    const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Controls */}
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 space-y-4 text-xs">
                <h4 className="font-bold text-white border-b border-gray-700 pb-2">إعدادات الرصد الفلكي</h4>
                
                {/* Coordinate Systems */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">النظام الإحداثي:</span>
                        <div className="flex gap-1">
                            <button onClick={() => setSettings({...settings, coordinateSystem: 'Geocentric'})} className={`px-2 py-1 rounded ${settings.coordinateSystem === 'Geocentric' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Geo</button>
                            <button onClick={() => setSettings({...settings, coordinateSystem: 'Heliocentric'})} className={`px-2 py-1 rounded ${settings.coordinateSystem === 'Heliocentric' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Helio</button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">دائرة البروج:</span>
                        <div className="flex gap-1">
                            <button onClick={() => setSettings({...settings, zodiacSystem: 'Tropical'})} className={`px-2 py-1 rounded ${settings.zodiacSystem === 'Tropical' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Tropical</button>
                            <button onClick={() => setSettings({...settings, zodiacSystem: 'Sidereal'})} className={`px-2 py-1 rounded ${settings.zodiacSystem === 'Sidereal' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Sidereal</button>
                        </div>
                    </div>
                </div>

                {/* Planet Selection */}
                <div>
                    <p className="text-gray-400 mb-1">الكواكب النشطة:</p>
                    <div className="flex flex-wrap gap-1">
                        {planets.map(p => (
                            <button 
                                key={p} 
                                onClick={() => handlePlanetToggle(p)}
                                className={`px-2 py-0.5 rounded border ${settings.selectedPlanets.includes(p) ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-gray-700 border-gray-600 text-gray-500'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wave Controls */}
                <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-400">Scale Factor:</span> <span className="text-white">{settings.scale.toFixed(4)}</span></div>
                    <input type="range" min={0.0001} max={settings.scale * 3} step={0.0001} value={settings.scale} onChange={(e) => setSettings({...settings, scale: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                    
                    <div className="flex justify-between"><span className="text-gray-400">Wave Amplitude:</span> <span className="text-white">{settings.waveAmplitude.toFixed(2)}</span></div>
                    <input type="range" min="0" max="50" step="0.1" value={settings.waveAmplitude} onChange={(e) => setSettings({...settings, waveAmplitude: parseFloat(e.target.value)})} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={settings.showHarmonics} onChange={(e) => setSettings({...settings, showHarmonics: e.target.checked})} />
                    <span className="text-gray-300">إظهار التوافقيات (Harmonics)</span>
                </div>
            </div>

            {/* Right: Chart */}
            <div className="lg:col-span-2 h-80">
                <AstroChart candles={candles} levels={localAnalysis.astroModule.levels} settings={settings} />
            </div>
        </div>
    );
};

const GannAnalysisView: React.FC<Props> = ({ analysis, candles, pair, pairMarketData }) => {
    const [activeTab, setActiveTab] = useState<'Geometry' | 'Time' | 'Cosmic' | 'Tools' | 'AstroLab'>('Geometry');

    if (!analysis || !analysis.gannFans) return null;

    const { 
        squareOf9Levels, squareOf144Levels, hexagonLevels,
        timeCycles, squaringPoints, planetaryLines, lawOfVibrationScore,
        planetaryWheel, squaringResults, squareTheCircle,
        swings, anniversaryDates, rangeDivisions, circleOf24, zeroAngles, gannGrid, masterCycleEvents,
        gannFans, unitScale
    } = analysis;

    const currentPrice = candles[candles.length - 1].close;

    const renderGeometryTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Interactive Master Wheel */}
            <ToolCard title="1. عجلة جان الرئيسية (Master Wheel)" icon="🎡" className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <InteractiveGannWheel currentPrice={currentPrice} levels={squareOf9Levels} />
                    <div className="space-y-4">
                        <GannSignalCard levels={squareOf9Levels} currentPrice={currentPrice} />
                        <GannCalculator />
                        <div className="bg-gray-900 p-3 rounded border border-gray-700">
                            <p className="text-xs text-gray-400 mb-2">أهم المستويات الحالية (Heatmap):</p>
                            <div className="flex flex-wrap gap-2">
                                {squareOf9Levels.slice(0, 6).map((l, i) => (
                                    <span key={i} className={`text-[10px] px-2 py-1 rounded border ${l.type==='Resistance' ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-green-900/20 border-green-500/30 text-green-300'}`}>
                                        {l.degree}° : {l.price.toFixed(l.price < 1 ? 5 : 2)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </ToolCard>

            {/* 2. Gann Fan Summary */}
            <ToolCard title="2. مروحة جان (Gann Fan)" icon="📐">
                <div className="space-y-2 text-xs">
                    <p className="text-gray-400">الزوايا النشطة حالياً:</p>
                    {gannFans.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex justify-between border-b border-gray-700/50 pb-1">
                            <span>{f.name} ({f.type})</span>
                            <span className={f.status === 'Support' ? 'text-green-400' : 'text-red-400'}>{f.value.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </ToolCard>

            {/* 3. Square of 144 (Pyramid) */}
            <ToolCard title="3. الهرم الأكبر (Square of 144)" icon="🔺">
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {squareOf144Levels.map((lvl, i) => (
                        <div key={i} className="flex justify-between text-xs bg-gray-900/30 p-1 rounded">
                            <span className="text-purple-300">{lvl.label}</span>
                            <span className="font-mono text-yellow-500">{lvl.price.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </ToolCard>

            {/* 4. Hexagon Chart */}
            <ToolCard title="4. الشكل السداسي (Hexagon)" icon="⬡">
                 <div className="grid grid-cols-3 gap-2 text-center">
                    {hexagonLevels.slice(0, 6).map((lvl, i) => (
                        <div key={i} className="bg-gray-900 p-1 rounded border border-gray-800">
                            <p className="text-[10px] text-gray-500">{lvl.angle}°</p>
                            <p className={`text-xs font-bold ${lvl.type==='Resistance'?'text-red-400':'text-green-400'}`}>{lvl.price.toFixed(4)}</p>
                        </div>
                    ))}
                 </div>
            </ToolCard>

            {/* 5. Zero Angle */}
            <ToolCard title="5. زاوية الصفر (Zero Angle)" icon="🎯">
                <div className="space-y-1">
                    {zeroAngles.map((z, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-300">
                            <span>{z.label}</span>
                            <span className="font-mono text-cyan-glow">{z.price.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </ToolCard>
        </div>
    );

    const renderTimeTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 6. Squaring Price & Time */}
            <ToolCard title="6. تربيع السعر والزمن (Squaring)" icon="⚖️">
                <div className="flex flex-wrap gap-2">
                    {squaringPoints.slice(0, 6).map((p, i) => (
                        <span key={i} className="bg-green-900/30 text-green-400 border border-green-500/30 px-2 py-1 rounded text-[10px]">
                            Bar #{p.index}: {p.price.toFixed(2)}
                        </span>
                    ))}
                </div>
                {squaringResults && squaringResults.map((r, i) => (
                    <p key={i} className="text-[10px] text-yellow-500 mt-2">{r.description} (Remaining: {r.daysRemaining} bars)</p>
                ))}
            </ToolCard>

            {/* 7. Square The Circle (Time Targets) */}
            <ToolCard title="7. تربيع الدائرة (أهداف زمنية)" icon="⭕">
                 {squareTheCircle && squareTheCircle.slice(0, 4).map((lvl, i) => (
                    <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-gray-700/50">
                        <span className="text-white font-bold">{lvl.angle}° ({lvl.date})</span>
                        <span className="font-mono text-yellow-300">{lvl.price.toFixed(4)}</span>
                    </div>
                ))}
            </ToolCard>

            {/* 8. Anniversary Dates */}
            <ToolCard title="8. الدورات السنوية (Anniversary)" icon="📅">
                {anniversaryDates.length > 0 ? anniversaryDates.map((d, i) => (
                    <div key={i} className="mb-2 text-xs border-l-2 border-yellow-500 pl-2">
                        <span className="text-white font-bold">{d.date}</span>
                        <p className="text-gray-400">{d.description}</p>
                    </div>
                )) : <p className="text-xs text-gray-500">لا توجد تواريخ موسمية قريبة.</p>}
            </ToolCard>

            {/* 9. Circle of 24 */}
            <ToolCard title="9. دائرة الـ 24 (اليومي)" icon="🕒">
                <div className="grid grid-cols-4 gap-1">
                    {circleOf24.map((c, i) => (
                        <div key={i} className={`text-center text-[10px] p-1 rounded ${c.isActive ? 'bg-cyan-600 text-white font-bold' : 'bg-gray-900 text-gray-500'}`}>
                            {c.hour}:00
                        </div>
                    ))}
                </div>
            </ToolCard>
        </div>
    );

    const renderToolsTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 10. Range Division */}
            <ToolCard title="10. قاعدة الـ 50% (Range Division)" icon="➗">
                <div className="space-y-1">
                    {rangeDivisions.map((r, i) => (
                        <div key={i} className={`flex justify-between text-xs p-1 rounded ${r.type === 'Equilibrium' ? 'bg-yellow-900/20 border border-yellow-500/30' : ''}`}>
                            <span className="text-gray-400">{r.label}</span>
                            <span className={`font-mono font-bold ${r.type === 'Equilibrium' ? 'text-yellow-400' : 'text-white'}`}>{r.price.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </ToolCard>

            {/* 11. Swing Charts */}
            <ToolCard title="11. شارتات التأرجح (Swing)" icon="〰️">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">الاتجاه الميكانيكي:</span>
                    <span className={`font-bold ${swings[swings.length-1]?.type === 'Up' ? 'text-green-400' : 'text-red-400'}`}>
                        {swings[swings.length-1]?.type || 'N/A'}
                    </span>
                </div>
                <div className="mt-2 h-1 bg-gray-700 rounded overflow-hidden">
                    {swings.slice(-10).map((s, i) => (
                        <div key={i} className={`inline-block h-full ${s.type === 'Up' ? 'bg-green-500' : 'bg-red-500'}`} style={{width: '10%'}}></div>
                    ))}
                </div>
            </ToolCard>

            {/* 12. Gann Grid - NEW INTERACTIVE CHART */}
            <ToolCard title="12. شبكة جان (Gann Grid - K-Web)" icon="🕸️" className="md:col-span-2">
                <GannGridChart candles={candles} gridLines={gannGrid} unitScale={unitScale} />
            </ToolCard>
        </div>
    );

    const renderCosmicTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 13. Law of Vibration */}
            <ToolCard title="13. قانون الاهتزاز (Law of Vibration)" icon="📡">
                <VibrationMeter score={lawOfVibrationScore} />
                <p className="text-center text-xs font-bold text-white">{lawOfVibrationScore.toFixed(2)} / 100</p>
            </ToolCard>

            {/* 14. Planetary Lines */}
            <ToolCard title="14. خطوط الكواكب المالية" icon="🪐">
                <div className="space-y-1 text-xs">
                    {planetaryLines.slice(0, 4).map((l, i) => (
                        <div key={i} className="flex justify-between">
                            <span className="text-gray-400">{l.planet} {l.angle}°</span>
                            <span className={l.type === 'Resistance' ? 'text-red-400' : 'text-green-400'}>{l.price.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </ToolCard>

            {/* 15. Financial Astrologer */}
            <div className="md:col-span-2">
                {planetaryWheel && <FinancialAstrologer pair={pair} planetaryWheel={planetaryWheel} />}
            </div>
        </div>
    );

    const renderAstroLabTab = () => (
        <div className="grid grid-cols-1">
            <ToolCard title="16. مختبر التحليل الفلكي المتقدم (Astro Lab)" icon="🔭" className="w-full">
                <AstroAnalysisModule candles={candles} initialAnalysis={analysis} pair={pair} />
            </ToolCard>
        </div>
    );

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 flex items-center gap-2">
                    <span className="text-2xl">📐</span> مدرسة جان وفيثاغورس (16 أداة)
                </h3>
                {analysis.isSmartScale && <span className="text-[10px] bg-blue-900 text-blue-300 px-2 py-1 rounded">Smart Scale Active</span>}
            </div>

            <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg overflow-x-auto">
                {[
                    { id: 'Geometry', label: '1. الهندسة', icon: '💠' },
                    { id: 'Time', label: '2. الزمن', icon: '⏳' },
                    { id: 'Tools', label: '3. السعر', icon: '🧰' },
                    { id: 'Cosmic', label: '4. الفلك', icon: '🌌' },
                    { id: 'AstroLab', label: '5. المختبر الفلكي', icon: '🔭' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                            activeTab === tab.id ? 'bg-gray-700 text-yellow-400 shadow-md' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'Geometry' && renderGeometryTab()}
                {activeTab === 'Time' && renderTimeTab()}
                {activeTab === 'Tools' && renderToolsTab()}
                {activeTab === 'Cosmic' && renderCosmicTab()}
                {activeTab === 'AstroLab' && renderAstroLabTab()}
                
                <GannDeepAIAnalysis pairMarketData={pairMarketData} />
            </div>
        </div>
    );
};

export default GannAnalysisView;
