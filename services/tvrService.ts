import type { Candle, TvrAnalysis } from '../types';
import { TvrBehavioralState, TvrRecommendation } from '../types';

export const analyzeTvr = (candles: Candle[]): TvrAnalysis | null => {
    if (candles.length < 5) {
        return null;
    }

    const lastCandle = candles[candles.length - 1];
    const prev1 = candles[candles.length - 2];
    const prev2 = candles[candles.length - 3];
    const prev3 = candles[candles.length - 4];
    
    // Some assets like indices might have 0 volume, skip them.
    if (!lastCandle || !prev1 || !prev2 || !prev3 || lastCandle.volume === 0) {
        return null;
    }

    const vResponse = lastCandle.volume;
    const vRef = (prev1.volume + prev2.volume + prev3.volume) / 3;

    if (vRef === 0) return null;

    const ratio = vResponse / vRef;
    let state: TvrBehavioralState;
    let discoveryNote = '';

    if (ratio < 0.4) {
        state = TvrBehavioralState.INERTIAL;
        discoveryNote = "إذا كانت الحالة \"حجم متبلد\"، فإن احتمالية استمرار أو انعكاس السعر في الاتجاه الجديد تصل إلى 90%.";
    } else if (ratio > 1.5) {
        state = TvrBehavioralState.AGGRESSIVE;
        discoveryNote = "صراع عنيف بين المشترين والبائعين قد يسبق انعكاسًا أو ذروة انتهاء الاتجاه.";
    } else {
        state = TvrBehavioralState.NORMAL;
        discoveryNote = "استمرارية طبيعية للاتجاه دون زخم خاص.";
    }

    const priceActionContext = lastCandle.close > prev3.close ? 'بعد صعود' : 'بعد هبوط';

    let recommendation: TvrRecommendation = 'انتظار';
    if (state === TvrBehavioralState.INERTIAL) {
        if (priceActionContext === 'بعد صعود') {
            recommendation = 'مواصلة الشراء/الاحتفاظ';
        } else { // بعد هبوط
            recommendation = 'إشارة شراء قوية';
        }
    } else if (state === TvrBehavioralState.AGGRESSIVE) {
        if (priceActionContext === 'بعد صعود') {
            recommendation = 'جني أرباح/بيع';
        } else { // بعد هبوط
            recommendation = 'شراء بحذر';
        }
    }

    return { state, recommendation, vRef, vResponse, discoveryNote, priceActionContext };
};