
import React from 'react';
import type { FractalAnalysisResult, CurrencyData } from '../types';
import SimpleLineChart from './LineChart';

interface Props {
    initialAnalysis: FractalAnalysisResult;
    pairData: CurrencyData;
    initialTimeframe: string;
}

const Gauge: React.FC<{ value: number; min: number; max: number; label: string; unit: string; description?: string; colorScale?: boolean }> = ({ value, min, max, label, unit, description, colorScale = false }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const rotation = (Math.min(100, Math.max(0, percentage)) / 100) * 180 - 90;
    
    let colorClass = 'text-yellow-400';
    if (colorScale) {
        if (value > max * 0.7) colorClass = 'text-green-400';
        else if (value < min + (max-min)*0.3) colorClass = 'text-red-400';
    }

    return (
        <div className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded-lg border border-gray-700 h-full">
            <div className="relative w-24 h-12 overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-700 rounded-t-full border-b-0"></div>
                 <div className={`absolute top-0 left-0 w-full h-full rounded-t-full border-b-0 origin-bottom transition-transform duration-500`}
                    style={{ transform: `rotate(${rotation}deg)` }}>
                     <div className={`absolute bottom-0 left-1/2 -ml-1 w-2 h-12 bg-cyan-glow rounded-full shadow-lg shadow-cyan-glow/50`}></div>
                 </div>
            </div>
            <p className="mt-2 text-xs text-gray-400 text-center">{label}</p>
            <p className={`text-base font-bold font-mono ${colorClass}`}>{value.toFixed(2)} <span className="text-[10px]">{unit}</span></p>
            {description && <p className="text-[9px] text-gray-500 mt-1">{description}</p>}
        </div>
    );
};

// --- Phase Space Plot ---
const PhaseSpacePlot: React.FC<{ data: number[], attractorType?: string }> = ({ data, attractorType }) => {
    const points = [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const normalize = (v: number) => ((v - min) / range) * 100;
    
    for (let i = 1; i < data.length; i++) {
        points.push({ x: normalize(data[i-1]), y: normalize(data[i]) });
    }
    
    return (
        <div className="relative w-full h-40 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center">
            <div className="absolute top-2 left-2 text-[9px] text-gray-500 font-mono z-10">PHASE SPACE</div>
            <div className="absolute bottom-2 right-2 text-[10px] font-bold text-purple-400 z-10 bg-gray-900/80 px-2 rounded">{attractorType || 'Analyzing...'}</div>
             <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <line x1="0" y1="0" x2="100" y2="100" stroke="#374151" strokeWidth="0.5" strokeDasharray="2 2" />
                <path d={points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${100-p.y}`).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="0.5" opacity="0.6" />
                {points.slice(-30).map((p, i) => (
                    <circle key={i} cx={p.x} cy={100-p.y} r={i === points.length-31 ? 1.5 : 0.6} fill={i === points.length-31 ? '#facc15' : '#22d3ee'} opacity={i/30} />
                ))}
             </svg>
        </div>
    )
}

// --- Holder Exponent (Roughness) Chart ---
const RoughnessChart: React.FC<{ data: number[] }> = ({ data }) => {
    if (!data || data.length === 0) return null;
    const formattedData = data.map((val, i) => ({ time: i, value: val }));
    
    return (
        <div className="w-full h-24 bg-gray-800 rounded-lg border border-gray-700 p-2 relative">
            <p className="text-[9px] text-gray-400 absolute top-1 left-2">مؤشر الخشونة اللحظية (Holder)</p>
            <SimpleLineChart 
                data={formattedData} 
                lines={[{ key: 'value', color: '#f87171', strokeWidth: 1 }]} 
                xAxisKey="time"
                domain={[0, 1]}
            />
        </div>
    );
};

const FractalAnalysisView: React.FC<Props> = ({ initialAnalysis: analysis, pairData, initialTimeframe }) => {
    
    const { 
        summary, hurstExponent, predictionFan, chaosMetrics, 
        fractalEfficiency, holderExponent, fractalPivots, 
        multifractalSpectrumWidth, memoryScore 
    } = analysis;
    
    const candles = pairData.candles[initialTimeframe] || [];
    const closePrices = candles.map(c => c.close);

    // Prepare "Fan" Chart Data
    const fanChartData = React.useMemo(() => {
        if (!predictionFan || predictionFan.length === 0 || candles.length === 0) return null;
        
        const lookback = 40; 
        const currentSegment = candles.slice(-lookback).map((c, i) => ({ time: i, price: c.close }));
        const lastPrice = currentSegment[currentSegment.length-1].price;
        
        const chartData: any[] = [...currentSegment];
        
        // Create projection points
        const projectionLen = predictionFan[0].projection.length;
        for(let i=0; i<projectionLen; i++) {
            const point: any = { time: lookback + i };
            predictionFan.forEach((match, idx) => {
                // Only show top 3
                if (idx < 3) {
                    point[`proj_${idx}`] = lastPrice * match.projection[i];
                }
            });
            chartData.push(point);
        }
        return chartData;
    }, [predictionFan, candles]);

    const fanLines = predictionFan ? predictionFan.slice(0,3).map((m, i) => ({
        key: `proj_${i}`,
        name: m.type === 'Optimistic' ? 'مسار متفائل' : m.type === 'Pessimistic' ? 'مسار متشائم' : 'مسار محايد',
        color: m.type === 'Optimistic' ? '#4ade80' : m.type === 'Pessimistic' ? '#f87171' : '#facc15',
        strokeWidth: 2,
        dashArray: '4 2'
    })) : [];
    
    // Add current price line
    fanLines.unshift({ key: 'price', name: 'السعر الحالي', color: '#22d3ee', strokeWidth: 2, dashArray: '' });

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    <span>التحليل الفركتالي المتقدم (Advanced Fractal Engine)</span>
                </h3>
                {memoryScore !== undefined && (
                    <div className="bg-purple-900/30 border border-purple-500/30 px-3 py-1 rounded-full">
                        <span className="text-xs text-purple-300">ذاكرة السوق: <span className="font-bold text-white">{memoryScore.toFixed(0)}%</span></span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Gauge value={hurstExponent} min={0} max={1} label="معامل هيرست" unit="H" description={hurstExponent > 0.5 ? "اتجاهي (Persistent)" : "ارتدادي (Mean Revert)"} />
                <Gauge value={fractalEfficiency || 0.5} min={0} max={1} label="كفاءة الفركتال (FER)" unit="" colorScale description="1.0 = خط مستقيم" />
                <Gauge value={multifractalSpectrumWidth || 0} min={0} max={0.5} label="طيف التعدد (Risk)" unit="α" description="واسع = خطر عالي" />
                <div className="bg-gray-800 p-2 rounded-lg border border-gray-700 flex flex-col justify-center">
                     <p className="text-xs text-gray-400 mb-1 text-center">نقاط الارتكاز الفركتالية</p>
                     <div className="space-y-1">
                        {fractalPivots && fractalPivots.length > 0 ? fractalPivots.slice(0, 3).map((p, i) => (
                            <div key={i} className="flex justify-between text-[10px]">
                                <span className={p.type === 'Resistance' ? 'text-red-400' : 'text-green-400'}>{p.type === 'Resistance' ? 'R' : 'S'}</span>
                                <span className="font-mono text-white">{p.price.toFixed(4)}</span>
                            </div>
                        )) : <span className="text-[10px] text-gray-500 text-center block">لا توجد نقاط قوية</span>}
                     </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2 space-y-3">
                    <p className="text-sm text-cyan-glow bg-gray-800/50 p-2 rounded border border-gray-700/50 leading-relaxed">{summary}</p>
                    
                     {predictionFan && predictionFan.length > 0 ? (
                        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 relative">
                            <div className="absolute top-2 left-2 z-10 flex gap-2">
                                 <span className="text-[10px] bg-black/50 text-white px-1 rounded">مروحة الاحتمالات</span>
                            </div>
                            <div className="h-48 w-full">
                                {fanChartData && (
                                    <SimpleLineChart
                                        data={fanChartData}
                                        xAxisKey="time"
                                        lines={fanLines}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center bg-gray-800 rounded border border-gray-700 border-dashed">
                            <p className="text-gray-500 text-sm">لا يوجد نمط تاريخي مطابق بنسبة ثقة عالية.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {/* Phase Space */}
                    <PhaseSpacePlot data={closePrices.slice(-60)} attractorType={chaosMetrics?.attractorType} />
                    
                    {/* Holder Roughness */}
                    {holderExponent && <RoughnessChart data={holderExponent.slice(-30)} />}
                    
                    {/* Chaos Stats */}
                    <div className="bg-gray-800 p-2 rounded border border-gray-700 text-[10px] space-y-1 font-mono">
                        <div className="flex justify-between"><span className="text-gray-400">Lyapunov Exp:</span> <span className={chaosMetrics?.lyapunovExponent! > 0 ? 'text-red-400' : 'text-green-400'}>{chaosMetrics?.lyapunovExponent.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Entropy:</span> <span className="text-white">{chaosMetrics?.entropy.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Dimension:</span> <span className="text-white">{chaosMetrics?.dimension.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FractalAnalysisView;
