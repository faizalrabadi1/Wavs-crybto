
import React, { useRef } from 'react';
import type { LiveSignal } from '../types';
import SignalChart from './SignalChart';

interface Props {
    currencyPairs: string[];
    symbol: string;
    setSymbol: (s: string) => void;
    timeframe: string;
    setTimeframe: (t: string) => void;
    signal: LiveSignal | null;
    isLoading: boolean;
    nextScanCountdown: number;
}

const formatPrice = (pair: string, price: number): string => {
    if (price === 0) return '0.00';
    if (pair.endsWith('.D')) {
        return `${price.toFixed(2)}%`;
    }
    if (pair.startsWith('TOTAL')) {
        if (price >= 1e12) return `$${(price / 1e12).toFixed(2)}T`;
        if (price >= 1e9) return `$${(price / 1e9).toFixed(2)}B`;
        return `$${(price / 1e6).toFixed(2)}M`;
    }
    if (pair.includes('CAC40')) {
        return price.toFixed(2);
    }
    if (pair.includes('JPY')) {
        return price.toFixed(3);
    }
    if (pair.includes('XAU')) { // Gold
        return price.toFixed(2);
    }
    if (!pair.endsWith('USDT')) { // Assume Forex
        return price.toFixed(5);
    }
    
    // Default Crypto formatting
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toPrecision(4);
};


const SignalTerminal: React.FC<Props> = ({ currencyPairs, symbol, setSymbol, timeframe, setTimeframe, signal, isLoading, nextScanCountdown }) => {
    const signalCardRef = useRef<HTMLDivElement>(null);

    const handleExportPDF = () => {
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;
        if (!signalCardRef.current || !signal || !jsPDF || !html2canvas) return;

        html2canvas(signalCardRef.current, { backgroundColor: '#161b22' }).then((canvas: any) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'px', [canvas.width, canvas.height]);
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`WaveSight_Signal_${signal.side}_${symbol.replace('/', '')}_${new Date().toISOString()}.pdf`);
        });
    };
    
    const confidenceColor = signal && signal.confidence > 75 ? 'bg-green-500' : signal && signal.confidence > 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div className="flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-glow animate-pulse-live" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" /><path d="M12 6c-3.309 0-6 2.691-6 6s2.691 6 6 6 6-2.691 6-6-2.691-6-6-6zm0 10c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z" /></svg>
                    <h2 className="text-xl font-bold text-white">محطة الإشارات اللحظية</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-4">
                     <div className="relative w-full sm:w-auto">
                        <select value={symbol} onChange={e => setSymbol(e.target.value)} className="w-full appearance-none bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-cyan-glow transition">
                            {currencyPairs.slice(0, 15).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg></div>
                    </div>
                     <div className="relative w-full sm:w-auto">
                        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="w-full appearance-none bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-md py-1.5 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-cyan-glow transition">
                            {['1m', '5m', '15m', '1h', '4h'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg></div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700 rounded-lg p-2 sm:p-4 h-64 sm:h-96 min-h-[250px]">
                    <SignalChart signal={signal} />
                </div>

                {/* Signal Card & Controls */}
                <div className="space-y-4">
                    <div ref={signalCardRef} className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-700">
                             <div>
                                <h3 className="font-semibold text-white">التوصية الحالية</h3>
                                <p className="text-xs text-gray-400">{signal ? new Date(signal.timestamp).toLocaleString() : '...'}</p>
                            </div>
                            {isLoading ? (
                                <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-600 animate-pulse">...</div>
                            ) : (
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${signal?.side === 'BUY' ? 'bg-green-500/20 text-green-300' : signal?.side === 'SELL' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/10 text-yellow-300'}`}>
                                    {signal?.side ?? 'WAIT'}
                                </div>
                            )}
                        </div>
                        
                        {signal && signal.side !== 'WAIT' ? (
                            <div className="pt-3">
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="bg-gray-900/70 p-2 rounded-md"><p className="text-xs text-gray-400">الدخول</p><p className="font-mono font-bold text-cyan-glow">{formatPrice(symbol, signal.entry)}</p></div>
                                    <div className="bg-gray-900/70 p-2 rounded-md"><p className="text-xs text-gray-400">وقف الخسارة</p><p className="font-mono font-bold text-red-400">{formatPrice(symbol, signal.sl)}</p></div>
                                    <div className="bg-gray-900/70 p-2 rounded-md"><p className="text-xs text-gray-400">الهدف 1</p><p className="font-mono font-bold text-green-400">{formatPrice(symbol, signal.tp1)}</p></div>
                                    <div className="bg-gray-900/70 p-2 rounded-md"><p className="text-xs text-gray-400">الهدف 2</p><p className="font-mono font-bold text-green-400">{formatPrice(symbol, signal.tp2)}</p></div>
                                </div>
                                <div className="mt-3">
                                    <div className="flex justify-between items-center text-xs mb-1"><span className="text-gray-400">درجة الثقة</span><span className="font-mono font-semibold text-white">{signal.confidence}%</span></div>
                                    <div className="w-full bg-gray-700 h-2 rounded-full"><div className={`h-2 rounded-full ${confidenceColor}`} style={{ width: `${signal.confidence}%` }} /></div>
                                </div>
                                <div className="mt-3 pt-2 border-t border-gray-700"><p className="text-xs text-gray-400">الأسباب: {signal.reasons.join(', ')}</p></div>
                            </div>
                        ) : (
                             <div className="pt-12 pb-8 text-center text-gray-500">
                                 {isLoading ? 'جاري تحليل الإشارة...' : 'لا توجد إشارة عالية الاحتمالية حاليًا.'}
                             </div>
                        )}
                    </div>
                    
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-white">حالة النظام</span>
                            <div className="flex items-center space-x-2">
                                <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-green-300">متصل</span>
                           </div>
                        </div>
                        <div className="mt-4 text-gray-400 flex justify-between">
                             <span>التحديث القادم مع الماسح:</span>
                             <span className="font-mono text-cyan-glow w-6 inline-block text-center">{nextScanCountdown}s</span>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                             <button onClick={handleExportPDF} disabled={!signal || signal.side === 'WAIT'} className="flex-1 px-3 py-2 bg-cyan-glow/20 text-cyan-glow rounded-md border border-cyan-glow/50 text-xs font-semibold hover:bg-cyan-glow/40 disabled:opacity-50 disabled:cursor-not-allowed">تصدير PDF</button>
                             <button onClick={() => alert('Feature coming soon!')} className="flex-1 px-3 py-2 bg-yellow-glow/20 text-yellow-glow rounded-md border border-yellow-glow/50 text-xs font-semibold hover:bg-yellow-glow/40">عرض السجل</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignalTerminal;
