import type { LiveSignal, AnalysisResult } from '../types';
import { MarketState } from '../types';

// This is a new, professional signal engine that replaces the mock service.
// It calculates a live signal based on the confluence of multiple real-time analyses.
export const calculateLiveSignal = (
  analysis: AnalysisResult | undefined,
  price: number,
  change: number,
): LiveSignal => {
  const timestamp = Date.now();
  // In a real app, this would be determined dynamically
  const session: LiveSignal['session'] = 'New York';

  if (!analysis) {
    return {
      side: 'WAIT',
      entry: 0, tp1: 0, tp2: 0, sl: 0, confidence: 0,
      reasons: ["Analysis data is not yet available."],
      price, change, timestamp, session,
    };
  }

  const { ictAnalysis, macdAnalysis, state } = analysis;
  const reasons: string[] = [];
  let confidence = 0;
  let side: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  
  // Primary Driver: ICT Trade Setup
  if (ictAnalysis?.tradeSetup) {
    side = ictAnalysis.tradeSetup.direction === 'Long' ? 'BUY' : 'SELL';
    reasons.push(`ICT Setup: ${ictAnalysis.summary}`);
    confidence += 50;
  }

  // Confirmation from MACD
  const activeMacdSignal = macdAnalysis?.advancedStrategies.find(s => s.isActive && s.signal !== 'Hold') 
    || macdAnalysis?.basicStrategies.find(s => s.isActive && s.signal !== 'Hold');

  if (activeMacdSignal) {
    if (side === 'WAIT') {
      // MACD can initiate a signal if no ICT setup exists but conditions are right
      side = activeMacdSignal.signal === 'Buy' ? 'BUY' : 'SELL';
      reasons.push(`MACD Signal: ${activeMacdSignal.name}`);
      confidence += 40;
    } else if ((side === 'BUY' && activeMacdSignal.signal === 'Buy') || (side === 'SELL' && activeMacdSignal.signal === 'Sell')) {
      reasons.push(`MACD Confirms`);
      confidence += 25;
    }
  }

  // Confirmation from Spectral Analysis
  if (side === 'BUY' && (state === MarketState.TRENDING_UP || state === MarketState.BREAKOUT_UP)) {
    reasons.push(`Spectral Confirms: ${state}`);
    confidence += 25;
  } else if (side === 'SELL' && (state === MarketState.TRENDING_DOWN || state === MarketState.BREAKOUT_DOWN)) {
     reasons.push(`Spectral Confirms: ${state}`);
     confidence += 25;
  }

  // If we have a signal, we need to define the trade parameters.
  // If initiated by ICT, use its setup. If by MACD, create a synthetic one.
  if (side !== 'WAIT') {
      let entry, sl, tp1, tp2;
      if (ictAnalysis?.tradeSetup) {
          entry = ictAnalysis.tradeSetup.entry;
          sl = ictAnalysis.tradeSetup.stopLoss;
          tp1 = ictAnalysis.tradeSetup.targets[0]?.price || (side === 'BUY' ? entry * 1.01 : entry * 0.99);
          tp2 = ictAnalysis.tradeSetup.targets[1]?.price || (side === 'BUY' ? entry * 1.02 : entry * 0.98);
      } else {
          // Synthetic setup based on current price for MACD-initiated signals
          entry = price;
          const range = price * 0.02; // 2% range
          sl = side === 'BUY' ? entry - range * 0.5 : entry + range * 0.5;
          tp1 = side === 'BUY' ? entry + range * 0.75 : entry - range * 0.75;
          tp2 = side === 'BUY' ? entry + range * 1.5 : entry - range * 1.5;
          reasons.push("Trade parameters estimated from current price.");
      }
      return {
          side, entry, sl, tp1, tp2,
          confidence: Math.min(95, Math.round(confidence)),
          reasons, price, change, timestamp, session,
      };
  }

  // If after all checks, we are still in WAIT
  return {
    side: 'WAIT',
    entry: 0, tp1: 0, tp2: 0, sl: 0, confidence: 0,
    reasons: ["No high-confluence setup detected at the moment."],
    price, change, timestamp, session,
  };
};