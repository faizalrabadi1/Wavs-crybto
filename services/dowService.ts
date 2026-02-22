
import type { Candle, DowAnalysis, DowPhase, DowTrend } from '../types';

const findSwings = (candles: Candle[], lookback: number = 5) => {
    const swings: { index: number; price: number; type: 'High' | 'Low' }[] = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
        const current = candles[i];
        const slice = candles.slice(i - lookback, i + lookback + 1);
        
        const isHigh = slice.every(c => c.high <= current.high);
        const isLow = slice.every(c => c.low >= current.low);
        
        if (isHigh) swings.push({ index: i, price: current.high, type: 'High' });
        else if (isLow) swings.push({ index: i, price: current.low, type: 'Low' });
    }
    return swings;
};

export const analyzeDowTheory = (candles: Candle[]): DowAnalysis => {
    if (candles.length < 100) {
        return {
            primaryTrend: 'Neutral', secondaryTrend: 'Neutral', phase: 'Public Participation',
            volumeConfirmation: false, higherHighs: false, higherLows: false, lowerHighs: false, lowerLows: false,
            summary: "بيانات غير كافية لتحليل داو.", swings: []
        };
    }

    const swings = findSwings(candles, 10);
    const lastSwings = swings.slice(-6); // Look at last few swings structure
    
    let hh = 0, hl = 0, lh = 0, ll = 0;
    const highs = lastSwings.filter(s => s.type === 'High');
    const lows = lastSwings.filter(s => s.type === 'Low');

    for (let i = 1; i < highs.length; i++) {
        if (highs[i].price > highs[i-1].price) hh++;
        else lh++;
    }
    for (let i = 1; i < lows.length; i++) {
        if (lows[i].price > lows[i-1].price) hl++;
        else ll++;
    }

    let primaryTrend: DowTrend = 'Neutral';
    if (hh >= 2 && hl >= 2) primaryTrend = 'Bullish';
    else if (ll >= 2 && lh >= 2) primaryTrend = 'Bearish';

    // Secondary Trend (Correction detection)
    const currentPrice = candles[candles.length-1].close;
    const lastSwing = lastSwings[lastSwings.length-1];
    let secondaryTrend: 'Correction' | 'Rally' | 'Neutral' = 'Neutral';
    
    if (primaryTrend === 'Bullish') {
        if (currentPrice < lastSwing.price && lastSwing.type === 'High') secondaryTrend = 'Correction';
    } else if (primaryTrend === 'Bearish') {
        if (currentPrice > lastSwing.price && lastSwing.type === 'Low') secondaryTrend = 'Rally';
    }

    // Volume Confirmation
    // Volume should increase in direction of trend
    const recentVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0);
    const prevVolume = candles.slice(-40, -20).reduce((sum, c) => sum + c.volume, 0);
    let volumeConfirmation = false;
    
    if (primaryTrend === 'Bullish' && currentPrice > candles[candles.length-20].close && recentVolume > prevVolume) volumeConfirmation = true;
    else if (primaryTrend === 'Bearish' && currentPrice < candles[candles.length-20].close && recentVolume > prevVolume) volumeConfirmation = true;

    // Phase Logic (Simplified)
    let phase: DowPhase = 'Public Participation';
    if (primaryTrend === 'Bullish') {
        if (!volumeConfirmation && hh > 0) phase = 'Accumulation';
        else if (volumeConfirmation && hh > 1) phase = 'Public Participation';
        else if (!volumeConfirmation && currentPrice < highs[highs.length-1]?.price * 0.9) phase = 'Distribution';
    } else if (primaryTrend === 'Bearish') {
        phase = 'Distribution'; // Or Panic
    }

    let summary = `الاتجاه الأساسي ${primaryTrend === 'Bullish' ? 'صاعد' : primaryTrend === 'Bearish' ? 'هابط' : 'عرضي'}. `;
    if (secondaryTrend !== 'Neutral') summary += `السوق يمر بمرحلة ${secondaryTrend === 'Correction' ? 'تصحيح' : 'ارتداد'} ثانوي. `;
    summary += volumeConfirmation ? "حجم التداول يؤكد الاتجاه." : "حجم التداول لا يدعم الاتجاه الحالي (ضعف).";

    return {
        primaryTrend,
        secondaryTrend,
        phase,
        volumeConfirmation,
        higherHighs: hh > 0,
        higherLows: hl > 0,
        lowerHighs: lh > 0,
        lowerLows: ll > 0,
        summary,
        swings: lastSwings
    };
};
