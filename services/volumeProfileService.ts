
import type { Candle, VolumeProfileAnalysis, PriceLevelVolume, VolumeProfileStrategy } from '../types';

const calculateVWAP = (candles: Candle[]): { vwap: number, stdDev: number } => {
    let cumVol = 0;
    let cumVolPrice = 0;
    let squaredDiffs = 0;

    candles.forEach(c => {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        cumVol += c.volume;
        cumVolPrice += typicalPrice * c.volume;
    });

    const vwap = cumVol > 0 ? cumVolPrice / cumVol : 0;

    // StdDev Calculation
    candles.forEach(c => {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        squaredDiffs += Math.pow(typicalPrice - vwap, 2) * c.volume;
    });
    
    const stdDev = cumVol > 0 ? Math.sqrt(squaredDiffs / cumVol) : 0;
    
    return { vwap, stdDev };
};

const classifyProfileShape = (histogram: PriceLevelVolume[], pocIndex: number): 'P-Shape' | 'b-Shape' | 'D-Shape' | 'B-Shape' => {
    const totalRows = histogram.length;
    if (totalRows < 10) return 'D-Shape';

    // Divide profile into 3 sections
    const third = Math.floor(totalRows / 3);
    const topVol = histogram.slice(totalRows - third).reduce((s, b) => s + b.volume, 0);
    const midVol = histogram.slice(third, totalRows - third).reduce((s, b) => s + b.volume, 0);
    const botVol = histogram.slice(0, third).reduce((s, b) => s + b.volume, 0);

    // Logic
    if (topVol > botVol * 1.5 && pocIndex > totalRows * 0.6) return 'P-Shape'; // Top heavy (Short Covering)
    if (botVol > topVol * 1.5 && pocIndex < totalRows * 0.4) return 'b-Shape'; // Bottom heavy (Long Liquidation)
    if (midVol > topVol && midVol > botVol) return 'D-Shape'; // Balanced
    
    // B-Shape (Double Distribution) - simplified check: two peaks separated by a valley
    // Not implementing full B-shape logic for simplicity, default to D if balanced.
    
    return 'D-Shape'; 
};

export const calculateVolumeProfile = (candles: Candle[]): VolumeProfileAnalysis => {
    if (!candles || candles.length < 20) {
        return { 
            histogram: [], pocPrice: 0, vah: 0, val: 0, summary: "بيانات غير كافية", 
            vwap: 0, vwapStdDev: 0, profileShape: 'D-Shape', impliedTrend: 'Neutral', strategies: [] 
        };
    }

    // Use the last 200 candles or fewer for the profile
    const lookbackCandles = candles.slice(-200);
    
    // Find High and Low for the range
    const minPrice = Math.min(...lookbackCandles.map(c => c.low)); 
    const maxPrice = Math.max(...lookbackCandles.map(c => c.high)); 
    
    const range = maxPrice - minPrice;
    const rowCount = 50; // Increased resolution for better HVN/LVN detection
    const rowHeight = range / rowCount;
    
    if (rowHeight === 0) {
         return { 
             histogram: [], pocPrice: 0, vah: 0, val: 0, summary: "نطاق سعري ضيق جداً", 
             vwap: 0, vwapStdDev: 0, profileShape: 'D-Shape', impliedTrend: 'Neutral', strategies: [] 
         };
    }

    // Initialize bins
    const bins: { [key: number]: { vol: number, buyVol: number, sellVol: number } } = {};
    for (let i = 0; i < rowCount; i++) {
        bins[i] = { vol: 0, buyVol: 0, sellVol: 0 };
    }

    // Distribute volume & Estimate Delta
    let totalVolume = 0;
    lookbackCandles.forEach(candle => {
        const binIndex = Math.min(rowCount - 1, Math.floor((candle.close - minPrice) / rowHeight));
        
        // Delta Estimation Logic (Up Close vs Down Close ratio + Wick analysis)
        const rangeC = candle.high - candle.low;
        let buyRatio = 0.5;
        if (rangeC > 0) {
            if (candle.close > candle.open) {
                // Bullish candle: Buy vol is body + lower wick. 
                // Simplified: Close relative to range
                buyRatio = (candle.close - candle.low) / rangeC;
            } else {
                // Bearish candle
                buyRatio = (candle.close - candle.low) / rangeC; 
            }
        }
        // Bias slightly
        buyRatio = Math.max(0.1, Math.min(0.9, buyRatio));
        
        const buyV = candle.volume * buyRatio;
        const sellV = candle.volume * (1 - buyRatio);

        bins[binIndex].vol += candle.volume;
        bins[binIndex].buyVol += buyV;
        bins[binIndex].sellVol += sellV;
        totalVolume += candle.volume;
    });

    // Find POC
    let maxVolume = 0;
    let pocIndex = 0;
    
    for (let i = 0; i < rowCount; i++) {
        if (bins[i].vol > maxVolume) {
            maxVolume = bins[i].vol;
            pocIndex = i;
        }
    }

    // Calculate Value Area (VA) - 70%
    const valueAreaVolume = totalVolume * 0.70;
    let currentVolume = maxVolume;
    let upIndex = pocIndex;
    let downIndex = pocIndex;
    let vahIndex = pocIndex;
    let valIndex = pocIndex;

    while (currentVolume < valueAreaVolume) {
        const upVol = (upIndex < rowCount - 1) ? bins[upIndex + 1].vol : 0;
        const downVol = (downIndex > 0) ? bins[downIndex - 1].vol : 0;

        if (upVol > downVol) {
            upIndex++;
            currentVolume += upVol;
            vahIndex = upIndex;
        } else if (downVol > 0) {
            downIndex--;
            currentVolume += downVol;
            valIndex = downIndex;
        } else if (upIndex < rowCount - 1) {
             upIndex++;
            currentVolume += upVol;
            vahIndex = upIndex;
        } else {
            break;
        }
    }

    // Construct Histogram & Detect HVN/LVN
    const histogram: PriceLevelVolume[] = [];
    const avgBinVol = totalVolume / rowCount;

    for (let i = 0; i < rowCount; i++) {
        const price = minPrice + (i * rowHeight) + (rowHeight / 2);
        const binVol = bins[i].vol;
        
        let type: 'HVN' | 'LVN' | 'Normal' = 'Normal';
        if (binVol > avgBinVol * 1.5) type = 'HVN';
        if (binVol < avgBinVol * 0.5) type = 'LVN';

        histogram.push({
            price,
            volume: binVol,
            buyVol: bins[i].buyVol,
            sellVol: bins[i].sellVol,
            delta: bins[i].buyVol - bins[i].sellVol,
            isPOC: i === pocIndex,
            isValueArea: i >= valIndex && i <= vahIndex,
            type
        });
    }

    // Derived Stats
    const pocPrice = histogram[pocIndex].price;
    const vah = histogram[vahIndex].price;
    const val = histogram[valIndex].price;
    const currentPrice = candles[candles.length-1].close;
    
    // New Metrics
    const { vwap, stdDev } = calculateVWAP(lookbackCandles);
    const shape = classifyProfileShape(histogram, pocIndex);
    
    // Generate Strategies
    const strategies: VolumeProfileStrategy[] = [];
    
    // 1. Mean Reversion
    if (currentPrice > vah && currentPrice < vah * 1.01) {
        strategies.push({ name: 'Rejection at VAH', signal: 'Sell', description: 'السعر يختبر VAH من الأعلى. كسر للأسفل يستهدف POC.' });
    } else if (currentPrice < val && currentPrice > val * 0.99) {
        strategies.push({ name: 'Rejection at VAL', signal: 'Buy', description: 'السعر يختبر VAL من الأسفل. اختراق للأعلى يستهدف POC.' });
    }
    
    // 2. Breakout
    if (currentPrice > vah * 1.01 && candles[candles.length-1].volume > avgBinVol) {
        strategies.push({ name: 'Volume Breakout', signal: 'Buy', description: 'خروج قوي من منطقة القيمة بحجم عالٍ.' });
    } else if (currentPrice < val * 0.99 && candles[candles.length-1].volume > avgBinVol) {
        strategies.push({ name: 'Volume Breakdown', signal: 'Sell', description: 'كسر قوي لمنطقة القيمة بحجم عالٍ.' });
    }
    
    // 3. VWAP Confluence
    if (Math.abs(currentPrice - vwap) < (currentPrice * 0.002)) {
        strategies.push({ name: 'VWAP Test', signal: 'Neutral', description: 'السعر يختبر القيمة العادلة (VWAP). راقب رد الفعل.' });
    }

    let summary = `نموذج التوزيع: ${shape}. `;
    if (shape === 'P-Shape') summary += "إشارات تغطية بيع (Short Covering). ";
    else if (shape === 'b-Shape') summary += "إشارات تصفية شراء (Long Liquidation). ";
    else summary += "سوق متوازن. ";

    summary += currentPrice > vah ? "السعر في منطقة بريميوم." : currentPrice < val ? "السعر في منطقة خصم." : "السعر في منطقة التوازن.";

    return { 
        histogram, pocPrice, vah, val, summary, 
        vwap, vwapStdDev: stdDev, profileShape: shape, 
        impliedTrend: shape === 'P-Shape' ? 'Bullish' : shape === 'b-Shape' ? 'Bearish' : 'Neutral',
        strategies
    };
};