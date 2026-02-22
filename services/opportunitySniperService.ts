import type { AnalysisResult, SniperSignal } from '../types';

// A state object to hold the status for each pair-timeframe.
// This allows the service to "remember" that an RSI peak has occurred.
const sniperState: { [key: string]: { peakRsi: number; peakTimestamp: number } } = {};

const ARM_THRESHOLD = 90;
const TRIGGER_LEVEL = 50;
const RESET_WINDOW_MS = 15 * 60 * 1000; // Reset "Armed" status after 15 minutes to avoid stale signals.

export const analyzeSniperOpportunity = (
    pair: string,
    timeframe: string,
    analysis: AnalysisResult | undefined
): SniperSignal | null => {
    if (!analysis?.rsi) {
        return null;
    }

    const key = `${pair}-${timeframe}`;
    const currentRsi = analysis.rsi;
    const now = Date.now();

    // Check if an existing "Armed" signal has expired.
    if (sniperState[key] && now - sniperState[key].peakTimestamp > RESET_WINDOW_MS) {
        delete sniperState[key];
    }

    // New peak detected: Arm the signal.
    if (currentRsi > ARM_THRESHOLD) {
        // If it's a new peak or a higher peak than the one we're tracking, update the state.
        if (!sniperState[key] || currentRsi > sniperState[key].peakRsi) {
            sniperState[key] = {
                peakRsi: currentRsi,
                peakTimestamp: now,
            };
        }
    }

    const state = sniperState[key];
    if (state) {
        // A peak has been recorded. Check for the trigger condition.
        if (currentRsi <= TRIGGER_LEVEL) {
            // Signal Triggered! RSI has pulled back to the buy zone.
            const signal: SniperSignal = {
                pair,
                timeframe,
                status: 'Triggered',
                currentRsi,
                peakRsi: state.peakRsi,
                peakTimestamp: state.peakTimestamp
            };
            // Reset the state after triggering to prevent immediate re-triggering.
            delete sniperState[key];
            return signal;
        } else {
            // Still armed, waiting for pullback to 50.
            return {
                pair,
                timeframe,
                status: 'Armed',
                currentRsi,
                peakRsi: state.peakRsi,
                peakTimestamp: state.peakTimestamp
            };
        }
    }

    // No recent peak above 90, so the system is just monitoring.
    // We return a 'Monitoring' status which can be filtered out by the UI.
    return {
        pair,
        timeframe,
        status: 'Monitoring',
        currentRsi,
        peakRsi: 0,
        peakTimestamp: 0
    };
};
