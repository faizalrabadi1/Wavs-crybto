import React from 'react';
import type { ShortSqueezeAnalysis } from '../types';

interface Props {
    analysis: ShortSqueezeAnalysis;
}

const InfoCard: React.FC<{ title: string; value: string; description: string; colorClass?: string }> = ({ title, value, description, colorClass = "text-orange-400" }) => (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700" title={description}>
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-2xl font-mono font-bold ${colorClass}`}>{value}</p>
    </div>
);

const ShortSqueezeAnalysisView: React.FC<Props> = ({ analysis }) => {
    if (!analysis) return null;

    const { summary, squeezePressure, shortInterestIndex, costToBorrow, daysToCover, fundingRate } = analysis;
    const pressureColor = squeezePressure > 85 ? 'text-red-500' : squeezePressure > 65 ? 'text-orange-500' : 'text-yellow-500';

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" transform="rotate(-90 12 12)" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7 7 7" />
                </svg>
                <span>تحليل Short Squeeze</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                    <h4 className="font-semibold text-white mb-2">مستوى الضغط الحالي</h4>
                    <p className={`text-6xl font-bold font-mono ${pressureColor}`}>{Math.round(squeezePressure)}<span className="text-3xl">%</span></p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                     <h4 className="font-semibold text-white mb-2">الخلاصة</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{summary}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-center">
                <InfoCard 
                    title="الفائدة المفتوحة"
                    value={`${shortInterestIndex.toFixed(1)}%`}
                    description="النسبة المئوية المحاكاة للأسهم المعروضة للبيع على المكشوف."
                />
                 <InfoCard 
                    title="أيام التغطية"
                    value={daysToCover.toFixed(2)}
                    description="عدد الأيام اللازمة للبائعين لإغلاق مراكزهم بناءً على متوسط الحجم."
                />
                 <InfoCard 
                    title="تكلفة الاقتراض"
                    value={`${costToBorrow.toFixed(2)}%`}
                    description="الرسوم السنوية المحاكاة للحفاظ على المراكز البيعية."
                />
                 <InfoCard 
                    title="معدل التمويل"
                    value={`${fundingRate.toFixed(4)}%`}
                    description="المدفوعات الدورية. قيمة سالبة تعني أن البائعين يدفعون للمشترين."
                    colorClass={fundingRate < 0 ? "text-orange-400" : "text-green-400"}
                />
            </div>
        </div>
    );
};

export default ShortSqueezeAnalysisView;