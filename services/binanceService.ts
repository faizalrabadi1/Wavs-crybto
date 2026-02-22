
import { HISTORICAL_CANDLES_COUNT } from '../constants';
import type { Candle, MarketData, DataProvider, DataProviderName } from '../types';

const API_BASE_URL = 'https://fapi.binance.com';
const WS_BASE_URL = 'wss://fstream.binance.com';

// A set of all valid k-line intervals supported by the Binance Futures API
const VALID_INTERVALS = new Set(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']);

// A curated list of popular futures symbols to be used as a fallback if the API fails.
const FALLBACK_FUTURES_SYMBOLS = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'PEPE/USDT', 'DOGE/USDT', 
    'XRP/USDT', 'BNB/USDT', 'WIF/USDT', 'ORDI/USDT', 'LINK/USDT', 
    'AVAX/USDT', 'MATIC/USDT', 'LTC/USDT', 'NEAR/USDT', 'FIL/USDT'
];


const formatPairToSymbol = (pair: string) => pair.replace('/', '').toUpperCase();

const mapTimeframeToInterval = (timeframe: string): string | null => {
    if (VALID_INTERVALS.has(timeframe)) {
        return timeframe;
    }
    return null;
};

const fetchTopFuturesSymbols = async (): Promise<string[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/fapi/v1/ticker/24hr`);
        if (!response.ok) {
            throw new Error(`Failed to fetch symbols: ${response.status} ${response.statusText}`);
        }
        const tickers: any[] = await response.json();

        if (!Array.isArray(tickers)) {
            return FALLBACK_FUTURES_SYMBOLS;
        }

        const usdtFutures = tickers
            .filter(ticker => ticker.symbol.endsWith('USDT') && !ticker.symbol.includes('_') && parseFloat(ticker.quoteVolume) > 10000000)
            .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .map(ticker => {
                const baseAsset = ticker.symbol.slice(0, -4);
                return `${baseAsset}/USDT`;
            });

        if (usdtFutures.length === 0) {
            return FALLBACK_FUTURES_SYMBOLS;
        }
        return usdtFutures;

    } catch (error) {
        console.error("Error fetching top futures symbols:", error);
        return FALLBACK_FUTURES_SYMBOLS;
    }
};

// --- OPTIMIZED: Fetch Top 15 Movers based on 5-minute Liquidity Change ---
export const fetchTopActivePairsByLiquidity5m = async (): Promise<string[]> => {
    try {
        // 1. Get tickers (One fast request)
        const response = await fetch(`${API_BASE_URL}/fapi/v1/ticker/24hr`);
        if (!response.ok) throw new Error("Failed to fetch tickers");
        const tickers: any[] = await response.json();

        // Filter: Scan top 60 liquid pairs (Optimized pool size for speed)
        const candidates = tickers
            .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_') && parseFloat(t.quoteVolume) > 10000000)
            .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 60); 

        const results: { pair: string, liquidityScore: number }[] = [];
        const BATCH_SIZE = 10; // Increased batch size for speed

        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            
            // Parallel execution within batch
            await Promise.all(batch.map(async (t: any) => {
                try {
                    // Fetch very limited klines (just enough to compare last 5 mins)
                    const klineRes = await fetch(`${API_BASE_URL}/fapi/v1/klines?symbol=${t.symbol}&interval=5m&limit=5`);
                    if(!klineRes.ok) return;
                    const data = await klineRes.json();
                    if(data.length < 3) return;

                    // Volume index is 5
                    const vols = data.map((d: any) => parseFloat(d[5]));
                    
                    // Current forming candle volume
                    const currentVol = vols[vols.length - 1];
                    
                    // Average of previous 3 completed candles
                    const prevVols = vols.slice(Math.max(0, vols.length - 4), vols.length - 1);
                    const avgPrevVol = prevVols.reduce((a: number, b: number) => a + b, 0) / prevVols.length;

                    // Calculate Surge Ratio: How much higher/lower is current vol vs avg?
                    const score = avgPrevVol > 0 ? ((currentVol - avgPrevVol) / avgPrevVol) * 100 : 0;

                    results.push({
                        pair: `${t.symbol.slice(0, -4)}/USDT`,
                        liquidityScore: Math.abs(score) // Absolute change (Up or Down)
                    });
                } catch (e) { 
                    // Silent fail for individual pair
                }
            }));
            
            // Minimal delay to allow event loop to breathe, but keep it fast
            await new Promise(res => setTimeout(res, 150));
        }

        // Sort by highest activity
        results.sort((a, b) => b.liquidityScore - a.liquidityScore);

        if (results.length === 0) throw new Error("No liquidity data found");

        // Return top 15
        return results.slice(0, 15).map(r => r.pair);

    } catch (e) {
        console.error("Liquidity scan failed, using fallback movers:", e);
        // Fallback: Return top 15 volatility movers from ticker data (No extra API calls needed)
        // This ensures the user ALWAYS gets a "Fast" result even if API limits hit.
        try {
             const response = await fetch(`${API_BASE_URL}/fapi/v1/ticker/24hr`);
             const tickers = await response.json();
             return tickers
                .filter((t: any) => t.symbol.endsWith('USDT'))
                .sort((a: any, b: any) => Math.abs(parseFloat(b.priceChangePercent)) - Math.abs(parseFloat(a.priceChangePercent)))
                .slice(0, 15)
                .map((t: any) => `${t.symbol.slice(0, -4)}/USDT`);
        } catch (err) {
            return FALLBACK_FUTURES_SYMBOLS;
        }
    }
};

// --- NEW: Fetch ALL USDT Futures Pairs ---
export const fetchAllUSDTFuturesPairs = async (): Promise<string[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/fapi/v1/exchangeInfo`);
        if (!response.ok) throw new Error("Failed to fetch exchange info");
        const data = await response.json();
        
        return data.symbols
            .filter((s: any) => 
                s.quoteAsset === 'USDT' && 
                s.status === 'TRADING' && 
                s.contractType === 'PERPETUAL' &&
                !s.symbol.includes('_') // Exclude contract delivery like BTCUSDT_210924
            )
            .map((s: any) => `${s.baseAsset}/USDT`)
            .sort();
    } catch (e) {
        console.error("Error fetching all futures pairs:", e);
        return FALLBACK_FUTURES_SYMBOLS;
    }
};

export const fetchFastTickerSnapshot = async (): Promise<MarketData> => {
    try {
        const response = await fetch(`${API_BASE_URL}/fapi/v1/ticker/24hr`);
        if (!response.ok) throw new Error("Failed to fetch tickers");
        const tickers: any[] = await response.json();

        const marketData: MarketData = {};
        
        tickers
            .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
            .forEach((t: any) => {
                const pair = `${t.symbol.slice(0, -4)}/USDT`;
                marketData[pair] = {
                    pair,
                    price: parseFloat(t.lastPrice),
                    change24h: parseFloat(t.priceChangePercent),
                    volume24h: parseFloat(t.quoteVolume),
                    candles: {} // Empty initially
                };
            });
            
        return marketData;
    } catch (e) {
        console.error("Error in fast snapshot:", e);
        return {};
    }
};

export const fetchTopLiquidityMovers = async (): Promise<{ pair: string, volChange: number, price: number, candles: Candle[] }[]> => {
    // Keep existing logic for the specific Liquidity Mode
    try {
        const response = await fetch(`${API_BASE_URL}/fapi/v1/ticker/24hr`);
        if (!response.ok) throw new Error("Failed to fetch 24h tickers");
        const tickers: any[] = await response.json();

        const topTickers = tickers
            .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
            .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
            .slice(0, 40);

        const results: { pair: string, volChange: number, price: number, candles: Candle[] }[] = [];

        const BATCH_SIZE = 5;
        for (let i = 0; i < topTickers.length; i += BATCH_SIZE) {
            const batch = topTickers.slice(i, i + BATCH_SIZE);
            const promises = batch.map(async (t: any) => {
                try {
                    const klineRes = await fetch(`${API_BASE_URL}/fapi/v1/klines?symbol=${t.symbol}&interval=1h&limit=5`);
                    if(!klineRes.ok) return null;
                    const data = await klineRes.json();
                    const candles: Candle[] = data.map((k: any) => ({
                        timestamp: k[6], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5])
                    }));
                    if (candles.length < 3) return null;
                    const prev1 = candles[candles.length - 2];
                    const prev2 = candles[candles.length - 3];
                    const avgVolume = (prev2.volume + (candles[candles.length-4]?.volume || 0)) / 2;
                    const volChange = avgVolume > 0 ? ((prev1.volume - avgVolume) / avgVolume) * 100 : 0;
                    return { pair: `${t.symbol.slice(0, -4)}/USDT`, volChange, price: parseFloat(t.lastPrice), candles: candles };
                } catch (e) { return null; }
            });
            const batchResults = await Promise.all(promises);
            batchResults.forEach(r => { if(r) results.push(r); });
            await new Promise(res => setTimeout(res, 100));
        }
        results.sort((a, b) => b.volChange - a.volChange);
        return results;
    } catch (e) {
        return [];
    }
};

const fetchInitialData = async (
    pairs: string[], 
    timeframes: string[],
    onProgress: (progress: number) => void,
    limitOverride?: number,
    onPartialData?: (data: MarketData) => void
): Promise<MarketData> => {
    const marketData: MarketData = {};
    let tickerMap = new Map<string, any>();
    try {
        const tickerResponse = await fetch(`${API_BASE_URL}/fapi/v1/ticker/24hr`);
        if (tickerResponse.ok) {
            const tickers = await tickerResponse.json();
            if (Array.isArray(tickers)) {
                tickerMap = new Map(tickers.map(t => [t.symbol, t]));
            }
        }
    } catch (error) { console.error(error); }

    // Group requests by pair to enable better partial updates
    const pairGroups: { pair: string; tfs: string[] }[] = pairs.map(p => ({ pair: p, tfs: timeframes }));

    // --- ADAPTIVE THROTTLING ---
    const isFastMode = pairs.length <= 20;
    const BATCH_SIZE = isFastMode ? 6 : 3; 
    const BATCH_DELAY = isFastMode ? 200 : 1000;
    const ITEM_DELAY = isFastMode ? 50 : 300;

    let completedRequests = 0;
    const totalRequests = pairs.length * timeframes.length;
    onProgress(0);

    for (let i = 0; i < pairGroups.length; i += BATCH_SIZE) {
        const batchPairs = pairGroups.slice(i, i + BATCH_SIZE);
        if (i > 0) await new Promise(resolve => setTimeout(resolve, BATCH_DELAY)); 

        const batchResults: MarketData = {};

        await Promise.all(batchPairs.map(async ({ pair, tfs }, index) => {
            await new Promise(resolve => setTimeout(resolve, index * ITEM_DELAY));
            const symbol = formatPairToSymbol(pair);
            const ticker = tickerMap.get(symbol);
            
            // Initialize pair data
            const pairData: any = {
                pair,
                price: ticker ? parseFloat(ticker.lastPrice) : 0,
                change24h: ticker ? parseFloat(ticker.priceChangePercent) : 0,
                volume24h: ticker ? parseFloat(ticker.quoteVolume) : 0,
                candles: {},
            };

            for (const tf of tfs) {
                try {
                    const interval = mapTimeframeToInterval(tf);
                    if (!interval) {
                        pairData.candles[tf] = []; 
                        continue;
                    }
                    const MAX_CANDLES_TO_FETCH = limitOverride || 2500;
                    const API_LIMIT_PER_REQUEST = 1500;
                    let allCandlesData: any[] = [];
                    let lastCandleOpenTime: number | undefined = undefined;
                    let fetchCount = 0;
                    const maxFetches = Math.ceil(MAX_CANDLES_TO_FETCH / API_LIMIT_PER_REQUEST);

                    while (allCandlesData.length < MAX_CANDLES_TO_FETCH && fetchCount < maxFetches) {
                        let url = `${API_BASE_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${API_LIMIT_PER_REQUEST}`;
                        if (lastCandleOpenTime) url += `&endTime=${lastCandleOpenTime - 1}`;
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000);
                        const response = await fetch(url, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!response.ok) break;
                        const newCandlesData: any[] = await response.json();
                        if (newCandlesData.length === 0) break;
                        allCandlesData = [...newCandlesData, ...allCandlesData];
                        lastCandleOpenTime = newCandlesData[0][0];
                        fetchCount++;
                        if (newCandlesData.length < API_LIMIT_PER_REQUEST) break;
                        if (fetchCount < maxFetches) await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    const sortedData = allCandlesData.sort((a, b) => a[0] - b[0]).slice(-MAX_CANDLES_TO_FETCH);
                    pairData.candles[tf] = sortedData.map((k: any) => ({
                        timestamp: k[6], open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
                    }));
                } catch (error) { } finally {
                    completedRequests++;
                    const progress = Math.round((completedRequests / totalRequests) * 100);
                    onProgress(progress > 100 ? 100 : progress);
                }
            }
            
            marketData[pair] = pairData;
            batchResults[pair] = pairData;
        }));

        // Trigger partial update callback if provided
        if (onPartialData) {
            onPartialData(batchResults);
        }
    }
    return marketData;
};

const connectToStreams = (
    pairs: string[], 
    timeframes: string[], 
    onUpdate: (pair: string, timeframe: string, candle: Candle) => void
): () => void => {
    if (pairs.length === 0) return () => {};
    const allStreams = pairs.flatMap(pair =>
        timeframes.map(tf => mapTimeframeToInterval(tf)).filter((interval): interval is string => interval !== null).map(interval => `${formatPairToSymbol(pair).toLowerCase()}@kline_${interval}`)
    );
    const MAX_STREAMS_PER_CONNECTION = 150;
    const sockets: WebSocket[] = [];
    const connectChunk = (chunk: string[]) => {
        const streams = chunk.join('/');
        const wsUrl = `${WS_BASE_URL}/stream?streams=${streams}`;
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (!message || typeof message.stream !== 'string' || !message.data) return;
                const { stream, data } = message;
                if (data.e === 'kline' && data.k && data.k.x === true) {
                    const streamPair = stream.split('@')[0].toUpperCase();
                    const pair = pairs.find(p => formatPairToSymbol(p) === streamPair);
                    if (!pair) return;
                    const kline = data.k;
                    onUpdate(pair, kline.i, { timestamp: kline.T, open: parseFloat(kline.o), high: parseFloat(kline.h), low: parseFloat(kline.l), close: parseFloat(kline.c), volume: parseFloat(kline.v) });
                }
            } catch (error) { }
        };
        ws.onerror = (error) => { console.error('WebSocket error', error); };
        ws.onclose = (event) => { setTimeout(() => connectChunk(chunk), 5000); };
        sockets.push(ws);
    }
    for (let i = 0; i < allStreams.length; i += MAX_STREAMS_PER_CONNECTION) {
        const chunk = allStreams.slice(i, i + MAX_STREAMS_PER_CONNECTION);
        connectChunk(chunk);
    }
    return () => { sockets.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.close(); }); };
};

const binanceProvider: DataProvider = {
    name: 'Binance',
    fetchTopSymbols: fetchTopFuturesSymbols,
    fetchInitialData: fetchInitialData,
    connectToStreams: connectToStreams,
};

export const getProvider = (): DataProvider => {
    return binanceProvider;
};
