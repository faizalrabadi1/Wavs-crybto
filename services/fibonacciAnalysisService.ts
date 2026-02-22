import type { Candle, FibonacciAnalysis, FibRetracement, FibExtension, FibTimeZone, FibCluster, FibLevel } from '../types';

type SwingPoint = { type: 'high' | 'low'; price: number; index: number };

const RETRACEMENT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const EXTENSION_LEVELS = [-0.618, -0.236, 0, 0.382, 0.5, 0.618, 1, 1.382, 1.618, 2, 2.618];
const TIME_ZONE_SEQUENCE = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

const findSignificantSwings = (candles: Candle[], lookback: number): SwingPoint[] => {
    const points: SwingPoint[] = [];
    const window = Math.floor(lookback / 2);

    for (let i = window; i < candles.length - window; i++) {
        const slice = candles.slice(i - window, i + window + 1);
        const currentPrice = candles[i].close;
        const maxInWindow = Math.max(...slice.map(c => c.close));
        const minInWindow = Math.min(...slice.map(c => c.close));

        if (currentPrice === maxInWindow) {
            points.push({ type: 'high', price: currentPrice, index: i });
        } else if (currentPrice === minInWindow) {
            points.push({ type: 'low', price: currentPrice, index: i });
        }
    }
    return points.filter((p, i, arr) => i === 0 || p.type !== arr[i - 1].type);
};


const calculateRetracement = (swing1: SwingPoint, swing2: SwingPoint): FibRetracement | null => {
    if (!swing1 || !swing2) return null;
    
    const [swingLow, swingHigh] = swing1.price < swing2.price ? [swing1, swing2] : [swing2, swing1];
    const range = swingHigh.price - swingLow.price;
    if (range === 0) return null;

    const isUpTrend = swingHigh.index > swingLow.index;

    const levels = RETRACEMENT_LEVELS.map(level => ({
        level,
        price: isUpTrend ? swingHigh.price - range * level : swingLow.price + range * level
    }));

    return { swingHigh, swingLow, levels };
};

const calculateExtension = (p1: SwingPoint, p2: SwingPoint, p3: SwingPoint): FibExtension | null => {
     if (!p1 || !p2 || !p3) return null;
     const range = Math.abs(p2.price - p1.price);
     if (range === 0) return null;

     const levels = EXTENSION_LEVELS.map(level => ({
        level,
        price: p3.price + range * level
     }));

     return { p1, p2, p3, levels };
};

const calculateTimeZones = (startPoint: SwingPoint, numZones: number): FibTimeZone[] => {
    return TIME_ZONE_SEQUENCE.slice(0, numZones).map(seq => ({
        level: seq,
        index: startPoint.index + seq
    }));
};

const findClusters = (allLevels: { price: number; reason: string }[], candles: Candle[]): FibCluster[] => {
    if (allLevels.length === 0) return [];
    
    const sortedLevels = allLevels.sort((a, b) => a.price - b.price);
    const avgPrice = candles.reduce((sum, c) => sum + c.close, 0) / candles.length;
    const CLUSTER_TOLERANCE = avgPrice * 0.005; // 0.5% of average price

    const clusters: FibCluster[] = [];
    let currentCluster: { priceTop: number; priceBottom: number; count: number; reasons: string[]; sum: number; } = {
        priceTop: sortedLevels[0].price,
        priceBottom: sortedLevels[0].price,
        count: 1,
        reasons: [sortedLevels[0].reason],
        sum: sortedLevels[0].price,
    };

    for (let i = 1; i < sortedLevels.length; i++) {
        const level = sortedLevels[i];
        if (level.price <= currentCluster.priceTop + CLUSTER_TOLERANCE) {
            currentCluster.priceTop = Math.max(currentCluster.priceTop, level.price);
            currentCluster.count++;
            currentCluster.reasons.push(level.reason);
            currentCluster.sum += level.price;
        } else {
            if (currentCluster.count > 1) {
                clusters.push({ ...currentCluster });
            }
            currentCluster = { priceTop: level.price, priceBottom: level.price, count: 1, reasons: [level.reason], sum: level.price };
        }
    }
    if (currentCluster.count > 1) {
        clusters.push({ ...currentCluster });
    }

    return clusters.filter(c => c.count > 2).sort((a, b) => b.count - a.count).slice(0, 5); // Return top 5 clusters with 3+ levels
};

export const analyzeFibonacci = (candles: Candle[]): FibonacciAnalysis => {
    const defaultResponse: FibonacciAnalysis = { isValid: false, summary: "بيانات غير كافية لتحليل فيبوناتشي.", confluenceScore: 0, clusters: [] };
    if (candles.length < 100) return defaultResponse;

    const majorSwings = findSignificantSwings(candles, 60).slice(-4);
    const minorSwings = findSignificantSwings(candles, 20).slice(-4);
    
    if (majorSwings.length < 2 || minorSwings.length < 3) return defaultResponse;

    const allFibLevels: { price: number; reason: string }[] = [];
    
    // 1. Primary Retracement
    const primaryRetracement = calculateRetracement(majorSwings.slice(-2)[0], majorSwings.slice(-1)[0]);
    if (primaryRetracement) {
        primaryRetracement.levels.forEach(l => allFibLevels.push({ price: l.price, reason: `ارتداد رئيسي ${l.level.toFixed(3)}` }));
    }

    // 2. Trend-Based Extension
    let trendBasedExtension: FibExtension | null = null;
    if (majorSwings.length >= 3) {
        trendBasedExtension = calculateExtension(majorSwings.slice(-3)[0], majorSwings.slice(-2)[0], majorSwings.slice(-1)[0]);
        if (trendBasedExtension) {
            trendBasedExtension.levels.forEach(l => allFibLevels.push({ price: l.price, reason: `امتداد رئيسي ${l.level.toFixed(3)}` }));
        }
    }

    // Secondary calculations for clusters
    const secondaryRetracement = calculateRetracement(minorSwings.slice(-2)[0], minorSwings.slice(-1)[0]);
    if (secondaryRetracement) {
        secondaryRetracement.levels.forEach(l => allFibLevels.push({ price: l.price, reason: `ارتداد فرعي ${l.level.toFixed(3)}` }));
    }
     if (minorSwings.length >= 3) {
        const secondaryExtension = calculateExtension(minorSwings.slice(-3)[0], minorSwings.slice(-2)[0], minorSwings.slice(-1)[0]);
        if (secondaryExtension) {
            secondaryExtension.levels.forEach(l => allFibLevels.push({ price: l.price, reason: `امتداد فرعي ${l.level.toFixed(3)}` }));
        }
    }

    // 3. Time Zones
    const timeZones = calculateTimeZones(majorSwings.slice(-1)[0], 8);

    // 4. Clusters
    const clusters = findClusters(allFibLevels, candles);

    // Calculate Confluence Score
    let confluenceScore = 0;
    if (clusters.length > 0) {
        confluenceScore += clusters[0].count * 10;
        if(clusters[0].reasons.some(r => r.includes("رئيسي")) && clusters[0].reasons.some(r => r.includes("فرعي"))) {
            confluenceScore += 25;
        }
    }
    const currentPrice = candles[candles.length-1].close;
    clusters.forEach(c => {
        if(currentPrice >= c.priceBottom && currentPrice <= c.priceTop) {
            confluenceScore += 30; // Bonus for price being in a cluster
        }
    });

    const summary = clusters.length > 0
        ? `تم تحديد ${clusters.length} مناطق التقاء فيبوناتشي قوية. أقوى منطقة تقع بين ${clusters[0].priceBottom.toFixed(4)} و ${clusters[0].priceTop.toFixed(4)}، وتتكون من ${clusters[0].count} مستويات متوافقة.`
        : "لم يتم تحديد مناطق التقاء قوية. مستويات فيبوناتشي متفرقة حاليًا.";

    return {
        isValid: true,
        summary,
        confluenceScore: Math.min(100, confluenceScore),
        primaryRetracement: primaryRetracement ?? undefined,
        trendBasedExtension: trendBasedExtension ?? undefined,
        timeZones,
        clusters,
        // Other types are simulated in the view for now
    };
};
