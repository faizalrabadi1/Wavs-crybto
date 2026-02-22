import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { CurrencyData, MarketAnalysis, UltraLightSignal } from '../types';
import SimpleLineChart from './LineChart';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    pair: string;
    marketData: CurrencyData;
    analysisData: MarketAnalysis[string];
    type: 'gainer' | 'loser';
}

const buildSignalPrompt = (
    pair: string,
    marketData: CurrencyData,
    analysisData: MarketAnalysis[string]
): string => {
    // We'll use the 15m analysis as a good proxy for "instantaneous" sentiment
    const analysis = analysisData?.['15m'];
    if (!analysis) return '';

    return `
You are a high-frequency trading AI. Your task is to generate a high-probability trade setup for ${pair} based on its instantaneous analysis. The trade should be actionable within the next few minutes.

**Current Market Data for ${pair}:**
- **Current Price:** ${marketData.price.toFixed(4)} USDT
- **24h Change:** ${marketData.change24h.toFixed(2)}%
- **Spectral State (15m):** ${analysis.state}
- **Momentum (15m, 20p):** ${analysis.momentum.toFixed(2)}%
- **RSI (15m):** ${analysis.rsi?.toFixed(2) || 'N/A'}
- **MACD Hist (15m):** ${analysis.macdHistogram?.toFixed(4) || 'N/A'}

**TASK:**
Generate a complete JSON object for a trade setup.
Your response MUST be ONLY the JSON object within a \`\`\`json block. Do not add any other text.
The JSON object must have the following structure:
{
  "side": "BUY" | "SELL",
  "entry": number, // A precise entry price, very close to the current price
  "stopLoss": number, // Max 7% away from entry
  "targets": [
    { "level": "TP1", "price": number }, // Min 10% profit
    { "level": "TP2", "price": number },
    { "level": "TP3", "price": number },
    { "level": "TP4", "price": number }  // Min 69% profit
  ],
  "duration": string, // Estimated duration, e.g., "1-4 hours"
  "rationale": string, // A short, compelling reason for the trade in Arabic
  "predictedPath": number[] // A JSON array of exactly 60 numbers normalized between 0.0 and 1.0, representing the price path for the next 60 minutes. 0.0 is the stop loss, 1.0 is the highest target. The path MUST reflect your BUY/SELL recommendation.
}

**Rules:**
- For high 24h change assets (gainers), look for continuation (BUY) or reversal (SELL) signals.
- For low 24h change assets (losers), look for reversal (BUY) signals.
- Set the entry price very close to the current price.
- Calculate stopLoss and targets based on the entry price and percentage rules.
- The predictedPath must be a smooth and realistic price evolution over 60 steps.
`;
}


const TradeSignalCard: React.FC<Props> = ({ pair, marketData, analysisData, type }) => {
    const [signal, setSignal] = useState<UltraLightSignal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<any[] | null>(null);

    const generateSignal = useCallback(async () => {
        if (!marketData || !analysisData) return;

        setIsLoading(true);
        setError(null);
        
        const cacheKey = `ultralight-${pair}-${marketData.price}`; // Price in key to re-fetch on change
        const cached = getCachedAiResponse(cacheKey);

        if(cached) {
            try {
                const parsedSignal = JSON.parse(cached);
                setSignal(parsedSignal);
                setIsLoading(false);
                return;
            } catch (e) {
                // Invalid cache, proceed to fetch
            }
        }
        
        try {
            const prompt = buildSignalPrompt(pair, marketData, analysisData);
            if (!prompt) {
                throw new Error("Insufficient analysis data.");
            }

            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });

            const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/);
            if (!jsonMatch || !jsonMatch[1]) {
                throw new Error("AI did not return a valid JSON object.");
            }

            const parsedSignal = JSON.parse(jsonMatch[1]);
            setCachedAiResponse(cacheKey, jsonMatch[1]);
            setSignal(parsedSignal);

        } catch (err: any) {
            console.error(`Error generating signal for ${pair}:`, err);
            setError("فشل في توليد الإشارة.");
        } finally {
            setIsLoading(false);
        }

    }, [pair, marketData, analysisData]);

    useEffect(() => {
        generateSignal();
    }, [generateSignal]);
    
    useEffect(() => {
        if (!signal || !marketData) return;
        
        const historicalCandles = marketData.candles['1m']?.slice(-60) || [];
        const historicalChartData: { time: number; price: number; prediction?: number }[] = historicalCandles.map((c, i) => ({ time: i, price: c.close }));
        
        const lastHistoricalPoint = historicalChartData[historicalChartData.length - 1];

        const predictionData = signal.predictedPath.map((normVal, i) => ({
            time: (lastHistoricalPoint?.time || 59) + i + 1,
            prediction: signal.stopLoss + (normVal * (signal.targets[3].price - signal.stopLoss))
        }));

        const combinedData: { time: number; price?: number, prediction?: number }[] = [...historicalChartData];
        if (combinedData.length > 0) {
            combinedData[combinedData.length - 1].prediction = lastHistoricalPoint.price;
        }
        predictionData.forEach(p => combinedData.push(p));
        
        setChartData(combinedData);

    }, [signal, marketData]);

    if (!marketData || !analysisData) {
        return <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 h-full flex items-center justify-center"><p className="text-gray-500">جاري تحميل البيانات...</p></div>
    }

    const isBuy = signal?.side === 'BUY';
    const cardBorder = type === 'gainer' ? 'border-green-400/50' : 'border-red-400/50';
    const typeBg = type === 'gainer' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300';
    const signalBg = isBuy ? 'bg-green-500/80' : 'bg-red-500/80';

    return (
         <div className={`bg-gray-800 rounded-lg p-4 border ${cardBorder} h-full flex flex-col`}>
             <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="text-xl font-bold text-white">{pair}</h4>
                    <p className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${typeBg}`}>
                        {type === 'gainer' ? `الأكثر ارتفاعًا (${marketData.change24h.toFixed(2)}%)` : `الأكثر انخفاضًا (${marketData.change24h.toFixed(2)}%)`}
                    </p>
                </div>
                {signal && !isLoading && (
                    <div className={`px-4 py-1.5 rounded-full text-lg font-bold text-white ${signalBg}`}>{signal.side}</div>
                )}
            </div>

            {isLoading && <div className="flex-grow flex items-center justify-center text-cyan-glow animate-pulse">جاري إنشاء الصفقة...</div>}
            {error && <div className="flex-grow flex items-center justify-center text-red-400">{error}</div>}
            
            {signal && !isLoading && (
                <>
                    <p className="text-sm text-gray-300 mb-3 h-10">{signal.rationale}</p>

                    <div className="h-48 w-full mb-3">
                         {chartData && (
                            <SimpleLineChart data={chartData} lines={[
                                { key: 'price', color: '#9ca3af' },
                                { key: 'prediction', color: isBuy ? '#4ade80' : '#f87171', strokeWidth: 2, dashArray: '4 4' }
                            ]} />
                         )}
                    </div>
                    
                    <div className="text-xs font-mono space-y-1">
                         <div className="flex justify-between items-center"><span className="text-gray-400">مدة الصفقة المقترحة:</span><span className="text-yellow-glow">{signal.duration}</span></div>
                         <div className="flex justify-between items-center"><span className="text-gray-400">سعر الدخول:</span><span className="text-cyan-glow">{signal.entry.toFixed(4)}</span></div>
                         <div className="flex justify-between items-center"><span className="text-gray-400">وقف الخسارة:</span><span className="text-red-400">{signal.stopLoss.toFixed(4)}</span></div>
                         {signal.targets.map(t => (
                             <div key={t.level} className="flex justify-between items-center">
                                <span className="text-gray-400">{t.level}:</span>
                                <span className="text-green-400">{t.price.toFixed(4)}</span>
                             </div>
                         ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default TradeSignalCard;