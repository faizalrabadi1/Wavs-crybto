import React from 'react';
import type { CotAnalysis, TraderGroupPositions } from '../types';

interface Props {
    analysis: CotAnalysis;
}

const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
};

const SentimentMeter: React.FC<{ score: number }> = ({ score }) => {
    // Score is from -1 to 1. We map it to 0-100 for the meter.
    const percentage = (score + 1) / 2 * 100;
    
    let colorClass = 'bg-yellow-400';
    let label = 'محايد';
    if (percentage > 65) { colorClass = 'bg-green-400'; label = 'متفائل'; }
    else if (percentage < 35) { colorClass = 'bg-red-400'; label = 'متشائم'; }

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>تشاؤمي للغاية</span>
                <span>{label}</span>
                <span>تفاؤلي للغاية</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 relative">
                <div 
                    className="absolute top-0 h-full w-1 bg-white rounded-full z-10 transition-all duration-500"
                    style={{ left: `calc(${percentage}% - 2px)` }}
                ></div>
            </div>
            <div className="w-full flex rounded-full h-3 -mt-3">
                <div className="h-full bg-gradient-to-r from-red-500 to-yellow-500 rounded-l-full" style={{width: '50%'}}></div>
                <div className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-r-full" style={{width: '50%'}}></div>
            </div>
        </div>
    );
};

const TraderGroupCard: React.FC<{ title: string; data: TraderGroupPositions; description: string }> = ({ title, data, description }) => {
    const isNetLong = data.net > 0;
    const netPositionPercentage = (data.long + data.short) > 0 ? (Math.abs(data.net) / (data.long + data.short)) * 100 : 0;
    
    return (
        <div className="bg-gray-800 p-3 rounded-lg border border-gray-700" title={description}>
            <h4 className="font-semibold text-white text-base">{title}</h4>
            <div className="my-2">
                <div className={`text-center font-mono font-bold text-2xl ${isNetLong ? 'text-green-400' : 'text-red-400'}`}>
                    {isNetLong ? '+' : ''}{formatNumber(data.net)}
                </div>
                <div className="text-center text-xs text-gray-400">
                    صافي العقود
                </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 flex">
                <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${(data.long / (data.long + data.short)) * 100}%`}}></div>
                <div className="bg-red-500 h-full rounded-r-full" style={{ width: `${(data.short / (data.long + data.short)) * 100}%`}}></div>
            </div>
             <div className="flex justify-between text-xs mt-1 font-mono">
                <span className="text-green-400">شراء: {formatNumber(data.long)}</span>
                <span className="text-red-400">بيع: {formatNumber(data.short)}</span>
            </div>
        </div>
    );
};


const CotAnalysisView: React.FC<Props> = ({ analysis }) => {
    if (!analysis) return null;
    
    const { summary, sentimentScore, largeSpeculators, commercials, smallSpeculators } = analysis;

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <span>تحليل التزام التجار (COT)</span>
            </h3>
            
            <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 mb-4">{summary}</p>
            
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-2 text-center">مؤشر معنويات كبار المضاربين</h4>
                <SentimentMeter score={sentimentScore} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TraderGroupCard 
                    title="كبار المضاربين"
                    data={largeSpeculators}
                    description="الصناديق الكبيرة والمؤسسات التي تراهن على اتجاه السوق."
                />
                <TraderGroupCard 
                    title="التجاريون (المحوطون)"
                    data={commercials}
                    description="الشركات التي تستخدم السوق للتحوط من مخاطر الأسعار الحقيقية، وغالباً ما تتخذ مراكز عكس الاتجاه."
                />
                <TraderGroupCard 
                    title="صغار المضاربين"
                    data={smallSpeculators}
                    description="المتداولون الأفراد (التجزئة)."
                />
            </div>
        </div>
    );
};

export default CotAnalysisView;