import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { ScannerCandidate } from '../types';
import { fetchDeepHistoricalData } from '../services/deepAnalysisService';
import type { DeepHistoricalData, Explosion } from '../services/deepAnalysisService';
import DeepAnalysisChart from './DeepAnalysisChart';
import type { ChartData } from './DeepAnalysisChart';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    candidate: ScannerCandidate;
    difficulty: 'Basic' | 'Advanced' | 'Expert';
}

const getPromptByDifficulty = (
    candidate: ScannerCandidate,
    deepData: DeepHistoricalData,
    fibPriceLevels: { level: string; value: number }[],
    fibTimeZones: { level: string; value: number }[],
    difficulty: 'Basic' | 'Advanced' | 'Expert'
): string => {
    const { pair, timeframe, analysis: analysisData, price } = candidate;
    const { explosions } = deepData;

    const explosionsText = explosions.map((e, i) => 
        `**الانفجار ${i+1} (ذروة عند الشمعة ${e.peakIndex}):**
- **المدة:** ${e.endIndex - e.startIndex} شمعة
- **الارتفاع:** +${e.priceChange.toFixed(2)}%
- **الظروف الطيفية السابقة:** ${e.preExplosionState}`
    ).join('\n');

    const elliottWaveText = analysisData.elliottWave && analysisData.elliottWave.longTermTargets.length > 0 ? `
**الجزء الثاني: التحليل الموجي (Elliott Wave)**
*   **الملخص:** ${analysisData.elliottWave.summary}
*   **الموجة الحالية:** ${analysisData.elliottWave.currentWave}
*   **الأهداف الاستراتيجية:** ${analysisData.elliottWave.longTermTargets.map(t => `${t.level}: ${t.price.toFixed(4)}`).join('\n    ')}
*   **مستوى الإلغاء الحرج:** ${analysisData.elliottWave.invalidationLevel.toFixed(4)}
` : '';
    
    const harmonicText = analysisData.harmonicPattern && analysisData.harmonicPattern.detected ? `
**الجزء الثالث: تحليل الهارمونيك**
*   **النموذج المكتشف:** ${analysisData.harmonicPattern.patternName}
*   **منطقة الانعكاس المحتملة (PRZ):** ${analysisData.harmonicPattern.potentialReversalZone?.start.toFixed(4)} - ${analysisData.harmonicPattern.potentialReversalZone?.end.toFixed(4)}
*   **الأهداف:** ${analysisData.harmonicPattern.targets?.map(t => `${t.level}: ${t.price.toFixed(4)}`).join(' / ')}
*   **وقف الخسارة:** ${analysisData.harmonicPattern.stopLoss?.toFixed(4)}
` : '';


    const commonPromptPart = `
أنت محلل فني وخبير في التحليل الكمي، متخصص في دمج التحليل الطيفي، الموجي، ونماذج فيبوناتشي والهارمونيك لتوقع تحركات السوق الكبرى. مهمتك هي إعداد تقرير تحليل عميق، احترافي، وشامل لعملة ${pair}. يجب أن يكون الناتج باللغة العربية.

**الجزء الأول: تحليل البيانات التاريخية والطيفية**
لقد قمنا بتحديد أقوى 3 انفجارات سعرية تاريخية لـ ${pair}. هذه هي بصمتها الطيفية:
${explosionsText}

**البيانات الفنية الحالية:**
*   **الإطار الزمني:** ${timeframe}
*   **السعر الحالي:** ${price.toFixed(4)} USDT
*   **الحالة الطيفية:** ${analysisData.state}
*   **الزخم (20 شمعة):** ${analysisData.momentum.toFixed(2)}%
*   **زاوية الطور:** ${analysisData.currentPhaseAngle.toFixed(0)}°
*   **مؤشر النظام:** ${analysisData.regimeScore.toFixed(2)}

${elliottWaveText}

${harmonicText}

**الجزء الرابع: تحليل فيبوناتشي التوقعي**
لقد قمنا بحساب مستويات فيبوناتشي الزمنية والسعرية المحتملة بناءً على الدورات التاريخية:
*   **مناطق فيبوناتشي الزمنية المتوقعة:** الشمعة ~${fibTimeZones[0].value}, الشمعة ~${fibTimeZones[1].value}, الشمعة ~${fibTimeZones[2].value}.
*   **مستويات فيبوناتشي السعرية الرئيسية:**
    ${fibPriceLevels.map(l => `- ${l.level}: ${l.value.toFixed(4)} USDT`).join('\n    ')}
`;

    switch (difficulty) {
        case 'Basic':
            return `${commonPromptPart}
**المهمة: إنشاء ملخص بسيط**
بناءً على كل ما سبق، قم بإنشاء تقرير بسيط جداً باللغة العربية ومناسب للمبتدئين.
1.  **ماذا حدث في الماضي؟** لخص بكلمات بسيطة جدًا، هل تتشابه الظروف الحالية مع ما حدث قبل الارتفاعات الكبيرة السابقة؟
2.  **ماذا نتوقع؟** بناءً على كل التحليلات، ما هو الهدف السعري الكبير القادم للعملة؟ قدم إجابة مباشرة وبسيطة.`;
        
        case 'Expert':
            return `${commonPromptPart}
**المهمة: إنشاء تقرير تحليل فني عميق للمحترفين**
بناءً على كل ما سبق، قم بإنشاء تقرير نقدي، مفصل، ومنظم.
1.  **"نقد ومزامنة النماذج (Confluence Analysis)":** حلل بعمق مدى توافق النماذج الأربعة (البصمة التاريخية، الموجي، الهارمونيك، وفيبوناتشي). هل هناك أي تعارض بينها؟ ابحث عن نقاط الالتقاء الحرجة (High Confluence Zones)، مثلاً: هل يقع هدف موجي رئيسي داخل منطقة PRZ للهارمونيك ويتوافق مع امتداد فيبوناتشي تاريخي؟ وهل تتوافق المناطق الزمنية مع نقاط التحول الموجية المحتملة؟
2.  **"التحليل الطيفي كعامل تأكيد":** استخدم البيانات الطيفية الحالية كفلتر نهائي. هل تؤكد هذه البيانات صحة سيناريو الانعكاس من منطقة الالتقاء الحرجة؟ أم تشير إلى احتمالية فشله أو تأجيله؟ قارن بدقة بين الظروف الطيفية الحالية والظروف التاريخية، مبرزاً أوجه التشابه والاختلاف.
3.  **"استراتيجية التداول المتكاملة":** بناءً على هذا التكامل، اقترح استراتيجية تداول مفصلة:
    *   **مناطق الدخول المحتملة (Zones):** حدد نطاقات سعرية للدخول بدلاً من نقطة واحدة، مع ذكر الشروط الطيفية المطلوبة داخل كل نطاق.
    *   **تحديد الأهداف بدقة:** حدد أهدافًا متعددة بناءً على تقاطع مستويات فيبوناتشي والأهداف الموجية وأهداف الهارمونيك.
    *   **إدارة المخاطر الديناميكية:** اشرح كيف يمكن استخدام مستويات وقف الخسارة من الهارمونيك والموجي، مع تحديد نقاط خروج مبكرة بناءً على تدهور المؤشرات الطيفية.`;

        case 'Advanced':
        default:
            return `${commonPromptPart}
**المهمة: إنشاء تقرير التحليل العميق**
بناءً على كل ما سبق، قم بإنشاء تقرير مفصل ومنظم.
1.  **"تحليل البصمة التاريخية":** هل تتشابه الظروف الطيفية الحالية مع الظروف التي سبقت الانفجارات التاريخية؟
2.  **"الهياكل الفنية المتكاملة":** اشرح كيف يتناسب السعر حاليًا ضمن الهيكل الموجي والهارمونيكي. هل يكمل أحدهما الآخر؟
3.  **"السيناريو المستقبلي المتوقع (دمج النماذج)":**
    *   **التوقيت المحتمل:** هل تتوافق مناطق فيبوناتشي الزمنية مع نقاط الانعكاس المتوقعة من الهارمونيك أو الموجي؟
    *   **الأهداف السعرية المتقاطعة:** حدد أهم هدف سعري مستقبلي، وهو المستوى الذي يتوافق فيه هدف موجي مع هدف هارمونيك ومستوى امتداد فيبوناتشي.
    *   **نقاط القرار الرئيسية:** حدد:
        *   **نقطة تأكيد السيناريو:** مستوى سعري يجب اختراقه لتأكيد صحة التحليل.
        *   **الهدف الرئيسي:** الهدف السعري المتقاطع الذي تم تحديده.
        *   **مستوى إبطال السيناريو:** استخدم مستوى الإلغاء الأقرب (من الهارمونيك أو الموجي) كنقطة وقف نهائية للتحليل.`;
    }
};


const DeepAnalysis: React.FC<Props> = ({ candidate, difficulty }) => {
    const [analysisReport, setAnalysisReport] = useState('');
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!candidate) return;

        const generateAnalysis = async () => {
            setIsLoading(true);
            setError(null);
            setAnalysisReport('');
            setChartData(null);

            try {
                // 1. Fetch deep historical data & calculate chart data (this is local & fast)
                const deepData = fetchDeepHistoricalData(candidate.pair);
                const { candles } = deepData;

                const lastSwingCandles = candles.slice(-150);
                const high = Math.max(...lastSwingCandles.map(c => c.close));
                const low = Math.min(...lastSwingCandles.map(c => c.close));
                const fibPriceLevels = [
                    { level: '1.618', value: high + (high - low) * 0.618 },
                    { level: '1.000', value: high },
                    { level: '0.618', value: high - (high - low) * 0.382 },
                    { level: '0.500', value: high - (high - low) * 0.5 },
                    { level: '0.382', value: high - (high - low) * 0.618 },
                    { level: '0.000', value: low },
                ];

                const t1 = deepData.explosions[0].peakIndex;
                const t2 = deepData.explosions[1].peakIndex;
                const t3 = deepData.explosions[2].peakIndex;
                const lastCandleIndex = candles.length -1;
                const fibTimeZones = [
                    { level: 'T1', value: lastCandleIndex + (t2 - t1) },
                    { level: 'T2', value: lastCandleIndex + (t3 - t2) },
                    { level: 'T3', value: lastCandleIndex + (t3 - t1) },
                ];
                
                const predictedPath = [
                    candles[candles.length - 1],
                    { close: candidate.price * 1.05, timestamp: lastCandleIndex + (fibTimeZones[0].value - lastCandleIndex)/2 },
                    { close: fibPriceLevels[0].value, timestamp: fibTimeZones[0].value },
                ];
                
                setChartData({ candles, explosions: deepData.explosions, fibPriceLevels, fibTimeZones, predictedPath });

                // 2. Check cache for AI report
                const cacheKey = `deep-${candidate.pair}-${candidate.timeframe}-${difficulty}`;
                const cachedReport = getCachedAiResponse(cacheKey);

                if (cachedReport) {
                    setAnalysisReport(cachedReport);
                } else {
                    // 3. If not cached, generate report via AI
                    if (!process.env.API_KEY) {
                        throw new Error("API key is not configured.");
                    }
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    const prompt = getPromptByDifficulty(candidate, deepData, fibPriceLevels, fibTimeZones, difficulty);
                    const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
                    
                    setCachedAiResponse(cacheKey, response.text);
                    setAnalysisReport(response.text);
                }

            } catch (err: any) {
                console.error("Error generating deep AI analysis:", err);
                if (err.message?.includes('429') || err.status === 429 || err.code === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
                    setError("⚠️ تم تجاوز حد الاستخدام (Quota Exceeded). يرجى الانتظار لحظة ثم المحاولة مرة أخرى.");
                } else {
                    setError("فشل في توليد التحليل العميق. قد تكون هناك مشكلة في الاتصال بالخدمة.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        generateAnalysis();
    }, [candidate, difficulty]);
    
    const handleDownloadPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;
        
        if (!reportRef.current || !html2canvas || !jsPDF) {
            alert("لا يمكن إنشاء الملف. المكتبات المطلوبة غير متوفرة.");
            return;
        }

        const reportElement = reportRef.current;
        const originalBackgroundColor = reportElement.style.backgroundColor;
        reportElement.style.backgroundColor = '#161b22'; // Match panel bg for capture

        html2canvas(reportElement, {
            scale: 2, // Higher resolution
            useCORS: true,
            backgroundColor: '#161b22',
        }).then((canvas: HTMLCanvasElement) => {
             reportElement.style.backgroundColor = originalBackgroundColor;
             const imgData = canvas.toDataURL('image/png');
             const pdf = new jsPDF({
                 orientation: 'p',
                 unit: 'px',
                 format: [canvas.width, canvas.height]
             });
             pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
             pdf.save(`WaveSight_Deep_Analysis_${candidate.pair.replace('/', '_')}.pdf`);
        });
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-yellow-glow/30 mt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m6 4v4m-2-2h4M12 3v1m0 16v1m-6.364-2.364l.707-.707M6.343 6.343l-.707-.707m12.728 0l.707-.707M17.657 17.657l.707.707M18 12h1M5 12H4" />
                    </svg>
                    <span>تقرير التحليل العميق (تاريخي وتوقعي)</span>
                </div>
                 {!isLoading && analysisReport && (
                    <button onClick={handleDownloadPDF} className="text-xs bg-gray-700/80 text-cyan-glow font-semibold py-1 px-3 rounded-md border border-gray-600 hover:bg-gray-700 hover:border-cyan-glow/50 transition-colors">
                        تنزيل التقرير (PDF)
                    </button>
                 )}
            </h3>
            {isLoading && (
                 <div className="space-y-4 animate-pulse pt-2">
                    <div className="h-64 bg-gray-700 rounded-lg w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/3 mt-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-700 rounded w-full"></div>
                </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            {!isLoading && !error && chartData && (
                <div ref={reportRef} className="p-2 bg-gray-800 rounded-md">
                     <div className="h-80 w-full mb-4">
                        <DeepAnalysisChart {...chartData} />
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed" dir="rtl">
                        {analysisReport}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeepAnalysis;