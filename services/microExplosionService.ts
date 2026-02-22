
import type { FullInstantaneousAnalysis, MicroAnalysisResult, MicroTimeCycle } from '../types';

// This is a sophisticated simulation service for Micro Explosion Lab.
// It now includes "Advanced Time Tools" logic.

const generateTimeCycles = (timeframeMultiplier: number, hash: number): MicroTimeCycle[] => {
    const cycles: MicroTimeCycle[] = [];
    
    // 1. Gann Cycles (Squares of Time)
    // Simulating a cycle that hits every 45/90 degrees relative to 1m/5m bars
    const gannCycleBase = 45 / timeframeMultiplier; 
    const minutesToGann = Math.floor((hash % gannCycleBase) / 2);
    cycles.push({
        type: 'Gann',
        label: `Gann 45° Cycle`,
        minutesUntil: minutesToGann + 2, // Ensure it's in future
        strength: 0.85
    });

    // 2. Fibonacci Time Zones
    // Simulating a Fibonacci projection from a recent "phantom" swing
    const fibDelay = (hash % 13) + 3;
    cycles.push({
        type: 'Fibonacci',
        label: 'Fib Time Zone 1.618',
        minutesUntil: fibDelay,
        strength: 0.7
    });

    // 3. Harmonic Timing
    // Occasional timing signal
    if (hash % 5 === 0) {
        cycles.push({
            type: 'Harmonic',
            label: 'Butterfly Pattern Completion',
            minutesUntil: (hash % 8) + 1,
            strength: 0.9
        });
    }

    return cycles.sort((a, b) => a.minutesUntil - b.minutesUntil);
};


const generateMicroAnalysis = (pair: string, timeframeMultiplier: number, lastPrice: number): MicroAnalysisResult => {
    const hash = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const volatility = (hash % 50) / 10000 + 0.001 * timeframeMultiplier; // e.g., 0.1% to 0.6%

    const swingLow = lastPrice * (1 - volatility * 3);
    const swingHigh = lastPrice * (1 + volatility * 2);
    const range = swingHigh - swingLow;

    // Entry Zone
    const entryZone = {
        start: swingLow * 1.002,
        end: swingLow * 1.005,
    };

    // Targets based on Fibonacci extensions
    const targets = [
        { level: 'T1 (Scalp)', price: swingHigh + range * 0.236 },
        { level: 'T2 (Swing)', price: swingHigh + range * 0.618 },
        { level: 'T3 (Moon)', price: swingHigh + range * 1.618 },
    ];

    // Stop Loss
    const stopLoss = swingLow * 0.998;

    // Advanced Time Analysis
    const activeChronometers = generateTimeCycles(timeframeMultiplier, hash);
    
    // Calculate Time Explosion Probability based on convergence of cycles near t=0 to t=5 mins
    const nearCycles = activeChronometers.filter(c => c.minutesUntil <= 5);
    const timeExplosionProbability = Math.min(99, 40 + (nearCycles.length * 20) + (hash % 20));
    
    const nextMajorTimeCluster = activeChronometers[0]?.minutesUntil || 10;

    // Confirmation Signals
    const confirmationSignals = {
        microVolumeFlow: (hash % 100 / 50) - 1 + 1.2, // bias towards positive
        phaseCoherence: 0.65 + (hash % 30 / 100),
    };
    
    // Ensure flow is within [-1, 1]
    confirmationSignals.microVolumeFlow = Math.max(-1, Math.min(1, confirmationSignals.microVolumeFlow));

    const side: 'BUY' | 'SELL' = confirmationSignals.microVolumeFlow > 0.1 ? 'BUY' : 'SELL';

    return {
        side,
        entryZone,
        targets,
        stopLoss,
        timeExplosionProbability,
        activeChronometers,
        nextMajorTimeCluster,
        confirmationSignals,
    };
};


export const getInstantaneousAnalysis = (pair: string, lastPrice: number): FullInstantaneousAnalysis => {
     if (!lastPrice || lastPrice <= 0) {
        lastPrice = 100; // Fallback
    }

    const analysis: FullInstantaneousAnalysis = {
        '1m': generateMicroAnalysis(pair, 1, lastPrice),
        '5m': generateMicroAnalysis(pair, 5, lastPrice),
        '15m': generateMicroAnalysis(pair, 15, lastPrice),
    };
    
    return analysis;
};
