import React, { useState } from 'react';
import type { WyckoffAnalysis, Candle } from '../types';

interface Props {
    analysis: WyckoffAnalysis;
    candles: Candle[];
    pair: string;
}

const WyckoffAnalysisView: React.FC<Props> = ({ analysis, candles }) => {
    const [showSchematic, setShowSchematic] = useState(false);
    const [hoveredEvent, setHoveredEvent] = useState<{ event: string, description: string } | null>(null);

    if (analysis.schematic === 'None' || !analysis.tradingRange) {
        return null;
    }

    const { summary, schematic, phase, events, tradingRange, vsaSummary, implication, tradeSetup, pointAndFigureTarget, effortVsResult, phaseChecklist } = analysis;

    // --- Charting Logic ---
    const SVG_WIDTH = 500;
    const SVG_HEIGHT = 280;
    const PADDING = { top: 20, right: 10, bottom: 40, left: 10 };

    const chartCandleSlice = candles.slice(-200);
    const allPrices = [
        ...chartCandleSlice.map(c => c.close),
        tradingRange.top, tradingRange.bottom,
        ...(tradeSetup ? [tradeSetup.entry, tradeSetup.stopLoss, ...tradeSetup.targets.map(t => t.price)] : [])
    ];
    const minPrice = Math.min(...allPrices) * 0.98;
    const maxPrice = Math.max(...allPrices) * 1.02;
    const priceRange = maxPrice - minPrice;
    const indexRange = chartCandleSlice.length;

    const scaleX = (index: number) => PADDING.left + (index / indexRange) * (SVG_WIDTH - PADDING.left * 2);
    const scaleY = (price: number) => (SVG_HEIGHT - PADDING.bottom) - ((price - minPrice) / priceRange) * (SVG_HEIGHT - PADDING.top - PADDING.bottom);

    const pricePathData = chartCandleSlice.map((c, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)} ${scaleY(c.close)}`).join(' ');
    
    const eventDescriptions: { [key: string]: string } = {
        'PS': 'Preliminary Support - دعم أولي',
        'SC': 'Selling Climax - ذروة البيع',
        'AR': 'Automatic Rally - صعود تلقائي',
        'ST': 'Secondary Test - اختبار ثانوي',
        'Spring': 'Spring - كسر كاذب للدعم',
        'Test': 'Test - اختبار للكسر',
        'SOS': 'Sign of Strength - علامة قوة',
        'LPS': 'Last Point of Support - آخر نقطة دعم',
        'BU': 'Back-up - إعادة اختبار',
    };
    
    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m16-10v10M4 12h16" /></svg>
                <span>تحليل وايكوف المتقدم (Wyckoff)</span>
            </h3>
            
            <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 mb-4">{summary}</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Chart and info */}
                <div className="relative">
                     <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto bg-gray-800/50 rounded-md border border-gray-700">
                        {/* Trading Range */}
                        <rect x={PADDING.left} y={scaleY(tradingRange.top)} width={SVG_WIDTH - PADDING.left * 2} height={scaleY(tradingRange.bottom) - scaleY(tradingRange.top)} fill="#30363d" stroke="#4a5568" strokeWidth="0.5" />
                        <line x1={PADDING.left} y1={scaleY(tradingRange.top)} x2={SVG_WIDTH - PADDING.left} y2={scaleY(tradingRange.top)} stroke="#f87171" strokeWidth="1" strokeDasharray="3 3"/>
                        <line x1={PADDING.left} y1={scaleY(tradingRange.bottom)} x2={SVG_WIDTH - PADDING.left} y2={scaleY(tradingRange.bottom)} stroke="#4ade80" strokeWidth="1" strokeDasharray="3 3"/>
                        
                        {/* Price Path */}
                        <path d={pricePathData} stroke="#a0aec0" strokeWidth="1" fill="none" />

                        {/* Events */}
                        <g fontSize="10" textAnchor="middle">
                        {events.map(({event, index, price}) => (
                            <g key={`${event}-${index}`} onMouseEnter={() => setHoveredEvent({ event, description: eventDescriptions[event] })} onMouseLeave={() => setHoveredEvent(null)}>
                                <circle cx={scaleX(index)} cy={scaleY(price)} r="3" fill="#ffc800" className="cursor-pointer" />
                                <text x={scaleX(index)} y={scaleY(price) - 8} fill="#ffc800">{event}</text>
                            </g>
                        ))}
                        </g>

                        {/* Schematic Overlay */}
                        {showSchematic && (
                             <path d={events.map((e,i) => `${i===0 ? 'M' : 'L'}${scaleX(e.index)} ${scaleY(e.price)}`).join(' ')}
                                  stroke="#00a9ff" strokeWidth="2" fill="none" strokeDasharray="4 2" opacity="0.7"
                             />
                        )}
                    </svg>
                     <div className="absolute top-2 right-2 flex space-x-2">
                         <button onClick={() => setShowSchematic(!showSchematic)} className="text-xs bg-gray-700/80 text-cyan-glow font-semibold py-1 px-3 rounded-md border border-gray-600 hover:bg-gray-700 hover:border-cyan-glow/50 transition-colors">
                            {showSchematic ? 'إخفاء' : 'عرض'} المخطط التعليمي
                         </button>
                         {hoveredEvent && <div className="text-xs bg-gray-900/80 text-white p-2 rounded-md">{hoveredEvent.description}</div>}
                    </div>
                </div>

                {/* Right side: Details */}
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-white mb-2">تتبع المراحل</h4>
                        <div className="flex justify-between items-center bg-gray-800 p-2 rounded-lg">
                            {['A', 'B', 'C', 'D', 'E'].map(p => (
                                <div key={p} className={`flex-1 text-center py-1 rounded-md transition-all ${phase === p ? 'bg-cyan-glow text-gray-900 font-bold' : 'text-gray-400'}`}>
                                    {p}
                                </div>
                            ))}
                        </div>
                    </div>

                    {phaseChecklist && (
                        <div>
                            <h4 className="font-semibold text-white mb-2">قائمة التحقق للمرحلة {phaseChecklist.phase}</h4>
                            <ul className="text-sm space-y-1 bg-gray-800 p-3 rounded-lg">
                                {phaseChecklist.checks.map((check, i) => (
                                    <li key={i} className={`flex items-center space-x-2 ${check.met ? 'text-gray-300' : 'text-gray-500'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${check.met ? 'text-green-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>{check.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {effortVsResult && (
                        <div>
                            <h4 className="font-semibold text-white mb-2">مقياس الجهد مقابل النتيجة</h4>
                             <div className="bg-gray-800 p-3 rounded-lg space-y-2">
                                <div className="text-xs flex justify-between items-center"><span className="text-gray-400">الجهد (الحجم)</span><span>{(effortVsResult.effort*100).toFixed(0)}%</span></div>
                                <div className="w-full bg-gray-700 h-3 rounded-full"><div className="bg-yellow-500 h-3 rounded-full" style={{width: `${effortVsResult.effort*100}%`}}></div></div>
                                <div className="text-xs flex justify-between items-center"><span className="text-gray-400">النتيجة (السعر)</span><span>{(effortVsResult.result*100).toFixed(0)}%</span></div>
                                <div className="w-full bg-gray-700 h-3 rounded-full"><div className="bg-cyan-glow h-3 rounded-full" style={{width: `${effortVsResult.result*100}%`}}></div></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

             <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-gray-800 p-3 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">ملخص تحليل الحجم (VSA)</h4>
                    <p className="text-sm text-gray-400">{vsaSummary}</p>
                 </div>
                 {pointAndFigureTarget && (
                     <div className="bg-gray-800 p-3 rounded-lg">
                        <h4 className="font-semibold text-white mb-2">الهدف السعري (Point & Figure)</h4>
                        <p className="text-sm text-gray-400">منطقة الهدف المتوقعة بناءً على "السبب" الذي تم بناؤه في نطاق التداول.</p>
                        <p className="text-center text-lg font-mono font-bold text-yellow-glow mt-2">
                             {pointAndFigureTarget.targetMin.toFixed(4)} - {pointAndFigureTarget.targetMax.toFixed(4)}
                        </p>
                     </div>
                 )}
             </div>

        </div>
    );
};

export default WyckoffAnalysisView;