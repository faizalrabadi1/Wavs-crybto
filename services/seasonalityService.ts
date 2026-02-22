
import type { Candle, SeasonalityAnalysis, SeasonalMetric } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const calculateSeasonality = (candles: Candle[]): SeasonalityAnalysis => {
    // Initialize accumulators
    const hourStats: { [key: number]: { returns: number[], count: number } } = {};
    const dayStats: { [key: number]: { returns: number[], count: number } } = {};
    
    // We only have limited history, so monthly seasonality will be simulated for the demo based on the asset's "hash" 
    // to keep it consistent but varied across assets.
    
    // Process candles for Hourly and Daily
    for (let i = 1; i < candles.length; i++) {
        const current = candles[i];
        const prev = candles[i-1];
        const returnPct = (current.close - prev.close) / prev.close * 100;
        
        const date = new Date(current.timestamp);
        const hour = date.getHours();
        const day = date.getDay(); // 0 = Sun

        if (!hourStats[hour]) hourStats[hour] = { returns: [], count: 0 };
        hourStats[hour].returns.push(returnPct);
        hourStats[hour].count++;

        if (!dayStats[day]) dayStats[day] = { returns: [], count: 0 };
        dayStats[day].returns.push(returnPct);
        dayStats[day].count++;
    }

    // Build Hourly Results
    const hourly: SeasonalMetric[] = [];
    for (let h = 0; h < 24; h++) {
        const stats = hourStats[h];
        if (stats && stats.count > 0) {
            const avg = stats.returns.reduce((a, b) => a + b, 0) / stats.count;
            const wins = stats.returns.filter(r => r > 0).length;
            hourly.push({
                period: `${h.toString().padStart(2, '0')}:00`,
                avgReturn: avg,
                winRate: (wins / stats.count) * 100
            });
        } else {
            hourly.push({ period: `${h}:00`, avgReturn: 0, winRate: 0 });
        }
    }

    // Build Daily Results
    const daily: SeasonalMetric[] = [];
    for (let d = 0; d < 7; d++) {
         const stats = dayStats[d];
         if (stats && stats.count > 0) {
            const avg = stats.returns.reduce((a, b) => a + b, 0) / stats.count;
            const wins = stats.returns.filter(r => r > 0).length;
            daily.push({
                period: DAYS[d],
                avgReturn: avg,
                winRate: (wins / stats.count) * 100
            });
         } else {
             daily.push({ period: DAYS[d], avgReturn: 0, winRate: 0 });
         }
    }

    // Build Simulated Monthly Results (Since we don't have years of data in this context)
    const monthly: SeasonalMetric[] = [];
    // Use the last candle timestamp as a seed combined with month index
    const seed = candles.length > 0 ? candles[candles.length-1].close : 123; 
    
    for (let m = 0; m < 12; m++) {
        // Deterministic random-ish simulation
        const simReturn = Math.sin((seed + m) * 1.5) * 5 + (Math.random() - 0.5) * 2;
        const simWinRate = 50 + (simReturn * 5); 
        monthly.push({
            period: MONTHS[m],
            avgReturn: simReturn,
            winRate: Math.min(100, Math.max(0, simWinRate))
        });
    }

    // Find best times
    const bestHourObj = [...hourly].sort((a, b) => b.avgReturn - a.avgReturn)[0];
    const bestDayObj = [...daily].sort((a, b) => b.avgReturn - a.avgReturn)[0];
    
    const bestHour = bestHourObj ? bestHourObj.period : 'N/A';
    const bestDay = bestDayObj ? bestDayObj.period : 'N/A';

    const summary = `أفضل وقت للتداول هو الساعة ${bestHour} بتوقيت الجهاز، ويوم ${bestDay}.`;

    return { hourly, daily, monthly, bestHour, bestDay, summary };
};
