/**
 * AI量化交易系统核心类型定义
 * 包含市场数据、交易信号、策略配置等核心接口
 */

// ============= 基础数据类型 =============

/**
 * 时间戳类型
 */
export type Timestamp = number;

/**
 * 价格类型
 */
export type Price = number;

/**
 * 数量类型
 */
export type Volume = number;

/**
 * 资产类型枚举
 */
export enum AssetType {
  STOCK = 'STOCK',           // 股票
  CRYPTO = 'CRYPTO',         // 数字货币
  FOREX = 'FOREX',           // 外汇
  COMMODITY = 'COMMODITY',   // 商品
  FUTURES = 'FUTURES',       // 期货
  OPTIONS = 'OPTIONS'        // 期权
}

/**
 * 交易方向枚举
 */
export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

/**
 * 订单类型枚举
 */
export enum OrderType {
  MARKET = 'MARKET',         // 市价单
  LIMIT = 'LIMIT',           // 限价单
  STOP = 'STOP',             // 止损单
  STOP_LIMIT = 'STOP_LIMIT'  // 限价止损单
}

/**
 * 信号强度枚举
 */
export enum SignalStrength {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  VERY_STRONG = 'VERY_STRONG'
}

// ============= 市场数据接口 =============

/**
 * K线数据接口
 */
export interface Kline {
  /** 交易对符号 */
  symbol: string;
  /** 开盘时间 */
  openTime: Timestamp;
  /** 收盘时间 */
  closeTime: Timestamp;
  /** 开盘价 */
  open: Price;
  /** 最高价 */
  high: Price;
  /** 最低价 */
  low: Price;
  /** 收盘价 */
  close: Price;
  /** 成交量 */
  volume: Volume;
  /** 成交额 */
  turnover?: number;
  /** 时间间隔 */
  interval: string;
}

/**
 * 市场深度数据接口
 */
export interface MarketDepth {
  symbol: string;
  timestamp: Timestamp;
  /** 买盘深度 */
  bids: Array<[Price, Volume]>;
  /** 卖盘深度 */
  asks: Array<[Price, Volume]>;
}

/**
 * 实时价格数据接口
 */
export interface Ticker {
  symbol: string;
  timestamp: Timestamp;
  /** 最新价格 */
  price: Price;
  /** 24小时价格变化 */
  change24h: number;
  /** 24小时价格变化百分比 */
  changePercent24h: number;
  /** 24小时最高价 */
  high24h: Price;
  /** 24小时最低价 */
  low24h: Price;
  /** 24小时成交量 */
  volume24h: Volume;
}

/**
 * 综合市场数据接口
 */
export interface MarketData {
  /** 基础K线数据 */
  klines: Kline[];
  /** 实时价格数据 */
  ticker?: Ticker;
  /** 市场深度数据 */
  depth?: MarketDepth;
  /** 技术指标数据 */
  indicators?: TechnicalIndicators;
}

// ============= 技术指标接口 =============

/**
 * 技术指标数据接口
 */
export interface TechnicalIndicators {
  /** 移动平均线 */
  ma?: {
    ma5: number[];
    ma10: number[];
    ma20: number[];
    ma50: number[];
    ma200: number[];
  };
  /** 相对强弱指数 */
  rsi?: number[];
  /** MACD指标 */
  macd?: {
    dif: number[];
    dea: number[];
    histogram: number[];
  };
  /** 布林带 */
  bollinger?: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  /** KDJ指标 */
  kdj?: {
    k: number[];
    d: number[];
    j: number[];
  };
}

// ============= 交易信号接口 =============

/**
 * 交易信号接口
 */
export interface Signal {
  /** 信号ID */
  id: string;
  /** 交易对符号 */
  symbol: string;
  /** 信号生成时间 */
  timestamp: Timestamp;
  /** 交易方向 */
  side: OrderSide;
  /** 信号强度 */
  strength: SignalStrength;
  /** 信号置信度 (0-1) */
  confidence: number;
  /** 建议价格 */
  price: Price;
  /** 建议数量 */
  quantity?: Volume;
  /** 止损价格 */
  stopLoss?: Price;
  /** 止盈价格 */
  takeProfit?: Price;
  /** 信号原因 */
  reason: string;
  /** 策略名称 */
  strategy: string;
  /** 附加数据 */
  metadata?: Record<string, any>;
}

// ============= 订单接口 =============

/**
 * 订单接口
 */
export interface Order {
  /** 订单ID */
  id: string;
  /** 交易对符号 */
  symbol: string;
  /** 交易方向 */
  side: OrderSide;
  /** 订单类型 */
  type: OrderType;
  /** 订单数量 */
  quantity: Volume;
  /** 订单价格 */
  price?: Price;
  /** 止损价格 */
  stopPrice?: Price;
  /** 订单状态 */
  status: OrderStatus;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
  /** 成交数量 */
  filledQuantity: Volume;
  /** 平均成交价格 */
  avgPrice?: Price;
}

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  PENDING = 'PENDING',       // 待成交
  FILLED = 'FILLED',         // 已成交
  PARTIALLY_FILLED = 'PARTIALLY_FILLED', // 部分成交
  CANCELLED = 'CANCELLED',   // 已取消
  REJECTED = 'REJECTED'      // 已拒绝
}

// ============= 策略接口 =============

/**
 * 策略配置接口
 */
export interface StrategyConfig {
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  /** 策略参数 */
  parameters: Record<string, any>;
  /** 风险管理配置 */
  riskManagement: RiskManagementConfig;
  /** 交易配置 */
  tradingConfig: TradingConfig;
}

/**
 * 风险管理配置接口
 */
export interface RiskManagementConfig {
  /** 最大仓位比例 */
  maxPositionSize: number;
  /** 止损比例 */
  stopLossPercent: number;
  /** 止盈比例 */
  takeProfitPercent: number;
  /** 最大日损失 */
  maxDailyLoss: number;
  /** 最大回撤 */
  maxDrawdown: number;
}

/**
 * 交易配置接口
 */
export interface TradingConfig {
  /** 最小信号置信度 */
  minConfidence: number;
  /** 最大并发交易数 */
  maxConcurrentTrades: number;
  /** 交易时间窗口 */
  tradingHours: {
    start: string;
    end: string;
  };
  /** 允许的资产类型 */
  allowedAssetTypes: AssetType[];
}
// ============= 回测接口 =============

/**
 * 回测配置接口
 */
export interface BacktestConfig {
  /** 策略配置 */
  strategy: StrategyConfig;
  /** 开始时间 */
  startDate: string;
  /** 结束时间 */
  endDate: string;
  /** 初始资金 */
  initialCapital: number;
  /** 交易手续费 */
  commission: number;
  /** 滑点 */
  slippage: number;
  /** 交易对列表 */
  symbols: string[];
}

/**
 * 回测结果接口
 */
export interface BacktestResult {
  /** 总收益率 */
  totalReturn: number;
  /** 年化收益率 */
  annualizedReturn: number;
  /** 最大回撤 */
  maxDrawdown: number;
  /** 夏普比率 */
  sharpeRatio: number;
  /** 胜率 */
  winRate: number;
  /** 盈亏比 */
  profitLossRatio: number;
  /** 交易次数 */
  totalTrades: number;
  /** 详细交易记录 */
  trades: Trade[];
  /** 资金曲线 */
  equityCurve: EquityPoint[];
  /** 性能指标 */
  metrics: PerformanceMetrics;
}

/**
 * 交易记录接口
 */
export interface Trade {
  /** 交易ID */
  id: string;
  /** 交易对符号 */
  symbol: string;
  /** 开仓时间 */
  entryTime: Timestamp;
  /** 平仓时间 */
  exitTime: Timestamp;
  /** 交易方向 */
  side: OrderSide;
  /** 开仓价格 */
  entryPrice: Price;
  /** 平仓价格 */
  exitPrice: Price;
  /** 交易数量 */
  quantity: Volume;
  /** 盈亏金额 */
  pnl: number;
  /** 盈亏百分比 */
  pnlPercent: number;
  /** 手续费 */
  commission: number;
}

/**
 * 资金曲线点接口
 */
export interface EquityPoint {
  timestamp: Timestamp;
  equity: number;
  drawdown: number;
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  /** 收益指标 */
  returns: {
    total: number;
    annualized: number;
    monthly: number[];
    daily: number[];
  };
  /** 风险指标 */
  risk: {
    volatility: number;
    maxDrawdown: number;
    var95: number;
    var99: number;
  };
  /** 风险调整收益 */
  riskAdjusted: {
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
  };
  /** 交易统计 */
  trading: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
  };
}

// ============= 数据采集接口 =============

/**
 * 数据采集器接口
 */
export interface IDataCollector {
  /** 获取K线数据 */
  getKlines(symbol: string, interval: string, limit?: number): Promise<Kline[]>;
  /** 获取实时价格 */
  getTicker(symbol: string): Promise<Ticker>;
  /** 获取市场深度 */
  getDepth(symbol: string, limit?: number): Promise<MarketDepth>;
  /** 订阅实时数据 */
  subscribe(symbol: string, callback: (data: any) => void): void;
  /** 取消订阅 */
  unsubscribe(symbol: string): void;
}

// ============= 策略基类接口 =============

/**
 * 策略接口
 */
export interface IStrategy {
  /** 策略名称 */
  name: string;
  /** 策略配置 */
  config: StrategyConfig;
  /** 初始化策略 */
  initialize(): Promise<void>;
  /** 生成交易信号 */
  generateSignal(data: MarketData): Promise<Signal | null>;
  /** 更新策略参数 */
  updateParameters(parameters: Record<string, any>): void;
  /** 获取策略状态 */
  getStatus(): StrategyStatus;
}

/**
 * 策略状态接口
 */
export interface StrategyStatus {
  isRunning: boolean;
  lastUpdate: Timestamp;
  performance: {
    totalSignals: number;
    successfulSignals: number;
    accuracy: number;
  };
}

// ============= 错误类型 =============

/**
 * 系统错误基类
 */
export class TradingSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TradingSystemError';
  }
}

/**
 * 数据错误类
 */
export class DataError extends TradingSystemError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_ERROR', details);
    this.name = 'DataError';
  }
}

/**
 * 策略错误类
 */
export class StrategyError extends TradingSystemError {
  constructor(message: string, details?: any) {
    super(message, 'STRATEGY_ERROR', details);
    this.name = 'StrategyError';
  }
}

/**
 * 回测错误类
 */
export class BacktestError extends TradingSystemError {
  constructor(message: string, details?: any) {
    super(message, 'BACKTEST_ERROR', details);
    this.name = 'BacktestError';
  }
}

// ============= 工具类型 =============

/**
 * 深度只读类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 可选字段类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 事件类型
 */
export interface Event<T = any> {
  type: string;
  timestamp: Timestamp;
  data: T;
}

/**
 * 事件处理器类型
 */
export type EventHandler<T = any> = (event: Event<T>) => void | Promise<void>;
