
import React, { useState, useEffect } from 'react';
import { calculateFlashCrashRisk } from '../services/advancedAnalysisService';
import type { FlashCrashRisk } from '../types';

interface Props {
    currentPrice: number;
}

// Feature 6: Flash Crash Widget
const FlashCrashWidget: React.FC<{ risk: FlashCrashRisk }> = ({ risk }) => {
    let color = 'text-green-400';
    let border = 'border-green-500/30';
    let bg = 'bg-green-500/10';

    if (risk.level === 'Critical') { color = 'text-red-500'; border = 'border-red-500/30'; bg = 'bg-red-500/10 animate-pulse'; }
    else if (risk.level === 'High') { color = 'text-orange-500'; border = 'border-orange-500/30'; bg = 'bg-orange-500/10'; }
    else if (risk.level === 'Moderate') { color = 'text-yellow-400'; border = 'border-yellow-500/30'; bg = 'bg-yellow-500/10'; }

    return (
        <div className={`mt-4 p-3 rounded-lg border ${border} ${bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 <div>
                     <p className={`text-xs font-bold ${color}`}>احتمالية الانهيار الخاطف: {risk.probability}%</p>
                     <p className="text-[10px] text-gray-400">{risk.description}</p>
                 </div>
            </div>
            <div className={`text-sm font-bold ${color}`}>{risk.level}</div>
        </div>
    )
}

const RiskCalculator: React.FC<Props> = ({ currentPrice }) => {
    const [portfolioSize, setPortfolioSize] = useState(10000);
    const [riskPercentage, setRiskPercentage] = useState(1);
    const [stopLossPrice, setStopLossPrice] = useState(currentPrice * 0.99);
    const [takeProfitPrice, setTakeProfitPrice] = useState(currentPrice * 1.02);
    
    const [positionSize, setPositionSize] = useState(0);
    const [riskAmount, setRiskAmount] = useState(0);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [rrRatio, setRrRatio] = useState(0);
    const [leverageSuggestion, setLeverageSuggestion] = useState(1);
    
    // Simulated Flash Crash Risk (Needs candles in real app, mocking data here for UI demo)
    const [flashRisk, setFlashRisk] = useState<FlashCrashRisk | null>(null);

    useEffect(() => {
        const riskAmt = portfolioSize * (riskPercentage / 100);
        setRiskAmount(riskAmt);

        const priceDiff = Math.abs(currentPrice - stopLossPrice);
        const priceDiffPercent = priceDiff / currentPrice;

        if (priceDiffPercent > 0) {
            // Position Size = Risk Amount / Distance to SL %
            const posSize = riskAmt / priceDiffPercent;
            setPositionSize(posSize);
            
            // Suggest Leverage (conservative)
            // Leverage = Position Size / Portfolio Size
            setLeverageSuggestion(Math.ceil(posSize / portfolioSize));
        } else {
            setPositionSize(0);
        }

        const rewardAmt = Math.abs(takeProfitPrice - currentPrice) * (positionSize / currentPrice); // Approx for simplicity
        // More accurate: reward = posSize * (percent change)
        const profitDiffPercent = Math.abs(takeProfitPrice - currentPrice) / currentPrice;
        const calcReward = (riskAmt / priceDiffPercent) * profitDiffPercent;
        
        setRewardAmount(calcReward);
        setRrRatio(riskAmt > 0 ? calcReward / riskAmt : 0);

        // Simulate Risk calculation
        const mockCandles: any[] = Array.from({length: 50}, () => ({ high: 100, low: 90, close: 95, volume: 1000 })); // Dummy
        setFlashRisk(calculateFlashCrashRisk(mockCandles));

    }, [portfolioSize, riskPercentage, stopLossPrice, takeProfitPrice, currentPrice]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span>حاسبة المخاطر وإدارة الصفقات</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">حجم المحفظة ($)</label>
                    <input type="number" value={portfolioSize} onChange={(e) => setPortfolioSize(parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-cyan-glow focus:outline-none" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">المخاطرة (%)</label>
                    <input type="number" value={riskPercentage} onChange={(e) => setRiskPercentage(parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-cyan-glow focus:outline-none" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">سعر وقف الخسارة</label>
                    <input type="number" value={stopLossPrice} onChange={(e) => setStopLossPrice(parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-red-500 focus:outline-none" />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">سعر جني الأرباح</label>
                    <input type="number" value={takeProfitPrice} onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm focus:border-green-500 focus:outline-none" />
                </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3 space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                    <span className="text-gray-400">حجم الصفقة (Position Size):</span>
                    <span className="text-white font-bold">${positionSize.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">الرافعة المقترحة:</span>
                    <span className="text-yellow-glow font-bold">{leverageSuggestion}x</span>
                </div>
                 <div className="flex justify-between border-t border-gray-700 pt-2">
                    <span className="text-gray-400">مبلغ المخاطرة (Risk):</span>
                    <span className="text-red-400 font-bold">-${riskAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">الربح المتوقع (Reward):</span>
                    <span className="text-green-400 font-bold">+${rewardAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">نسبة العائد/المخاطرة (R:R):</span>
                    <span className={`font-bold ${rrRatio >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>1 : {rrRatio.toFixed(2)}</span>
                </div>
            </div>

            {flashRisk && <FlashCrashWidget risk={flashRisk} />}
        </div>
    );
};

export default RiskCalculator;
