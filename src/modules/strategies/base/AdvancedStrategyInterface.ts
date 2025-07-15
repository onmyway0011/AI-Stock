/**
 * 高级策略接口
 * 支持仓位管理、分批交易、机器学习优化等高级功能
 */

import { Signal, MarketData, OrderSide } from '../../types';

/**
 * 仓位信息接口
 */
export interface Position {
  /** 仓位ID */
  id: string;
  /** 交易对符号 */
  symbol: string;
  /** 方向 */
  side: OrderSide;
  /** 总数量 */
  totalQuantity: number;
  /** 已成交数量 */
  filledQuantity: number;
  /** 平均成本价 */
  avgPrice: number;
  /** 当前价值 */
  currentValue: number;
  /** 未实现盈亏 */
  unrealizedPnL: number;
  /** 开仓时间 */
  openTime: number;
  /** 分批记录 */
  batches: PositionBatch[];
  /** 是否激活 */
  isActive: boolean;
}

/**
 * 仓位批次信息
 */
export interface PositionBatch {
  /** 批次ID */
  id: string;
  /** 数量 */
  quantity: number;
  /** 价格 */
  price: number;
  /** 时间戳 */
  timestamp: number;
  /** 批次类型 */
  type: 'OPEN' | 'ADD' | 'REDUCE' | 'CLOSE';
  /** 信号ID */
  signalId?: string;
}

/**
 * 分批交易配置
 */
export interface BatchTradingConfig {
  /** 最大批次数 */
  maxBatches: number;
  /** 初始仓位比例 */
  initialPositionRatio: number;
  /** 加仓间隔比例 */
  addPositionInterval: number;
  /** 减仓间隔比例 */
  reducePositionInterval: number;
  /** 最小批次大小 */
  minBatchSize: number;
  /** 是否启用分批建仓 */
  enableBatchOpening: boolean;
  /** 是否启用分批减仓 */
  enableBatchClosing: boolean;
}

/**
 * 左侧建仓配置
 */
export interface LeftSideTradingConfig {
  /** 左侧建仓启用 */
  enabled: boolean;
  /** 价格下跌阈值 */
  priceDropThreshold: number;
  /** 最大建仓次数 */
  maxBuildPositions: number;
  /** 建仓间隔时间（毫秒） */
  buildPositionInterval: number;
  /** 建仓数量递增比例 */
  quantityIncreaseRatio: number;
  /** 价格确认周期 */
  priceConfirmationPeriod: number;
}

/**
 * 机器学习配置
 */
export interface MLConfig {
  /** 是否启用ML优化 */
  enabled: boolean;
  /** 模型类型 */
  modelType: 'LSTM' | 'RandomForest' | 'XGBoost' | 'LinearRegression';
  /** 特征窗口大小 */
  featureWindowSize: number;
  /** 预测窗口大小 */
  predictionWindowSize: number;
  /** 模型重训练间隔（小时） */
  retrainInterval: number;
  /** 最小训练样本数 */
  minTrainSamples: number;
  /** 模型置信度阈值 */
  confidenceThreshold: number;
  /** 特征列表 */
  features: string[];
}

/**
 * 动态参数调整配置
 */
export interface DynamicParameterConfig {
  /** 是否启用动态调整 */
  enabled: boolean;
  /** 调整频率（小时） */
  adjustmentFrequency: number;
  /** 性能评估周期（天） */
  evaluationPeriod: number;
  /** 参数调整幅度 */
  adjustmentMagnitude: number;
  /** 最小性能阈值 */
  minPerformanceThreshold: number;
  /** 可调整的参数列表 */
  adjustableParameters: string[];
}

/**
 * 策略信号类型枚举
 */
export enum AdvancedSignalType {
  OPEN_POSITION = 'OPEN_POSITION',           // 开仓
  ADD_POSITION = 'ADD_POSITION',             // 加仓
  REDUCE_POSITION = 'REDUCE_POSITION',       // 减仓
  CLOSE_POSITION = 'CLOSE_POSITION',         // 平仓
  LEFT_SIDE_BUILD = 'LEFT_SIDE_BUILD',       // 左侧建仓
  BATCH_REDUCE = 'BATCH_REDUCE',             // 分批减仓
  ML_OPTIMIZED = 'ML_OPTIMIZED'              // ML优化信号
}

/**
 * 高级交易信号
 */
export interface AdvancedSignal extends Signal {
  /** 信号类型 */
  signalType: AdvancedSignalType;
  /** 目标仓位比例 */
  targetPositionRatio?: number;
  /** 批次信息 */
  batchInfo?: {
    batchNumber: number;
    totalBatches: number;
    batchRatio: number;
  };
  /** ML预测信息 */
  mlPrediction?: {
    predictedPrice: number;
    priceDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
    confidence: number;
    modelUsed: string;
  };
  /** 仓位管理信息 */
  positionManagement?: {
    currentPositionRatio: number;
    targetPositionRatio: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

/**
 * 高级策略接口
 */
export interface IAdvancedStrategy {
  /** 策略名称 */
  name: string;
  
  /** 获取当前持仓 */
  getCurrentPositions(): Promise<Position[]>;
  
  /** 获取指定符号的持仓 */
  getPosition(symbol: string): Promise<Position | null>;
  
  /** 创建新仓位 */
  createPosition(signal: AdvancedSignal): Promise<Position>;
  
  /** 更新仓位 */
  updatePosition(positionId: string, batch: PositionBatch): Promise<Position>;
  
  /** 关闭仓位 */
  closePosition(positionId: string, reason: string): Promise<void>;
  
  /** 左侧建仓检查 */
  checkLeftSideEntry(data: MarketData): Promise<AdvancedSignal | null>;
  
  /** 分批减仓检查 */
  checkBatchExit(data: MarketData, position: Position): Promise<AdvancedSignal | null>;
  
  /** ML模型预测 */
  predictWithML(data: MarketData): Promise<{
    predictedPrice: number;
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    confidence: number;
  } | null>;
  
  /** 动态调整参数 */
  adjustParametersDynamically(): Promise<void>;
  
  /** 生成高级信号 */
  generateAdvancedSignal(data: MarketData): Promise<AdvancedSignal | null>;
  
  /** 风险评估 */
  assessRisk(signal: AdvancedSignal): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskFactors: string[];
    recommendation: 'PROCEED' | 'CAUTION' | 'REJECT';
  }>;
  
  /** 计算最优仓位大小 */
  calculateOptimalPositionSize(signal: AdvancedSignal, availableCapital: number): Promise<number>;
  
  /** 获取策略性能分析 */
  getPerformanceAnalysis(): Promise<{
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgHoldingPeriod: number;
    mlAccuracy?: number;
  }>;
}

/**
 * 市场状态分析结果
 */
export interface MarketStateAnalysis {
  /** 趋势方向 */
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  /** 趋势强度 */
  trendStrength: number;
  /** 波动率 */
  volatility: number;
  /** 支撑位 */
  supportLevels: number[];
  /** 阻力位 */
  resistanceLevels: number[];
  /** 市场情绪 */
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  /** 流动性评分 */
  liquidityScore: number;
}

/**
 * 交易决策上下文
 */
export interface TradingDecisionContext {
  /** 市场数据 */
  marketData: MarketData;
  /** 当前持仓 */
  currentPositions: Position[];
  /** 可用资金 */
  availableCapital: number;
  /** 市场状态分析 */
  marketAnalysis: MarketStateAnalysis;
  /** 风险评估 */
  riskAssessment: {
    portfolioRisk: number;
    marketRisk: number;
    liquidityRisk: number;
  };
  /** ML预测结果 */
  mlPredictions?: {
    priceTargets: number[];
    confidence: number;
    timeHorizon: number;
  };
}

/**
 * 策略优化结果
 */
export interface StrategyOptimizationResult {
  /** 优化类型 */
  optimizationType: 'PARAMETER_TUNING' | 'ML_TRAINING' | 'RISK_ADJUSTMENT';
  /** 优化前性能 */
  beforePerformance: {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  /** 优化后性能 */
  afterPerformance: {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  /** 调整的参数 */
  adjustedParameters: Record<string, any>;
  /** 优化时间 */
  optimizationTime: number;
  /** 是否应用优化 */
  shouldApply: boolean;
  /** 优化建议 */
  recommendations: string[];
}