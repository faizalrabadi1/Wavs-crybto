
import type { Candle, GannAnalysis, FractalAnalysisResult, GannFractalNexusAnalysis, NexusChartData, NexusNode, NexusPhysics } from '../types';

// --- 1. Physics Engine Helpers ---
const calculatePhysics = (currentPrice: number, trendSlope: number, vol: number, hurst: number): NexusPhysics => {
    // Velocity: Rate of change modulated by volatility
    const velocity = trendSlope * (1 + vol);
    
    // Gravity: Mean reversion force (higher if Hurst < 0.5)
    const gravity = (1 - hurst) * 9.81 * (Math.abs(velocity) > 0.5 ? 1.5 : 0.5);
    
    // Mass: Simulated based on recent volume context (not available here, using Hurst as proxy for trend 'weight')
    const mass = hurst * 100; 
    
    // Resilience: Monte Carlo success rate proxy
    const resilienceScore = (hurst * 50) + (50 * (1 - vol));

    return {
        velocity,
        gravity,
        mass,
        resilienceScore: Math.min(100, Math.max(0, resilienceScore))
    };
};

// --- 2. Nexus Node Detector (Squaring Logic) ---
const findNexusNodes = (
    path: NexusChartData[], 
    startIdx: number, 
    startPrice: number
): NexusNode[] => {
    const nodes: NexusNode[] = [];
    
    path.forEach((point, i) => {
        if (point.type === 'History') return;
        
        const timeDelta = point.time - startIdx;
        const priceDelta = Math.abs(point.price - startPrice);
        
        // Price Squaring: Price touches a Gann Level (e.g. 90 deg)
        // Simplified: Check if normalized price is near a whole number or significant fraction
        const priceMod = point.price % 10; // Arbitrary cyclic check for demo
        
        // Time Squaring: Time is a Gann number (45, 90, 144...)
        const isTimeSquare = [45, 90, 144, 180, 270, 360].some(t => Math.abs(timeDelta - t) < 2);
        
        if (isTimeSquare) {
            nodes.push({
                time: point.time,
                price: point.price,
                label: `Time Square ${timeDelta}`,
                strength: 0.8,
                type: 'Squaring'
            });
        }
        
        // Fractal/Gann Interaction Node (Stellar Nexus)
        // If path curvature (acceleration) is high at a Time Square
        if (i > 1 && isTimeSquare) {
             const prev = path[i-1];
             const prev2 = path[i-2];
             const acc = (point.price - prev.price) - (prev.price - prev2.price);
             if (Math.abs(acc) > point.price * 0.005) {
                 nodes.push({
                     time: point.time,
                     price: point.price,
                     label: 'STELLAR NEXUS',
                     strength: 1.0,
                     type: 'Gann'
                 });
             }
        }
    });
    
    return nodes;
};

export const analyzeGannFractalNexus = (
    candles: Candle[],
    gann: GannAnalysis,
    fractal: FractalAnalysisResult
): GannFractalNexusAnalysis => {
    
    const currentPrice = candles[candles.length - 1].close;
    const currentIndex = candles.length - 1;
    const lastCandles = candles.slice(-60);

    // 1. Identify Key Overlaps (The "Nexus")
    let confluenceScore = 50;
    const timeTargets: GannFractalNexusAnalysis['timeTargets'] = [];

    const gannCluster = gann.timeCycles[0]; 
    const fractalHurst = fractal.hurstExponent;
    const fractalProjection = fractal.historicalMatch?.projection || [];

    if (gann.implication === 'Bullish' && fractalHurst > 0.55) confluenceScore += 20;
    if (gann.implication === 'Bearish' && fractalHurst < 0.45) confluenceScore += 20;
    if (gannCluster && gannCluster.projectedIndex - currentIndex < 20) {
        confluenceScore += 15;
        timeTargets.push({ index: gannCluster.projectedIndex, label: 'Gann Squaring Time' });
    }

    const isBullish = confluenceScore > 60;
    const volatility = (1 - fractalHurst) * 0.1; // Base volatility for cloud

    // --- 2. Generate Paths & Clouds ---
    const shortTermPath: NexusChartData[] = [];
    const longTermPath: NexusChartData[] = [];

    // A. History
    lastCandles.forEach((c, i) => {
        shortTermPath.push({ 
            time: currentIndex - 59 + i, 
            price: c.close, 
            type: 'History',
            energy: 0.5 
        });
    });

    // B. Short Term Projection (Quantum Cloud)
    const shortProjLen = 40;
    let simPrice = currentPrice;
    
    for(let i = 1; i <= shortProjLen; i++) {
        const fractalStep = fractalProjection[i] || 1.0;
        const trendBias = isBullish ? 1.001 : 0.999;
        
        // Nonlinear dynamics
        simPrice *= (fractalStep > 0 ? fractalStep : 1) * trendBias;
        
        // Cloud calculation (Standard Deviation Cone)
        const uncertainty = simPrice * volatility * Math.sqrt(i);
        
        // Energy (Hurst-based gradient)
        // Higher Hurst = Green/Blue (Trend), Lower = Red/Orange (Chaos)
        const localEnergy = Math.max(0, Math.min(1, fractalHurst + (Math.sin(i/5)*0.1))); 

        shortTermPath.push({ 
            time: currentIndex + i, 
            price: simPrice, 
            type: 'Projection',
            upperBound: simPrice + uncertainty,
            lowerBound: simPrice - uncertainty,
            energy: localEnergy
        });
    }

    // C. Long Term Projection (Gann Attractor)
    const gann1x1 = gann.gannFans.find(f => f.name.includes('1x1') && (isBullish ? f.type === 'Up' : f.type === 'Down'));
    const targetSlope = gann1x1 ? gann1x1.slope : (currentPrice * 0.001 * (isBullish ? 1 : -1));

    for(let i = 1; i <= 150; i++) {
        const trendPrice = currentPrice + (targetSlope * i);
        const chaos = Math.sin(i * 0.1) * (trendPrice * volatility * 2);
        const uncertainty = trendPrice * volatility * 1.5 * Math.sqrt(i/10);

        longTermPath.push({ 
            time: currentIndex + i, 
            price: trendPrice + chaos, 
            type: 'Projection',
            upperBound: trendPrice + chaos + uncertainty,
            lowerBound: trendPrice + chaos - uncertainty,
            energy: fractalHurst // Smoother energy for long term
        });
    }

    // D. Explosion Path (Parabolic)
    let explosionPath: NexusChartData[] | undefined = undefined;
    const canExplode = confluenceScore > 75;
    
    if (canExplode) {
        explosionPath = [];
        const targetPrice = currentPrice * (isBullish ? 1.6 : 0.4);
        const duration = 50;
        for(let i = 1; i <= duration; i++) {
             const t = i / duration;
             const ease = t * t * t; // Cubic easing for violent move
             const price = currentPrice + (targetPrice - currentPrice) * ease;
             explosionPath.push({ 
                 time: currentIndex + i, 
                 price: price, 
                 type: 'Explosion',
                 energy: 1.0 // Max energy
             });
        }
    }

    // --- 3. Calculate Nexus Nodes ---
    const nexusNodes = findNexusNodes(shortTermPath, currentIndex, currentPrice);

    // --- 4. Physics Engine ---
    const physics = calculatePhysics(currentPrice, targetSlope, volatility, fractalHurst);

    // --- 5. Key Levels ---
    const keyLevels: GannFractalNexusAnalysis['keyLevels'] = [];
    if (gann.squareOf9Levels.length > 0) {
        gann.squareOf9Levels.slice(0, 2).forEach(l => keyLevels.push({ price: l.price, type: 'Gann', label: l.label }));
    }
    keyLevels.push({ price: currentPrice * (isBullish ? 0.95 : 1.05), type: 'Fractal', label: 'Fractal Attractor' });

    let summary = `نظام نيكسوس يرصد توافق ${isBullish ? 'إيجابي' : 'سلبي'} مع سحابة احتمالات كمومية واسعة. `;
    if (nexusNodes.length > 0) summary += `تم تحديد ${nexusNodes.length} نقطة اندماج نجمية (Stellar Nodes). `;
    if (canExplode) summary += " **تحذير: فيزياء السوق تشير إلى انفجار وشيك.**";

    return {
        confluenceScore,
        shortTermPath,
        longTermPath,
        explosionPath,
        summary,
        recommendation: isBullish ? 'Buy' : confluenceScore < 40 ? 'Wait' : 'Sell',
        keyLevels,
        timeTargets,
        nexusNodes,
        physics
    };
};
