
import type { Candle, ElliottWaveAnalysis, ElliottWavePoint, ElliottWaveScenario, WaveValidationRule } from '../types';

// --- Helper: Calculate Awesome Oscillator (EWO) ---
const calculateEWO = (candles: Candle[]): number[] => {
    const closes = candles.map(c => c.close);
    if (closes.length < 35) return new Array(closes.length).fill(0);

    const sma5 = [];
    const sma34 = [];
    for(let i=0; i<closes.length; i++) {
        const s5 = i >= 4 ? closes.slice(i-4, i+1).reduce((a,b)=>a+b,0)/5 : closes[i];
        const s34 = i >= 33 ? closes.slice(i-33, i+1).reduce((a,b)=>a+b,0)/34 : closes[i];
        sma5.push(s5);
        sma34.push(s34);
    }
    return sma5.map((s, i) => s - sma34[i]);
};

// --- Helper: Find Swings (Updated) ---
const findSwings = (candles: Candle[], lookback: number) => {
    const points = [];
    for (let i = lookback; i < candles.length - lookback; i++) {
        const slice = candles.slice(i - lookback, i + lookback + 1);
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;
        const max = Math.max(...slice.map(c => c.high));
        const min = Math.min(...slice.map(c => c.low));

        if (currentHigh === max) points.push({ type: 'high', price: currentHigh, index: i });
        else if (currentLow === min) points.push({ type: 'low', price: currentLow, index: i });
    }
    
    // Advanced Filtering: Remove noise
    const filtered = [];
    for(const p of points) {
        if(filtered.length === 0) { filtered.push(p); continue; }
        const last = filtered[filtered.length-1];
        if(last.type !== p.type) filtered.push(p);
        else {
            // Keep more extreme
            if(p.type === 'high' && p.price > last.price) filtered[filtered.length-1] = p;
            else if(p.type === 'low' && p.price < last.price) filtered[filtered.length-1] = p;
        }
    }
    return filtered;
};

export const analyzeWaves = (candles: Candle[]): ElliottWaveAnalysis => {
    if(candles.length < 100) {
        return {
            summary: "بيانات غير كافية.",
            currentWave: "Unknown",
            longTermTargets: [],
            invalidationLevel: 0,
            points: [],
            confidenceScore: 0
        };
    }

    const swings = findSwings(candles, 5); 
    const ewo = calculateEWO(candles);
    
    let primaryScenario: ElliottWaveScenario | undefined;
    let alternateScenario: ElliottWaveScenario | undefined;
    let checklist: WaveValidationRule[] = [];

    // --- SCENARIO 1: BULLISH IMPULSE (1-2-3-4-5) ---
    // Logic: Looking for the most recent 5 swings that could fit
    if (swings.length >= 5) {
        const potential5 = swings.slice(-5);
        // Expect: Low(0) -> High(1) -> Low(2) -> High(3) -> Low(4) -> High(5 proj)
        // Or for completed: L(0)-H(1)-L(2)-H(3)-L(4)-H(5)
        // Let's focus on finding a developing Wave 3, 4, or 5.
        
        // Try to fit last 4 points: 0(L), 1(H), 2(L), 3(H) -> We are in 4(L) or 5(H)
        // Current setup assumption: We are looking for the *next* move.
        
        // Case A: Developing Wave 3 (Strongest)
        // Need: 0(Low), 1(High), 2(Higher Low). Price exploding up.
        const p0 = swings[swings.length-3];
        const p1 = swings[swings.length-2];
        const p2 = swings[swings.length-1];
        
        if (p0.type === 'low' && p1.type === 'high' && p2.type === 'low' && p2.price > p0.price) {
            // Potential 1-2 setup, entering 3
            const w1 = p1.price - p0.price;
            const w2 = p1.price - p2.price;
            const retrace = w2/w1;
            
            // Rules
            const r1 = { name: "W2 لا تكسر قاع W1", passed: p2.price > p0.price, description: "قاعدة حديدية", strict: true };
            const r2 = { name: "ارتداد W2 نموذجي (0.5-0.786)", passed: retrace >= 0.382 && retrace <= 0.9, description: "قاعدة إرشادية", strict: false };
            
            // Targets (Pinball) for Wave 3
            // 1.618 Ext of W1
            const w3Target = p2.price + w1 * 1.618;
            const w3Min = p2.price + w1 * 1.0;
            
            primaryScenario = {
                type: 'Bullish Impulse (Wave 3)',
                probability: r1.passed && r2.passed ? 85 : 60,
                waveCount: ['1', '2', '3'],
                points: [
                    { wave: '0', price: p0.price, index: p0.index, type: 'Impulse' },
                    { wave: '1', price: p1.price, index: p1.index, type: 'Impulse' },
                    { wave: '2', price: p2.price, index: p2.index, type: 'Correction' },
                ],
                targets: [
                    { level: 'W3 (1.0 Ext)', price: w3Min, probability: 'Medium', description: 'أقل هدف للموجة 3' },
                    { level: 'W3 (1.618 Ext)', price: w3Target, probability: 'High', description: 'الهدف الذهبي للموجة 3' },
                    { level: 'W3 (2.618 Ext)', price: p2.price + w1 * 2.618, probability: 'Low', description: 'موجة 3 ممتدة جداً' },
                ],
                invalidationLevel: p0.price,
                summary: "السعر أنهى الموجة 2 وبدأ في الموجة 3 الدافعة. هذا هو السيناريو الأقوى.",
                currentWaveLabel: '3',
                fibLevels: [
                    { level: 1.0, price: w3Min, type: 'Extension' },
                    { level: 1.618, price: w3Target, type: 'Extension' }
                ]
            };
            checklist = [r1, r2];
            
            // Alternate: ABC Corrective
            alternateScenario = {
                type: 'ABC Zigzag',
                probability: 40,
                waveCount: ['A', 'B', 'C'],
                points: primaryScenario.points,
                targets: [{ level: 'C=A', price: p2.price + w1, probability: 'Medium', description: 'تساوي الموجات' }],
                invalidationLevel: p0.price,
                summary: "مجرد تصحيح ABC وليس دافع 123.",
                currentWaveLabel: 'C'
            };
        }
        
        // Case B: Developing Wave 5
        // Need 0(L), 1(H), 2(L), 3(H), 4(L). 3 must be > 1. 4 must not overlap 1.
        else if (swings.length >= 5) {
            const s = swings.slice(-5);
            if (s[0].type === 'low' && s[1].type === 'high' && s[2].type === 'low' && s[3].type === 'high' && s[4].type === 'low') {
                // Check Rules
                const r_w3len = (s[3].price - s[2].price) > (s[1].price - s[0].price); // W3 > W1 usually
                const r_overlap = s[4].price > s[1].price; // W4 no overlap W1
                
                if (r_w3len && r_overlap) {
                    const w1 = s[1].price - s[0].price;
                    const w3 = s[3].price - s[2].price;
                    
                    // W5 Targets: Inverse 1.272-1.618 of W4 retracement OR W1 equality
                    const w4Retrace = s[3].price - s[4].price;
                    const t1 = s[4].price + w1; // W5 = W1
                    const t2 = s[4].price + w4Retrace * 1.618; // Ext
                    
                    primaryScenario = {
                        type: 'Bullish Impulse (Wave 5)',
                        probability: 75,
                        waveCount: ['1', '2', '3', '4', '5'],
                        points: s.map((p, i) => ({ wave: i.toString(), price: p.price, index: p.index, type: i%2===0?'Correction':'Impulse' })),
                        targets: [
                            { level: 'W5=W1', price: t1, probability: 'High', description: 'هدف قياسي' },
                            { level: 'Fib Ext', price: t2, probability: 'Medium', description: 'امتداد' }
                        ],
                        invalidationLevel: s[4].price * 0.98, // Stop below W4
                        summary: "الموجة 4 انتهت، نتوقع الموجة 5 الأخيرة.",
                        currentWaveLabel: '5',
                        fibLevels: [{ level: 1.0, price: t1, type: 'Extension' }]
                    };
                    checklist = [
                        { name: "W3 > W1", passed: r_w3len, description: "الموجة 3 ليست الأقصر", strict: true },
                        { name: "W4 No Overlap", passed: r_overlap, description: "الموجة 4 لا تتداخل مع 1", strict: true }
                    ];
                }
            }
        }
    }

    // --- FALLBACK / DEFAULT ---
    if (!primaryScenario) {
        // Assume Correction or Noise
        primaryScenario = {
            type: 'Complex / Correction',
            probability: 50,
            waveCount: ['?', '?'],
            points: [],
            targets: [],
            invalidationLevel: 0,
            summary: "النمط الموجي غير واضح (Non-Impulsive). يرجى الحذر.",
            currentWaveLabel: '?'
        };
    }

    return {
        summary: primaryScenario.summary,
        currentWave: primaryScenario.currentWaveLabel,
        longTermTargets: primaryScenario.targets.map(t => ({ level: t.level, price: t.price })),
        invalidationLevel: primaryScenario.invalidationLevel,
        points: primaryScenario.points,
        confidenceScore: primaryScenario.probability,
        primaryScenario,
        alternateScenario,
        oscillatorData: { values: ewo.slice(-50), divergence: false, label: 'EWO' },
        validationChecklist: checklist,
        waveDegree: 'Minor'
    };
};
