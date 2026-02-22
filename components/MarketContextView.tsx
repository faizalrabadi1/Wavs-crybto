import React from 'react';
import type { AnalysisResult } from '../types';

interface MarketContextViewProps {
    indicesAnalysis: {
        'BTC.D': AnalysisResult | undefined;
        'TOTAL2': AnalysisResult | undefined;
    }
}

const ContextItem: React.FC<{ title: string; analysis: AnalysisResult | undefined }> = ({ title, analysis }) => {
    if (!analysis) {
        return (
            <div className="bg-gray-800 p-3 rounded-md text-center">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-gray-500 mt-1">لا توجد بيانات</p>
            </div>
        );
    }
    
    const momentumColor = analysis.momentum > 0 ? 'text-green-400' : 'text-red-400';
    const implication = title === 'هيمنة البيتكوين' 
        ? (analysis.momentum > 0 ? 'سلبي للبديلات' : 'إيجابي للبديلات')
        : (analysis.momentum > 0 ? 'إيجابي للبديلات' : 'سلبي للبديلات');

    const implicationColor = implication.includes('إيجابي') ? 'text-green-400' : 'text-red-400';

    return (
        <div className="bg-gray-800 p-3 rounded-md text-center border border-gray-700">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-gray-400 mt-1">{analysis.state}</p>
            <div className="mt-2 text-xs font-mono flex justify-center items-baseline space-x-4">
                <div>
                    <span className="text-gray-500 block">الزخم</span>
                    <span className={momentumColor}>{analysis.momentum.toFixed(2)}%</span>
                </div>
                 <div>
                    <span className="text-gray-500 block">الدلالة</span>
                    <span className={implicationColor}>{implication}</span>
                </div>
            </div>
        </div>
    );
};

const MarketContextView: React.FC<MarketContextViewProps> = ({ indicesAnalysis }) => {
    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
             <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h1a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.5l.053.053m-.707.707l.053-.053M16.293 4.5l-.053.053m.707.707l-.053-.053M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>
                <span>سياق السوق العام</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ContextItem title="هيمنة البيتكوين" analysis={indicesAnalysis['BTC.D']} />
                <ContextItem title="سوق العملات البديلة" analysis={indicesAnalysis['TOTAL2']} />
            </div>
        </div>
    );
};

export default MarketContextView;
