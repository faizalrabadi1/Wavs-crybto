import React from 'react';
import type { MarketAnalysis } from '../types';

interface MarketHealthDashboardProps {
  analysisData: MarketAnalysis;
}

const Gauge: React.FC<{ value: number, title: string, description: string }> = ({ value, title, description }) => {
    const percentage = Math.max(0, Math.min(100, value));
    const rotation = (percentage / 100) * 180;
    const color = percentage > 70 ? '#4ade80' : percentage > 40 ? '#facc15' : '#f87171';
    const label = percentage > 70 ? 'مرتفع' : percentage > 40 ? 'محايد' : 'منخفض';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-48 h-24">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" stroke="#30363d" strokeWidth="8" fill="none" strokeLinecap="round" />
                    <path
                        d="M 10 50 A 40 40 0 0 1 90 50"
                        stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"
                        style={{ strokeDasharray: 125.6, strokeDashoffset: 125.6 * (1 - percentage / 100), transition: 'stroke-dashoffset 0.5s ease-out' }}
                    />
                </svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                    <span className="text-2xl font-bold" style={{ color }}>{Math.round(percentage)}%</span>
                    <span className="text-xs ml-1" style={{ color }}>{label}</span>
                </div>
            </div>
            <h4 className="text-sm font-semibold text-white mt-2">{title}</h4>
            <p className="text-xs text-gray-400 text-center max-w-xs">{description}</p>
        </div>
    );
}

const MarketHealthDashboard: React.FC<MarketHealthDashboardProps> = ({ analysisData }) => {
    const btcDAnalysis = analysisData['BTC.D']?.['1d'];
    const total2Analysis = analysisData['TOTAL2']?.['1d'];
    const usdtDAnalysis = analysisData['USDT.D']?.['1d'];

    if (!btcDAnalysis || !total2Analysis || !usdtDAnalysis) {
        return <div className="text-center text-gray-500 py-4">جاري حساب صحة السوق...</div>;
    }
    
    // Altcoin Season Index: higher is better for alts.
    // - Inversely related to BTC.D momentum.
    // - Directly related to TOTAL2 momentum.
    const btcDMomentumScore = Math.max(-10, Math.min(10, -btcDAnalysis.momentum * 5)); // score from -10 to 10
    const total2MomentumScore = Math.max(-10, Math.min(10, total2Analysis.momentum * 2)); // score from -10 to 10
    const altcoinIndex = 50 + btcDMomentumScore * 2.5 + total2MomentumScore * 2.5; // map to 0-100

    // Market Sentiment: higher is more risk-on.
    // - Inversely related to USDT.D momentum (people moving out of stables)
    const usdtDMomentumScore = Math.max(-10, Math.min(10, -usdtDAnalysis.momentum * 5));
    const marketSentiment = 50 + usdtDMomentumScore * 5;

    let summaryText = "السوق في حالة ترقب.";
    if (altcoinIndex > 70 && marketSentiment > 60) {
        summaryText = "بيئة إيجابية للغاية للعملات البديلة. مؤشرات على بداية 'موسم العملات البديلة' مع زيادة شهية المخاطرة.";
    } else if (altcoinIndex < 30) {
        summaryText = "هيمنة البيتكوين قوية. العملات البديلة قد تواجه صعوبات حاليًا. الحذر مطلوب.";
    } else if (marketSentiment < 40) {
        summaryText = "شهية المخاطرة منخفضة في السوق. يميل المستثمرون إلى الأصول الآمنة مثل USDT.";
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6 flex flex-col md:flex-row items-center justify-around gap-8">
            <div className="flex-1 text-center md:text-right">
                <h3 className="text-xl font-bold text-white">لوحة معلومات صحة السوق</h3>
                <p className="text-gray-400 mt-2">{summaryText}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                <Gauge value={altcoinIndex} title="مؤشر موسم العملات البديلة" description="يقيس قوة العملات البديلة مقابل البيتكوين." />
                <Gauge value={marketSentiment} title="مؤشر شهية المخاطرة" description="يعكس ميل المستثمرين نحو الأصول الخطرة." />
            </div>
        </div>
    );
}

export default MarketHealthDashboard;
