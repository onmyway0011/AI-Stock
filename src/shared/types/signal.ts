/**
 * 交易信号类型定义
 * 支持置信度判断、价格建议和消息推送
 */

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
  CLOSE = 'CLOSE',
  CONFIDENCE_CHECK = 'CONFIDENCE_CHECK', // 扩展信号类型以支持置信度判断
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION' // 扩展信号类型以支持消息推送
}

export enum SignalStrength {
  VERY_WEAK = 'VERY_WEAK',
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  VERY_STRONG = 'VERY_STRONG'
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum SignalSource {
  TECHNICAL_ANALYSIS = 'TECHNICAL_ANALYSIS',
  MACHINE_LEARNING = 'MACHINE_LEARNING',
  FUNDAMENTAL_ANALYSIS = 'FUNDAMENTAL_ANALYSIS',
  SENTIMENT_ANALYSIS = 'SENTIMENT_ANALYSIS',
  HYBRID = 'HYBRID'
}

export enum NotificationChannel {
  WECHAT = 'WECHAT',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEBHOOK = 'WEBHOOK',
  DINGTALK = 'DINGTALK'
}

/**
 * 价格建议接口
 */
export interface PriceSuggestion {
  /** 入场价格 */
  entryPrice: number;
  /** 止损价格 */
  stopLoss: number;
  /** 止盈价格 */
  takeProfit: number;
  /** 价格有效期（毫秒） */
  validUntil: number;
  /** 建议仓位大小 */
  positionSize?: number;
  /** 风险收益比 */
  riskRewardRatio?: number;
}

/**
 * 置信度分析接口
 */
export interface ConfidenceAnalysis {
  /** 总体置信度 (0-1) */
  overall: number;
  /** 技术面置信度 */
  technical: number;
  /** 基本面置信度 */
  fundamental?: number;
  /** 市场情绪置信度 */
  sentiment?: number;
  /** 置信度来源 */
  sources: {
    source: SignalSource;
    weight: number;
    confidence: number;
  }[];
  /** 置信度阈值 */
  threshold: number;
  /** 是否达到阈值 */
  meetsThreshold: boolean;
}

/**
 * 市场状态接口
 */
export interface MarketCondition {
  /** 趋势方向 */
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  /** 趋势强度 (0-1) */
  trendStrength: number;
  /** 波动率水平 */
  volatility: 'LOW' | 'MEDIUM' | 'HIGH';
  /** 成交量状态 */
  volume: 'LOW' | 'NORMAL' | 'HIGH';
  /** 市场阶段 */
  phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN';
}

/**
 * 风险评估接口
 */
export interface RiskAssessment {
  /** 风险等级 */
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  /** 风险评分 (0-100) */
  score: number;
  /** 风险因子 */
  factors: string[];
  /** 最大建议仓位 */
  maxPositionSize: number;
  /** 风险控制建议 */
  recommendations: string[];
}

/**
 * 交易信号接口
 */
export interface TradingSignal {
  /** 信号ID */
  id: string;
  /** 信号类型 */
  type: SignalType;
  /** 交易品种 */
  symbol: string;
  /** 交易方向 */
  side: OrderSide;
  /** 信号强度 */
  strength: SignalStrength;
  /** 信号来源 */
  source: SignalSource;
  /** 置信度分析 */
  confidence: ConfidenceAnalysis;
  /** 价格建议 */
  priceSuggestion: PriceSuggestion;
  /** 市场状态 */
  marketCondition: MarketCondition;
  /** 风险评估 */
  riskAssessment: RiskAssessment;
  /** 生成时间 */
  timestamp: number;
  /** 有效期 */
  expiresAt: number;
  /** 信号原因 */
  reason: string;
  /** 详细分析 */
  analysis: string;
  /** 技术指标数据 */
  indicators?: Record<string, number>;
  /** 是否需要推送 */
  shouldNotify: boolean;
  /** 推送渠道 */
  notificationChannels: NotificationChannel[];
  /** 优先级 */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

/**
 * 信号过滤配置
 */
export interface SignalFilter {
  /** 最小置信度 */
  minConfidence: number;
  /** 允许的信号类型 */
  allowedTypes: SignalType[];
  /** 允许的信号强度 */
  allowedStrengths: SignalStrength[];
  /** 允许的交易品种 */
  allowedSymbols: string[];
  /** 最小风险收益比 */
  minRiskRewardRatio?: number;
  /** 最大风险等级 */
  maxRiskLevel?: string;
  /** 冷却时间（毫秒） */
  cooldownPeriod: number;
}

/**
 * 推送消息接口
 */
export interface NotificationMessage {
  /** 消息ID */
  id: string;
  /** 信号ID */
  signalId: string;
  /** 推送渠道 */
  channel: NotificationChannel;
  /** 消息标题 */
  title: string;
  /** 消息内容 */
  content: string;
  /** 富文本内容 */
  richContent?: {
    type: 'text' | 'markdown' | 'card';
    data: any;
  };
  /** 发送时间 */
  timestamp: number;
  /** 发送状态 */
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  /** 错误信息 */
  error?: string;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 信号统计接口
 */
export interface SignalStatistics {
  /** 总信号数 */
  totalSignals: number;
  /** 有效信号数 */
  validSignals: number;
  /** 买入信号数 */
  buySignals: number;
  /** 卖出信号数 */
  sellSignals: number;
  /** 平均置信度 */
  averageConfidence: number;
  /** 成功率 */
  successRate: number;
  /** 今日信号数 */
  todaySignals: number;
  /** 按强度分组统计 */
  byStrength: Record<SignalStrength, number>;
  /** 按品种分组统计 */
  bySymbol: Record<string, number>;
  /** 推送统计 */
  notifications: {
    sent: number;
    failed: number;
    pending: number;
  };
}
/**
 * 信号配置接口
 */
export interface SignalConfig {
  /** 是否启用信号生成 */
  enabled: boolean;
  /** 信号过滤配置 */
  filter: SignalFilter;
  /** 推送配置 */
  notification: {
    enabled: boolean;
    channels: NotificationChannel[];
    quietHours?: {
      start: string; // HH:mm格式
      end: string;
    };
    maxDailyNotifications?: number;
  };
  /** 置信度配置 */
  confidence: {
    threshold: number; // 默认0.8
    sources: {
      technical: number;
      fundamental?: number;
      sentiment?: number;
      ml?: number;
    };
  };
  /** 风险控制 */
  riskControl: {
    maxRiskLevel: string;
    requireStopLoss: boolean;
    minRiskRewardRatio: number;
  };
}