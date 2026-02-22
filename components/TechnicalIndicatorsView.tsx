import React from 'react';
import type { AnalysisResult } from '../types';

interface Props {
    analysis: AnalysisResult;
    currentPrice: number;
}

const RSIGauge: React.FC<{ value: number }> = ({ value }) => {
    const getRsiStatus = (rsi: number) => {
        if (rsi > 70) return { label: 'تشبع شرائي', color: 'bg-red-500', textColor: 'text-red-300' };
        if (rsi < 30) return { label: 'تشبع بيعي', color: 'bg-green-500', textColor: 'text-green-300' };
        return { label: 'محايد', color: 'bg-yellow-500', textColor: 'text-yellow-300' };
    };
    const status = getRsiStatus(value);

    return (
        <div>
            <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-400">0</span>
                <span className={status.textColor}>{status.label}</span>
                <span className="text-gray-400">100</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5 relative">
                <div className="absolute top-0 left-0 h-full bg-green-500/30 rounded-l-full" style={{ width: '30%' }}></div>
                <div className="absolute top-0 left-[70%] h-full bg-red-500/30 rounded-r-full" style={{ width: '30%' }}></div>
                <div className={`h-2.5 rounded-full absolute top-0`} style={{ left: `${Math.max(0, value - 2)}%`, width: '4%', backgroundColor: '#fff' }}></div>
            </div>
        </div>
    );
};


const TechnicalIndicatorsView: React.FC<Props> = ({ analysis, currentPrice }) => {
    const { rsi, macdHistogram, bollingerBands } = analysis;

    if (rsi === undefined || macdHistogram === undefined || bollingerBands === undefined) {
        return null;
    }

    const getPricePositionInBands = () => {
        if (!bollingerBands || bollingerBands.upper === bollingerBands.lower) return { position: 50, label: 'في المنتصف' };
        if (currentPrice > bollingerBands.upper) return { position: 100, label: 'فوق النطاق العلوي' };
        if (currentPrice < bollingerBands.lower) return { position: 0, label: 'تحت النطاق السفلي' };
        const position = ((currentPrice - bollingerBands.lower) / (bollingerBands.upper - bollingerBands.lower)) * 100;
        return { position, label: 'داخل النطاقات' };
    };
    
    const pricePosition = getPricePositionInBands();

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span>المؤشرات الفنية</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* RSI */}
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <h4 className="text-base font-semibold text-gray-300">مؤشر القوة النسبية (RSI)</h4>
                        <span className="font-mono font-bold text-lg text-cyan-glow">{rsi.toFixed(2)}</span>
                    </div>
                    <RSIGauge value={rsi} />
                </div>
                
                {/* MACD Histogram */}
                <div className="space-y-2">
                    <h4 className="text-base font-semibold text-gray-300">مؤشر MACD (الهيستوجرام)</h4>
                    <div className={`p-3 rounded-md text-center ${macdHistogram > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <p className={`font-mono font-bold text-2xl ${macdHistogram > 0 ? 'text-green-300' : 'text-red-300'}`}>{macdHistogram.toFixed(4)}</p>
                        <p className={`text-xs ${macdHistogram > 0 ? 'text-green-400' : 'text-red-400'}`}>{macdHistogram > 0 ? 'زخم شرائي' : 'زخم بيعي'}</p>
                    </div>
                </div>

                {/* Bollinger Bands */}
                <div className="space-y-2">
                    <h4 className="text-base font-semibold text-gray-300">نطاقات بولينجر (BB)</h4>
                    <div className="font-mono text-xs space-y-1 text-gray-400">
                        <div className="flex justify-between"><span>النطاق العلوي:</span><span className="text-gray-300">{bollingerBands.upper.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span>المتوسط:</span><span className="text-gray-300">{bollingerBands.middle.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span>النطاق السفلي:</span><span className="text-gray-300">{bollingerBands.lower.toFixed(4)}</span></div>
                    </div>
                    <div className="pt-2">
                         <div className="w-full bg-gray-700 rounded-full h-1.5 relative">
                           <div className="absolute top-0 h-full bg-cyan-glow/50 rounded-full" style={{ left: `${Math.max(0, pricePosition.position - 1)}%`, width: '2%' }}>
                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-cyan-glow whitespace-nowrap">السعر الحالي</span>
                           </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TechnicalIndicatorsView;
