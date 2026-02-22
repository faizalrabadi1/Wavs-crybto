import type { Candle, CotAnalysis, TraderGroupPositions } from '../types';

// This is a simulation service for Commitment of Traders (COT) data.
// In a real-world application, this data would be fetched from a dedicated provider like the CFTC.

const calculateMomentum = (candles: Candle[]): number => {
    if (candles.length < 25) return 0;
    const currentPrice = candles[candles.length - 1].close;
    const pastPrice = candles[candles.length - 21].close; // 20 periods ago
    return ((currentPrice - pastPrice) / pastPrice); // As a decimal, not percentage
}

export const analyzeCotData = (pair: string, candles: Candle[]): CotAnalysis => {
    if (['BTC.D', 'USDT.D', 'TOTAL', 'TOTAL2'].includes(pair)) {
        return {
            summary: "بيانات COT غير متاحة لهذا المؤشر العام للسوق.",
            sentimentScore: 0, // Neutral score
            largeSpeculators: { long: 0, short: 0, net: 0 },
            commercials: { long: 0, short: 0, net: 0 },
            smallSpeculators: { long: 0, short: 0, net: 0 },
        };
    }
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const momentum = calculateMomentum(candles);

    // --- Special logic for CAC40 Index Futures ---
    if (pair.includes('CAC40')) {
        const baseTotalContracts = 250000 + (hash % 50000);
        // Large Speculators are bullish, Commercials are hedging (net short)
        const largeSpecBaseLong = baseTotalContracts * 0.45;
        const largeSpecBaseShort = baseTotalContracts * 0.20;
        const commercialsBaseLong = baseTotalContracts * 0.20;
        const commercialsBaseShort = baseTotalContracts * 0.50;
        const smallSpecBaseLong = baseTotalContracts * 0.03;
        const smallSpecBaseShort = baseTotalContracts * 0.02;

        const momentumFactor = 800000;
        const largeSpeculators: TraderGroupPositions = {
            long: Math.round(largeSpecBaseLong + (momentum > 0 ? momentum * momentumFactor : 0)),
            short: Math.round(largeSpecBaseShort - (momentum < 0 ? momentum * momentumFactor : 0)),
            net: 0
        };
        const commercials: TraderGroupPositions = {
            long: Math.round(commercialsBaseLong - (momentum < 0 ? momentum * momentumFactor * 0.9 : 0)),
            short: Math.round(commercialsBaseShort + (momentum > 0 ? momentum * momentumFactor * 0.9 : 0)),
            net: 0
        };
        const smallSpeculators: TraderGroupPositions = {
            long: Math.round(smallSpecBaseLong + (momentum > 0 ? momentum * momentumFactor * 0.1 : 0)),
            short: Math.round(smallSpecBaseShort - (momentum < 0 ? momentum * momentumFactor * 0.1 : 0)),
            net: 0
        };

        largeSpeculators.net = largeSpeculators.long - largeSpeculators.short;
        commercials.net = commercials.long - commercials.short;
        smallSpeculators.net = smallSpeculators.long - smallSpeculators.short;

        const totalLargeSpecContracts = largeSpeculators.long + largeSpeculators.short;
        const sentimentScore = totalLargeSpecContracts > 0 ? largeSpeculators.net / totalLargeSpecContracts : 0;
        
        let summary = '';
        if (sentimentScore > 0.25) {
            summary = "بيانات العقود الآجلة للمؤشر تظهر تفاؤلاً من كبار المضاربين. المؤسسات الكبرى (التجاريون) في حالة تحوط بيعي قوي، وهو أمر طبيعي للمؤشرات.";
        } else if (sentimentScore < -0.25) {
            summary = "كبار المضاربين يميلون للبيع على المؤشر، بينما يقلل التجاريون من مراكز التحوط البيعية، مما قد يشير إلى توقع استقرار أو ارتداد.";
        } else {
            summary = "المراكز متوازنة على عقود المؤشر الآجلة، مما يعكس حالة من الترقب في السوق.";
        }
        
        return { summary, sentimentScore, largeSpeculators, commercials, smallSpeculators };
    }


    // --- Base Positions Simulation for other assets ---
    const baseTotalContracts = 100000 + (hash % 50000);
    
    // Large Speculators (Trend Followers)
    const largeSpecBaseLong = baseTotalContracts * (0.35 + ((hash % 10) / 100));
    const largeSpecBaseShort = baseTotalContracts * (0.20 + ((hash % 10) / 100));
    
    // Commercials (Hedgers, often counter-trend)
    const commercialsBaseLong = baseTotalContracts * (0.25 + ((hash % 8) / 100));
    const commercialsBaseShort = baseTotalContracts * (0.40 + ((hash % 12) / 100));

    // Small Speculators (Retail, often counter-trend at extremes)
    const smallSpecBaseLong = baseTotalContracts * (0.05 + ((hash % 5) / 100));
    const smallSpecBaseShort = baseTotalContracts * (0.03 + ((hash % 5) / 100));

    // --- Adjust Positions Based on Momentum ---
    const momentumFactor = 500000;
    const largeSpeculators: TraderGroupPositions = {
        long: Math.round(largeSpecBaseLong + (momentum > 0 ? momentum * momentumFactor : 0)),
        short: Math.round(largeSpecBaseShort - (momentum < 0 ? momentum * momentumFactor : 0)),
        net: 0
    };

    const commercials: TraderGroupPositions = {
        long: Math.round(commercialsBaseLong - (momentum < 0 ? momentum * momentumFactor * 0.8 : 0)),
        short: Math.round(commercialsBaseShort + (momentum > 0 ? momentum * momentumFactor * 0.8 : 0)),
        net: 0
    };
    
    const smallSpeculators: TraderGroupPositions = {
        long: Math.round(smallSpecBaseLong - (momentum < 0 ? momentum * momentumFactor * 0.5 : 0)),
        short: Math.round(smallSpecBaseShort + (momentum > 0 ? momentum * momentumFactor * 0.2 : 0)),
        net: 0
    };

    // Calculate net positions
    largeSpeculators.net = largeSpeculators.long - largeSpeculators.short;
    commercials.net = commercials.long - commercials.short;
    smallSpeculators.net = smallSpeculators.long - smallSpeculators.short;

    // --- Calculate Sentiment Score ---
    // Based on the normalized net position of Large Speculators (trend-followers).
    const totalLargeSpecContracts = largeSpeculators.long + largeSpeculators.short;
    const sentimentScore = totalLargeSpecContracts > 0 ? largeSpeculators.net / totalLargeSpecContracts : 0;
    
    // --- Generate Summary ---
    let summary = '';
    if (sentimentScore > 0.3) {
        summary = "تظهر بيانات COT تمركزًا شرائيًا قويًا من كبار المضاربين، مما يشير إلى توقعات إيجابية للاتجاه. التجاريون (Commercials) يزيدون من مراكز البيع للتحوط.";
    } else if (sentimentScore < -0.3) {
        summary = "تظهر بيانات COT تمركزًا بيعيًا قويًا من كبار المضاربين، مما يشير إلى توقعات سلبية للاتجاه. التجاريون (Commercials) يزيدون من مراكز الشراء للتحوط.";
    } else {
        summary = "تمركزات السوق متوازنة نسبيًا. لا يوجد انحياز واضح من كبار المتداولين في الوقت الحالي.";
    }

    return {
        summary,
        sentimentScore,
        largeSpeculators,
        commercials,
        smallSpeculators
    };
};