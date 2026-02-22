
import { Body, GeoVector, Ecliptic, SphereFromVector, HelioVector } from 'astronomy-engine';
import type { Candle, GannAnalysis, GannAngle, GannSquareLevel, GannSquaringPoint, GannSwing, AstroEvent, MoonPhase, GannIntersection, GannToolboxData, GannGridLine, PlanetPosition, PlanetaryAspect, SquaringResult, SquareTheCircleLevel, GannHexagonLevel, PlanetaryLine, GannTimeCycle, RangeLevel, CircleOf24Item, ZeroAngle, MasterCycleEvent, AstroModuleAnalysis, AstroSettings, PlanetaryPriceLevel } from '../types';
import { calculateNumerology } from './advancedAnalysisService';

// --- 0. Helper: Crypto Genesis Dates ---
const COIN_GENESIS: { [key: string]: string } = {
    'BTC/USDT': '2009-01-03',
    'ETH/USDT': '2015-07-30',
    'SOL/USDT': '2020-03-16',
    'BNB/USDT': '2017-07-08',
    'XRP/USDT': '2012-06-02',
    'ADA/USDT': '2017-09-29',
    'DOGE/USDT': '2013-12-06',
    'DOT/USDT': '2020-05-26',
    'LTC/USDT': '2011-10-07',
    'LINK/USDT': '2017-09-19'
};

// --- ZODIAC & MUSIC HELPERS ---
const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const MUSICAL_NOTES = ['C (Do)', 'C#', 'D (Re)', 'D#', 'E (Mi)', 'F (Fa)', 'F#', 'G (Sol)', 'G#', 'A (La)', 'A#', 'B (Si)'];

const getZodiacSign = (longitude: number) => {
    const index = Math.floor(longitude / 30) % 12;
    return ZODIAC_SIGNS[index];
};

const getMusicalNote = (price: number) => {
    const degree = price % 360;
    const index = Math.floor(degree / 30) % 12;
    return MUSICAL_NOTES[index];
};

// --- ZERO COIN NORMALIZATION ENGINE ---
const normalizePriceForGann = (price: number): { normalized: number, factor: number } => {
    if (price === 0) return { normalized: 0, factor: 1 };
    let factor = 1;
    let tempPrice = price;
    
    // Scale up small numbers
    while (tempPrice < 10) {
        tempPrice *= 10;
        factor *= 10;
    }
    // Scale down huge numbers
    while (tempPrice > 10000) {
        tempPrice /= 10;
        factor /= 10;
    }
    
    return { normalized: tempPrice, factor };
};

// --- NEW: ASTRONOMICAL MODULE CORE FUNCTIONS ---

/**
 * Dynamically suggests a scale based on price and volatility.
 * @param currentPrice 
 * @param volatility Average True Range or standard deviation
 */
const calculateDynamicAstroScale = (currentPrice: number, volatility: number): number => {
    if (currentPrice === 0) return 1;
    // Simple heuristic: We want 360 degrees to map to a significant price movement.
    // If price is 50000, maybe 1 deg = $100 (Scale 100). 
    // If price is 1.0, maybe 1 deg = $0.01 (Scale 0.01).
    
    // Base scale on magnitude of 10
    const magnitude = Math.pow(10, Math.floor(Math.log10(currentPrice)));
    
    // Refine based on volatility: If high volatility, we need wider spacing (larger scale).
    // If volatility is > 2% of price, increase scale.
    const volatilityRatio = volatility / currentPrice;
    let scale = magnitude / 100; // Default: 100 points per 360 cycle for a stock like AAPL (150) -> 1.5 scale? No.
    
    // Let's try to make 1 degree approx 1/360th of the "primary cycle" which is often related to price magnitude.
    // For BTC (60000), magnitude is 10000. Scale = 100. 1 deg = $100. 360 deg = $36000. Reasonable.
    // For XRP (0.5), magnitude is 0.1. Scale = 0.001. 1 deg = $0.001. 360 deg = $0.36. Reasonable.
    
    if (volatilityRatio > 0.05) scale *= 2; // High vol -> wider steps
    if (volatilityRatio < 0.005) scale /= 2; // Low vol -> tighter steps
    
    return scale;
};

/**
 * Converts a planetary degree (0-360) to a price level closest to the current base price.
 */
const convertDegreesToPrice = (degree: number, scale: number, basePrice: number): number => {
    const cycle = 360 * scale;
    const rawVal = degree * scale;
    
    // We want P = rawVal + k * cycle closest to basePrice
    // P - basePrice = rawVal - basePrice + k * cycle
    // We minimize |rawVal - basePrice + k*cycle|
    const diff = basePrice - rawVal;
    const k = Math.round(diff / cycle);
    
    const price = rawVal + k * cycle;
    
    // Ensure positive price
    if (price <= 0) return price + cycle; 
    return price;
};

const PLANET_COLORS: { [key: string]: string } = {
    'Sun': '#fbbf24', // Yellow
    'Moon': '#e5e7eb', // White/Grey
    'Mercury': '#a78bfa', // Purple
    'Venus': '#f472b6', // Pink
    'Mars': '#f87171', // Red
    'Jupiter': '#fcd34d', // Orange/Gold
    'Saturn': '#9ca3af', // Grey/Dark
    'Uranus': '#22d3ee', // Cyan
    'Neptune': '#3b82f6', // Blue
    'Pluto': '#818cf8' // Indigo
};

const calculateAstroModule = (
    candles: Candle[],
    customDate?: string,
    customSettings?: AstroSettings
): AstroModuleAnalysis => {
    const currentPrice = candles[candles.length - 1].close;
    const volatility = (candles[candles.length - 1].high - candles[candles.length - 1].low); 
    
    // 1. Determine Settings
    const settings: AstroSettings = customSettings || {
        coordinateSystem: 'Geocentric',
        zodiacSystem: 'Tropical',
        waveAmplitude: volatility * 0.5,
        waveFrequency: 0.1,
        scale: calculateDynamicAstroScale(currentPrice, volatility),
        showHarmonics: false,
        selectedPlanets: ['Sun', 'Mars', 'Saturn', 'Jupiter']
    };

    const date = customDate ? new Date(customDate) : new Date(candles[candles.length - 1].timestamp);
    const prevDate = new Date(date.getTime() - 24 * 60 * 60 * 1000);

    // 2. Calculate Planet Positions
    const bodies = [
        { name: 'Sun', body: Body.Sun },
        { name: 'Moon', body: Body.Moon },
        { name: 'Mercury', body: Body.Mercury },
        { name: 'Venus', body: Body.Venus },
        { name: 'Mars', body: Body.Mars },
        { name: 'Jupiter', body: Body.Jupiter },
        { name: 'Saturn', body: Body.Saturn },
        { name: 'Uranus', body: Body.Uranus },
        { name: 'Neptune', body: Body.Neptune },
        { name: 'Pluto', body: Body.Pluto }
    ];

    const levels: PlanetaryPriceLevel[] = [];
    const calculatedAspects: PlanetaryAspect[] = []; // For alerts if needed

    // AYANAMSA (Approximate for Sidereal) ~24 degrees for Lahiri
    const SIDEREAL_OFFSET = 24.0;

    bodies.forEach(b => {
        if (!settings.selectedPlanets.includes(b.name)) return;
        if (settings.coordinateSystem === 'Heliocentric' && (b.name === 'Sun' || b.name === 'Moon')) return; // Skip Sun/Moon in Helio

        let longitude = 0;
        let speedVal = 0;
        let declination = 0;
        let latitude = 0;

        // Calculate Vector
        if (settings.coordinateSystem === 'Heliocentric') {
            const vec = HelioVector(b.body, date);
            // Convert Helio vector to longitude? astronomy-engine usually outputs J2000 eq. coordinates
            // Simplified: We calculate relative to Earth? No, Helio is Sun center. 
            // astronomy-engine doesn't have direct Helio Ecliptic converter easily exposed in Typescript defs sometimes,
            // assuming HelioVector returns x,y,z. We can convert to spherical.
            const x = vec.x, y = vec.y, z = vec.z;
            const lonRad = Math.atan2(y, x);
            longitude = (lonRad * 180 / Math.PI);
            if (longitude < 0) longitude += 360;
            // Latitude/Declination logic for Helio is distinct, we'll skip for simplicity or approx
        } else {
            // Geocentric
            const vec = GeoVector(b.body, date, false);
            const ecliptic = Ecliptic(vec);
            longitude = ecliptic.elon;
            latitude = ecliptic.elat;
            const sphere = SphereFromVector(vec);
            declination = sphere.lat;

            // Calculate Speed
            const vecPrev = GeoVector(b.body, prevDate, false);
            const eclipticPrev = Ecliptic(vecPrev);
            let diff = longitude - eclipticPrev.elon;
            if (diff < -300) diff += 360;
            if (diff > 300) diff -= 360;
            speedVal = diff;
        }

        // Apply Zodiac System
        if (settings.zodiacSystem === 'Sidereal') {
            longitude = (longitude - SIDEREAL_OFFSET + 360) % 360;
        }

        // Determine Speed Label
        const isRetrograde = speedVal < 0;
        const absSpeed = Math.abs(speedVal);
        let speedLabel: 'Fast' | 'Slow' | 'Stationary' = 'Slow';
        // Arbitrary thresholds for demo (real thresholds depend on planet)
        if (absSpeed < 0.05) speedLabel = 'Stationary';
        else if (absSpeed > 0.8) speedLabel = 'Fast'; // Moon moves 13deg/day, others much slower. This logic needs per-planet refinement in full prod.

        // --- Core Price Mapping ---
        const price = convertDegreesToPrice(longitude, settings.scale, currentPrice);
        
        levels.push({
            planetName: b.name,
            symbol: b.name.substring(0, 2), // Simplified symbol
            degree: longitude,
            price: price,
            isRetrograde,
            speed: speedLabel,
            type: 'Longitude',
            color: PLANET_COLORS[b.name] || '#fff'
        });

        // --- Harmonics ---
        if (settings.showHarmonics) {
            const harmonics = [90, 120, 180];
            harmonics.forEach(h => {
                const hDeg = (longitude + h) % 360;
                const hPrice = convertDegreesToPrice(hDeg, settings.scale, currentPrice);
                levels.push({
                    planetName: b.name,
                    symbol: b.name.substring(0, 2),
                    degree: hDeg,
                    price: hPrice,
                    isRetrograde,
                    speed: speedLabel,
                    type: 'Harmonic',
                    harmonicLabel: `+${h}°`,
                    color: PLANET_COLORS[b.name] || '#fff' // Use same color but maybe lighter opacity in UI
                });
            });
        }
        
        // --- Declination / Latitude Levels (Enhancement 9) ---
        // Map declination (-90 to +90) to price
        // Since declination is a small range, we might map it directly or relative to 0 (Equator)
        // 1 deg declination = 1 unit * scale?
        const decPrice = convertDegreesToPrice(Math.abs(declination), settings.scale, currentPrice);
        // We'll add this only if specifically requested, but the structure supports it.
    });

    return {
        levels,
        aspects: calculatedAspects,
        recommendedScale: calculateDynamicAstroScale(currentPrice, volatility)
    };
};

// --- Existing Functions (Unchanged mostly, but keeping exports) ---

const calculateSmartScale = (candles: Candle[]): { scale: number, isSmart: boolean, multiplier: number } => {
    if (candles.length < 20) return { scale: 1, isSmart: false, multiplier: 1 };

    const lookback = 50;
    const recentCandles = candles.slice(-lookback);
    const startPrice = recentCandles[0].close;
    const endPrice = recentCandles[recentCandles.length - 1].close;
    const timeDelta = recentCandles.length;
    const avgPrice = recentCandles.reduce((a,b) => a + b.close, 0) / recentCandles.length;

    let multiplier = 1;
    if (avgPrice > 10000) multiplier = 0.01; 
    else if (avgPrice > 1000) multiplier = 0.1;
    else if (avgPrice < 10 && avgPrice > 0.1) multiplier = 100; 
    else if (avgPrice <= 0.1) multiplier = 10000; 
    
    const rawSlope = Math.abs(endPrice - startPrice) / timeDelta;
    
    if (rawSlope === 0) {
        return { scale: 1, isSmart: false, multiplier };
    }

    return { scale: rawSlope, isSmart: true, multiplier };
};

const calculateSquareOf9Levels = (currentPrice: number): GannSquareLevel[] => {
    if (currentPrice <= 0) return [];
    
    const { normalized, factor } = normalizePriceForGann(currentPrice);
    const root = Math.sqrt(normalized);
    const levels: GannSquareLevel[] = [];
    
    const angleConfigs = [
        { deg: 45, factor: 0.25, label: '45° (Semi-Square)', type: 'Support' },
        { deg: 90, factor: 0.5, label: '90° (Square)', type: 'Resistance' },
        { deg: 120, factor: 0.666, label: '120° (Trine)', type: 'Support' },
        { deg: 135, factor: 0.75, label: '135° (Sesquiquadrate)', type: 'Resistance' },
        { deg: 180, factor: 1.0, label: '180° (Opposition)', type: 'Resistance' },
        { deg: 225, factor: 1.25, label: '225° (Bi-Quintile)', type: 'Support' },
        { deg: 270, factor: 1.5, label: '270° (Square)', type: 'Resistance' },
        { deg: 315, factor: 1.75, label: '315° (Semi-Square)', type: 'Support' },
        { deg: 360, factor: 2.0, label: '360° (Conjunction)', type: 'Resistance' }
    ];

    angleConfigs.forEach(config => {
        const upperPriceNorm = Math.pow(root + config.factor, 2);
        const lowerPriceNorm = Math.pow(root - config.factor, 2);

        const upperPrice = upperPriceNorm / factor;
        const lowerPrice = lowerPriceNorm / factor;

        levels.push({ degree: config.deg, label: config.label, price: upperPrice, type: config.type as 'Support' | 'Resistance', factor: config.factor });
        if (lowerPrice > 0) {
            levels.push({ degree: -config.deg, label: `-${config.label}`, price: lowerPrice, type: config.type === 'Resistance' ? 'Support' : 'Resistance', factor: config.factor });
        }
    });
    
    return levels.sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice));
};

const calculateSquareOf144Levels = (anchorPrice: number): GannSquareLevel[] => {
    if (anchorPrice <= 0) return [];
    const { normalized, factor } = normalizePriceForGann(anchorPrice);
    const root = Math.sqrt(normalized);
    const levels: GannSquareLevel[] = [];
    const steps = [36, 72, 108, 144]; 
    
    steps.forEach(step => {
        const stepFactor = step / 144;
        const resPriceNorm = Math.pow(root + stepFactor, 2);
        const supPriceNorm = Math.pow(root - stepFactor, 2);
        
        levels.push({ degree: step, label: `Sq144-${step}`, price: resPriceNorm / factor, type: 'Resistance', factor: stepFactor });
        if (supPriceNorm > 0) levels.push({ degree: step, label: `Sq144-${step}`, price: supPriceNorm / factor, type: 'Support', factor: stepFactor });
    });
    return levels;
};

const calculateHexagonChart = (anchorPrice: number): GannHexagonLevel[] => {
    const levels: GannHexagonLevel[] = [];
    for (let ring = 1; ring <= 5; ring++) {
        const angle = ring * 60;
        const factor = 1 + (ring * 0.05);
        levels.push({ angle, price: anchorPrice * factor, type: 'Resistance', label: `Ring ${ring}` });
        levels.push({ angle, price: anchorPrice / factor, type: 'Support', label: `Ring ${ring}` });
    }
    return levels;
};

const toSafeDate = (dateStr: string): string => {
    try {
        if (!isNaN(Number(dateStr))) return new Date(Number(dateStr)).toISOString();
        return new Date(dateStr).toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
};

export const calculateSquareTheCircle = (price: number, anchorDateStr: string, direction: 'Up' | 'Down' = 'Up'): SquareTheCircleLevel[] => {
    if (price <= 0) return [];
    const { normalized, factor } = normalizePriceForGann(price);
    const sqrtPrice = Math.sqrt(normalized);
    const anchorDate = new Date(toSafeDate(anchorDateStr));
    
    const calculateDate = (degrees: number) => {
        const d = new Date(anchorDate);
        d.setDate(d.getDate() + degrees);
        return d.toLocaleDateString();
    };

    const levels: SquareTheCircleLevel[] = [];
    const angles = [45, 90, 135, 180, 225, 270, 315, 360];

    angles.forEach(angle => {
        const steps = angle / 180; 
        let targetPriceNorm = 0;
        
        if (direction === 'Up') targetPriceNorm = Math.pow(sqrtPrice + steps, 2);
        else targetPriceNorm = Math.pow(sqrtPrice - steps, 2);

        if (targetPriceNorm > 0) {
            const targetPrice = targetPriceNorm / factor;
            let desc = '';
            if (angle === 90) desc = 'Hard Square';
            else if (angle === 180) desc = 'Opposition';
            else if (angle === 360) desc = 'Full Cycle';
            else if (angle === 120 || angle === 240) desc = 'Trine (Soft)';
            else desc = 'Minor';
            
            levels.push({ angle, steps, price: targetPrice, date: calculateDate(angle), description: desc, type: direction === 'Up' ? 'Resistance' : 'Support' });
        }
    });
    return levels;
};

const calculateSquaringPoints = (anchor: { index: number, price: number }, candles: Candle[], scale: number): GannSquaringPoint[] => {
    const points: GannSquaringPoint[] = [];
    for (let i = anchor.index + 1; i < candles.length + 50; i++) {
        const timeDelta = i - anchor.index;
        const p1x1 = anchor.price + (timeDelta * scale);
        if (i < candles.length) {
            const c = candles[i];
            if (c.high >= p1x1 && c.low <= p1x1) {
                points.push({ index: i, price: p1x1, type: '1x1 Touch' });
            }
        }
        const SQUARES = [45, 90, 135, 180, 225, 270, 360];
        if (SQUARES.includes(timeDelta % 360)) {
             if (i > candles.length - 10) {
                 points.push({ index: i, price: p1x1, type: `Time Square ${timeDelta%360}` });
             }
        }
    }
    return points;
};

const calculateDualFans = (candles: Candle[], scale: number, highAnchor: {index: number, price: number}, lowAnchor: {index: number, price: number}): { fans: GannAngle[], intersections: GannIntersection[] } => {
    const ratios = [1/8, 1/4, 1/3, 1/2, 1, 2, 3, 4, 8]; 
    const fans: GannAngle[] = [];
    const upAngles = ratios.map(r => {
        const slope = scale * r;
        const name = r === 1 ? '1x1' : r < 1 ? `1x${Math.round(1/r)}` : `${r}x1`;
        const value = lowAnchor.price + (slope * (candles.length - 1 - lowAnchor.index));
        return { name: name, slope, value, originIndex: lowAnchor.index, originPrice: lowAnchor.price, type: 'Up' as const, status: 'Support' as const };
    });
    const downAngles = ratios.map(r => {
        const slope = scale * r * -1;
        const name = r === 1 ? '1x1' : r < 1 ? `1x${Math.round(1/r)}` : `${r}x1`;
        const value = highAnchor.price + (slope * (candles.length - 1 - highAnchor.index));
         return { name: name, slope, value, originIndex: highAnchor.index, originPrice: highAnchor.price, type: 'Down' as const, status: 'Resistance' as const };
    });
    fans.push(...upAngles, ...downAngles);
    const intersections: GannIntersection[] = [];
    upAngles.forEach(up => {
        downAngles.forEach(down => {
            if (Math.abs(up.slope - down.slope) < 0.00001) return; 
            const xIntersect = (up.slope * up.originIndex - down.slope * down.originIndex + down.originPrice - up.originPrice) / (up.slope - down.slope);
            const yIntersect = up.slope * (xIntersect - up.originIndex) + up.originPrice;
            if (xIntersect > Math.min(up.originIndex, down.originIndex) && xIntersect < candles.length + 50) {
                const isStrong = up.name.includes('1x1') || down.name.includes('1x1');
                if (isStrong && yIntersect > 0) {
                     intersections.push({ index: Math.round(xIntersect), price: yIntersect, description: `${up.name} Up x ${down.name} Down` });
                }
            }
        });
    });
    return { fans, intersections };
};

const calculateGannGrid = (candles: Candle[], scale: number, anchor: { index: number, price: number }): GannGridLine[] => {
    const lines: GannGridLine[] = [];
    const len = candles.length;
    const spacing = Math.max(10, Math.floor(len / 15));
    const steps = Math.ceil(len / spacing) + 4;
    for (let k = -steps; k <= steps; k++) {
        const offsetX = anchor.index + (k * spacing);
        const startDrawIdx = 0;
        const endDrawIdx = len + 30;
        const upP1Price = scale * (startDrawIdx - offsetX) + anchor.price;
        const upP2Price = scale * (endDrawIdx - offsetX) + anchor.price;
        lines.push({ p1: { index: startDrawIdx, price: upP1Price }, p2: { index: endDrawIdx, price: upP2Price }, type: 'Up' });
        const downP1Price = -scale * (startDrawIdx - offsetX) + anchor.price;
        const downP2Price = -scale * (endDrawIdx - offsetX) + anchor.price;
        lines.push({ p1: { index: startDrawIdx, price: downP1Price }, p2: { index: endDrawIdx, price: downP2Price }, type: 'Down' });
    }
    return lines;
};

const calculateGannTunnel = (candles: Candle[], scale: number, highAnchor: {index: number, price: number}, lowAnchor: {index: number, price: number}) => {
    const isUptrend = candles[candles.length-1].close > lowAnchor.price;
    let upperAngle: GannAngle;
    let lowerAngle: GannAngle;
    if (isUptrend) {
        const slope = scale;
        lowerAngle = { name: 'Tunnel Bottom', slope, value: 0, originIndex: lowAnchor.index, originPrice: lowAnchor.price, type: 'Up', status: 'Support' };
        upperAngle = { name: 'Tunnel Top', slope, value: 0, originIndex: highAnchor.index, originPrice: highAnchor.price, type: 'Up', status: 'Resistance' };
    } else {
        const slope = -scale;
        upperAngle = { name: 'Tunnel Top', slope, value: 0, originIndex: highAnchor.index, originPrice: highAnchor.price, type: 'Down', status: 'Resistance' };
        lowerAngle = { name: 'Tunnel Bottom', slope, value: 0, originIndex: lowAnchor.index, originPrice: lowAnchor.price, type: 'Down', status: 'Support' };
    }
    const startIdx = 0;
    const endIdx = candles.length + 30;
    const area = [
        { x: startIdx, y0: lowerAngle.slope * (startIdx - lowerAngle.originIndex) + lowerAngle.originPrice, y1: upperAngle.slope * (startIdx - upperAngle.originIndex) + upperAngle.originPrice },
        { x: endIdx, y0: lowerAngle.slope * (endIdx - lowerAngle.originIndex) + lowerAngle.originPrice, y1: upperAngle.slope * (endIdx - upperAngle.originIndex) + upperAngle.originPrice }
    ];
    return { upper: upperAngle, lower: lowerAngle, area };
};

const calculateMechanicalSwings = (candles: Candle[]): GannSwing[] => {
    const swings: GannSwing[] = [];
    if (candles.length < 3) return swings;
    let trend: 'Up' | 'Down' = 'Up';
    let swingStart = { index: 0, price: candles[0].low! }; 
    let extreme = { index: 0, price: candles[0].high! }; 
    for (let i = 2; i < candles.length; i++) {
        const c = candles[i];
        const p1 = candles[i-1];
        const p2 = candles[i-2];
        const high = c.high || c.close; const low = c.low || c.close;
        const p1Low = p1.low || p1.close; const p2Low = p2.low || p2.close;
        const p1High = p1.high || p1.close; const p2High = p2.high || p2.close;
        if (trend === 'Up') {
            if (high > extreme.price) extreme = { index: i, price: high };
            const trigger = Math.min(p1Low, p2Low);
            if (low < trigger) {
                swings.push({ type: 'Up', startIndex: swingStart.index, startPrice: swingStart.price, endIndex: extreme.index, endPrice: extreme.price, isMechanicalTrigger: false });
                trend = 'Down';
                swingStart = { index: extreme.index, price: extreme.price };
                extreme = { index: i, price: low };
            }
        } else {
            if (low < extreme.price) extreme = { index: i, price: low };
            const trigger = Math.max(p1High, p2High);
            if (high > trigger) {
                swings.push({ type: 'Down', startIndex: swingStart.index, startPrice: swingStart.price, endIndex: extreme.index, endPrice: extreme.price, isMechanicalTrigger: false });
                trend = 'Up';
                swingStart = { index: extreme.index, price: extreme.price };
                extreme = { index: i, price: high };
            }
        }
    }
    swings.push({ type: trend, startIndex: swingStart.index, startPrice: swingStart.price, endIndex: extreme.index, endPrice: extreme.price, isMechanicalTrigger: false });
    return swings;
};

const calculatePlanetaryLines = (currentPrice: number): PlanetaryLine[] => {
    const lines: PlanetaryLine[] = [];
    const bodies = [{ name: 'Jupiter', longitude: 45 }, { name: 'Saturn', longitude: 90 }, { name: 'Mars', longitude: 180 }, { name: 'Venus', longitude: 270 }];
    const { normalized, factor } = normalizePriceForGann(currentPrice);
    const k = Math.floor(normalized / 360);
    const base = k * 360;
    bodies.forEach(b => {
        lines.push({ planet: b.name, angle: b.longitude, price: (base + b.longitude) / factor, type: 'Resistance' });
        lines.push({ planet: b.name, angle: b.longitude, price: (base + b.longitude - 360) / factor, type: 'Support' });
    });
    return lines.filter(l => l.price > 0);
};

const calculateAstroData = (candles: Candle[]): { astroEvents: AstroEvent[], moonPhases: MoonPhase[] } => {
    const events: AstroEvent[] = [];
    const phases: MoonPhase[] = [];
    const knownNewMoon = new Date('2023-01-21T20:53:00Z').getTime(); 
    const cycleMs = 29.53059 * 24 * 60 * 60 * 1000;
    candles.forEach((c, i) => {
        const diff = c.timestamp - knownNewMoon;
        const phase = (diff % cycleMs) / cycleMs;
        if (phase < 0.02 || phase > 0.98) {
            if (phases.length === 0 || phases[phases.length-1].index < i - 5) {
                phases.push({ date: new Date(c.timestamp).toLocaleDateString(), index: i, phase: 'New Moon', label: '🌑' });
            }
        }
        if (phase > 0.48 && phase < 0.52) {
             if (phases.length === 0 || phases[phases.length-1].index < i - 5) {
                phases.push({ date: new Date(c.timestamp).toLocaleDateString(), index: i, phase: 'Full Moon', label: '🌕' });
            }
        }
    });
    return { astroEvents: events, moonPhases: phases };
};

const scanAnniversaryDates = (candles: Candle[]): { date: string, type: string, index: number, price: number, description: string }[] => {
    const anniversaries: { date: string, type: string, index: number, price: number, description: string }[] = [];
    if (candles.length < 300) return anniversaries;
    const lastCandle = candles[candles.length - 1];
    const currentDate = new Date(lastCandle.timestamp);
    const pivots = [];
    const lookback = 20;
    for (let i = lookback; i < candles.length - lookback; i++) {
        const slice = candles.slice(i - lookback, i + lookback + 1);
        const current = candles[i];
        const max = Math.max(...slice.map(c => c.high || c.close));
        const min = Math.min(...slice.map(c => c.low || c.close));
        if ((current.high || current.close) === max) pivots.push({ ...current, index: i, type: 'High', price: current.high || current.close });
        else if ((current.low || current.close) === min) pivots.push({ ...current, index: i, type: 'Low', price: current.low || current.close });
    }
    pivots.forEach(pivot => {
        const pivotDate = new Date(pivot.timestamp);
        const timeDiff = Math.abs(currentDate.getTime() - pivotDate.getTime());
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const currentYearAnniversary = new Date(currentDate.getFullYear(), pivotDate.getMonth(), pivotDate.getDate());
        const diffInDays = Math.abs((currentDate.getTime() - currentYearAnniversary.getTime()) / (1000 * 60 * 60 * 24));
        if (diffInDays <= 3 && daysDiff > 300) {
            const yearsAgo = Math.round(daysDiff / 365);
            const typeLabel = yearsAgo === 1 ? 'ذكرى سنوية (1 عام)' : `ذكرى سنوية (${yearsAgo} أعوام)`;
            anniversaries.push({ date: pivotDate.toLocaleDateString(), type: 'Annual Anniversary', index: pivot.index, price: pivot.price, description: `${typeLabel}: يوافق تاريخ ${pivot.type === 'High' ? 'قمة' : 'قاع'} سابق.` });
        }
    });
    return anniversaries.reverse().slice(0, 5);
};

const calculateRangeDivisions = (high: number, low: number): RangeLevel[] => {
    const range = high - low;
    const levels = [0.25, 0.333, 0.5, 0.666, 0.75];
    return levels.map(pct => ({ price: low + range * pct, label: `${(pct * 100).toFixed(1)}%`, type: pct === 0.5 ? 'Equilibrium' : 'Support' }));
};

const calculateCircleOf24 = (): CircleOf24Item[] => {
    const now = new Date();
    const currentHour = now.getHours();
    const items: CircleOf24Item[] = [];
    for(let h = 0; h < 24; h+=2) {
        const isActive = currentHour >= h && currentHour < h+2;
        items.push({ hour: h, label: `${h}:00 - ${h+2}:00`, isActive });
    }
    return items;
};

const calculateZeroAngles = (currentPrice: number, index: number): ZeroAngle[] => {
    const angles: ZeroAngle[] = [];
    const slopes = [1, 0.5, 0.25, 2, 4]; 
    slopes.forEach(s => { angles.push({ price: s * index * 0.1, label: `Zero ${s}x1`, type: 'Resistance' }); });
    return angles;
};

const calculateMasterCycle = (genesisDateStr?: string): MasterCycleEvent[] => {
    if (!genesisDateStr) return [];
    const genesis = new Date(genesisDateStr);
    const events: MasterCycleEvent[] = [];
    [10, 20, 30, 40, 50, 60].forEach(year => {
        const future = new Date(genesis);
        future.setFullYear(future.getFullYear() + year);
        if (future > new Date()) {
             events.push({ date: future.toLocaleDateString(), type: year === 60 ? '60-Year' : year === 20 ? '20-Year' : '10-Year', description: `نقطة تحول كبرى في دورة الـ ${year} عام.` });
        }
    });
    return events.slice(0, 3);
};

const calculateToolboxData = (candles: Candle[], anchorHigh: { price: number, date: string }, anchorLow: { price: number }, pairName: string): GannToolboxData => {
    const currentPrice = candles[candles.length - 1].close;
    const range8 = anchorHigh.price - anchorLow.price;
    const levels8 = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map(r => ({ label: `${r*8}/8`, price: anchorLow.price + range8 * r }));
    const nearest8 = levels8.reduce((prev, curr) => Math.abs(curr.price - currentPrice) < Math.abs(prev.price - currentPrice) ? curr : prev);
    const now = new Date();
    const start = new Date(anchorHigh.date);
    const addDays = (d: Date, days: number) => { const n = new Date(d); n.setDate(n.getDate() + days); return n.toLocaleDateString(); }
    const octUp = anchorLow.price * 2;
    const octDown = anchorLow.price / 2;
    const fifth = anchorLow.price * 1.5;
    const last10 = candles.slice(-10);
    const change = (last10[9].close - last10[0].close) / last10[0].close;
    const angle = Math.atan(change * 10) * (180 / Math.PI);
    const absAngle = Math.abs(angle);
    let angleStatus = 'Normal';
    if (absAngle > 60) angleStatus = 'Extreme'; else if (absAngle < 20) angleStatus = 'Flat';
    const mid = (anchorHigh.price + anchorLow.price) / 2;
    const block = Math.floor(currentPrice / 144) + 1;
    const numerology = calculateNumerology(pairName);
    
    return {
        ruleOf8ths: { nearestLevel: nearest8.label, nearestPrice: nearest8.price, equilibrium: anchorLow.price + range8 * 0.5 },
        wheelOf24: { activeSegment: Math.floor(now.getHours() / 2) + 1, nextChange: "2 hours" },
        mechanicalSwing: { trend: 'Neutral', type: 'N/A' }, 
        timeCounts: { next45: addDays(start, 45), next90: addDays(start, 90), next144: addDays(start, 144) },
        octaves: { up: octUp, down: octDown, fifth },
        volatilityAngle: { angle, status: angleStatus },
        polarity: { status: currentPrice > mid ? 'Positive' : 'Negative', value: mid },
        pyramid: { block, cycleComplete: block * 144 },
        numerology
    };
}

const calculateTimeClusters = (anchorDate: string, cycles: number[]): GannTimeCycle[] => {
    const results: GannTimeCycle[] = [];
    const start = new Date(anchorDate).getTime();
    cycles.forEach(days => {
        const future = start + days * 24 * 60 * 60 * 1000;
        results.push({ name: `${days}-Day Cycle`, projectedDate: new Date(future).toLocaleDateString(), projectedIndex: 0, type: days % 360 === 0 ? 'Major' : 'Minor', strength: 'Medium' });
    });
    return results;
}

const calculateLawOfVibration = (price: number, volume: number, angle: number): number => {
    const { normalized } = normalizePriceForGann(price);
    const pScore = (normalized % 144) / 144; 
    const tScore = Math.abs(Math.sin(angle * Math.PI / 180)); 
    const vScore = Math.min(1, volume / 10000000); 
    return (pScore + tScore + vScore) / 3 * 100;
};

const calculatePlanetaryWheel = (transitDateStr: string, currentPrice: number, natalDateStr?: string): { transits: PlanetPosition[], natal: PlanetPosition[], pricePlanet: PlanetPosition, aspects: PlanetaryAspect[], transitDate: string, natalDate: string } => {
    const transitDate = new Date(toSafeDate(transitDateStr));
    const targetDate = isNaN(transitDate.getTime()) ? new Date() : transitDate;
    const prevDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const natalDate = natalDateStr ? new Date(toSafeDate(natalDateStr)) : new Date(targetDate.getFullYear() - 1, 0, 1);
    const bodies = [
        { name: 'Sun', body: Body.Sun, symbol: '☉' }, { name: 'Moon', body: Body.Moon, symbol: '☽' },
        { name: 'Mercury', body: Body.Mercury, symbol: '☿' }, { name: 'Venus', body: Body.Venus, symbol: '♀' },
        { name: 'Mars', body: Body.Mars, symbol: '♂' }, { name: 'Jupiter', body: Body.Jupiter, symbol: '♃' },
        { name: 'Saturn', body: Body.Saturn, symbol: '♄' }, { name: 'Uranus', body: Body.Uranus, symbol: '♅' },
        { name: 'Neptune', body: Body.Neptune, symbol: '♆' }, { name: 'Pluto', body: Body.Pluto, symbol: '♇' }
    ];
    const getPositions = (date: Date, isNatal: boolean): PlanetPosition[] => {
        return bodies.map(b => {
            const vec = GeoVector(b.body, date, false); 
            const ecliptic = Ecliptic(vec);
            const sphere = SphereFromVector(vec);
            let isRetrograde = false;
            let speed = 0;
            if (!isNatal) {
                const vecPrev = GeoVector(b.body, prevDate, false);
                const eclipticPrev = Ecliptic(vecPrev);
                let diff = ecliptic.elon - eclipticPrev.elon;
                if (diff < -300) diff += 360; 
                if (diff > 300) diff -= 360;
                speed = diff;
                isRetrograde = diff < 0;
            }
            return { name: b.name, symbol: b.symbol, longitude: ecliptic.elon, latitude: ecliptic.elat, declination: sphere.lat, isNatal, isRetrograde, speed, sign: getZodiacSign(ecliptic.elon) };
        });
    };
    const transits = getPositions(targetDate, false);
    const natal = getPositions(natalDate, true);
    const { normalized } = normalizePriceForGann(currentPrice);
    const priceLongitude = normalized % 360;
    const pricePlanet: PlanetPosition = { name: 'Price', symbol: '$', longitude: priceLongitude, isPrice: true, sign: getZodiacSign(priceLongitude), musicalNote: getMusicalNote(normalized), isNatal: false };
    const aspects: PlanetaryAspect[] = [];
    const aspectTypes = [
        { angle: 0, type: 'Conjunction', tolerance: 8 }, { angle: 60, type: 'Sextile', tolerance: 5 },
        { angle: 90, type: 'Square', tolerance: 7 }, { angle: 120, type: 'Trine', tolerance: 7 },
        { angle: 180, type: 'Opposition', tolerance: 8 }, { angle: 72, type: 'Quintile', tolerance: 2 }, { angle: 144, type: 'Bi-Quintile', tolerance: 2 }
    ];
    const checkAspect = (p1: PlanetPosition, p2: PlanetPosition, isNatalAspect: boolean) => {
        let diff = Math.abs(p1.longitude - p2.longitude);
        if (diff > 180) diff = 360 - diff;
        for (const asp of aspectTypes) {
            if (Math.abs(diff - asp.angle) <= asp.tolerance) {
                aspects.push({ planet1: p1.name, planet2: p2.name, angle: asp.angle, type: asp.type as any, orb: Math.abs(diff - asp.angle), isNatalAspect });
            }
        }
    };
    for (let i = 0; i < transits.length; i++) {
        for (let j = i + 1; j < transits.length; j++) { checkAspect(transits[i], transits[j], false); }
    }
    for (let t of transits) { checkAspect(pricePlanet, t, false); }
    return { transits, natal, pricePlanet, aspects, transitDate: targetDate.toLocaleDateString(), natalDate: natalDate.toLocaleDateString() };
};

const calculateSquaringStrategies = (candles: Candle[], anchorHigh: { price: number, index: number, date: string }, anchorLow: { price: number, index: number, date: string }, multiplier: number): SquaringResult[] => {
    const results: SquaringResult[] = [];
    const currentIndex = candles.length - 1;
    const range = Math.abs(anchorHigh.price - anchorLow.price);
    const rangeTimeUnits = Math.round(range * multiplier); 
    const lastAnchor = anchorHigh.index > anchorLow.index ? anchorHigh : anchorLow;
    const rangeTargetIndex = lastAnchor.index + rangeTimeUnits;
    const rangeTargetDate = new Date(new Date(lastAnchor.date).getTime() + rangeTimeUnits * 24 * 60 * 60 * 1000);
    results.push({ type: 'Range', baseValue: range, scaleUsed: multiplier, anchorDate: lastAnchor.date, targetDate: rangeTargetDate.toLocaleDateString(), targetIndex: rangeTargetIndex, isComplete: (rangeTargetIndex - currentIndex) <= 0, daysRemaining: rangeTargetIndex - currentIndex, description: `Range (${range.toFixed(2)}) squared to time (${rangeTimeUnits} bars). Expect reversal.` });
    const { normalized } = normalizePriceForGann(anchorLow.price);
    const lowTimeUnits = Math.round(normalized); 
    const lowTargetIndex = anchorLow.index + lowTimeUnits;
    const lowTargetDate = new Date(new Date(anchorLow.date).getTime() + lowTimeUnits * 24 * 60 * 60 * 1000);
    results.push({ type: 'Absolute', baseValue: anchorLow.price, scaleUsed: multiplier, anchorDate: anchorLow.date, targetDate: lowTargetDate.toLocaleDateString(), targetIndex: lowTargetIndex, isComplete: (lowTargetIndex - currentIndex) <= 0, daysRemaining: lowTargetIndex - currentIndex, description: `Absolute Low (${anchorLow.price.toFixed(4)}) squared (Using Normalized: ${normalized.toFixed(0)} bars).` });
    return results;
};

export const analyzeGann = (candles: Candle[], pair: string = 'UNKNOWN', astroSettings?: AstroSettings): GannAnalysis => {
    if (candles.length < 50) {
        return { summary: "بيانات غير كافية لتحليل جان.", anchorPointHigh: { price: 0, index: 0, date: '' }, anchorPointLow: { price: 0, index: 0, date: '' }, unitScale: 1, gannFans: [], squareOf9Levels: [], squareOf144Levels: [], hexagonLevels: [], timeCycles: [], squaringPoints: [], swings: [], astroEvents: [], planetaryLines: [], moonPhases: [], intersections: [], anniversaryDates: [], vibrationBase: 0, implication: 'Neutral', lawOfVibrationScore: 0, isSmartScale: false, gannGrid: [], rangeDivisions: [], circleOf24: [], zeroAngles: [], masterCycleEvents: [] };
    }

    let highest = { price: -Infinity, index: 0 };
    let lowest = { price: Infinity, index: 0 };
    const lookback = Math.min(300, candles.length);
    const recentCandles = candles.slice(-lookback);
    recentCandles.forEach((c, i) => {
        const h = c.high || c.close; const l = c.low || c.close;
        const actualIndex = candles.length - lookback + i;
        if (h > highest.price) highest = { price: h, index: actualIndex };
        if (l < lowest.price) lowest = { price: l, index: actualIndex };
    });
    const safeDateISO = (ts: number) => { try { return ts ? new Date(ts).toISOString() : new Date().toISOString(); } catch (e) { return new Date().toISOString(); } };
    const anchorHigh = { ...highest, date: safeDateISO(candles[highest.index]?.timestamp) };
    const anchorLow = { ...lowest, date: safeDateISO(candles[lowest.index]?.timestamp) };

    const { scale, isSmart, multiplier } = calculateSmartScale(candles);
    const swings = calculateMechanicalSwings(candles);
    const { fans, intersections } = calculateDualFans(candles, scale, anchorHigh, anchorLow);
    const currentPrice = candles[candles.length - 1].close;
    
    const squareOf9Levels = calculateSquareOf9Levels(currentPrice);
    const squareOf144Levels = calculateSquareOf144Levels(currentPrice); 
    const hexagonLevels = calculateHexagonChart(currentPrice);
    const planetaryLines = calculatePlanetaryLines(currentPrice);
    const { astroEvents, moonPhases } = calculateAstroData(candles);
    const anniversaries = scanAnniversaryDates(candles);
    const timeCycles = calculateTimeClusters(anchorLow.date, [30, 45, 60, 90, 120, 144, 180, 240, 270, 360]);
    const isUptrend = currentPrice > anchorLow.price && (currentPrice - anchorLow.price) > (anchorHigh.price - currentPrice);
    const dominantAnchor = isUptrend ? anchorLow : anchorHigh;
    const squaringPoints = calculateSquaringPoints(dominantAnchor, candles, scale);
    const squaringResults = calculateSquaringStrategies(candles, anchorHigh, anchorLow, multiplier);
    const squareTheCircle = calculateSquareTheCircle(dominantAnchor.price, dominantAnchor.date);
    const toolbox = calculateToolboxData(candles, anchorHigh, anchorLow, pair);
    toolbox.mechanicalSwing = { trend: swings[swings.length-1].type, type: swings[swings.length-1].isMechanicalTrigger ? 'Trigger' : 'Continuation' };
    const gannGrid = calculateGannGrid(candles, scale, dominantAnchor);
    const gannTunnel = calculateGannTunnel(candles, scale, anchorHigh, anchorLow);
    const genesisDate = pair ? COIN_GENESIS[pair] : undefined;
    const natalDate = genesisDate || new Date(candles[0].timestamp).toISOString().split('T')[0];
    const planetaryWheel = calculatePlanetaryWheel(anchorHigh.date, currentPrice, natalDate);
    const lawOfVibrationScore = calculateLawOfVibration(currentPrice, candles[candles.length-1].volume, toolbox.volatilityAngle.angle);
    const rangeDivisions = calculateRangeDivisions(anchorHigh.price, anchorLow.price);
    const circleOf24 = calculateCircleOf24();
    const zeroAngles = calculateZeroAngles(currentPrice, candles.length);
    const masterCycleEvents = calculateMasterCycle(genesisDate);

    // NEW: Calculate Astro Module
    // We only run this if astroSettings are passed or we rely on internal defaults
    const astroModule = calculateAstroModule(candles, undefined, astroSettings);

    return {
        summary: `Master Gann Analysis 10.0. Scale: ${scale.toFixed(5)}. Trend: ${isUptrend ? 'Up' : 'Down'}.`,
        anchorPointHigh: anchorHigh, anchorPointLow: anchorLow, unitScale: scale,
        gannFans: fans, squareOf9Levels, squareOf144Levels, hexagonLevels,
        timeCycles, squaringPoints, gannBox: undefined, gannGrid, gannTunnel,
        swings, astroEvents, planetaryLines, moonPhases, intersections, anniversaryDates: anniversaries,
        vibrationBase: anchorLow.price, implication: isUptrend ? 'Bullish' : 'Bearish',
        lawOfVibrationScore, isSmartScale: isSmart, toolbox,
        gannzillaStrategies: undefined, planetaryWheel,
        squaringResults, smartMultiplier: multiplier, squareTheCircle,
        rangeDivisions, circleOf24, zeroAngles, masterCycleEvents,
        astroModule // Return the new module data
    };
};
