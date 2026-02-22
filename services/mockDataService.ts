
import type { DataProvider, MarketData, Candle } from '../types';
import { TIME_FRAMES, HISTORICAL_CANDLES_COUNT } from '../constants';

const generateMockCandles = (count: number, startPrice: number): Candle[] => {
    const candles: Candle[] = [];
    let currentPrice = startPrice;
    for (let i = 0; i < count; i++) {
        const open = currentPrice;
        const change = (Math.random() - 0.495) * 0.05; // a bit of random walk
        currentPrice = open * (1 + change);
        const close = currentPrice;
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);

        candles.push({
            timestamp: Date.now() - (count - i) * 60000,
            open,
            high,
            low,
            close,
            volume: (Math.random() * 500 + 100) * 1000,
        });
    }
    return candles;
};

const generateIndexCandles = (count: number, startPrice: number, volatility: number): Candle[] => {
    const candles: Candle[] = [];
    let currentPrice = startPrice;
    for (let i = 0; i < count; i++) {
        const open = currentPrice;
        currentPrice *= (1 + (Math.random() - 0.5) * volatility);
        // Add some clamping for dominance percentages
        if (volatility < 0.01) { // Assume it's a percentage
            currentPrice = Math.max(1, Math.min(100, currentPrice));
        }
        const close = currentPrice;
        candles.push({
            timestamp: Date.now() - (count - i) * 60000,
            open,
            high: Math.max(open, close) * 1.001,
            low: Math.min(open, close) * 0.999,
            close,
            volume: 0, // Indices do not have direct volume
        });
    }
    return candles;
};

const mockFetchInitialData = async (
    pairs: string[],
    timeframes: string[],
    onProgress: (progress: number) => void,
    limit?: number
): Promise<MarketData> => {
    const marketData: MarketData = {};
    const totalRequests = pairs.length * timeframes.length;
    let completedRequests = 0;

    const indexStartPrices: { [key: string]: { price: number; vol: number; vol24h: number } } = {
        'BTC.D': { price: 54.3, vol: 0.005, vol24h: 0 },
        'USDT.D': { price: 6.8, vol: 0.008, vol24h: 0 },
        'TOTAL': { price: 2.3e12, vol: 0.02, vol24h: 80e9 },
        'TOTAL2': { price: 1.1e12, vol: 0.025, vol24h: 45e9 },
    };

    for (const pair of pairs) {
        if (indexStartPrices[pair]) {
            const indexInfo = indexStartPrices[pair];
            marketData[pair] = {
                pair,
                price: indexInfo.price * (1 + (Math.random() - 0.5) * (indexInfo.vol / 2)),
                change24h: (Math.random() - 0.5) * 5,
                volume24h: indexInfo.vol24h,
                candles: {},
            };
            for (const tf of timeframes) {
                const candleCount = limit || 2500;
                marketData[pair].candles[tf] = generateIndexCandles(candleCount, indexInfo.price, indexInfo.vol);
                completedRequests++;
                await new Promise(res => setTimeout(res, 10));
                onProgress(Math.round((completedRequests / totalRequests) * 100));
            }
        } else {
            const startPrice = 50 + (pair.charCodeAt(0) % 100) + Math.random() * 20;
            marketData[pair] = {
                pair,
                price: startPrice * (1 + (Math.random() - 0.5) * 0.1),
                change24h: (Math.random() - 0.5) * 10,
                volume24h: Math.random() * 200_000_000 + 50_000_000,
                candles: {},
            };
            for (const tf of timeframes) {
                const candleCount = limit || 2500; // Match the real data provider's limit for deep analysis
                marketData[pair].candles[tf] = generateMockCandles(candleCount, startPrice);
                completedRequests++;
                // Simulate network delay and progress update
                await new Promise(res => setTimeout(res, 10));
                onProgress(Math.round((completedRequests / totalRequests) * 100));
            }
        }
    }
    onProgress(100);
    return marketData;
};

const mockConnectToStreams = (
    pairs: string[],
    timeframes: string[],
    onUpdate: (pair: string, timeframe: string, candle: Candle) => void
): (() => void) => {
    const intervalId = setInterval(() => {
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
        // This is a simplified update; in a real scenario, we'd need to manage the last price per pair
        const close = 100 + Math.random() * 50;
        const newCandle: Candle = {
            timestamp: Date.now(),
            open: close,
            high: close * 1.01,
            low: close * 0.99,
            close: close,
            volume: Math.random() * 100000,
        };
        onUpdate(pair, timeframe, newCandle);
    }, 2000);

    return () => clearInterval(intervalId);
};


export const coinGeckoProvider: DataProvider = {
    name: 'CoinGecko',
    fetchTopSymbols: async () => {
        await new Promise(res => setTimeout(res, 500)); // simulate network delay
        return [
            'PHB/USDT', 'API3/USDT', // User requested
            'DOGE/USDT', 'SHIB/USDT', 'LTC/USDT', 'TRX/USDT', 'AVAX/USDT',
            'DOT/USDT', 'LINK/USDT', 'MATIC/USDT', 'BCH/USDT', 'ICP/USDT',
            'XLM/USDT', 'NEAR/USDT', 'ATOM/USDT', 'UNI/USDT', 'ETC/USDT'
        ];
    },
    fetchInitialData: mockFetchInitialData,
    connectToStreams: mockConnectToStreams,
};


export const cryptoCompareProvider: DataProvider = {
    name: 'CryptoCompare',
    fetchTopSymbols: async () => {
        await new Promise(res => setTimeout(res, 500)); // simulate network delay
        return [
            'TAO/USDT', 'UMA/USDT', // User requested
            'XRP/USDT', 'ADA/USDT', 'SOL/USDT', 'BNB/USDT', 'BTC/USDT',
            'ETH/USDT', 'FIL/USDT', 'HBAR/USDT', 'VET/USDT', 'KAS/USDT',
            'TON/USDT', 'STX/USDT', 'IMX/USDT', 'THETA/USDT', 'GRT/USDT'
        ];
    },
    fetchInitialData: mockFetchInitialData,
    connectToStreams: (pairs, timeframes, onUpdate) => {
        // Use a slightly different interval to differentiate
         const intervalId = setInterval(() => {
            const pair = pairs[Math.floor(Math.random() * pairs.length)];
            const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
            const close = 100 + Math.random() * 50;
            const newCandle: Candle = {
                timestamp: Date.now(),
                open: close,
                high: close * 1.01,
                low: close * 0.99,
                close: close,
                volume: Math.random() * 120000,
            };
            onUpdate(pair, timeframe, newCandle);
        }, 2500);

        return () => clearInterval(intervalId);
    },
};

// --- New Forex & Gold Provider ---

const generateForexCandles = (count: number, startPrice: number, pair: string): Candle[] => {
    const candles: Candle[] = [];
    let currentPrice = startPrice;
    // Forex has much smaller volatility than crypto
    let volatility = pair.includes('JPY') ? 0.005 : 0.0005;
    if (pair.includes('CAC40')) {
        volatility = 0.0012; // Index volatility
    }


    for (let i = 0; i < count; i++) {
        const open = currentPrice;
        currentPrice *= (1 + (Math.random() - 0.498) * volatility);
        const close = currentPrice;
        const high = Math.max(open, close) + (Math.random() * volatility * currentPrice);
        const low = Math.min(open, close) - (Math.random() * volatility * currentPrice);

        candles.push({
            timestamp: Date.now() - (count - i) * 60000,
            open,
            high,
            low,
            close,
            volume: (Math.random() * 1e9) + 0.5e9,
        });
    }
    return candles;
};

const forexFetchInitialData = async (
    pairs: string[],
    timeframes: string[],
    onProgress: (progress: number) => void,
    limit?: number
): Promise<MarketData> => {
    const marketData: MarketData = {};
    const totalRequests = pairs.length * timeframes.length;
    let completedRequests = 0;

    const startPrices: { [key: string]: number } = {
        'EUR/USD': 1.08550,
        'GBP/USD': 1.27120,
        'USD/JPY': 157.050,
        'AUD/USD': 0.66500,
        'USD/CAD': 1.36600,
        'XAU/USD': 2355.50,
        'CAC40/EUR': 7650.25,
    };

    for (const pair of pairs) {
        const startPrice = startPrices[pair] || 1.0;
        marketData[pair] = {
            pair,
            price: startPrice * (1 + (Math.random() - 0.5) * 0.001),
            change24h: (Math.random() - 0.5) * 1.5,
            volume24h: Math.random() * 500_000_000_000 + 100_000_000_000, // Forex volume is huge
            candles: {},
        };
        for (const tf of timeframes) {
            marketData[pair].candles[tf] = generateForexCandles(limit || 2500, startPrice, pair);
            completedRequests++;
            await new Promise(res => setTimeout(res, 10));
            onProgress(Math.round((completedRequests / totalRequests) * 100));
        }
    }
    onProgress(100);
    return marketData;
};

export const forexProvider: DataProvider = {
    name: 'Forex',
    fetchTopSymbols: async () => {
        await new Promise(res => setTimeout(res, 500));
        return ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'XAU/USD', 'CAC40/EUR'];
    },
    fetchInitialData: forexFetchInitialData,
    connectToStreams: mockConnectToStreams, // Re-use the simple mock stream logic
};