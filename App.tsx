
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TIME_FRAMES } from './constants';
import type { MarketData, MarketAnalysis, ScannerCandidate, Candle, AnalysisResult, DataProviderName, VolumeStrength, LiveSignal, TvrCandidate, ConvergenceSignal, ShortSqueezeCandidate, SniperSignal } from './types';
import { MarketState, TvrBehavioralState } from './types';
import { getProvider, fetchTopLiquidityMovers, fetchFastTickerSnapshot, fetchTopActivePairsByLiquidity5m } from './services/binanceService';
import { analyzePair } from './services/spectralAnalysisService';
import { calculateLiveSignal } from './services/liveSignalService';
import { calculateTechnicalIndicators } from './services/technicalIndicatorService';
import { analyzeTvr } from './services/tvrService';
import { analyzeSniperOpportunity } from './services/opportunitySniperService';
import Header from './components/Header';
import ExplosionScanner from './components/ExplosionScanner';
import BuySignalScanner from './BuySignalScanner';
import MarketScanner from './components/MarketScanner';
import AnalysisPanel from './components/AnalysisPanel';
import Watchlist from './components/Watchlist';
import SignalTerminal from './components/SignalTerminal';
import SystemSelector from './components/SystemSelector';
import TvrScanner from './components/TvrScanner';
import UltraLightTerminal from './components/UltraLightTerminal';
import ShortSqueezeScanner from './components/ShortSqueezeScanner';
import OpportunitySniper from './components/OpportunitySniper';
import LiquidityScanner from './components/LiquidityScanner';
import LiquiditySystemTerminal from './components/LiquiditySystemTerminal';

import CustomAnalysisTerminal from './components/CustomAnalysisTerminal';
import ReadyToBuyScanner from './components/ReadyToBuyScanner';
import WaveMasterTerminal from './components/WaveMasterTerminal';
import { fetchAllUSDTFuturesPairs } from './services/binanceService';

const SCAN_INTERVAL_SECONDS = 30;
const CORE_WATCHLIST = ['PHB/USDT', 'API3/USDT', 'FIL/USDT', 'TAO/USDT', 'UMA/USDT', 'SOL/USDT', 'ENA/USDT', 'PORTAL/USDT', 'HYPE/USDT'];
const WAVE_MASTER_PAIRS = ['PHB/USDT', 'APT/USDT', 'DASH/USDT', 'UMA/USDT', 'FIL/USDT', 'API3/USDT'];
const CUSTOM_ANALYSIS_PAIRS = [
    'PHB/USDT', 'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 
    'XRP/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT', 'DOT/USDT',
    'LINK/USDT', 'MATIC/USDT', 'UNI/USDT', 'LTC/USDT', 'NEAR/USDT'
];

// Reduced timeframes for background scanning to prevent crashes on mobile/light mode
const SCANNER_TIME_FRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

const calculateVolumeStrength = (volume24h: number): VolumeStrength => {
    if (volume24h > 1_000_000_000) return 'عالية جداً';
    if (volume24h > 200_000_000) return 'عالية';
    if (volume24h > 50_000_000) return 'متوسطة';
    return 'منخفضة';
};

// ... [Keep calculateConfidence and other helper functions same as before] ...
const calculateConfidence = (analysis: AnalysisResult) => {
    let score = 0;
    const { currentPhaseAngle, regimeScore, state, momentum, rsi, macdHistogram } = analysis;

    if (state === MarketState.TRENDING_UP || state === MarketState.BREAKOUT_UP) {
        score += 35;
    } else if (state === MarketState.CONSOLIDATING) {
        score += 10;
    }

    if (currentPhaseAngle > 270) {
       score += (1 - (360 - currentPhaseAngle) / 90) * 25;
    } else if (currentPhaseAngle <= 90) {
        score += (currentPhaseAngle / 90) * 10;
    }
    
    score += (regimeScore + 1) / 2 * 10; 
    
    if (momentum > 0) {
        score += Math.min(momentum * 4, 10);
    }
    
    if (rsi && rsi > 50 && rsi < 75) {
         score += (rsi - 50) / 25 * 10;
    }
    if (macdHistogram && macdHistogram > 0) {
         score += 10;
    }

    return Math.min(99, Math.round(score));
};

const calculateExplosionPotential = (analysis: AnalysisResult) => {
    let score = 0;
    const { state, regimeScore, momentum, marketEnergyIndex, volumeStrength } = analysis;

    if (state !== MarketState.CONSOLIDATING) return 0;
    
    score += 30; 
    if (regimeScore < -0.4) score += 25;
    if (momentum > 0.1) score += 15;
    if (marketEnergyIndex && marketEnergyIndex.length >= 25) {
        const recentEnergy = marketEnergyIndex.slice(-5).reduce((sum, p) => sum + p.value, 0) / 5;
        const pastEnergy = marketEnergyIndex.slice(-25, -5).reduce((sum, p) => sum + p.value, 0) / 20;
        if (recentEnergy > pastEnergy * 1.15) score += 15;
    }
    if (volumeStrength === 'متوسطة' || volumeStrength === 'عالية' || volumeStrength === 'عالية جداً') score += 15;
    return Math.min(99, Math.round(score));
};

// ... [Keep calculateSchoolConfluence and processConvergenceSignals] ...
const calculateSchoolConfluence = (analysis: AnalysisResult): { score: number, schools: string[] } => {
    let score = 0;
    const schools: string[] = [];
    if (analysis.elliottWave?.primaryScenario) {
        const scenario = analysis.elliottWave.primaryScenario;
        if (scenario.type.includes('Impulsive') && (scenario.currentWaveLabel === '3' || scenario.currentWaveLabel === '5')) {
            score += 20; schools.push('Elliott');
        } else if (scenario.type.includes('Corrective') && scenario.currentWaveLabel === 'C') {
            score += 10; schools.push('Elliott');
        }
    }
    if (analysis.harmonicPattern?.detected && analysis.harmonicPattern.hsiScore && analysis.harmonicPattern.hsiScore > 70) {
        if (analysis.harmonicPattern.patternName?.includes('Bullish')) {
            score += 20; schools.push('Harmonic');
        }
    }
    if (analysis.gannAnalysis) {
        if (analysis.gannAnalysis.implication === 'Bullish') {
            score += 10; schools.push('Gann');
        }
        if (analysis.gannAnalysis.squaringPoints.some(p => p.index > 0 && p.index < 5)) score += 5;
    }
    if (analysis.wyckoffAnalysis) {
        if (analysis.wyckoffAnalysis.phase === 'C' || analysis.wyckoffAnalysis.phase === 'D' || analysis.wyckoffAnalysis.phase === 'E') {
            score += 15; schools.push('Wyckoff');
        }
    }
    if (analysis.ictAnalysis) {
        if (analysis.ictAnalysis.marketStructure === 'Bullish' && analysis.ictAnalysis.fairValueGaps.some(g => g.type === 'bullish' && !g.isMitigated)) {
            score += 15; schools.push('ICT');
        }
    }
    if (analysis.fractalAnalysis?.historicalMatch?.type === 'Optimistic') {
        score += 10; schools.push('Fractal');
    }
    if (analysis.state === MarketState.TRENDING_UP || analysis.state === MarketState.BREAKOUT_UP) {
        if (analysis.currentPhaseAngle > 270) {
            score += 20; schools.push('Spectral');
        }
    }
    return { score: Math.min(99, score), schools };
};

const processConvergenceSignals = (allAnalysisData: MarketAnalysis, allMarketData: MarketData): ConvergenceSignal[] => {
    const convergenceSignals: ConvergenceSignal[] = [];
    const pairs = Object.keys(allAnalysisData);
    const btcDAnalysis = allAnalysisData['BTC.D']?.['1d'];
    const total2Analysis = allAnalysisData['TOTAL2']?.['1d'];
    const marketContext: ConvergenceSignal['marketContext'] = {
        btcDominance: btcDAnalysis?.momentum ?? 0 < -0.5 ? 'Supportive' : btcDAnalysis?.momentum ?? 0 > 0.5 ? 'Headwind' : 'Neutral',
        altcoinMomentum: total2Analysis?.momentum ?? 0 > 0.5 ? 'Supportive' : total2Analysis?.momentum ?? 0 < -0.5 ? 'Headwind' : 'Neutral',
    };
    const timeframeWeights: { [key: string]: number } = { '1w': 5, '3d': 4, '1d': 4, '12h': 3, '6h': 3, '4h': 3, '2h': 2, '1h': 2, '15m': 1 };

    for (const pair of pairs) {
        const pairAnalyses = allAnalysisData[pair];
        const validSignals: { tf: string; score: number; schools: string[]; analysis: AnalysisResult }[] = [];
        for (const tf of Object.keys(pairAnalyses)) {
            const analysis = pairAnalyses[tf];
            if (!analysis) continue;
            const { score, schools } = calculateSchoolConfluence(analysis);
            if (score > 40) validSignals.push({ tf, score, schools, analysis });
        }
        if (validSignals.length === 0) continue;
        let totalWeight = 0;
        let weightedScoreSum = 0;
        const allSchools = new Set<string>();
        validSignals.forEach(signal => {
            const weight = timeframeWeights[signal.tf] ?? 1;
            totalWeight += weight;
            weightedScoreSum += signal.score * weight;
            signal.schools.forEach(s => allSchools.add(s));
        });
        const convergenceScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 0;
        if (convergenceScore < 50) continue;
        let signalTier: ConvergenceSignal['signalTier'] = 'B';
        if (convergenceScore > 85 && allSchools.size >= 4) signalTier = 'A+';
        else if (convergenceScore > 75 && allSchools.size >= 3) signalTier = 'A';
        else if (convergenceScore > 65) signalTier = 'B+';
        const bestSignal = validSignals.reduce((best, current) => current.score > best.score ? current : best);
        const { analysis: bestAnalysis } = bestSignal;
        let primaryDriver: ConvergenceSignal['primaryDriver'] = { type: 'Spectral', name: 'Convergence' };
        if (allSchools.has('Harmonic') && bestAnalysis.harmonicPattern?.detected) primaryDriver = { type: 'Harmonic', name: bestAnalysis.harmonicPattern.patternName || 'Pattern' };
        else if (allSchools.has('Elliott') && bestAnalysis.elliottWave?.primaryScenario) primaryDriver = { type: 'Elliott', name: `Wave ${bestAnalysis.elliottWave.currentWave}` };
        else if (allSchools.has('ICT')) primaryDriver = { type: 'ICT', name: 'Smart Money' };
        else if (allSchools.has('Wyckoff')) primaryDriver = { type: 'Wyckoff', name: 'Accumulation' };
        let riskRewardRatio = 2.0;
        if (bestAnalysis.smartMoneyAnalysis?.tradeSetup) {
             const s = bestAnalysis.smartMoneyAnalysis.tradeSetup;
             riskRewardRatio = Math.abs((s.targets[0].price - s.entry) / (s.entry - s.stopLoss));
        }
        let volumeConfirmation: ConvergenceSignal['volumeConfirmation'] = 'Weak';
        if (bestAnalysis.volumeStrength === 'عالية جداً' || bestAnalysis.volumeStrength === 'عالية') volumeConfirmation = 'Strong';
        else if (bestAnalysis.volumeStrength === 'متوسطة') volumeConfirmation = 'Moderate';
        
        convergenceSignals.push({
            pair,
            bestTimeframe: bestSignal.tf,
            analysis: bestAnalysis,
            price: allMarketData[pair].price,
            signalTier,
            convergenceScore,
            convergingTimeframes: validSignals.map(s => ({ tf: s.tf, confidence: s.score })),
            primaryDriver,
            riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
            marketContext,
            volumeConfirmation,
            strategies: Array.from(allSchools)
        });
    }
    return convergenceSignals.sort((a, b) => b.convergenceScore - a.convergenceScore);
};

const App: React.FC = () => {
    const [systemMode, setSystemMode] = useState<'Light' | 'Medium' | 'Full' | 'UltraLight' | 'VeryLight' | 'Liquidity' | 'FastFull' | null>(null);
    const [marketData, setMarketData] = useState<MarketData>({});
    const [analysisData, setAnalysisData] = useState<MarketAnalysis>({});
    const [convergenceCandidates, setConvergenceCandidates] = useState<ConvergenceSignal[]>([]);
    const [explosionCandidates, setExplosionCandidates] = useState<ScannerCandidate[]>([]);
    const [tvrCandidates, setTvrCandidates] = useState<TvrCandidate[]>([]);
    const [shortSqueezeCandidates, setShortSqueezeCandidates] = useState<ShortSqueezeCandidate[]>([]);
    const [sniperSignals, setSniperSignals] = useState<SniperSignal[]>([]);
    const [liquidityCandidates, setLiquidityCandidates] = useState<ScannerCandidate[]>([]);
    const [liquidityMovers, setLiquidityMovers] = useState<{ pair: string, volChange: number, price: number, candles: Candle[] }[]>([]);
    
    const [activeTimeframe, setActiveTimeframe] = useState<string>(() => localStorage.getItem('activeTimeframe') || '1h');
    const [selectedCandidate, setSelectedCandidate] = useState<ScannerCandidate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('اختر نظام التحليل لبدء التشغيل...');
    const [currencyPairs, setCurrencyPairs] = useState<string[]>([]);
    const [loadingProgress, setLoadingProgress] = useState(0);
    
    const [watchlist, setWatchlist] = useState<Set<string>>(() => {
        const stored = localStorage.getItem('watchlist');
        let userWatchlist: string[] = [];
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) userWatchlist = parsed as string[];
            } catch (e) { console.error('Failed to parse watchlist', e); }
        }
        return new Set([...CORE_WATCHLIST, ...userWatchlist]);
    });

    const [terminalSymbol, setTerminalSymbol] = useState<string>('BTC/USDT');
    const [terminalTimeframe, setTerminalTimeframe] = useState<string>('15m');
    const [liveSignal, setLiveSignal] = useState<LiveSignal | null>(null);
    const [isTerminalLoading, setIsTerminalLoading] = useState(true);

    const [nextScanCountdown, setNextScanCountdown] = useState(SCAN_INTERVAL_SECONDS);
    const marketDataQueueRef = useRef<{pair: string, timeframe: string, newCandle: Candle}[]>([]);
    const updateTimerRef = useRef<number | null>(null);

    useEffect(() => { localStorage.setItem('activeTimeframe', activeTimeframe); }, [activeTimeframe]);
    useEffect(() => {
        const userWatchlist = Array.from(watchlist).filter((pair: string) => !CORE_WATCHLIST.includes(pair));
        localStorage.setItem('watchlist', JSON.stringify(userWatchlist));
    }, [watchlist]);

    const handleToggleWatchlist = useCallback((pair: string) => {
        if (CORE_WATCHLIST.includes(pair)) return;
        setWatchlist(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pair)) newSet.delete(pair);
            else newSet.add(pair);
            return newSet;
        });
    }, []);

    const runFullAnalysisAndScan = useCallback((currentMarketData: MarketData, pairs: string[]) => {
        const newAnalysisData: MarketAnalysis = {};
        const newExplosionCandidates: ScannerCandidate[] = [];
        const newTvrCandidates: TvrCandidate[] = [];
        const newShortSqueezeCandidates: ShortSqueezeCandidate[] = [];
        const newSniperSignals: SniperSignal[] = [];
        const newLiquidityCandidates: ScannerCandidate[] = []; 

        const explosionTimeframes = ['1m', '5m', '15m', '30m', '1h'];
        const tvrTimeframes = ['1h', '4h'];
        const squeezeTimeframes = ['4h', '1d'];
        const sniperTimeframes = ['1m', '5m'];
        const liquidityTimeframes = ['15m', '1h']; 

        for (const pair of pairs) {
            if (!currentMarketData[pair]) continue;
            newAnalysisData[pair] = {};
            const volumeStrength = calculateVolumeStrength(currentMarketData[pair].volume24h);
            const availableTimeframes = Object.keys(currentMarketData[pair].candles);

            for (const tf of availableTimeframes) {
                const candles = currentMarketData[pair].candles[tf];
                if (!candles || candles.length < 50) continue; 

                let analysisResult = analyzePair(pair, tf, candles, currentMarketData[pair].candles);
                const indicators = calculateTechnicalIndicators(candles);
                analysisResult = { ...analysisResult, ...indicators, volumeStrength };
                newAnalysisData[pair][tf] = analysisResult;
                
                if (sniperTimeframes.includes(tf)) {
                    const sniperSignal = analyzeSniperOpportunity(pair, tf, analysisResult);
                    if (sniperSignal) newSniperSignals.push(sniperSignal);
                }
                if (squeezeTimeframes.includes(tf) && analysisResult.shortSqueezeAnalysis && analysisResult.shortSqueezeAnalysis.squeezePressure > 65) {
                    newShortSqueezeCandidates.push({ pair, timeframe: tf, analysis: analysisResult.shortSqueezeAnalysis, price: currentMarketData[pair].price });
                }
                if (tvrTimeframes.includes(tf)) {
                    const tvrAnalysis = analyzeTvr(candles);
                    if (tvrAnalysis && tvrAnalysis.state !== TvrBehavioralState.NORMAL) {
                        newTvrCandidates.push({ pair, timeframe: tf, analysis: tvrAnalysis });
                    }
                }
                if (liquidityTimeframes.includes(tf) && analysisResult.liquidityAnalysis && analysisResult.liquidityAnalysis.volumeRatio > 1.2) {
                    newLiquidityCandidates.push({ pair, timeframe: tf, confidence: analysisResult.liquidityAnalysis.volumeRatio * 10, analysis: analysisResult, price: currentMarketData[pair].price });
                }
                if (explosionTimeframes.includes(tf)) {
                    const potential = calculateExplosionPotential(analysisResult);
                    if (potential > 65) {
                        newExplosionCandidates.push({ pair, timeframe: tf, confidence: potential, analysis: analysisResult, price: currentMarketData[pair].price });
                    }
                }
            }
        }
        
        // Calculate convergence signals for the NEW batch
        const newConvergenceCandidates = processConvergenceSignals(newAnalysisData, currentMarketData);
        
        setAnalysisData(prev => ({...prev, ...newAnalysisData}));

        // --- ACCUMULATIVE STATE UPDATES (Merge new findings with existing ones) ---
        
        setConvergenceCandidates(prev => {
            const map = new Map<string, ConvergenceSignal>(prev.map(c => [c.pair, c]));
            newConvergenceCandidates.forEach(c => map.set(c.pair, c));
            // Sort by score descending and keep top 50 best opportunities found so far
            return Array.from(map.values()).sort((a, b) => b.convergenceScore - a.convergenceScore).slice(0, 50);
        });

        setExplosionCandidates(prev => {
            // Filter new candidates
            const map = new Map<string, ScannerCandidate>(prev.map(c => [`${c.pair}-${c.timeframe}`, c]));
            newExplosionCandidates.forEach(c => map.set(`${c.pair}-${c.timeframe}`, c));
            return Array.from(map.values()).sort((a, b) => b.confidence - a.confidence).slice(0, 50);
        });

        setShortSqueezeCandidates(prev => {
            const map = new Map<string, ShortSqueezeCandidate>(prev.map(c => [`${c.pair}-${c.timeframe}`, c]));
            newShortSqueezeCandidates.forEach(c => map.set(`${c.pair}-${c.timeframe}`, c));
            return Array.from(map.values()).sort((a, b) => b.analysis.squeezePressure - a.analysis.squeezePressure).slice(0, 50);
        });

        setTvrCandidates(prev => {
            const map = new Map<string, TvrCandidate>(prev.map(c => [`${c.pair}-${c.timeframe}`, c]));
            newTvrCandidates.forEach(c => map.set(`${c.pair}-${c.timeframe}`, c));
            return Array.from(map.values()).sort((a, b) => (a.analysis.state === TvrBehavioralState.INERTIAL ? -1 : 1) - (b.analysis.state === TvrBehavioralState.INERTIAL ? -1 : 1)).slice(0, 50);
        });

        setSniperSignals(prev => {
            const map = new Map<string, SniperSignal>(prev.map(s => [`${s.pair}-${s.timeframe}`, s]));
            newSniperSignals.forEach(s => map.set(`${s.pair}-${s.timeframe}`, s));
            // Keep recent
            return Array.from(map.values()).slice(-50); 
        });

        setLiquidityCandidates(prev => {
            const map = new Map<string, ScannerCandidate>(prev.map(c => [`${c.pair}-${c.timeframe}`, c]));
            newLiquidityCandidates.forEach(c => map.set(`${c.pair}-${c.timeframe}`, c));
            return Array.from(map.values()).sort((a, b) => Math.abs(b.analysis.liquidityAnalysis?.moneyFlowRaw || 0) - Math.abs(a.analysis.liquidityAnalysis?.moneyFlowRaw || 0)).slice(0, 50);
        });

    }, []);
    
    const processMarketDataQueue = useCallback(() => {
        if (marketDataQueueRef.current.length === 0) {
            updateTimerRef.current = null;
            return;
        }
        const updatesToProcess = marketDataQueueRef.current;
        marketDataQueueRef.current = [];

        setMarketData(prevData => {
            const nextData = { ...prevData };
            updatesToProcess.forEach(({ pair, timeframe, newCandle }) => {
                const prevPairData = nextData[pair];
                if (!prevPairData || !prevPairData.candles[timeframe]) return;
                const prevCandles = prevPairData.candles[timeframe] || [];
                const updatedCandles = [...prevCandles.slice(1), newCandle];
                const newPairData = {
                    ...prevPairData,
                    price: newCandle.close,
                    candles: { ...prevPairData.candles, [timeframe]: updatedCandles }
                };
                if (timeframe === '1h' && newPairData.candles['1h'] && newPairData.candles['1h'].length > 0) {
                    const anchorPrice = newPairData.candles['1h'][0].close;
                     if (anchorPrice > 0) newPairData.change24h = (newCandle.close / anchorPrice - 1) * 100;
                }
                nextData[pair] = newPairData;
            });
            return nextData;
        });
        updateTimerRef.current = null;
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            if (!systemMode) return;
            setIsLoading(true);
            setLoadingProgress(0);
            const dataProvider = getProvider();
            let pairsToAnalyze: string[] = [];

            if (systemMode === 'Liquidity') {
                setStatusMessage(`جاري جلب أفضل العملات من حيث السيولة...`);
                const topMovers = await fetchTopLiquidityMovers();
                setLiquidityMovers(topMovers);
                const initialData: MarketData = {};
                const pairs = topMovers.map(m => m.pair);
                topMovers.forEach(m => {
                    initialData[m.pair] = {
                        pair: m.pair,
                        price: m.price,
                        change24h: 0, 
                        volume24h: 0,
                        candles: { '1h': m.candles }
                    };
                });
                setCurrencyPairs(pairs);
                setMarketData(initialData);
                setAnalysisData({});
                setIsLoading(false);
                const closeSocket = dataProvider.connectToStreams(pairs, ['1h'], (pair, timeframe, candle) => {});
                return () => closeSocket();

            } else if (systemMode === 'FastFull') {
                setStatusMessage(`جاري فحص سيولة آخر 5 دقائق لتحديد أنشط 15 عملة...`);
                const priorityPairs = await fetchTopActivePairsByLiquidity5m();
                
                const fastData = await fetchFastTickerSnapshot();
                const filteredMarketData: MarketData = {};
                priorityPairs.forEach(p => {
                    if (fastData[p]) filteredMarketData[p] = fastData[p];
                });
                setMarketData(filteredMarketData);
                setCurrencyPairs(priorityPairs);
                
                setStatusMessage(`تم تحديد ${priorityPairs.length} عملة. جاري تحميل البيانات وتشغيل الماسح التراكمي...`);
                
                // Fetch candles with incremental update support
                await dataProvider.fetchInitialData(
                    priorityPairs, 
                    ['15m', '1h', '4h'], 
                    setLoadingProgress,
                    300,
                    (partialData) => {
                        setMarketData(prev => ({...prev, ...partialData}));
                        const batchPairs = Object.keys(partialData);
                        runFullAnalysisAndScan(partialData, batchPairs);
                    }
                );
                
                const closeSocket = dataProvider.connectToStreams(priorityPairs, ['15m', '1h', '4h'], (pair, timeframe, newCandle) => {
                    marketDataQueueRef.current.push({ pair, timeframe, newCandle });
                    if (!updateTimerRef.current) {
                        updateTimerRef.current = window.setTimeout(processMarketDataQueue, 300);
                    }
                });
                
                setIsLoading(false);
                setStatusMessage('النظام الشامل السريع جاهز. البحث مستمر...');

                return () => {
                    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
                    closeSocket();
                };

            } else if (systemMode === 'GlobalScanner') {
                setStatusMessage(`جاري جلب قائمة جميع عملات الفيوتشر (300+)...`);
                const allFuturesPairs = await fetchAllUSDTFuturesPairs();
                setCurrencyPairs(allFuturesPairs);
                
                setStatusMessage(`تم العثور على ${allFuturesPairs.length} عملة. جاري بدء المسح الشامل (قد يستغرق وقتاً)...`);
                
                // For Global Scanner, we prioritize 1h and 4h for stability, and fetch in larger batches but slower
                await dataProvider.fetchInitialData(
                    allFuturesPairs, 
                    ['1h', '4h'], 
                    setLoadingProgress,
                    300, // Limit candles to speed up
                    (partialData) => {
                        setMarketData(prev => ({...prev, ...partialData}));
                        const batchPairs = Object.keys(partialData);
                        runFullAnalysisAndScan(partialData, batchPairs);
                    }
                );

                // We don't open sockets for ALL 300 pairs to avoid browser crash. 
                // We only open sockets for the "Ready to Buy" candidates found.
                // But for now, let's just keep it static or update periodically via re-scan.
                
                setIsLoading(false);
                setStatusMessage('المسح الشامل مكتمل. النتائج جاهزة.');
                
                // Periodically refresh the full scan every 2 minutes instead of streaming
                const refreshInterval = setInterval(() => {
                    // Logic to re-fetch snapshot or re-scan could go here
                    // For now, we rely on the initial scan results.
                }, 120000);

                return () => clearInterval(refreshInterval);

            } else {
                // ... Existing Setup logic for other modes ...
                if (systemMode === 'UltraLight') {
                    // ... logic ...
                     try {
                        const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr`);
                        if (!response.ok) throw new Error('Failed to fetch tickers');
                        const tickers: any[] = await response.json();
                        const usdtTickers = tickers
                            .filter((t: any) => t.symbol.endsWith('USDT') && !t.symbol.includes('_') && parseFloat(t.quoteVolume) > 10000000) 
                            .map((t: any) => ({ pair: `${t.symbol.slice(0, -4)}/USDT`, change: parseFloat(t.priceChangePercent) }));
                        usdtTickers.sort((a: any, b: any) => b.change - a.change);
                        const topGainers = usdtTickers.slice(0, 5).map((t: any) => t.pair);
                        const topLosers = usdtTickers.slice(-5).map((t: any) => t.pair);
                        pairsToAnalyze = [...topGainers, ...topLosers];
                    } catch (e) {
                        pairsToAnalyze = ['GALA/USDT', 'LUNA2/USDT', 'LPT/USDT', 'OP/USDT', 'YGG/USDT', 'AR/USDT', 'FIL/USDT', 'NEAR/USDT', 'FET/USDT', 'RNDR/USDT'];
                    }
                } else if (systemMode === 'CustomAnalysis') {
                    pairsToAnalyze = CUSTOM_ANALYSIS_PAIRS;
                } else if (systemMode === 'WaveMasterSystem') {
                    pairsToAnalyze = WAVE_MASTER_PAIRS;
                } else if (systemMode === 'VeryLight') {
                    pairsToAnalyze = Array.from(new Set([...watchlist, 'BTC/USDT', 'SOL/USDT']));
                } else {
                    const allPairs = await dataProvider.fetchTopSymbols();
                    const combinedPairs = Array.from(new Set([...CORE_WATCHLIST, ...allPairs]));
                    switch(systemMode) {
                        case 'Light': pairsToAnalyze = Array.from(new Set([...CORE_WATCHLIST, ...combinedPairs.slice(0, 25)])); break;
                        case 'Medium': pairsToAnalyze = Array.from(new Set([...CORE_WATCHLIST, ...combinedPairs.slice(0, 100)])); break;
                        case 'Full': default: pairsToAnalyze = combinedPairs; break;
                    }
                }

                setCurrencyPairs(pairsToAnalyze);
                setMarketData({});
                setAnalysisData({});
                setStatusMessage(`جاري جلب وتحليل البيانات لـ ${pairsToAnalyze.length} عملة...`);
                
                await dataProvider.fetchInitialData(
                    pairsToAnalyze, 
                    SCANNER_TIME_FRAMES, 
                    setLoadingProgress, 
                    500,
                    (partialData) => {
                        setMarketData(prev => ({...prev, ...partialData}));
                        const batchPairs = Object.keys(partialData);
                        runFullAnalysisAndScan(partialData, batchPairs);
                    }
                );

                const handleStreamUpdate = (pair: string, timeframe: string, newCandle: Candle) => {
                    if (SCANNER_TIME_FRAMES.includes(timeframe)) {
                        marketDataQueueRef.current.push({ pair, timeframe, newCandle });
                        if (!updateTimerRef.current) {
                            updateTimerRef.current = window.setTimeout(processMarketDataQueue, 300);
                        }
                    }
                };
                const closeSocket = dataProvider.connectToStreams(pairsToAnalyze, SCANNER_TIME_FRAMES, handleStreamUpdate);
                setIsLoading(false);
                setStatusMessage('البحث مستمر... يتم تحديث الفرص فور اكتشافها.');
                return () => {
                    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
                    closeSocket();
                };
            }
        };
        initializeApp();
    }, [systemMode]);

    const marketDataRef = useRef(marketData);
    useEffect(() => { marketDataRef.current = marketData; }, [marketData]);
    const currencyPairsRef = useRef(currencyPairs);
    useEffect(() => { currencyPairsRef.current = currencyPairs; }, [currencyPairs]);

    useEffect(() => {
        if (isLoading || !systemMode) return;
        if (systemMode === 'Liquidity') {
             const refreshLiquidity = async () => {
                const topMovers = await fetchTopLiquidityMovers();
                setLiquidityMovers(topMovers);
                setNextScanCountdown(SCAN_INTERVAL_SECONDS);
             };
             const liqTimer = window.setInterval(refreshLiquidity, SCAN_INTERVAL_SECONDS * 1000);
             const countdownTimer = window.setInterval(() => { setNextScanCountdown(prev => (prev > 0 ? prev - 1 : 0)); }, 1000);
            return () => { clearInterval(liqTimer); clearInterval(countdownTimer); };
        }
        const performScan = () => {
            const pairsWithData = currencyPairsRef.current.filter(p => {
                const d = marketDataRef.current[p];
                return d && d.candles && Object.keys(d.candles).length > 0;
            });
            if (pairsWithData.length > 0) {
                runFullAnalysisAndScan(marketDataRef.current, pairsWithData);
                setNextScanCountdown(SCAN_INTERVAL_SECONDS);
            }
        };
        // Periodically re-scan all available data to update scores
        const analysisTimer = window.setInterval(performScan, SCAN_INTERVAL_SECONDS * 1000);
        const countdownTimer = window.setInterval(() => { setNextScanCountdown(prev => (prev > 0 ? prev - 1 : 0)); }, 1000);
        return () => { clearInterval(analysisTimer); clearInterval(countdownTimer); };
    }, [isLoading, runFullAnalysisAndScan, systemMode]);
    
    useEffect(() => {
        const updateLiveSignal = () => {
            setIsTerminalLoading(true);
            const analysis = analysisData[terminalSymbol]?.[terminalTimeframe];
            const marketInfo = marketData[terminalSymbol];
            if (analysis && marketInfo) {
                const newSignal = calculateLiveSignal(analysis, marketInfo.price, marketInfo.change24h);
                setLiveSignal(newSignal);
            } else {
                setLiveSignal(null);
            }
            setIsTerminalLoading(false);
        };
        updateLiveSignal();
    }, [terminalSymbol, terminalTimeframe, analysisData, marketData]);

    const handleAnalyze = useCallback((candidate: ScannerCandidate) => { setSelectedCandidate(candidate); }, []);
    const handleClosePanel = useCallback(() => { setSelectedCandidate(null); }, []);
    const memoizedAnalysisData = useMemo(() => analysisData, [analysisData]);
    const difficultyForPanel = systemMode === 'Light' ? 'Basic' : systemMode === 'Medium' ? 'Advanced' : 'Expert';

    if (!systemMode) return <SystemSelector onSelect={setSystemMode} />;
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-center px-4">
                <svg className="h-10 w-10 text-cyan-glow animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12H6L9 3L15 21L18 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <p className="mt-4 text-gray-400 font-mono">{statusMessage}</p>
                <div className="w-full max-w-sm mt-4 bg-gray-700 rounded-full h-2.5"><div className="bg-cyan-glow h-2.5 rounded-full" style={{ width: `${loadingProgress}%`, transition: 'width 0.2s ease-in-out' }}></div></div>
                <p className="mt-2 text-sm text-cyan-glow font-mono">{loadingProgress}%</p>
                
                {/* Preview of early findings during load */}
                {convergenceCandidates.length > 0 && (
                    <div className="mt-8 p-4 bg-gray-800 rounded border border-gray-700 max-w-lg w-full animate-fade-in">
                        <p className="text-xs text-green-400 mb-2 font-bold">تم اكتشاف {convergenceCandidates.length} فرصة حتى الآن...</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {convergenceCandidates.slice(0, 5).map(c => (
                                <span key={c.pair} className="text-[10px] bg-gray-700 px-2 py-1 rounded border border-gray-600 text-gray-300">{c.pair}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    if (systemMode === 'Liquidity') return <div className="min-h-screen bg-gray-900 text-gray-300"><Header /><LiquiditySystemTerminal movers={liquidityMovers} nextScanCountdown={nextScanCountdown} /></div>;
    if (systemMode === 'UltraLight') return <div className="min-h-screen bg-gray-900 text-gray-300"><Header /><UltraLightTerminal marketData={marketData} analysisData={memoizedAnalysisData} currencyPairs={currencyPairs} nextScanCountdown={nextScanCountdown} /></div>;
    if (systemMode === 'CustomAnalysis') return <div className="min-h-screen bg-gray-900 text-gray-300"><Header /><CustomAnalysisTerminal marketData={marketData} analysisData={memoizedAnalysisData} nextScanCountdown={nextScanCountdown} /></div>;
    if (systemMode === 'WaveMasterSystem') return <div className="min-h-screen bg-gray-900 text-gray-300"><Header /><WaveMasterTerminal marketData={marketData} analysisData={memoizedAnalysisData} nextScanCountdown={nextScanCountdown} /></div>;
    if (systemMode === 'GlobalScanner') return <div className="min-h-screen bg-gray-900 text-gray-300"><Header /><ReadyToBuyScanner candidates={convergenceCandidates} onAnalyze={handleAnalyze} isLoading={isLoading} nextScanCountdown={nextScanCountdown} /></div>;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-300">
            <Header />
            {systemMode === 'FastFull' && <div className="bg-cyan-900/20 text-center py-1 text-xs text-cyan-300 border-b border-cyan-500/20">🚀 النظام الشامل السريع: البحث مستمر (Accumulative Scanning Mode)</div>}
            <SignalTerminal currencyPairs={currencyPairs} symbol={terminalSymbol} setSymbol={setTerminalSymbol} timeframe={terminalTimeframe} setTimeframe={setTerminalTimeframe} signal={liveSignal} isLoading={isTerminalLoading} nextScanCountdown={nextScanCountdown} />
            <main>
                <div className="border-b border-gray-800">
                    <Watchlist watchlist={watchlist} onToggleWatchlist={handleToggleWatchlist} marketData={marketData} analysisData={memoizedAnalysisData} activeTimeframe={activeTimeframe} onAnalyze={handleAnalyze} currencyPairs={currencyPairs} />
                </div>
                <div className="border-b border-gray-800"><BuySignalScanner candidates={convergenceCandidates} onAnalyze={handleAnalyze} isLoading={false} nextScanCountdown={nextScanCountdown} /></div>
                <div className="border-b border-gray-800"><ExplosionScanner candidates={explosionCandidates} onAnalyze={handleAnalyze} isLoading={false} nextScanCountdown={nextScanCountdown} /></div>
                <div className="border-b border-gray-800"><LiquidityScanner candidates={liquidityCandidates} /></div>
                <div className="border-b border-gray-800"><ShortSqueezeScanner candidates={shortSqueezeCandidates} onAnalyze={handleAnalyze} analysisData={memoizedAnalysisData} nextScanCountdown={nextScanCountdown} /></div>
                <div className="border-b border-gray-800"><TvrScanner candidates={tvrCandidates} /></div>
                 <div className="border-b border-gray-800"><OpportunitySniper signals={sniperSignals} /></div>
                <MarketScanner marketData={marketData} analysisData={memoizedAnalysisData} activeTimeframe={activeTimeframe} setActiveTimeframe={setActiveTimeframe} onAnalyze={handleAnalyze} currencyPairs={currencyPairs} watchlist={watchlist} onToggleWatchlist={handleToggleWatchlist} />
            </main>
            <AnalysisPanel candidate={selectedCandidate} onClose={handleClosePanel} difficulty={difficultyForPanel} marketData={marketData} />
        </div>
    );
};

export default App;
