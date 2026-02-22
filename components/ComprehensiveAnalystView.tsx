
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import type { ScannerCandidate, BacktestResult, FullInstantaneousAnalysis, MicroAnalysisResult } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';
import { fetchDeepHistoricalData } from '../services/deepAnalysisService';
import { runAllBacktests } from '../services/strategyBacktestService';
import { getInstantaneousAnalysis } from '../services/microExplosionService';
import DeepAnalysisChart from './DeepAnalysisChart';
import type { ChartData as DeepChartData } from './DeepAnalysisChart';
import SimpleLineChart from './LineChart';

// --- Helper functions for Prompt Construction ---

const buildComprehensivePrompt = (
    candidate: ScannerCandidate,
    deepData: any,
    backtestResults: BacktestResult[],
): string => {
    const { pair, timeframe, analysis, price } = candidate;

    const formatSection = (title: string, data: any, formatter: (d: any) => string) => {
        if (!data) return '';
        const content = formatter(data);
        return content ? `**${title}:**\n${content}\n` : '';
    };

    const currentDataText = `
- **Price:** ${price.toFixed(4)} USDT on ${timeframe}
- **Spectral State:** ${analysis.state} (Regime Score: ${analysis.regimeScore.toFixed(2)})
- **Momentum (20p):** ${analysis.momentum.toFixed(2)}%
- **Cycle Phase:** ${analysis.currentPhaseAngle.toFixed(0)}°
- **Volume Strength:** ${analysis.volumeStrength || 'N/A'}`;

    const indicatorsText = `
- **RSI (14):** ${analysis.rsi?.toFixed(2) || 'N/A'}
- **MACD Histogram:** ${analysis.macdHistogram?.toFixed(4) || 'N/A'}
- **Bollinger Bands:** Price is ${analysis.bollingerBands ? (price > analysis.bollingerBands.upper ? 'above upper band' : price < analysis.bollingerBands.lower ? 'below lower band' : 'within bands') : 'N/A'}`;

    const structuralText = 
        formatSection('Elliott Wave', analysis.elliottWave, d => d.summary) +
        formatSection('Harmonic Pattern', analysis.harmonicPattern, d => d.detected ? `${d.patternName} detected. PRZ: ${d.potentialReversalZone?.start.toFixed(4)}-${d.potentialReversalZone?.end.toFixed(4)}` : '') +
        formatSection('Classic Patterns', analysis.technicalPatterns, d => d.chartPattern ? `${d.chartPattern.name} (${d.chartPattern.type})` : '');

    const flowText = 
        formatSection('Smart Money Concepts', analysis.smartMoneyAnalysis, d => `Bias: ${d.bias}. ${d.summary}`) +
        formatSection('ICT Analysis', analysis.ictAnalysis, d => `Structure: ${d.marketStructure}. ${d.summary} (Premium/Discount: ${d.premiumDiscount ? 'Active' : 'Inactive'})`) +
        formatSection('Commitment of Traders', analysis.cotAnalysis, d => `Sentiment Score: ${d.sentimentScore.toFixed(2)}. ${d.summary}`) +
        formatSection('Whale Watcher', analysis.whaleWatcherAnalysis, d => `Activity Level: ${d.whaleActivityLevel}. Manipulation Score: ${d.manipulationScore}%. Anomalies: ${d.detectedAnomalies.join(', ')}.`) +
        formatSection('TVRT (Time-Volume Response)', analysis.tvrAnalysis, d => `State: ${d.state}. Recommendation: ${d.recommendation}. Note: ${d.discoveryNote}`);

    const advancedGeometryText = 
        formatSection('Gann Analysis', analysis.gannAnalysis, d => d.summary) +
        (analysis.gannAnalysis?.toolbox ? `
**Gann Master Toolbox Data:**
- **Rule of 8ths:** Nearest: ${analysis.gannAnalysis.toolbox.ruleOf8ths.nearestLevel} (${analysis.gannAnalysis.toolbox.ruleOf8ths.nearestPrice.toFixed(4)})
- **Wheel of 24:** Segment ${analysis.gannAnalysis.toolbox.wheelOf24.activeSegment}/12
- **Mechanical Swing:** Trend ${analysis.gannAnalysis.toolbox.mechanicalSwing.trend}
- **Octaves:** Up: ${analysis.gannAnalysis.toolbox.octaves.up.toFixed(4)}, Down: ${analysis.gannAnalysis.toolbox.octaves.down.toFixed(4)}
- **Polarity:** ${analysis.gannAnalysis.toolbox.polarity.status} (Mid: ${analysis.gannAnalysis.toolbox.polarity.value.toFixed(4)})
` : '') +
        formatSection('Gann-Fractal Nexus', analysis.nexusAnalysis, d => `Confluence Score: ${d.confluenceScore}%. Recommendation: ${d.recommendation}. Summary: ${d.summary}`);

    const marketDynamicsText = 
        formatSection('Short Squeeze', analysis.shortSqueezeAnalysis, d => `Pressure: ${d.squeezePressure}%. Summary: ${d.summary}`) +
        formatSection('Liquidation Map', analysis.liquidationMap, d => d.summary) +
        formatSection('Volume Profile', analysis.volumeProfileAnalysis, d => d.summary) +
        formatSection('Seasonality', analysis.seasonalityAnalysis, d => d.summary) + 
        formatSection('Ichimoku Cloud', analysis.ichimokuAnalysis, d => `Cloud State: ${d.cloudState}. Balance Score: ${d.balanceScore}. ${d.summary}`);

    const fractalText = 
        formatSection('Fractal Analysis', analysis.fractalAnalysis, d => d.summary) +
        `**Historical Footprints:**\n${deepData.explosions.map((e: any, i: number) => `- Explosion ${i+1}: ${e.preExplosionState}`).join('\n')}`;

    const backtestText = `**Backtest Results:**\n${backtestResults.map(r => `- ${r.strategyName}: Profit Factor ${r.profitFactor.toFixed(2)}, Win Rate ${r.winRate}%`).join('\n')}`;

    return `
You are "WaveSight AI", the most advanced quantitative and technical analysis engine ever created. Your task is to synthesize a MASSIVE amount of multi-dimensional market data for ${pair} into a single, coherent, professional investment report.

**THE GOAL:** To find the "Golden Thread" of truth by cross-referencing Geometric, Volumetric, Structural, and Seasonal data. The output must be in Arabic.

---
### **INPUT DATA SYNOPSIS**
---
**1. Core Metrics:**
${currentDataText}
${indicatorsText}

**2. Market Structure & Geometry:**
${structuralText}
${advancedGeometryText}

**3. Volume, Flow & Manipulation:**
${flowText}

**4. Market Dynamics & Environment:**
${marketDynamicsText}

**5. Fractal & Historical Context:**
${fractalText}

**6. Strategy Validation:**
${backtestText}

---
### **TASK: PRODUCE THE MASTER INTELLIGENCE REPORT**
---
Structure your response *exactly* as follows using Markdown.

# تقرير الذكاء الاصطناعي الشامل (WaveSight Master Report) لـ ${pair}

## 1. الخلاصة الاستراتيجية (The Executive Verdict)
(ابدأ بفقرة قوية وحاسمة. هل نحن أمام فرصة "ذهبية"، "مخاطرة عالية"، أم "ترقب"؟ لخص السبب الرئيسي في جملتين بدمج أقوى إشارة فنية مع أقوى إشارة حجمية.)

## 2. التشريح الهندسي والهيكلي (Deep Geometric Anatomy)
(ادمج بيانات جان المتقدمة (Toolbox & Nexus) مع موجات إليوت. هل يتوافق "الزمن" مع "السعر"؟ هل يدعم هيكل السوق (SMC/ICT) الاتجاه الهندسي؟ تحدث عن زاوية الاهتزاز ومستويات الأوكتاف.)

## 3. تحليل التدفق المالي وكشف التلاعب (Flow & Manipulation)
(ركز على بيانات الحيتان (Whale Watcher)، اختبار استجابة الحجم (TVRT)، والضغط البيعي (Short Squeeze). هل هناك تجميع خفي؟ هل هناك مصائد سيولة؟ اين يتمركز كبار اللاعبين؟)

## 4. تقييم البيئة والتوقيت (Environment & Timing)
(استخدم بيانات إيشيموكو، والموسمية، والبروفايل الحجمي. هل الوقت الحالي مناسب للدخول؟ هل نحن في موسم صعود للعملة؟ ما هي حالة "سحابة" الاتجاه؟)

## 5. الاستراتيجية المثلى للتنفيذ (Tactical Execution)
(بناءً على نتائج الاختبار التاريخي (Backtest) والظروف الحالية، حدد أفضل طريقة للدخول.)
- **الاستراتيجية المقترحة:** (اسم الاستراتيجية الأنسب)
- **تأكيد الدخول:** (ما الشرط الذي يجب انتظاره قبل الضغط على الزر؟)

## 6. الحكم النهائي (Final Judgment)
(قدم تقييمًا نهائيًا مركبًا.)
- **اتجاه السوق المتوقع:** (صاعد / هابط / عرضي)
- **درجة الثقة:** (0-100%)
- **عامل المخاطرة:** (منخفض / متوسط / مرتفع)

## 7. خريطة الطريق السعرية (Price Roadmap)
(لخص المستويات الحرجة في جدول نصي بسيط)
- **منطقة الاقتناص (Sniper Zone):** [سعر/نطاق] - (سبب الاختيار)
- **الهدف الأول (تأمين):** [سعر] - (سبب الاختيار)
- **الهدف الرئيسي (Moonshot):** [سعر] - (سبب الاختيار)
- **منطقة الخطر (Stop Loss):** [سعر] - (سبب الاختيار)
`;
};

const buildNext2HoursPrompt = (
    pair: string,
    currentPrice: number,
    instantaneousAnalysis: FullInstantaneousAnalysis
): string => {
    const analysisText = Object.entries(instantaneousAnalysis).map(([tf, analysis]) => `
- **Timeframe ${tf}:**
  - Micro Volume Flow: ${(analysis as MicroAnalysisResult).confirmationSignals.microVolumeFlow.toFixed(2)}
  - Phase Coherence: ${(analysis as MicroAnalysisResult).confirmationSignals.phaseCoherence.toFixed(2)}
  - Predicted Time Window: ${(analysis as MicroAnalysisResult).nextMajorTimeCluster} minutes from now.
`).join('');

    return `
You are a high-frequency trading analyst specializing in micro-timeframe price action. Analyze the following real-time data for ${pair} (current price: ${currentPrice.toFixed(4)}) and provide a complete trade setup for the next 2 hours.

**Current Instantaneous Analysis:**
${analysisText}

**Task:**
Provide a complete, structured response in Arabic. Do not add any extra commentary outside of the requested format.

### التحليل اللحظي (الساعتان القادمتان)
**التوصية:** (A single word: BUY, SELL, or HOLD)
**الأساس المنطقي:** (A short, concise paragraph explaining your decision based on the confluence of signals from the 1m, 5m, and 15m data. For example, "A BUY is recommended due to positive micro-volume flow across all timeframes, high phase coherence on the 15m chart, and an imminent time window for a potential upward move.")

### إعداد الصفقة
**سعر الدخول:** (A specific, realistic price near the current price)
**وقف الخسارة:** (A specific, tight stop-loss price)

### الأهداف السعرية
**الهدف 1 (مضاربة سريعة):** ...
**الهدف 2 (متحفظ):** ...
**الهدف 3 (قياسي):** ...
**الهدف 4 (جريء):** ...
**الهدف 5 (متفائل):** ...
**الهدف 6 (انفجاري):** ...
**الهدف 7 (أقصى تفاؤل):** ...

### مسار السعر المتوقع (JSON)
(Provide a JSON array of exactly 120 numbers normalized between 0.0 and 1.0, representing the price path for the next 120 minutes. The path should reflect your BUY/SELL/HOLD recommendation. 0.0 is the Stop-Loss price, 1.0 is the highest 'Moonshot' target.)
\`\`\`json
[...]
\`\`\`
`;
};

const buildVideoScriptPrompt = (
    candidate: ScannerCandidate,
    backtestResults: BacktestResult[],
    fullReportMarkdown: string,
): string => {
    const { pair, analysis } = candidate;

    const bestStrategy = backtestResults.length > 0
        ? backtestResults.sort((a, b) => b.profitFactor - a.profitFactor)[0]
        : { strategyName: 'N/A', profitFactor: 0 };
    
    const mainConclusion = fullReportMarkdown.split('## 1. الخلاصة الاستراتيجية')[1]?.split('##')[0]?.trim() || "تحليلنا يشير إلى حركة سعرية قادمة.";
    const criticalLevel = analysis.elliottWave?.invalidationLevel?.toFixed(4) || analysis.harmonicPattern?.potentialReversalZone?.start.toFixed(4) || analysis.swingHigh.toFixed(4);

    return `
You are a creative director and scriptwriter for a high-energy financial news channel on TikTok and YouTube Shorts. Your task is to create a short, punchy, and visually-driven video script based on a deep financial analysis for the crypto pair ${pair}.

**Core Analysis Conclusion:**
- ${mainConclusion}

**Key Data Points:**
- **Current State:** ${analysis.state}
- **Most Profitable Strategy (Backtested):** ${bestStrategy.strategyName} (Profit Factor: ${bestStrategy.profitFactor.toFixed(2)})
- **Critical Level:** A key support/resistance level identified is around ${criticalLevel}.

**TASK: Write a 15-20 second video script.**
The script should be in Arabic and follow this structure exactly, using Markdown for scene descriptions. The tone must be exciting, fast-paced, and clear.

### **مشهد 1: المقدمة (3 ثوانٍ)**
- **(صورة):** لقطة مقربة لشعار عملة ${pair} يتوهج بشكل رقمي. موسيقى إلكترونية سريعة تبدأ.
- **(نص على الشاشة):** هل تستعد ${pair} للانفجار؟
- **(تعليق صوتي - سريع وحماسي):** "تحليل حصري لعملة ${pair} في أقل من 20 ثانية! هل ستكون هذه هي الفرصة القادمة؟"

### **مشهد 2: البيانات (7 ثوانٍ)**
- **(صورة):** لقطات سريعة لرسوم بيانية متحركة، أرقام متغيرة، ومؤشرات فنية. التركيز على الحركة السريعة.
- **(نص على الشاشة):**
    - الحالة الطيفية: ${analysis.state}
    - أفضل استراتيجية: ${bestStrategy.strategyName}
    - منطقة حرجة: ${criticalLevel}
- **(تعليق صوتي):** "بياناتنا تظهر حالة **${analysis.state}**. استراتيجيتنا الأقوى تاريخيًا هي **'${bestStrategy.strategyName}'**. عينك على مستوى **${criticalLevel}**!"

### **مشهد 3: الخلاصة (5 ثوانٍ)**
- **(صورة):** رسم بياني مبسط يظهر مسارًا سعريًا متوقعًا (صاعدًا أو هابطًا) مع ظهور شعار "WaveSight AI".
- **(نص على الشاشة):** تحليل أعمق؟ الرابط في الوصف!
- **(تعليق صوتي):** "الخلاصة: ${mainConclusion.substring(0, 100)}... هذا ليس نصيحة مالية. قم بأبحاثك الخاصة!"
`;
};

interface Props {
    candidate: ScannerCandidate;
    onClose: () => void;
}

const ComprehensiveAnalystView: React.FC<Props> = ({ candidate, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('جاري تهيئة المحلل الذكي...');
    const [error, setError] = useState<string | null>(null);
    const [reportMarkdown, setReportMarkdown] = useState('');
    const [deepChartData, setDeepChartData] = useState<DeepChartData | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    // State for Next 2 Hours
    const [isNext2HoursLoading, setIsNext2HoursLoading] = useState(false);
    const [next2HoursError, setNext2HoursError] = useState<string | null>(null);
    const [next2HoursReport, setNext2HoursReport] = useState<string | null>(null);
    const [next2HoursChartData, setNext2HoursChartData] = useState<any[] | null>(null);

    // State for video script generator
    const [isScriptLoading, setIsScriptLoading] = useState(false);
    const [scriptError, setScriptError] = useState<string | null>(null);
    const [generatedScript, setGeneratedScript] = useState('');
    const scriptRef = useRef<HTMLDivElement>(null);
    const [backtestData, setBacktestData] = useState<BacktestResult[]>([]);

    // State for image generator
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // State for video generator
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
    const [isApiKeySelected, setIsApiKeySelected] = useState(true);

    useEffect(() => {
        const checkApiKey = async () => {
            if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
                setIsApiKeySelected(true);
            } else {
                setIsApiKeySelected(false);
            }
        };
        checkApiKey();
        
        const generateReport = async () => {
            try {
                const cacheKey = `comprehensive-v3-${candidate.pair}-${candidate.timeframe}`;
                const cached = getCachedAiResponse(cacheKey);
                if (cached) {
                    const backtests = await runAllBacktests(candidate.pair, []);
                    setBacktestData(backtests);
                    setReportMarkdown(cached);
                    const deepData = fetchDeepHistoricalData(candidate.pair);
                    setDeepChartData({ ...deepData, fibPriceLevels: [], fibTimeZones: [], predictedPath: [] });
                    setIsLoading(false);
                    return;
                }

                setLoadingMessage('جاري جمع البيانات التاريخية والاستراتيجية وكافة المؤشرات الجديدة...');
                const deepData = fetchDeepHistoricalData(candidate.pair);
                const backtests = await runAllBacktests(candidate.pair, []);
                setBacktestData(backtests);
                setDeepChartData({ ...deepData, fibPriceLevels: [], fibTimeZones: [], predictedPath: [] });

                setLoadingMessage('يقوم الذكاء الاصطناعي بتوليف البيانات الهندسية والحجمية والسلوكية...');
                if (!process.env.API_KEY) throw new Error("API key is not configured.");
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = buildComprehensivePrompt(candidate, deepData, backtests);
                
                const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });
                
                setCachedAiResponse(cacheKey, response.text);
                setReportMarkdown(response.text);

            } catch (err: any) {
                console.error("Error generating comprehensive report:", err);
                setError(err.message.includes('RESOURCE_EXHAUSTED') ? "تم تجاوز حد الطلبات لواجهة برمجة التطبيقات." : "فشل في إنشاء التقرير الشامل.");
            } finally {
                setIsLoading(false);
            }
        };
        
        generateReport();
    }, [candidate]);

    const parseAndSetNext2HoursState = (responseText: string) => {
        const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const jsonMatch = responseText.match(jsonRegex);
        const textContent = responseText.replace(jsonRegex, '').trim();
        setNext2HoursReport(textContent);

        let setupLines = textContent.split('\n');
        const slLine = setupLines.find(l => l.startsWith('**وقف الخسارة:**'));
        const moonshotLine = setupLines.find(l => l.startsWith('**الهدف 7 (أقصى تفاؤل):**'));

        const stopLoss = slLine ? parseFloat(slLine.split(':')[1].trim()) : candidate.price * 0.98;
        const moonshot = moonshotLine ? parseFloat(moonshotLine.split(':')[1].trim()) : candidate.price * 1.1;

        if (jsonMatch && jsonMatch[1]) {
            try {
                const normalizedPath = JSON.parse(jsonMatch[1]);
                const priceRange = moonshot - stopLoss;

                const historicalCandles: { time: number; price: number; prediction?: number; }[] = Array.from({length: 30}, (_, i) => ({
                    time: i,
                    price: candidate.price * (1 + (Math.random() - 0.5) * 0.005)
                }));
                const lastHistoricalPoint = historicalCandles[historicalCandles.length - 1];

                const predictionData = normalizedPath.map((normVal: number, i: number) => ({
                    time: lastHistoricalPoint.time + i + 1,
                    prediction: stopLoss + (normVal * priceRange)
                }));
                
                const combinedData: { time: number; price?: number, prediction?: number }[] = [...historicalCandles];
                if (combinedData.length > 0) {
                    combinedData[combinedData.length - 1].prediction = lastHistoricalPoint.price;
                }
                predictionData.forEach((p: any) => combinedData.push(p));

                setNext2HoursChartData(combinedData);
            } catch (e) {
                console.error("Failed to parse next 2 hours prediction JSON", e);
            }
        }
    };
    
    const handleGenerateNext2HoursAnalysis = async () => {
        setIsNext2HoursLoading(true);
        setNext2HoursError(null);
        setNext2HoursReport(null);
        setNext2HoursChartData(null);

        const cacheKey = `next2hours-${candidate.pair}-${candidate.timeframe}`;
        const cached = getCachedAiResponse(cacheKey);
        if (cached) {
            parseAndSetNext2HoursState(cached);
            setIsNext2HoursLoading(false);
            return;
        }
        
        try {
            const instantaneousAnalysis = getInstantaneousAnalysis(candidate.pair, candidate.price);
            const prompt = buildNext2HoursPrompt(candidate.pair, candidate.price, instantaneousAnalysis);

            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });

            setCachedAiResponse(cacheKey, response.text);
            parseAndSetNext2HoursState(response.text);

        } catch (err: any) {
            console.error("Error generating next 2 hours analysis:", err);
            setNext2HoursError("فشل في توليد التحليل اللحظي. " + (err.message.includes('RESOURCE_EXHAUSTED') ? "تم تجاوز حد الطلبات." : ""));
        } finally {
            setIsNext2HoursLoading(false);
        }
    };

    const handleGenerateScript = async () => {
        setIsScriptLoading(true);
        setScriptError(null);
        setGeneratedScript('');

        const cacheKey = `video-script-${candidate.pair}-${candidate.timeframe}`;
        const cached = getCachedAiResponse(cacheKey);
        if (cached) {
            setGeneratedScript(cached);
            setIsScriptLoading(false);
            return;
        }

        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = buildVideoScriptPrompt(candidate, backtestData, reportMarkdown);
            
            const response = await ai.models.generateContent({ model: 'gemini-2.5-pro', contents: prompt });

            setCachedAiResponse(cacheKey, response.text);
            setGeneratedScript(response.text);

        } catch (err: any) {
             console.error("Error generating video script:", err);
             setScriptError(err.message.includes('RESOURCE_EXHAUSTED') ? "تم تجاوز حد الطلبات لواجهة برمجة التطبيقات." : "فشل في إنشاء السيناريو.");
        } finally {
            setIsScriptLoading(false);
        }
    };
    
    const handleGenerateImage = async () => {
        setIsImageLoading(true);
        setImageError(null);
        setGeneratedImage(null);

        const cacheKey = `image-${candidate.pair}-${candidate.timeframe}`;
        const cached = getCachedAiResponse(cacheKey);
        if (cached) {
            setGeneratedImage(cached);
            setIsImageLoading(false);
            return;
        }

        try {
            const prompt = `Create a visually stunning and professional YouTube thumbnail about a financial analysis of the crypto pair ${candidate.pair}. The style should be futuristic, with abstract representations of data charts and a glowing currency symbol. The text '${candidate.pair} BREAKOUT AHEAD?' should be prominently featured in a modern, bold font. The color scheme should be dominated by electric blue, cyan, and hints of gold.`;
            
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: prompt }] },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                    setGeneratedImage(imageUrl);
                    setCachedAiResponse(cacheKey, imageUrl);
                    break;
                }
            }

        } catch (err: any) {
            console.error("Error generating image:", err);
            setImageError("فشل في إنشاء الصورة. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsImageLoading(false);
        }
    };

    const handleSelectApiKey = async () => {
        if ((window as any).aistudio) {
            await (window as any).aistudio.openSelectKey();
            setIsApiKeySelected(true);
        }
    };

    const handleGenerateVideo = async () => {
        if (!isApiKeySelected) {
            handleSelectApiKey();
            return;
        }

        setIsVideoLoading(true);
        setVideoError(null);
        setGeneratedVideoUrl(null);
        setVideoLoadingMessage('جارٍ تهيئة نموذج Veo...');

        try {
            const prompt = `A dynamic, 5-second video for finance social media about the crypto pair ${candidate.pair}. Start with a shot of an abstract, glowing digital currency symbol. Transition to a fast-paced animation of rising stock charts and data streams in a futuristic, neon-lit environment. The mood should be exciting and optimistic, indicating a potential price breakout.`;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '9:16'
                }
            });

            let pollCount = 0;
            while (!operation.done) {
                pollCount++;
                if (pollCount <= 3) setVideoLoadingMessage('المشهد الأول قيد التصيير...');
                else if (pollCount <= 7) setVideoLoadingMessage('جارٍ إضافة التأثيرات البصرية...');
                else setVideoLoadingMessage('جارٍ إضافة اللمسات النهائية...');
                
                await new Promise(resolve => setTimeout(resolve, 10000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.response?.generatedVideos?.[0]?.video?.uri) {
                setVideoLoadingMessage('اكتمل التصيير. جاري تحميل الفيديو...');
                const downloadLink = operation.response.generatedVideos[0].video.uri;
                const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                if (!videoResponse.ok) throw new Error("Failed to download the generated video.");
                const videoBlob = await videoResponse.blob();
                const videoUrl = URL.createObjectURL(videoBlob);
                setGeneratedVideoUrl(videoUrl);
            } else {
                throw new Error("Video generation completed, but no video URI was returned.");
            }

        } catch (err: any) {
            console.error("Error generating video:", err);
            if (err.message && err.message.includes('Requested entity was not found')) {
                 setVideoError("فشل التحقق من مفتاح API. الرجاء تحديده مرة أخرى.");
                 setIsApiKeySelected(false);
            } else {
                 setVideoError("فشل في إنشاء الفيديو. قد تكون هناك مشكلة في الخدمة أو أن الطلب معقد للغاية.");
            }
        } finally {
            setIsVideoLoading(false);
            setVideoLoadingMessage('');
        }
    };

    const downloadAsset = (url: string | null, filename: string) => {
        if (!url) return;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };
    
    const handleDownloadReportPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;
        if (!reportRef.current || !jsPDF || !html2canvas) return;
        html2canvas(reportRef.current, { backgroundColor: '#0d1117' }).then((canvas: any) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'px', [canvas.width, canvas.height]);
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`WaveSight_Report_${candidate.pair.replace('/', '_')}.pdf`);
        });
    };
    
    const handleDownloadScriptPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;
        if (!scriptRef.current || !jsPDF || !html2canvas) return;
         html2canvas(scriptRef.current, { backgroundColor: '#161b22' }).then((canvas: any) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'px', [canvas.width, canvas.height]);
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`WaveSight_Script_${candidate.pair.replace('/', '_')}.pdf`);
        });
    };

    const handleDownloadDocx = () => {
        if (!reportMarkdown || !(window as any).docx) {
            alert("لا يمكن إنشاء الملف. المحتوى أو المكتبة غير متوفرة.");
            return;
        }

        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = (window as any).docx;

        const createStyledParagraph = (line: string): any => {
            const textRuns: any[] = [];
            const boldRegex = /\*\*(.*?)\*\*/g;
            let lastIndex = 0;
            let match;

            while ((match = boldRegex.exec(line)) !== null) {
                if (match.index > lastIndex) {
                    textRuns.push(new TextRun(line.substring(lastIndex, match.index)));
                }
                textRuns.push(new TextRun({ text: match[1], bold: true }));
                lastIndex = match.index + match[0].length;
            }

            if (lastIndex < line.length) {
                textRuns.push(new TextRun(line.substring(lastIndex)));
            }
            
            return new Paragraph({ children: textRuns, bidirectional: true });
        };

        const children: any[] = reportMarkdown.split('\n').map(line => {
            line = line.trim();

            if (line.startsWith('# ')) {
                return new Paragraph({
                    text: line.substring(2),
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                });
            }
            if (line.startsWith('## ')) {
                return new Paragraph({
                    text: line.substring(3),
                    heading: HeadingLevel.HEADING_2,
                    bidirectional: true,
                });
            }
            if (line.startsWith('- ')) {
                const innerParagraph = createStyledParagraph(line.substring(2));
                return new Paragraph({
                    children: innerParagraph.options.children,
                    bullet: {
                        level: 0,
                    },
                    bidirectional: true,
                });
            }
            
            return createStyledParagraph(line);
        });

        const doc = new Document({
            sections: [{
                children,
            }],
        });

        Packer.toBlob(doc).then((blob: any) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `WaveSight_Report_${candidate.pair.replace('/', '_')}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        });
    };

    const handleCopy = () => {
        if (reportMarkdown) {
            navigator.clipboard.writeText(reportMarkdown).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('فشل نسخ التحليل.');
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">تقرير المحلل الذكي الشامل: {candidate.pair}</h2>
                    <div className="flex items-center space-x-2">
                        {!isLoading && !error && (
                             <>
                                <button onClick={handleCopy} className="text-xs bg-cyan-glow/20 text-cyan-glow font-semibold py-1.5 px-3 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">
                                    {isCopied ? 'تم النسخ!' : 'نسخ التحليل'}
                                </button>
                                <button onClick={handleDownloadReportPDF} className="text-xs bg-cyan-glow/20 text-cyan-glow font-semibold py-1.5 px-3 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">تنزيل (PDF)</button>
                                <button onClick={handleDownloadDocx} className="text-xs bg-yellow-glow/20 text-yellow-glow font-semibold py-1.5 px-3 rounded-md border border-yellow-glow/50 hover:bg-yellow-glow/40 transition-colors">تنزيل (DOCX)</button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white ml-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <svg className="animate-spin h-10 w-10 text-cyan-glow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="mt-4 text-lg font-semibold text-white">{loadingMessage}</p>
                            <p className="text-gray-400">قد تستغرق هذه العملية دقيقة واحدة...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-red-400 text-center">{error}</p>
                        </div>
                    ) : (
                        <>
                        <div ref={reportRef} className="p-4 bg-gray-900 rounded">
                            {deepChartData && 
                                <div className="h-80 mb-6">
                                    <h4 className="text-center font-semibold text-white text-sm mb-2">مخطط التحليل التاريخي العميق</h4>
                                    <DeepAnalysisChart {...deepChartData} />
                                </div>
                            }
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                                {reportMarkdown.split(/(^##\s.+)/gm).map((part, index) => {
                                    part = part.trim();
                                    if (part.startsWith('## ')) {
                                        return <h2 key={index} className="text-xl font-bold text-cyan-glow border-b border-gray-700 pb-2 mt-6">{part.substring(3)}</h2>;
                                    }
                                    if(part.startsWith('# ')) {
                                        return <h1 key={index} className="text-2xl font-bold text-yellow-glow text-center mb-4">{part.substring(2)}</h1>;
                                    }
                                    const formattedPart = part
                                        .replace(/- \*\*(.*?):\*\* (.*?) - (.*)/g, '<div class="flex justify-between items-center py-1 border-b border-gray-800"><strong class="text-gray-200">$1</strong><div><span class="font-mono text-white">$2</span><br/><span class="text-xs text-gray-500">$3</span></div></div>')
                                        .replace(/-\s(.*?):/g, '<strong class="text-gray-200">$1:</strong>')
                                        .replace(/\n/g, '<br/>');
                                    return <div key={index} className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedPart }} />;
                                })}
                            </div>
                        </div>

                        {/* Next 2 Hours Prediction */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-cyan-glow border-b border-gray-700 pb-2 mt-6 mb-4">محرك التنبؤ اللحظي (الساعتان القادمتان)</h2>
                            <div className="bg-gray-900 p-4 rounded-lg">
                                {!next2HoursReport && !isNext2HoursLoading && (
                                    <div className="text-center">
                                        <p className="text-gray-400 mb-4">شغّل المحرك للحصول على تحليل عالي الدقة مبني على الأطر الزمنية الصغيرة (1م، 5م، 15م) مع 7 أهداف سعرية.</p>
                                        <button onClick={handleGenerateNext2HoursAnalysis} className="px-6 py-2 bg-cyan-glow/20 text-cyan-glow rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors font-semibold">
                                            ⚡️ تشغيل التحليل اللحظي
                                        </button>
                                    </div>
                                )}
                                {isNext2HoursLoading && <div className="text-center text-cyan-glow animate-pulse">جاري تحليل البيانات اللحظية...</div>}
                                {next2HoursError && <div className="text-center text-red-400">{next2HoursError}</div>}
                                {next2HoursReport && (
                                    <div>
                                        {next2HoursChartData && (
                                            <div className="h-64 w-full mb-4">
                                                <SimpleLineChart data={next2HoursChartData} lines={[
                                                    { key: 'price', name: 'السعر التاريخي', color: '#a0aec0', strokeWidth: 1.5 },
                                                    { key: 'prediction', name: 'المسار المتوقع', color: '#4ade80', strokeWidth: 2, dashArray: '4 4' }
                                                ]} />
                                            </div>
                                        )}
                                        <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                                            {next2HoursReport.split('###').map((part, index) => {
                                                part = part.trim();
                                                if (!part) return null;
                                                const contentSplit = part.split('\n');
                                                const title = contentSplit.shift();
                                                const content = contentSplit.join('\n');
                                                return (
                                                    <div key={index}>
                                                        <h3 className="font-bold text-lg text-cyan-glow">{title}</h3>
                                                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?):\*\*/g, '<strong class="text-gray-200">$1:</strong>') }} />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        </>
                    )}
                    
                    {/* Video Script Generator Section */}
                    {!isLoading && !error && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-t-lg">
                            <h3 className="text-lg font-bold text-yellow-glow flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                <span>مولد سيناريو الفيديو الاحترافي</span>
                            </h3>
                            {generatedScript && !isScriptLoading && (
                                <button onClick={handleDownloadScriptPDF} className="text-xs bg-cyan-glow/20 text-cyan-glow font-semibold py-1.5 px-3 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">تنزيل السيناريو (PDF)</button>
                            )}
                        </div>
                        <div className="bg-gray-900 p-6 rounded-b-lg border border-t-0 border-gray-700">
                                <>
                                    {!generatedScript && !isScriptLoading && (
                                        <div className="text-center">
                                            <p className="text-gray-400 mb-4">حوّل هذا التحليل المعقد إلى سيناريو فيديو جذاب ومشاركته مع جمهورك.</p>
                                            <button onClick={handleGenerateScript} className="px-6 py-2 bg-yellow-glow/20 text-yellow-glow rounded-md border border-yellow-glow/50 hover:bg-yellow-glow/40 transition-colors font-semibold">
                                                🚀 إنشاء السيناريو الآن
                                            </button>
                                        </div>
                                    )}
                                    {isScriptLoading && (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <svg className="animate-spin h-8 w-8 text-yellow-glow" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <p className="mt-3 text-yellow-glow">يقوم الذكاء الاصطناعي بكتابة سيناريو إبداعي...</p>
                                        </div>
                                    )}
                                    {scriptError && !isScriptLoading && (
                                         <div className="text-center text-red-400">{scriptError}</div>
                                    )}
                                    {generatedScript && !isScriptLoading && (
                                        <div ref={scriptRef} className="p-4 bg-gray-800 rounded-md">
                                             <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                {generatedScript.split(/(^###\s.+)/gm).map((part, index) => {
                                                    if (part.startsWith('### ')) {
                                                        return <h3 key={index} className="text-lg font-bold text-yellow-glow mt-4">{part.substring(4)}</h3>;
                                                    }
                                                    const formattedPart = part
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                        .replace(/\((.*?)\)/g, '<em class="text-gray-400">($1)</em>');
                                                    return <div key={index} dangerouslySetInnerHTML={{ __html: formattedPart }} />;
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                        </div>
                    </div>
                    )}
                    
                     {/* Image Generator Section */}
                    {!isLoading && !error && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-t-lg">
                            <h3 className="text-lg font-bold text-yellow-glow flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span>مولد الصور المصغرة للفيديو (AI - Nano Banana)</span>
                            </h3>
                            {generatedImage && !isImageLoading && (
                                <button onClick={() => downloadAsset(generatedImage, `WaveSight_Image_${candidate.pair.replace('/', '_')}.png`)} className="text-xs bg-cyan-glow/20 text-cyan-glow font-semibold py-1.5 px-3 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">تنزيل الصورة</button>
                            )}
                        </div>
                        <div className="bg-gray-900 p-6 rounded-b-lg border border-t-0 border-gray-700 text-center">
                            {!generatedImage && !isImageLoading && (
                                <>
                                    <p className="text-gray-400 mb-4">أنشئ صورة مصغرة (Thumbnail) احترافية لفيديو التحليل الخاص بك بنقرة واحدة.</p>
                                    <button onClick={handleGenerateImage} className="px-6 py-2 bg-yellow-glow/20 text-yellow-glow rounded-md border border-yellow-glow/50 hover:bg-yellow-glow/40 transition-colors font-semibold">
                                        🎨 إنشاء صورة مصغرة جذابة
                                    </button>
                                </>
                            )}
                            {isImageLoading && <p className="text-yellow-glow">🎨 جاري إنشاء الصورة...</p>}
                            {imageError && !isImageLoading && <p className="text-red-400">{imageError}</p>}
                            {generatedImage && !isImageLoading && (
                                <img src={generatedImage} alt={`Generated thumbnail for ${candidate.pair}`} className="max-w-md mx-auto rounded-lg shadow-lg" />
                            )}
                        </div>
                    </div>
                    )}
                    
                    {/* Video Generator Section */}
                    {!isLoading && !error && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-t-lg">
                            <h3 className="text-lg font-bold text-yellow-glow flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>مولد الفيديو القصير (AI - Veo)</span>
                            </h3>
                            {generatedVideoUrl && !isVideoLoading && (
                                <button onClick={() => downloadAsset(generatedVideoUrl, `WaveSight_Video_${candidate.pair.replace('/', '_')}.mp4`)} className="text-xs bg-cyan-glow/20 text-cyan-glow font-semibold py-1.5 px-3 rounded-md border border-cyan-glow/50 hover:bg-cyan-glow/40 transition-colors">تنزيل الفيديو</button>
                            )}
                        </div>
                        <div className="bg-gray-900 p-6 rounded-b-lg border border-t-0 border-gray-700 text-center">
                            {!isApiKeySelected ? (
                                <div className="bg-yellow-500/10 p-4 rounded-md border border-yellow-500/20">
                                    <p className="text-yellow-300">يتطلب مولد الفيديو Veo تحديد مفتاح API خاص بك.</p>
                                    <p className="text-xs text-yellow-400/80 my-2">سيتم استخدام هذا المفتاح لطلبات إنشاء الفيديو فقط. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">معلومات الفوترة</a></p>
                                    <button onClick={handleSelectApiKey} className="mt-2 px-4 py-2 bg-yellow-glow text-gray-900 rounded-md font-bold hover:opacity-90">
                                        🔑 تحديد مفتاح API
                                    </button>
                                </div>
                            ) : isVideoLoading ? (
                                <p className="text-yellow-glow animate-pulse">{videoLoadingMessage}</p>
                            ) : generatedVideoUrl ? (
                                <video src={generatedVideoUrl} controls autoPlay loop className="max-w-xs mx-auto rounded-lg shadow-lg"></video>
                            ) : (
                                <>
                                    <p className="text-gray-400 mb-4">أنشئ مقطع فيديو قصيرًا ومناسبًا لوسائل التواصل الاجتماعي لعرض هذه الفرصة.</p>
                                    <button onClick={handleGenerateVideo} className="px-6 py-2 bg-yellow-glow/20 text-yellow-glow rounded-md border border-yellow-glow/50 hover:bg-yellow-glow/40 transition-colors font-semibold">
                                        🎬 إنشاء فيديو قصير (قد يستغرق دقائق)
                                    </button>
                                </>
                            )}
                            {videoError && !isVideoLoading && <p className="mt-4 text-red-400">{videoError}</p>}
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComprehensiveAnalystView;
