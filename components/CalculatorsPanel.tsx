
import React, { useState, useEffect } from 'react';
import type { CurrencyData } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    activePairData: CurrencyData | null;
}

type PivotType = 'low' | 'high';
type TargetMode = 'normal' | 'decimal';

interface CalculationResult {
    priceLevels: { angle: number; price: number; type: string; label: string }[];
    timeCycles: { angle: number; date: string; status: string; unitAdded: string }[];
    nextEvent: string;
}

const CalculatorsPanel: React.FC<Props> = ({ isOpen, onClose, activePairData }) => {
    // Form State
    const [price, setPrice] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [scale, setScale] = useState<string>('100');
    const [pivotType, setPivotType] = useState<PivotType>('low');
    const [targetMode, setTargetMode] = useState<TargetMode>('normal');
    const [timeFrameMode, setTimeFrameMode] = useState<'daily' | 'intraday'>('daily');
    
    // Results State
    const [results, setResults] = useState<CalculationResult | null>(null);
    const [activeTab, setActiveTab] = useState<'price' | 'time'>('price');

    // Auto-fill data when activePairData changes or panel opens
    useEffect(() => {
        if (activePairData && isOpen) {
            setPrice(activePairData.price.toString());
            
            // Set date to the last candle timestamp or current time
            const lastCandle = activePairData.candles['1d']?.slice(-1)[0] || activePairData.candles['1h']?.slice(-1)[0];
            const timeVal = lastCandle ? lastCandle.timestamp : Date.now();
            
            // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
            const dateObj = new Date(timeVal);
            dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
            setDate(dateObj.toISOString().slice(0, 16));

            // Suggest Scale
            suggestScale(activePairData.price);
        }
    }, [activePairData, isOpen]);

    const suggestScale = (p: number) => {
        let s = 1;
        if (p > 10000) s = 1000;
        else if (p > 1000) s = 100;
        else if (p > 100) s = 10;
        else if (p < 1) s = 0.01;
        setScale(s.toString());
    };

    const handleCalculate = () => {
        const numPrice = parseFloat(price);
        const numScale = parseFloat(scale);
        
        if (isNaN(numPrice) || !date || isNaN(numScale)) return;

        const baseDate = new Date(date);
        const sqrtPrice = Math.sqrt(numPrice);
        
        // 1. Price Levels Calculation
        const priceLevels = [];
        let angles = [];

        if (targetMode === 'decimal') {
            angles = [
                { deg: 22.5, label: "22.5° (Scalp)" },
                { deg: 45, label: "45° (Minor)" },
                { deg: 67.5, label: "67.5° (Scalp)" },
                { deg: 90, label: "90° (Major)" },
                { deg: 112.5, label: "112.5°" },
                { deg: 135, label: "135°" },
                { deg: 180, label: "180° (Strong)" },
                { deg: 225, label: "225°" },
                { deg: 270, label: "270°" },
                { deg: 360, label: "360° (Cycle)" }
            ];
        } else {
            angles = [
                { deg: 45, label: "45°" },
                { deg: 90, label: "90°" },
                { deg: 120, label: "120° (Triangle)" },
                { deg: 144, label: "144° (Master)" },
                { deg: 180, label: "180°" },
                { deg: 240, label: "240°" },
                { deg: 270, label: "270°" },
                { deg: 315, label: "315°" },
                { deg: 360, label: "360°" }
            ];
        }

        for (const ang of angles) {
            const factor = ang.deg / 180;
            let target = 0;
            if (pivotType === 'low') {
                target = Math.pow((sqrtPrice + factor), 2);
            } else {
                target = Math.pow((sqrtPrice - factor), 2);
            }

            if (target > 0) {
                const isScalp = (ang.deg % 45 !== 0);
                priceLevels.push({
                    angle: ang.deg,
                    price: target,
                    type: isScalp ? 'مضاربة دقيقة' : 'مستوى رئيسي',
                    label: ang.label
                });
            }
        }

        // 2. Time Cycles Calculation
        const timeCycles = [];
        const baseUnits = numPrice / numScale;
        const timeAngles = [45, 90, 120, 135, 144, 180, 225, 240, 270, 315, 360];
        const now = new Date();
        let nextEventDate = null;

        for (const deg of timeAngles) {
            const ratio = deg / 360;
            const unitsToAdd = baseUnits * ratio;
            const targetDate = new Date(baseDate.getTime());

            if (timeFrameMode === 'intraday') {
                targetDate.setMinutes(targetDate.getMinutes() + Math.round(unitsToAdd));
            } else {
                targetDate.setDate(targetDate.getDate() + Math.round(unitsToAdd));
            }

            const isFuture = targetDate > now;
            if (isFuture && !nextEventDate) nextEventDate = targetDate;

            timeCycles.push({
                angle: deg,
                date: targetDate.toLocaleString('en-GB'),
                status: isFuture ? 'قادم' : 'انتهى',
                unitAdded: `+${unitsToAdd.toFixed(1)} ${timeFrameMode === 'intraday' ? 'دقيقة' : 'يوم'}`
            });
        }

        setResults({
            priceLevels,
            timeCycles,
            nextEvent: nextEventDate ? getTimeRemaining(nextEventDate) : "انتهت الدورة الحالية"
        });
    };

    const getTimeRemaining = (endtime: Date) => {
        const total = Date.parse(endtime.toString()) - Date.parse(new Date().toString());
        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        return `${days}d ${hours}h ${minutes}m`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md z-50 flex justify-center overflow-y-auto">
            <div className="relative w-full max-w-4xl mt-10 mb-10 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 h-fit">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg border border-yellow-500/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">مركز الآلات الحاسبة</h2>
                            <p className="text-sm text-gray-400">Gann Master Crypto Pro 3.0</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Inputs Panel */}
                    <div className="lg:col-span-1 space-y-5 bg-gray-900/50 p-5 rounded-xl border border-gray-700">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">نظام التحليل</label>
                            <div className="flex bg-gray-800 rounded-lg p-1">
                                <button onClick={() => setTimeFrameMode('daily')} className={`flex-1 py-1.5 text-xs rounded-md transition-all ${timeFrameMode === 'daily' ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}>يومي (Daily)</button>
                                <button onClick={() => setTimeFrameMode('intraday')} className={`flex-1 py-1.5 text-xs rounded-md transition-all ${timeFrameMode === 'intraday' ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}>لحظي (4H/1H)</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">السعر (ارتكاز)</label>
                            <input 
                                type="number" 
                                value={price} 
                                onChange={(e) => setPrice(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:border-yellow-500 focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">وقت القمة/القاع</label>
                            <input 
                                type="datetime-local" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:border-yellow-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">المقياس (Scaling)</label>
                                <input 
                                    type="number" 
                                    value={scale} 
                                    onChange={(e) => setScale(e.target.value)} 
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:border-yellow-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">نوع الارتكاز</label>
                                <select 
                                    value={pivotType} 
                                    onChange={(e) => setPivotType(e.target.value as PivotType)} 
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:border-yellow-500 focus:outline-none"
                                >
                                    <option value="low">قاع (Low)</option>
                                    <option value="high">قمة (High)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">نمط الأهداف</label>
                            <select 
                                value={targetMode} 
                                onChange={(e) => setTargetMode(e.target.value as TargetMode)} 
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2.5 text-white focus:border-yellow-500 focus:outline-none"
                            >
                                <option value="normal">عادي (مربع التسعة)</option>
                                <option value="decimal">عشري (Decimal/Scalping)</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleCalculate}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 rounded-lg transition-all shadow-lg shadow-yellow-500/20 mt-4"
                        >
                            🚀 حساب المستويات
                        </button>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-2 flex flex-col h-full">
                        {!results ? (
                            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl p-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                <p>أدخل البيانات واضغط على "حساب" للبدء</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                {/* Tabs */}
                                <div className="flex space-x-4 border-b border-gray-700 mb-4">
                                    <button 
                                        onClick={() => setActiveTab('price')}
                                        className={`pb-2 px-4 font-bold text-sm transition-all ${activeTab === 'price' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        💰 الأهداف السعرية
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('time')}
                                        className={`pb-2 px-4 font-bold text-sm transition-all ${activeTab === 'time' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        📅 الفواصل الزمنية
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                    {activeTab === 'price' && (
                                        <table className="w-full text-right border-collapse">
                                            <thead className="bg-gray-900 sticky top-0">
                                                <tr>
                                                    <th className="p-3 text-xs text-gray-400">الزاوية</th>
                                                    <th className="p-3 text-xs text-gray-400">السعر المستهدف</th>
                                                    <th className="p-3 text-xs text-gray-400">النوع</th>
                                                    <th className="p-3 text-xs text-gray-400">ملاحظات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700/50">
                                                {results.priceLevels.map((lvl, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-700/20 transition-colors">
                                                        <td className="p-3 text-sm font-mono text-yellow-500">{lvl.angle}°</td>
                                                        <td className={`p-3 text-lg font-bold font-mono ${pivotType === 'low' ? 'text-green-400' : 'text-red-400'}`}>
                                                            {lvl.price < 1 ? lvl.price.toFixed(6) : lvl.price.toFixed(2)}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded text-[10px] ${lvl.type.includes('رئيسي') ? 'bg-green-900/30 text-green-300 border border-green-500/30' : 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30'}`}>
                                                                {lvl.type}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-xs text-gray-400">{lvl.label}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {activeTab === 'time' && (
                                        <div className="space-y-4">
                                            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4 text-center">
                                                <p className="text-xs text-cyan-300 mb-1">الحدث الزمني القادم</p>
                                                <p className="text-xl font-bold text-white dir-ltr">{results.nextEvent}</p>
                                            </div>
                                            <table className="w-full text-right border-collapse">
                                                <thead className="bg-gray-900 sticky top-0">
                                                    <tr>
                                                        <th className="p-3 text-xs text-gray-400">الزاوية</th>
                                                        <th className="p-3 text-xs text-gray-400">الإضافة</th>
                                                        <th className="p-3 text-xs text-gray-400">التاريخ المتوقع</th>
                                                        <th className="p-3 text-xs text-gray-400">الحالة</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700/50">
                                                    {results.timeCycles.map((cycle, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-700/20 transition-colors">
                                                            <td className="p-3 text-sm font-mono text-cyan-400">{cycle.angle}°</td>
                                                            <td className="p-3 text-xs text-gray-400">{cycle.unitAdded}</td>
                                                            <td className="p-3 text-sm font-mono text-white dir-ltr">{cycle.date}</td>
                                                            <td className="p-3">
                                                                <span className={`font-bold text-xs ${cycle.status === 'قادم' ? 'text-green-400' : 'text-gray-600'}`}>
                                                                    {cycle.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculatorsPanel;
