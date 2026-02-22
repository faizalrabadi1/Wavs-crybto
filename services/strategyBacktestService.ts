import type { Candle, BacktestResult, Strategy } from '../types';

export const PREDEFINED_STRATEGIES: Strategy[] = [
    {
        id: 'phase_bottoming',
        name: 'شراء قاع الطور',
        description: 'الشراء عندما تكون زاوية الطور في الربع الأخير (270°-360°) والزخم إيجابي، مما يشير إلى بداية دورة صاعدة جديدة.'
    },
    {
        id: 'regime_breakout',
        name: 'ملاحقة اختراق النظام',
        description: 'الشراء عند حدوث اختراق للسعر للأعلى يتزامن مع وصول مؤشر النظام (قوة الاتجاه) إلى مستويات عالية (> 0.7).'
    },
    {
        id: 'momentum_divergence',
        name: 'انعكاس الزخم الخفي',
        description: 'الشراء عند حدوث تباين إيجابي بين السعر ومؤشر الزخم في منطقة تشبع بيعي، مما ينبئ بانعكاس وشيك.'
    },
];

// This is a MOCK service. It generates plausible-looking backtest results.
// In a real application, this would involve a complex backtesting engine.
export const runAllBacktests = async (pair: string, candles: Candle[]): Promise<BacktestResult[]> => {
    // Use pair name to generate slightly different but deterministic results for variety
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const results: BacktestResult[] = [
        // Phase Bottoming
        {
            strategyName: 'شراء قاع الطور',
            trades: 40 + (hash % 15),
            winRate: 65 + (hash % 8), // High win rate, smaller wins
            profitFactor: 1.7 + ((hash % 10) / 10),
            netProfit: 85 + (hash % 40),
        },
        // Regime Breakout
        {
            strategyName: 'ملاحقة اختراق النظام',
            trades: 18 + (hash % 8),
            winRate: 48 + (hash % 10), // Lower win rate, larger wins
            profitFactor: 2.5 + ((hash % 12) / 10),
            netProfit: 150 + (hash % 70),
        },
        // Momentum Divergence
        {
            strategyName: 'انعكاس الزخم الخفي',
            trades: 25 + (hash % 10),
            winRate: 55 + (hash % 12),
            profitFactor: 2.1 + ((hash % 9) / 10),
            netProfit: 110 + (hash % 50),
        }
    ];

    // Simulate network/computation delay
    await new Promise(res => setTimeout(res, 1200));

    return results;
};
