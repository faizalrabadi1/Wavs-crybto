
import React from 'react';
import type { SeasonalityAnalysis, SeasonalMetric } from '../types';

interface Props {
    analysis: SeasonalityAnalysis;
}

const HeatmapCell: React.FC<{ metric: SeasonalMetric }> = ({ metric }) => {
    const { avgReturn, winRate } = metric;
    
    // Determine color intensity based on return
    // Max intensity around 1% return for hourly/daily
    let bgColor = 'bg-gray-800';
    let textColor = 'text-gray-300';
    
    if (avgReturn > 0) {
        const intensity = Math.min(1, avgReturn / 0.5); // Normalize
        const opacity = Math.max(0.2, intensity); // Min opacity 0.2
        bgColor = `rgba(74, 222, 128, ${opacity})`; // Green
        if (opacity > 0.6) textColor = 'text-gray-900 font-bold';
    } else if (avgReturn < 0) {
        const intensity = Math.min(1, Math.abs(avgReturn) / 0.5);
        const opacity = Math.max(0.2, intensity);
        bgColor = `rgba(248, 113, 113, ${opacity})`; // Red
        if (opacity > 0.6) textColor = 'text-gray-900 font-bold';
    }

    return (
        <div className={`flex flex-col items-center justify-center p-2 rounded text-xs ${textColor}`} style={{ backgroundColor: bgColor }}>
            <span className="font-mono">{metric.period}</span>
            <span>{avgReturn > 0 ? '+' : ''}{avgReturn.toFixed(2)}%</span>
            <span className="text-[9px] opacity-70">{winRate.toFixed(0)}% Win</span>
        </div>
    );
};

const WeatherWidget: React.FC = () => {
    // Simulated weather logic for demo - in real app would use `weather` prop
    const weatherState = Math.random() > 0.5 ? 'Sunny' : 'Cloudy'; 
    
    return (
        <div className="flex flex-col items-center justify-center bg-gray-800 p-3 rounded-lg border border-gray-700 w-full h-full">
             <div className="text-4xl mb-2">
                 {weatherState === 'Sunny' ? '☀️' : '☁️'}
             </div>
             <span className="text-xs font-bold text-white">{weatherState === 'Sunny' ? 'طقس مشمس' : 'طقس غائم'}</span>
             <span className="text-[10px] text-gray-400">{weatherState === 'Sunny' ? 'ظروف إيجابية' : 'تقلبات محتملة'}</span>
        </div>
    )
}

const SeasonalityView: React.FC<Props> = ({ analysis }) => {
    if (!analysis) return null;

    const { hourly, daily, monthly, bestHour, bestDay, summary } = analysis;

    return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>التحليل الموسمي (Seasonality)</span>
            </h3>
            
            <div className="flex gap-4 mb-4">
                <p className="text-sm text-cyan-glow bg-gray-800/50 p-3 rounded-md border border-gray-700 flex-grow">{summary}</p>
                <div className="w-24 flex-shrink-0">
                     <WeatherWidget />
                </div>
            </div>
            
            <div className="space-y-6">
                {/* Hourly Heatmap */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-400 mb-2">الأداء الساعي (Intraday)</h4>
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
                        {hourly.map((m, i) => <HeatmapCell key={i} metric={m} />)}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daily Heatmap */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">الأداء اليومي (Day of Week)</h4>
                        <div className="grid grid-cols-7 gap-1">
                            {daily.map((m, i) => <HeatmapCell key={i} metric={m} />)}
                        </div>
                    </div>

                    {/* Monthly Heatmap (Simulated) */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">الأداء الشهري (Simulated)</h4>
                        <div className="grid grid-cols-4 gap-1">
                             {monthly.map((m, i) => <HeatmapCell key={i} metric={m} />)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeasonalityView;
