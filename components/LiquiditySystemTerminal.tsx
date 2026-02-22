
import React from 'react';
import type { Candle } from '../types';
import SimpleLineChart from './LineChart';

interface LiquidityMover {
    pair: string;
    volChange: number;
    price: number;
    candles: Candle[];
}

interface Props {
    movers: LiquidityMover[];
    nextScanCountdown: number;
}

const LiquidityCard: React.FC<{ mover: LiquidityMover, rank: number }> = ({ mover, rank }) => {
    const isPositive = mover.volChange > 0;
    const color = isPositive ? 'text-green-400' : 'text-red-400';
    const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';
    const borderColor = isPositive ? 'border-green-500/30' : 'border-red-500/30';

    // Prepare chart data (last 20 points from the fetched candles, normalized)
    const chartData = mover.candles.map((c, i) => ({ time: i, vol: c.volume })).slice(-20);

    return (
        <div className={`p-4 rounded-xl border ${borderColor} ${bgColor} transition-all duration-300 hover:scale-[1.02]`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 text-xs font-bold text-gray-400">{rank}</span>
                    <div>
                        <h3 className="font-bold text-white text-lg">{mover.pair}</h3>
                        <p className="text-xs text-gray-400">السعر: {mover.price.toFixed(4)}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-xl font-bold font-mono ${color}`}>
                        {isPositive ? '+' : ''}{mover.volChange.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-gray-400">تغير السيولة (1h)</p>
                </div>
            </div>

            {/* Mini Volume Chart */}
            <div className="h-16 w-full mt-2 opacity-70">
                <SimpleLineChart 
                    data={chartData} 
                    xAxisKey="time" 
                    lines={[{ key: 'vol', color: isPositive ? '#4ade80' : '#f87171', strokeWidth: 2 }]} 
                />
            </div>
            
            <div className="mt-3 flex justify-between items-center text-xs">
                <span className="text-gray-500">حالة التدفق</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${isPositive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {isPositive ? 'دخول قوي' : 'خروج/ضعف'}
                </span>
            </div>
        </div>
    );
};

const LiquiditySystemTerminal: React.FC<Props> = ({ movers, nextScanCountdown }) => {
    if (!movers || movers.length === 0) return null;

    // Top 5 Gainers (Positive Delta)
    const gainers = movers.filter(m => m.volChange > 0).slice(0, 5);
    // Top 5 Drainers (Negative Delta or just less positive if all positive, but usually sorting desc handles it)
    // Actually, movers are sorted desc. So top 5 are gainers. Bottom 5 are lowest (could be negative).
    const losers = [...movers].reverse().slice(0, 5);

    return (
        <main className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">نظام السيولة المباشر</h2>
                        <p className="text-sm text-gray-400">رصد العملات ذات التغير المفاجئ في حجم التداول (بينانس FAPI)</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <span className="text-xs text-gray-400">التحديث التلقائي:</span>
                    <span className="font-mono font-bold text-cyan-glow">{nextScanCountdown}s</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* High Inflow Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                        <span className="text-xl">🔥</span>
                        <h3 className="text-lg font-bold text-green-400">انفجار السيولة (Volume Surge)</h3>
                    </div>
                    <div className="grid gap-4">
                        {gainers.map((m, i) => <LiquidityCard key={m.pair} mover={m} rank={i+1} />)}
                    </div>
                </div>

                {/* Low Inflow/Outflow Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                        <span className="text-xl">❄️</span>
                        <h3 className="text-lg font-bold text-red-400">جفاف/خروج السيولة (Volume Drain)</h3>
                    </div>
                    <div className="grid gap-4">
                        {losers.map((m, i) => <LiquidityCard key={m.pair} mover={m} rank={i+1} />)}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default LiquiditySystemTerminal;
