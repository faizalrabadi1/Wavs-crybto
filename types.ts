
export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface MarketData {
    [pair: string]: CurrencyData;
}

export interface CurrencyData {
    pair: string;
    price: number;
    change24h: number;
    volume24h: number;
    candles: { [timeframe: string]: Candle[] };
}

export interface DataProvider {
    name: DataProviderName;
    fetchTopSymbols: () => Promise<string[]>;
    // Updated fetchInitialData to include onPartialData callback
    fetchInitialData: (
        pairs: string[], 
        timeframes: string[], 
        onProgress: (progress: number) => void, 
        limit?: number,
        onPartialData?: (data: MarketData) => void
    ) => Promise<MarketData>;
    connectToStreams: (pairs: string[], timeframes: string[], onUpdate: (pair: string, timeframe: string, candle: Candle) => void) => () => void;
}

export type DataProviderName = 'Binance' | 'CoinGecko' | 'CryptoCompare' | 'Forex';

export enum MarketState {
    TRENDING_UP = 'TRENDING_UP',
    TRENDING_DOWN = 'TRENDING_DOWN',
    BREAKOUT_UP = 'BREAKOUT_UP',
    BREAKOUT_DOWN = 'BREAKOUT_DOWN',
    CONSOLIDATING = 'CONSOLIDATING'
}

export interface ScalogramData {
    energy: number[][];
}

export interface SpectralVerdict {
    action: 'BUY' | 'SELL' | 'WAIT' | 'HOLD';
    confidence: number;
    description: string;
    nextTurnIn: number;
}

export enum SpectralPhaseState {
    ACCUMULATION = 'ACCUMULATION',
    MARKUP = 'MARKUP',
    DISTRIBUTION = 'DISTRIBUTION',
    MARKDOWN = 'MARKDOWN'
}

export interface CompositeCycle {
    time: number;
    value: number;
    dominantComponent: number;
    noiseComponent: number;
    isProjection: boolean;
}

// --- Liquidity Analysis Type ---
export interface LiquidityAnalysis {
    volumeRatio: number; // RVOL (Relative Volume)
    flowDirection: 'Inflow' | 'Outflow' | 'Neutral';
    moneyFlowRaw: number; // Volume * Price Change
    averageVolume: number;
    currentVolume: number;
    spikeDetected: boolean;
}

export interface AnalysisResult {
    dominantCyclePeriod: number;
    dominantCyclePower: number;
    currentPhaseAngle: number;
    regimeScore: number;
    scalogram: ScalogramData;
    marketEnergyIndex: { time: number; value: number }[];
    cyclePhaseOscillator: { time: number; value: number }[];
    spectralVerdict: SpectralVerdict;
    spectralPhaseState: SpectralPhaseState;
    compositeCycle: CompositeCycle[];
    signalToNoiseRatio: number;
    spectralEntropy: number;
    state: MarketState;
    momentum: number;
    priceTargets: { level: string; price: number }[];
    swingLow: number;
    swingHigh: number;
    elliottWave?: ElliottWaveAnalysis;
    harmonicPattern?: HarmonicPatternAnalysis;
    fractalAnalysis?: FractalAnalysisResult;
    smartMoneyAnalysis?: SmartMoneyAnalysis;
    ictAnalysis?: ICTAnalysis;
    macdAnalysis?: MacdAnalysis;
    cotAnalysis?: CotAnalysis;
    technicalPatterns?: TechnicalPatternsAnalysis;
    wyckoffAnalysis?: WyckoffAnalysis;
    gannAnalysis?: GannAnalysis;
    fibonacciAnalysis?: FibonacciAnalysis;
    shortSqueezeAnalysis?: ShortSqueezeAnalysis;
    liquidationMap?: LiquidationMap;
    pivotPoints?: PivotPoints;
    sessionStatus?: SessionStatus;
    ichimokuAnalysis?: IchimokuAnalysis;
    whaleWatcherAnalysis?: WhaleWatcherAnalysis;
    volumeProfileAnalysis?: VolumeProfileAnalysis;
    seasonalityAnalysis?: SeasonalityAnalysis;
    nexusAnalysis?: GannFractalNexusAnalysis;
    diverseStrategiesAnalysis?: DiverseStrategiesAnalysis;
    flashCrashRisk?: FlashCrashRisk;
    quantAnalysis?: QuantAnalysis;
    dowAnalysis?: DowAnalysis;
    tvrAnalysis?: TvrAnalysis;
    // New Liquidity Analysis
    liquidityAnalysis?: LiquidityAnalysis;
    rsi?: number;
    macdHistogram?: number;
    bollingerBands?: BollingerBands;
    volumeStrength?: VolumeStrength;
}

export type VolumeStrength = 'عالية جداً' | 'عالية' | 'متوسطة' | 'منخفضة';

export interface MarketAnalysis {
    [pair: string]: { [timeframe: string]: AnalysisResult };
}

export interface ScannerCandidate {
    pair: string;
    timeframe: string;
    confidence: number;
    analysis: AnalysisResult;
    price: number;
}

export interface BollingerBands {
    upper: number;
    middle: number;
    lower: number;
}

// --- Elliott Wave (UPDATED) ---
export interface ElliottWavePoint {
    wave: string;
    price: number;
    index: number;
    type: 'Impulse' | 'Correction';
}

export interface WaveValidationRule {
    name: string;
    passed: boolean;
    description: string;
    strict: boolean; // Is this a hard rule (e.g., W2 < W1 start) or guideline?
}

export interface ElliottWaveScenario {
    type: string;
    probability: number;
    waveCount: string[];
    points: ElliottWavePoint[];
    targets: { level: string; price: number; probability: 'High' | 'Medium' | 'Low'; description: string }[];
    invalidationLevel: number;
    summary: string;
    currentWaveLabel: string;
    fibLevels?: { level: number; price: number; type: 'Retracement' | 'Extension' }[]; // For Pinball
}

export interface ElliottWaveAnalysis {
    summary: string;
    currentWave: string;
    longTermTargets: { level: string; price: number }[];
    invalidationLevel: number;
    points: ElliottWavePoint[];
    confidenceScore: number;
    primaryScenario?: ElliottWaveScenario;
    alternateScenario?: ElliottWaveScenario;
    oscillatorData?: { values: number[]; divergence: boolean; label: string };
    validationChecklist?: WaveValidationRule[];
    waveDegree?: string;
}

// --- Harmonic Patterns ---
export interface HarmonicPoint {
    leg: string;
    price: number;
    index: number;
}

export interface HarmonicRatio {
    leg: string;
    value: number;
    status: string;
}

export interface HarmonicPatternAnalysis {
    detected: boolean;
    patternName?: string;
    points?: HarmonicPoint[];
    ratios?: HarmonicRatio[];
    potentialReversalZone?: { start: number; end: number; density: any[] };
    targets?: { level: string; price: number }[];
    stopLoss?: number;
    hsiScore?: number;
    summary?: string;
    executionType?: string;
    timeSymmetryScore?: number;
    rsiConfirmation?: { status: string; value: number };
    entryTrigger?: string;
    isBammActive?: boolean;
}

// --- Technical Patterns ---
export interface PatternPoint {
    index: number;
    price: number;
    label?: string;
}

export interface ChartPattern {
    name: string;
    type: 'Bullish' | 'Bearish' | 'Neutral';
    status: 'Forming' | 'Confirmed';
    confidence: number;
    summary: string;
    points: PatternPoint[];
    targetPrice?: number;
    stopLoss?: number;
    trendlines?: { start: { index: number; price: number }; end: { index: number; price: number } }[];
}

export interface CandlestickPattern {
    name: string;
    type: 'Bullish' | 'Bearish' | 'Neutral';
    significance: 'High' | 'Medium' | 'Low';
}

export interface TechnicalPatternsAnalysis {
    chartPattern?: ChartPattern;
    candlestickPattern?: CandlestickPattern;
    confluence?: { summary: string };
}

// --- Wyckoff ---
export interface WyckoffEventPoint {
    event: string;
    index: number;
    price: number;
}

export interface WyckoffAnalysis {
    summary: string;
    schematic: string;
    phase: string;
    events: WyckoffEventPoint[];
    tradingRange?: { top: number; bottom: number };
    vsaSummary?: string;
    implication?: string;
    tradeSetup?: TradeSetup;
    pointAndFigureTarget?: { targetMin: number; targetMax: number };
    effortVsResult?: { effort: number; result: number };
    phaseChecklist?: { phase: string; checks: { text: string; met: boolean }[] };
}

// --- Gann ---
export interface GannSquareLevel {
    degree: number;
    label: string;
    price: number;
    type: 'Support' | 'Resistance';
    factor: number;
    strength?: 'High' | 'Medium' | 'Low';
}

export interface GannAngle {
    name: string;
    slope: number;
    value: number;
    originIndex: number;
    originPrice: number;
    type: 'Up' | 'Down';
    status: 'Support' | 'Resistance';
}

export interface GannTimeCycle {
    name: string;
    projectedDate: string;
    projectedIndex: number;
    type: 'Major' | 'Minor';
    strength: 'Medium' | 'High' | 'Low';
}

export interface GannTradeRecommendation {
}

export interface GannSquaringPoint {
    index: number;
    price: number;
    type: string;
}

export interface GannSwing {
    type: 'Up' | 'Down' | 'Neutral';
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
    isMechanicalTrigger: boolean;
}

export interface AstroEvent {
}

export interface MoonPhase {
    date: string;
    index: number;
    phase: string;
    label: string;
}

export interface GannIntersection {
    index: number;
    price: number;
    description: string;
}

export interface GannGridLine {
    p1: { index: number; price: number };
    p2: { index: number; price: number };
    type: 'Up' | 'Down';
}

export interface GannToolboxData {
    ruleOf8ths: { nearestLevel: string; nearestPrice: number; equilibrium: number };
    wheelOf24: { activeSegment: number; nextChange: string };
    mechanicalSwing: { trend: string; type: string };
    timeCounts: { next45: string; next90: string; next144: string };
    octaves: { up: number; down: number; fifth: number };
    volatilityAngle: { angle: number; status: string };
    polarity: { status: string; value: number };
    pyramid: { block: number; cycleComplete: number };
    numerology: { number: number; meaning: string; color: string };
}

export interface PlanetPosition {
    name: string;
    symbol: string;
    longitude: number;
    latitude?: number;
    declination?: number;
    isNatal: boolean;
    isRetrograde?: boolean;
    speed?: number;
    sign: string;
    isPrice?: boolean;
    musicalNote?: string;
}

export interface PlanetaryAspect {
    planet1: string;
    planet2: string;
    angle: number;
    type: 'Conjunction' | 'Sextile' | 'Square' | 'Trine' | 'Opposition' | 'Quintile' | 'Bi-Quintile';
    orb: number;
    isNatalAspect: boolean;
}

export interface SquaringResult {
    type: string;
    baseValue: number;
    scaleUsed: number;
    anchorDate: string;
    targetDate: string;
    targetIndex: number;
    isComplete: boolean;
    daysRemaining: number;
    description: string;
}

export interface SquareTheCircleLevel {
    angle: number;
    steps: number;
    price: number;
    date: string;
    description: string;
    type: 'Support' | 'Resistance';
}

export interface GannHexagonLevel {
    angle: number;
    price: number;
    type: 'Support' | 'Resistance';
    label: string;
}

export interface PlanetaryLine {
    planet: string;
    angle: number;
    price: number;
    type: 'Support' | 'Resistance';
}

export interface RangeLevel {
    price: number;
    label: string;
    type: 'Equilibrium' | 'Support';
}

export interface CircleOf24Item {
    hour: number;
    label: string;
    isActive: boolean;
}

export interface ZeroAngle {
    price: number;
    label: string;
    type: string;
}

export interface MasterCycleEvent {
    date: string;
    type: string;
    description: string;
}

// --- New Astro Module Types ---
export interface PlanetaryPriceLevel {
    planetName: string;
    symbol: string;
    degree: number;
    price: number;
    isRetrograde: boolean;
    speed: 'Fast' | 'Slow' | 'Stationary';
    type: 'Longitude' | 'Declination' | 'Latitude' | 'Harmonic';
    harmonicLabel?: string;
    color: string;
}

export interface AstroSettings {
    coordinateSystem: 'Geocentric' | 'Heliocentric';
    zodiacSystem: 'Tropical' | 'Sidereal';
    waveAmplitude: number;
    waveFrequency: number;
    scale: number;
    showHarmonics: boolean;
    selectedPlanets: string[];
}

export interface AstroModuleAnalysis {
    levels: PlanetaryPriceLevel[];
    aspects: PlanetaryAspect[];
    recommendedScale: number;
}

export interface GannAnalysis {
    summary: string;
    anchorPointHigh: { price: number; index: number; date: string };
    anchorPointLow: { price: number; index: number; date: string };
    unitScale: number;
    gannFans: GannAngle[];
    squareOf9Levels: GannSquareLevel[];
    squareOf144Levels: GannSquareLevel[];
    hexagonLevels: GannHexagonLevel[];
    timeCycles: GannTimeCycle[];
    squaringPoints: GannSquaringPoint[];
    swings: GannSwing[];
    astroEvents: AstroEvent[];
    planetaryLines: PlanetaryLine[];
    moonPhases: MoonPhase[];
    intersections: GannIntersection[];
    anniversaryDates: { date: string; type: string; index: number; price: number; description: string }[];
    vibrationBase: number;
    implication: 'Bullish' | 'Bearish' | 'Neutral';
    lawOfVibrationScore: number;
    isSmartScale: boolean;
    gannBox?: any;
    gannGrid: GannGridLine[];
    gannTunnel?: { upper: GannAngle; lower: GannAngle; area: { x: number; y0: number; y1: number }[] };
    toolbox?: GannToolboxData;
    gannzillaStrategies?: any;
    planetaryWheel?: {
        transits: PlanetPosition[];
        natal: PlanetPosition[];
        pricePlanet: PlanetPosition;
        aspects: PlanetaryAspect[];
        transitDate: string;
        natalDate: string;
    };
    squaringResults?: SquaringResult[];
    smartMultiplier?: number;
    squareTheCircle?: SquareTheCircleLevel[];
    rangeDivisions: RangeLevel[];
    circleOf24: CircleOf24Item[];
    zeroAngles: ZeroAngle[];
    masterCycleEvents: MasterCycleEvent[];
    // New Property for the Module
    astroModule?: AstroModuleAnalysis;
}

// --- Fractal ---
export interface FractalMatch {
    startIndex: number;
    endIndex: number;
    similarityScore: number;
    projection: number[];
    timestamp: number;
    type: 'Optimistic' | 'Pessimistic' | 'Neutral';
}

export interface ChaosMetrics {
    lyapunovExponent: number;
    entropy: number;
    dimension: number;
    attractorType: 'Random Walk' | 'Limit Cycle' | 'Strange Attractor' | 'Point Attractor';
}

export interface FractalPivot {
    price: number;
    type: 'Resistance' | 'Support';
    strength: number;
}

export interface FractalAnalysisResult {
    hurstExponent: number;
    fractalDimension: number;
    summary: string;
    historicalMatch?: FractalMatch;
    predictionFan?: FractalMatch[];
    chaosMetrics?: ChaosMetrics;
    hurstSlope?: number;
    levyAlpha?: number;
    multifractalSpectrumWidth?: number;
    fractalEfficiency?: number;
    holderExponent?: number[];
    fractalPivots?: FractalPivot[];
    memoryScore?: number;
}

// --- Smart Money & ICT ---
export interface StructurePoint {
    type: string;
    price: number;
    index: number;
}

export interface OrderBlock {
    type: 'bullish' | 'bearish';
    index: number;
    top: number;
    bottom: number;
}

export interface TradeSetup {
    direction: 'Long' | 'Short';
    entry: number;
    stopLoss: number;
    targets: { level: string; price: number }[];
}

export interface SmartMoneyAnalysis {
    summary: string;
    bias: 'Bullish' | 'Bearish' | 'Ranging';
    structurePoint?: StructurePoint;
    orderBlock?: OrderBlock;
    tradeSetup?: TradeSetup;
}

export interface LiquidityZone {
    type: 'buy-side' | 'sell-side';
    priceLevel: number;
    strength: string;
    startIndex: number;
}

export interface FairValueGap {
    type: 'bullish' | 'bearish';
    top: number;
    bottom: number;
    startIndex: number;
    endIndex: number;
    isMitigated: boolean;
}

export interface PremiumDiscountZones {
    rangeHigh: number;
    rangeLow: number;
    equilibrium: number;
}

export interface ICTAnalysis {
    summary: string;
    marketStructure: 'Bullish' | 'Bearish' | 'Ranging';
    liquidityZones: LiquidityZone[];
    fairValueGaps: FairValueGap[];
    orderBlocks: OrderBlock[];
    timeBias: { session: string; bias: string };
    premiumDiscount?: PremiumDiscountZones;
    tradeSetup?: TradeSetup;
    confluencePoints?: any[];
}

export interface ICTSignal {
    signalType: 'Entry' | 'Hold' | 'Exit';
    direction: 'Long' | 'Short';
    timeframe: string;
    confidence: number;
    rationale: string;
    tradeSetup: TradeSetup;
}

// --- MACD ---
export interface MacdStrategy {
    id: number;
    name: string;
    logic: string;
    filter: string;
    accuracy: number;
    isActive: boolean;
    signal: 'Buy' | 'Sell' | 'Hold';
    confidence: 'Low' | 'Medium' | 'High';
}

export interface MacdMasterSignal {
    signal: 'Buy' | 'Sell' | 'Neutral';
    score: number;
    strength: 'Strong' | 'Moderate' | 'Weak';
    activeStrategyCount: number;
    totalStrategies: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
}

export interface MacdAnalysis {
    basicStrategies: MacdStrategy[];
    advancedStrategies: MacdStrategy[];
    summary: string;
    masterSignal: MacdMasterSignal;
}

// --- COT ---
export interface TraderGroupPositions {
    long: number;
    short: number;
    net: number;
}

export interface CotAnalysis {
    summary: string;
    sentimentScore: number;
    largeSpeculators: TraderGroupPositions;
    commercials: TraderGroupPositions;
    smallSpeculators: TraderGroupPositions;
}

// --- TVR ---
export enum TvrBehavioralState {
    INERTIAL = 'Inertial',
    AGGRESSIVE = 'Aggressive',
    NORMAL = 'Normal'
}

export type TvrRecommendation = 'مواصلة الشراء/الاحتفاظ' | 'إشارة شراء قوية' | 'جني أرباح/بيع' | 'شراء بحذر' | 'انتظار';

export interface TvrAnalysis {
    state: TvrBehavioralState;
    recommendation: TvrRecommendation;
    vRef: number;
    vResponse: number;
    discoveryNote: string;
    priceActionContext: string;
}

export interface TvrCandidate {
    pair: string;
    timeframe: string;
    analysis: TvrAnalysis;
}

// --- Whale Watcher ---
export interface WhaleCandleAnalysis {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    delta: number;
    anomaly: 'Absorption' | 'Stop Hunt' | 'Push' | 'Dump' | 'Churn' | null;
    description: string;
    effortResultRatio: number;
}

export interface WhaleWatcherAnalysis {
    manipulationScore: number;
    whaleActivityLevel: 'Low' | 'Moderate' | 'High' | 'Extreme';
    detectedAnomalies: string[];
    accumulationZone?: { high: number; low: number; volume: number };
    summary: string;
    lastWhaleAction?: 'Buying' | 'Selling' | 'Hidden Accumulation';
    candleAnalysis: WhaleCandleAnalysis[];
}

// --- Volume Profile ---
export interface PriceLevelVolume {
    price: number;
    volume: number;
    buyVol: number;
    sellVol: number;
    delta: number;
    isPOC: boolean;
    isValueArea: boolean;
    type: 'HVN' | 'LVN' | 'Normal';
}

export interface VolumeProfileStrategy {
    name: string;
    signal: string;
    description: string;
}

export interface VolumeProfileAnalysis {
    histogram: PriceLevelVolume[];
    pocPrice: number;
    vah: number;
    val: number;
    summary: string;
    vwap: number;
    vwapStdDev: number;
    profileShape: 'P-Shape' | 'b-Shape' | 'D-Shape' | 'B-Shape';
    impliedTrend: 'Bullish' | 'Bearish' | 'Neutral';
    strategies: VolumeProfileStrategy[];
}

// --- Seasonality ---
export interface SeasonalMetric {
    period: string;
    avgReturn: number;
    winRate: number;
}

export interface SeasonalityAnalysis {
    hourly: SeasonalMetric[];
    daily: SeasonalMetric[];
    monthly: SeasonalMetric[];
    bestHour: string;
    bestDay: string;
    summary: string;
}

// --- Quant ---
export interface QuantMetric {
    label: string;
    value: string;
    description: string;
    status: 'Normal' | 'Warning' | 'Extreme';
}

export interface QuantAnalysis {
    mean: number;
    stdDev: number;
    zScore: number;
    skewness: number;
    kurtosis: number;
    linearRegression: { slope: number; intercept: number; rSquared: number };
    metrics: QuantMetric[];
    bellCurveData: { x: number; y: number }[];
    summary: string;
}

// --- Dow Theory ---
export type DowTrend = 'Bullish' | 'Bearish' | 'Neutral';
export type DowPhase = 'Accumulation' | 'Public Participation' | 'Distribution';

export interface DowAnalysis {
    primaryTrend: DowTrend;
    secondaryTrend: 'Correction' | 'Rally' | 'Neutral';
    phase: DowPhase;
    volumeConfirmation: boolean;
    higherHighs: boolean;
    higherLows: boolean;
    lowerHighs: boolean;
    lowerLows: boolean;
    summary: string;
    swings: { index: number; price: number; type: 'High' | 'Low' }[];
}

// --- Fibonacci ---
export interface FibLevel {
    level: number;
    price: number;
}

export interface FibRetracement {
    swingHigh: { price: number; index: number };
    swingLow: { price: number; index: number };
    levels: FibLevel[];
}

export interface FibExtension {
    p1: { price: number; index: number };
    p2: { price: number; index: number };
    p3: { price: number; index: number };
    levels: FibLevel[];
}

export interface FibTimeZone {
    level: number;
    index: number;
    indexDiff?: number;
}

export interface FibCluster {
    priceTop: number;
    priceBottom: number;
    count: number;
    reasons: string[];
    sum: number;
}

export interface FibonacciAnalysis {
    isValid: boolean;
    summary: string;
    confluenceScore: number;
    primaryRetracement?: FibRetracement;
    trendBasedExtension?: FibExtension;
    timeZones?: FibTimeZone[];
    clusters: FibCluster[];
}

// --- Short Squeeze ---
export interface ShortSqueezeAnalysis {
    squeezePressure: number;
    shortInterestIndex: number;
    costToBorrow: number;
    daysToCover: number;
    fundingRate: number;
    summary: string;
}

export interface ShortSqueezeCandidate {
    pair: string;
    timeframe: string;
    analysis: ShortSqueezeAnalysis;
    price: number;
}

// --- Signals ---
export interface LiveSignal {
    side: 'BUY' | 'SELL' | 'WAIT';
    entry: number;
    tp1: number;
    tp2: number;
    sl: number;
    confidence: number;
    reasons: string[];
    price: number;
    change: number;
    timestamp: number;
    session: string;
}

export interface ConvergenceSignal {
    pair: string;
    bestTimeframe: string;
    analysis: AnalysisResult;
    price: number;
    signalTier: 'A+' | 'A' | 'B+' | 'B';
    convergenceScore: number;
    convergingTimeframes: { tf: string; confidence: number }[];
    primaryDriver: { type: string; name: string };
    riskRewardRatio: number;
    marketContext: { btcDominance: string; altcoinMomentum: string };
    volumeConfirmation: 'Strong' | 'Moderate' | 'Weak';
    strategies: string[];
}

export interface SniperSignal {
    pair: string;
    timeframe: string;
    status: 'Monitoring' | 'Armed' | 'Triggered';
    currentRsi: number;
    peakRsi: number;
    peakTimestamp: number;
}

export interface UltraLightSignal {
    side: 'BUY' | 'SELL';
    entry: number;
    stopLoss: number;
    targets: { level: string; price: number }[];
    duration: string;
    rationale: string;
    predictedPath: number[];
}

// --- Fayez ---
export interface PredictedCandle {
    o: number;
    h: number;
    l: number;
    c: number;
    timestamp: number;
}

export interface FayezScenario {
    type: 'Bullish' | 'Bearish' | 'Neutral';
    probability: number;
    path: PredictedCandle[];
    targetPrice: number;
    description: string;
    keyLevels: number[];
}

export interface FayezPredictionResult {
    mainScenario: FayezScenario;
    alternativeScenarios: FayezScenario[];
    historicalMatch: { similarity: number; date: string; outcome: string };
    volatilityCone: { upper: number[]; lower: number[] };
    aiNarrative: string;
    confidenceScore: number;
}

// --- Diverse Strategies ---
export interface StrategyMetric {
    label: string;
    value: string;
    isConditionMet: boolean;
}

export interface DiverseStrategyResult {
    id: string;
    name: string;
    signal: 'Buy' | 'Sell' | 'Neutral';
    strength: number;
    reasoning: string;
    metrics: StrategyMetric[];
    timeframeRecommendation: string;
}

export interface DiverseStrategiesAnalysis {
    strategies: DiverseStrategyResult[];
    summary: string;
}

// --- Nexus ---
export interface NexusChartData {
    time: number;
    price: number;
    type: 'History' | 'Projection' | 'Explosion';
    upperBound?: number; // For Probability Cloud
    lowerBound?: number; // For Probability Cloud
    energy?: number; // For Gradient coloring
}

export interface NexusNode {
    time: number;
    price: number;
    label: string;
    strength: number;
    type: 'Gann' | 'Fractal' | 'Squaring';
}

export interface NexusPhysics {
    velocity: number; // Speed of price change
    gravity: number; // Mean reversion force
    mass: number; // Volume profile density at current level
    resilienceScore: number; // Monte Carlo survival rate
}

export interface GannFractalNexusAnalysis {
    confluenceScore: number;
    shortTermPath: NexusChartData[];
    longTermPath: NexusChartData[];
    explosionPath?: NexusChartData[];
    summary: string;
    recommendation: 'Buy' | 'Sell' | 'Wait';
    keyLevels: { price: number; type: string; label: string }[];
    timeTargets: { index: number; label: string }[];
    nexusNodes: NexusNode[];
    physics: NexusPhysics;
}

// --- Advanced ---
export interface LiquidationLevel {
    price: number;
    volume: number;
    leverageTier: string;
    type: 'Long' | 'Short';
}

export interface LiquidationMap {
    levels: LiquidationLevel[];
    clusters: { price: number; intensity: 'High' | 'Medium' | 'Low'; type: 'Long' | 'Short'; volume: number }[];
    summary: string;
}

export interface PivotPoints {
    classic: { P: number; R1: number; S1: number; R2: number; S2: number; R3: number; S3: number };
    fibonacci: { P: number; R1: number; S1: number; R2: number; S2: number; R3: number; S3: number };
    camarilla: { P: number; R3: number; R4: number; S3: number; S4: number; R1: number; R2: number; S1: number; S2: number };
}

export interface SessionStatus {
    currentSession: string;
    isActive: boolean;
    nextSessionName: string;
    timeToNext: string;
    killZoneActive: boolean;
}

export interface FlashCrashRisk {
    probability: number;
    level: 'Low' | 'Moderate' | 'High' | 'Critical';
    description: string;
}

// --- Backtest ---
export interface BacktestResult {
    strategyName: string;
    trades: number;
    winRate: number;
    profitFactor: number;
    netProfit: number;
}

export interface Strategy {
    id: string;
    name: string;
    description: string;
}

// --- Micro ---
export interface MicroTimeCycle {
    type: 'Gann' | 'Fibonacci' | 'Harmonic';
    label: string;
    minutesUntil: number;
    strength: number;
}

export interface MicroAnalysisResult {
    side: 'BUY' | 'SELL';
    entryZone: { start: number; end: number };
    targets: { level: string; price: number }[];
    stopLoss: number;
    timeExplosionProbability: number;
    activeChronometers: MicroTimeCycle[];
    nextMajorTimeCluster: number;
    confirmationSignals: { microVolumeFlow: number; phaseCoherence: number };
}

export interface FullInstantaneousAnalysis {
    '1m': MicroAnalysisResult;
    '5m': MicroAnalysisResult;
    '15m': MicroAnalysisResult;
}

// --- Ichimoku ---
export interface IchimokuSignal {
    name: string;
    type: 'Bullish' | 'Bearish';
    strength: 'Strong' | 'Medium' | 'Weak';
    description: string;
}

export interface IchimokuAnalysis {
    lines: { tenkanSen: number; kijunSen: number; senkouSpanA: number; senkouSpanB: number; chikouSpan: number };
    futureCloud: { spanA: number; spanB: number; index: number }[];
    signals: IchimokuSignal[];
    trendState: 'Bullish' | 'Bearish' | 'Neutral';
    cloudState: 'Bullish' | 'Bearish';
    balanceScore: number;
    summary: string;
    recommendation: 'Buy' | 'Sell' | 'Wait';
}
