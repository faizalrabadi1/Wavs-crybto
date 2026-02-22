
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { PlanetPosition, PlanetaryAspect } from '../types';
import { getCachedAiResponse, setCachedAiResponse } from '../services/aiCacheService';

interface Props {
    pair: string;
    planetaryWheel: {
        transits: PlanetPosition[];
        natal: PlanetPosition[];
        pricePlanet: PlanetPosition;
        aspects: PlanetaryAspect[];
        transitDate: string;
        natalDate: string;
    };
}

const FinancialAstrologer: React.FC<Props> = ({ pair, planetaryWheel }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [prediction, setPrediction] = useState('');
    const [error, setError] = useState<string | null>(null);

    const consultTheStars = async () => {
        setIsLoading(true);
        setError(null);
        setPrediction('');

        const cacheKey = `astro-oracle-${pair}-${planetaryWheel.transitDate}`;
        const cached = getCachedAiResponse(cacheKey);
        
        if (cached) {
            setPrediction(cached);
            setIsLoading(false);
            return;
        }

        try {
            // Construct the prompt context
            const aspectsText = planetaryWheel.aspects
                .map(a => `- ${a.planet1} ${a.type} ${a.planet2} (Orb: ${a.orb.toFixed(2)}°)`)
                .join('\n');
            
            const transitsText = planetaryWheel.transits
                .filter(p => ['Sun', 'Moon', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Pluto'].includes(p.name))
                .map(p => `${p.name}: ${p.longitude.toFixed(2)}° (Dec: ${p.declination?.toFixed(2)})`)
                .join(', ');

            const prompt = `
أنت "المنجم المالي" (Financial Astrologer)، خبير في دمج علم الفلك المالي (Financial Astrology) ونظريات W.D. Gann. مهمتك هي قراءة الخريطة الفلكية الحالية للأصل المالي ${pair} وتقديم توقعات دقيقة للسوق.

**البيانات الفلكية الحالية:**
- **التاريخ:** ${planetaryWheel.transitDate}
- **مواقع الكواكب (Transits):** ${transitsText}
- **موقع كوكب السعر (Price Planet):** ${planetaryWheel.pricePlanet.longitude.toFixed(2)}°
- **الاتصالات الهندسية (Aspects):**
${aspectsText}

**المطلوب (تقرير باللغة العربية بأسلوب غامض ولكن احترافي):**

1.  **المناخ الكوني (Cosmic Climate):** صف الطاقة العامة في السوق بناءً على الكواكب المسيطرة. هل هي طاقة "المريخ" (عدوانية/تذبذب) أم "زحل" (ضغط/هبوط) أم "المشتري" (توسع/صعود)؟
2.  **تأثير الاتصالات (Geometry Analysis):** حلل أهم اتصالين (Aspects) في القائمة أعلاه. كيف سيؤثران على نفسية المتداولين وحركة السعر؟ ركز بشكل خاص على الاتصالات "الصعبة" (Square/Opposition) مقابل "السهلة" (Trine/Sextile).
3.  **توقع حركة السعر (The Forecast):** بناءً على "كوكب السعر" وعلاقته بالكواكب الأخرى، هل نتوقع انعكاسًا زمنيًا قريبًا؟ حدد الاتجاه المتوقع (صعود/هبوط) والمدة الزمنية المحتملة للتأثير.

اجعل إجابتك موجزة، عميقة، ومباشرة.
`;

            if (!process.env.API_KEY) throw new Error("API key is missing");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt
            });

            const text = response.text;
            setCachedAiResponse(cacheKey, text);
            setPrediction(text);

        } catch (err: any) {
            console.error("Astrology AI Error:", err);
            setError("تعذر الاتصال بالأفلاك حاليًا. حاول مرة أخرى لاحقًا.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mt-6 relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-b from-[#1a1025] to-[#0d1117] shadow-2xl">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-600/10 rounded-full blur-3xl"></div>

            <div className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m6 4v4m-2-2h4M12 3v1m0 16v1m-6.364-2.364l.707-.707M6.343 6.343l-.707-.707m12.728 0l.707-.707M17.657 17.657l.707.707M18 12h1M5 12H4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200">
                                العراف المالي (Financial Astrologer)
                            </h3>
                            <p className="text-xs text-purple-400/70">قراءة الطالع المالي عبر الذكاء الاصطناعي</p>
                        </div>
                    </div>

                    {!prediction && !isLoading && (
                        <button 
                            onClick={consultTheStars}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-purple-900/20 transition-all flex items-center gap-2 group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            استشر النجوم
                        </button>
                    )}
                </div>

                {isLoading && (
                    <div className="py-8 text-center">
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping"></div>
                            <div className="absolute inset-0 border-4 border-t-purple-400 rounded-full animate-spin"></div>
                            <div className="absolute inset-4 bg-purple-500 rounded-full blur-md animate-pulse"></div>
                        </div>
                        <p className="text-purple-300 animate-pulse font-mono text-sm">جاري حساب الاقترانات الفلكية وتأثيرها...</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-center text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {prediction && (
                    <div className="animate-fade-in">
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="bg-[#161b22]/80 p-4 rounded-lg border border-purple-500/20 backdrop-blur-sm">
                                {prediction.split('\n').map((line, i) => {
                                    if (line.trim().startsWith('**') || line.trim().endsWith(':')) {
                                        return <h4 key={i} className="text-purple-300 font-bold mt-4 mb-2 text-base">{line.replace(/\*\*/g, '')}</h4>;
                                    }
                                    if (line.trim().startsWith('-')) {
                                        return <p key={i} className="text-gray-300 mb-2 pl-4 border-r-2 border-purple-500/50 pr-2">{line.replace('-', '').trim()}</p>;
                                    }
                                    return <p key={i} className="text-gray-400 mb-2 leading-relaxed">{line}</p>;
                                })}
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                             <button 
                                onClick={consultTheStars}
                                className="text-xs text-purple-400 hover:text-purple-300 underline decoration-dotted"
                            >
                                تحديث القراءة الفلكية
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialAstrologer;
