// 量化交易系统核心类型声明

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  symbol: string;
  quoteVolume?: number;
  takerBuyBaseVolume?: number;
  takerBuyQuoteVolume?: number;
  ignore?: boolean;
}

export interface MarketData {
  klines: Kline[];
  symbol: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK';

export interface Signal {
  id: string;
  symbol: string;
  side: OrderSide;
  price: number;
  confidence: number;
  reason: string;
  strength: SignalStrength;
  stopLoss?: number;
  takeProfit?: number;
}

export interface StrategyConfig {
  name: string;
  description?: string;
  parameters: Record<string, any>;
  riskManagement?: any;
  tradingConfig?: any;
}

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  commission: number;
  symbols: string[];
}

export interface Trade {
  id: string;
  symbol: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  volume: number;
  pnl: number;
  pnlPercent?: number;
  quantity?: number;
  commission?: number;
  side?: string;
  price?: number;
  timestamp?: number;
  reason?: string;
}

export interface EquityPoint {
  time: number;
  equity: number;
  timestamp: number;
}

export interface BacktestResult {
  summary: {
    strategy: string;
    symbol: string;
    startTime: number;
    endTime: number;
    initialCapital: number;
    finalEquity: number;
  };
  returns: {
    totalReturn: number;
    annualizedReturn: number;
    alpha: number;
    beta: number;
  };
  risk: {
    volatility: number;
    maxDrawdown: number;
    downsideDeviation: number;
    var95: number;
  };
  riskAdjusted: {
    sharpeRatio: number;
    sortinoRatio?: number;
    calmarRatio?: number;
  };
  trading: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin?: number;
    avgLoss?: number;
    profitFactor?: number;
    averageTrade?: number;
  };
  trades: Trade[];
  equityCurve: EquityPoint[];
  monthlyReturns?: { [month: string]: number };
  totalReturn?: number;
  details?: any;
} 