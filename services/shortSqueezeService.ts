import type { Candle, ShortSqueezeAnalysis } from '../types';

// This is a simulation service for Short Squeeze detection.

export const analyzeShortSqueeze = (candles: Candle[], pair: string): ShortSqueezeAnalysis => {
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const recentCandles = candles.slice(-100);

    const noSqueeze: ShortSqueezeAnalysis = {
        squeezePressure: 10 + (hash % 20), // A low random base pressure
        shortInterestIndex: 15 + (hash % 15),
        costToBorrow: 0.5 + ((hash % 10) / 10),
        daysToCover: 0.5 + ((hash % 5) / 10),
        fundingRate: 0.01,
        summary: "الظروف الحالية لا تشير إلى وجود ضغط سعري على البائعين. المخاطر منخفضة."
    };

    if (recentCandles.length < 100) {
        return noSqueeze;
    }

    // Condition 1: Price has been in a downtrend or consolidation.
    const maxPrice = Math.max(...recentCandles.map(c => c.close));
    const currentPrice = recentCandles[recentCandles.length - 1].close;
    const priceIsDepressed = currentPrice < (maxPrice * 0.9); // Price is at least 10% off its recent high

    // Condition 2: Volume has been low recently.
    const avgVolumeLast20 = recentCandles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
    const avgVolumePrev80 = recentCandles.slice(0, 80).reduce((sum, c) => sum + c.volume, 0) / 80;
    const volumeIsLow = avgVolumeLast20 < (avgVolumePrev80 * 0.7);

    // Condition 3: A recent small price pop.
    const pricePop = currentPrice > recentCandles[recentCandles.length - 6].close;
    
    // Only proceed if conditions are met (tuned for ~20% of pairs to show high potential)
    if (!priceIsDepressed || !volumeIsLow || !pricePop || (hash % 10 > 2)) {
        return noSqueeze;
    }

    // --- Conditions met, simulate high-pressure metrics ---
    const shortInterestIndex = 60 + (hash % 35);
    const costToBorrow = 5 + (hash % 15);
    const daysToCover = 2.5 + (hash % 4);
    const fundingRate = -0.05 - ((hash % 15) / 1000);

    // Normalize metrics to a 0-100 score for pressure calculation
    const shortInterestScore = shortInterestIndex;
    const daysToCoverScore = Math.min(100, (daysToCover / 6) * 100); // 6 days is max pressure
    const fundingRateScore = Math.min(100, (Math.abs(fundingRate) / 0.2) * 100); // -0.2% is max pressure
    const priceActionScore = 75; // Constant score since we passed the checks

    const squeezePressure = Math.round(
        (shortInterestScore * 0.4) +
        (daysToCoverScore * 0.3) +
        (fundingRateScore * 0.2) +
        (priceActionScore * 0.1)
    );

    const summary = `ضغط عالٍ على البائعين! مؤشر الفائدة المفتوحة المرتفع، تكلفة الاقتراض العالية، وارتفاع عدد أيام التغطية تشير إلى أن أي حركة سعرية صاعدة قد تجبر البائعين على إغلاق مراكزهم بسرعة، مما يغذي ارتفاعًا حادًا.`;

    return {
        squeezePressure: Math.min(99, squeezePressure),
        shortInterestIndex,
        costToBorrow,
        daysToCover,
        fundingRate,
        summary
    };
};