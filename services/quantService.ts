
import type { Candle, QuantAnalysis, QuantMetric } from '../types';

const calculateMean = (data: number[]): number => {
    return data.reduce((a, b) => a + b, 0) / data.length;
};

const calculateStdDev = (data: number[], mean: number): number => {
    const squareDiffs = data.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
};

const calculateSkewness = (data: number[], mean: number, stdDev: number): number => {
    const n = data.length;
    const cubedDiffs = data.map(val => Math.pow((val - mean) / stdDev, 3));
    return (n / ((n - 1) * (n - 2))) * cubedDiffs.reduce((a, b) => a + b, 0);
};

const calculateKurtosis = (data: number[], mean: number, stdDev: number): number => {
    const n = data.length;
    const fourthPowerDiffs = data.map(val => Math.pow((val - mean) / stdDev, 4));
    const sum = fourthPowerDiffs.reduce((a, b) => a + b, 0);
    // Excess Kurtosis
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
};

const linearRegression = (y: number[]): { slope: number; intercept: number; rSquared: number } => {
    const n = y.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // R-Squared
    const yMean = sumY / n;
    const totalSS = y.reduce((a, b) => a + Math.pow(b - yMean, 2), 0);
    const residualSS = y.reduce((a, b, i) => a + Math.pow(b - (slope * i + intercept), 2), 0);
    const rSquared = 1 - (residualSS / totalSS);
    
    return { slope, intercept, rSquared };
};

const generateBellCurve = (mean: number, stdDev: number): { x: number; y: number }[] => {
    const points = [];
    const start = mean - 4 * stdDev;
    const end = mean + 4 * stdDev;
    const step = (end - start) / 50;
    
    for (let x = start; x <= end; x += step) {
        const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
        const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
        points.push({ x, y });
    }
    return points;
};

export const analyzeQuantStats = (candles: Candle[]): QuantAnalysis => {
    const prices = candles.map(c => c.close);
    // Use last 100 candles for relevant stats
    const data = prices.slice(-100); 
    const currentPrice = data[data.length - 1];
    
    const mean = calculateMean(data);
    const stdDev = calculateStdDev(data, mean);
    const zScore = stdDev === 0 ? 0 : (currentPrice - mean) / stdDev;
    const skewness = calculateSkewness(data, mean, stdDev);
    const kurtosis = calculateKurtosis(data, mean, stdDev);
    const reg = linearRegression(data);
    
    const metrics: QuantMetric[] = [];
    
    // Z-Score Analysis
    if (Math.abs(zScore) > 2.5) {
        metrics.push({ 
            label: 'Z-Score', 
            value: zScore.toFixed(2), 
            description: 'انحراف معياري حاد عن المتوسط. احتمالية عالية للانعكاس (Mean Reversion).',
            status: 'Extreme'
        });
    } else {
        metrics.push({ 
            label: 'Z-Score', 
            value: zScore.toFixed(2), 
            description: 'السعر ضمن النطاق الطبيعي للتوزيع.',
            status: 'Normal'
        });
    }
    
    // Volatility Analysis (CV)
    const cv = (stdDev / mean) * 100;
    metrics.push({
        label: 'Volatility (CV)',
        value: `${cv.toFixed(2)}%`,
        description: cv > 2 ? 'تقلبات عالية' : 'سوق مستقر',
        status: cv > 2 ? 'Warning' : 'Normal'
    });
    
    // Trend Strength (R-Squared)
    metrics.push({
        label: 'Trend Strength (R²)',
        value: reg.rSquared.toFixed(2),
        description: reg.rSquared > 0.7 ? 'اتجاه خطي قوي' : 'حركة عشوائية أو متذبذبة',
        status: reg.rSquared > 0.7 ? 'Normal' : 'Warning'
    });

    let summary = `السعر الحالي (${currentPrice.toFixed(2)}) يبعد ${Math.abs(zScore).toFixed(1)} انحراف معياري عن المتوسط. `;
    if (Math.abs(zScore) > 2) summary += "هذه حالة إحصائية متطرفة قد تسبق العودة للمتوسط. ";
    if (reg.rSquared > 0.8) summary += `هناك اتجاه ${reg.slope > 0 ? 'صاعد' : 'هابط'} قوي جداً إحصائياً.`;
    
    return {
        mean,
        stdDev,
        zScore,
        skewness,
        kurtosis,
        linearRegression: reg,
        metrics,
        bellCurveData: generateBellCurve(mean, stdDev),
        summary
    };
};
