/**
 * 信号生成器基类
 * 定义所有信号生成器的通用接口和基础功能
 */

import {
  TradingSignal,
  SignalConfig,
  MarketData,
  SignalStrength,
  OrderSide,
  IStrategy,
  StrategyError
} from '../../types';
import { createLogger, ErrorUtils, SimpleCache } from '../../utils';
const logger = createLogger('BASE_SIGNAL_GENERATOR');

/**
 * 信号生成器状态
 */
export enum GeneratorStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  ERROR = 'ERROR',
  DISABLED = 'DISABLED'
}

/**
 * 生成器统计信息
 */
export interface GeneratorStatistics {
  /** 总处理次数 */
  totalProcessed: number;
  /** 生成信号数 */
  signalsGenerated: number;
  /** 平均处理时间 */
  averageProcessingTime: number;
  /** 最后处理时间 */
  lastProcessedTime?: number;
  /** 错误次数 */
  errorCount: number;
  /** 成功率 */
  successRate: number;
}

/**
 * 信号生成器配置接口
 */
export interface SignalGeneratorConfig {
  /** 生成器名称 */
  name: string;
  /** 是否启用 */
  enabled: boolean;
  /** 最小置信度阈值 */
  minConfidence: number;
  /** 信号有效期（毫秒） */
  signalTTL: number;
  /** 冷却时间（毫秒） */
  cooldownPeriod: number;
  /** 最大并发信号数 */
  maxConcurrentSignals: number;
  /** 自定义参数 */
  parameters: Record<string, any>;
}

/**
 * 信号生成器状态
 */
export interface SignalGeneratorStatus {
  isEnabled: boolean;
  lastSignalTime: number;
  activeSignals: number;
  totalSignalsGenerated: number;
  successRate: number;
  avgConfidence: number;
}

/**
 * 信号生成器基类
 */
export abstract class BaseSignalGenerator {
  protected config: SignalGeneratorConfig;
  protected cache: SimpleCache<TradingSignal>;
  protected activeSignals = new Map<string, TradingSignal>();
  protected signalHistory: TradingSignal[] = [];
  protected lastSignalTime = 0;
  protected strategies = new Map<string, IStrategy>();
  protected status: GeneratorStatus = GeneratorStatus.IDLE;
  protected statistics: GeneratorStatistics = {
    totalProcessed: 0,
    signalsGenerated: 0,
    averageProcessingTime: 0,
    errorCount: 0,
    successRate: 0
  };
  protected isEnabled: boolean = true;

  constructor(config: SignalGeneratorConfig) {
    this.config = config;
    this.cache = new SimpleCache(config.signalTTL);
    this.isEnabled = config.enabled;
  }

  /**
   * 抽象方法：生成信号
   * 子类必须实现此方法
   */
  abstract generateSignal(marketData: MarketData): Promise<TradingSignal | null>;

  /**
   * 处理市场数据并生成信号
   * @param data 市场数据
   * @returns 过滤后的信号数组
   */
  async processMarketData(data: MarketData): Promise<TradingSignal[]> {
    try {
      // 检查生成器状态
      if (!this.isEnabled) {
        logger.debug('信号生成器已禁用');
        return [];
      }
      if (this.status === GeneratorStatus.PROCESSING) {
        logger.warn('信号生成器正在处理中，跳过重复请求');
        return [];
      }
      const startTime = Date.now();
      this.status = GeneratorStatus.PROCESSING;

      // 检查冷却时间
      if (!this.checkCooldown()) {
        this.status = GeneratorStatus.IDLE;
        return [];
      }
      // 生成原始信号
      const rawSignal = await this.generateSignal(data);
      // 过滤和处理信号
      const processedSignals = await this.processSignals(rawSignal ? [rawSignal] : []);

      // 更新状态
      this.updateStatus(processedSignals);
      this.updateProcessingTime(Date.now() - startTime);
      this.statistics.lastProcessedTime = Date.now();
      this.updateSuccessRate();

      this.status = GeneratorStatus.IDLE;

      return processedSignals;
    } catch (error) {
      this.statistics.errorCount++;
      this.status = GeneratorStatus.ERROR;
      logger.error('信号生成失败', error);

      // 错误恢复：重置状态
      setTimeout(() => {
        if (this.status === GeneratorStatus.ERROR) {
          this.status = GeneratorStatus.IDLE;
        }
      }, 5000);

      throw error;
    }
  }

  /**
   * 注册策略
   * @param strategy 策略实例
   */
  registerStrategy(strategy: IStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * 移除策略
   * @param strategyName 策略名称
   */
  removeStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
  }

  /**
   * 获取活跃信号
   * @param symbol 交易对符号（可选）
   * @returns 活跃信号数组
   */
  getActiveSignals(symbol?: string): TradingSignal[] {
    const signals = Array.from(this.activeSignals.values());
    if (symbol) {
      return signals.filter(s => s.symbol === symbol);
    }

    return signals;
  }

  /**
   * 取消信号
   * @param signalId 信号ID
   * @returns 是否成功取消
   */
  cancelSignal(signalId: string): boolean {
    if (this.activeSignals.has(signalId)) {
      this.activeSignals.delete(signalId);
      return true;
    }
    return false;
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  updateConfig(newConfig: Partial<SignalGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.isEnabled = this.config.enabled;
    this.onConfigUpdated();
  }

  /**
   * 配置更新钩子（子类可重写）
   */
  protected onConfigUpdated(): void {
    // 默认实现为空，子类可重写
  }

  /**
   * 获取生成器状态
   * @returns 状态信息
   */
  getStatus(): SignalGeneratorStatus {
    const signals = this.signalHistory;
    const totalSignals = signals.length;
    const avgConfidence = totalSignals > 0
      ? signals.reduce((sum, s) => sum + s.confidence.overall, 0) / totalSignals
      : 0;

    return {
      isEnabled: this.isEnabled,
      lastSignalTime: this.lastSignalTime,
      activeSignals: this.activeSignals.size,
      totalSignalsGenerated: totalSignals,
      successRate: this.calculateSuccessRate(),
      avgConfidence
    };
  }

  /**
   * 启用生成器
   */
  enable(): void {
    this.isEnabled = true;
    if (this.status === GeneratorStatus.DISABLED) {
      this.status = GeneratorStatus.IDLE;
    }
    logger.info('信号生成器已启用');
  }

  /**
   * 禁用生成器
   */
  disable(): void {
    this.isEnabled = false;
    this.status = GeneratorStatus.DISABLED;
    logger.info('信号生成器已禁用');
  }

  /**
   * 清理过期信号
   */
  cleanupExpiredSignals(): void {
    const now = Date.now();
    const expiredSignals: string[] = [];

    for (const [id, signal] of this.activeSignals) {
      if (now - signal.timestamp > this.config.signalTTL) {
        expiredSignals.push(id);
      }
    }

    expiredSignals.forEach(id => this.activeSignals.delete(id));
  }

  /**
   * 检查冷却时间
   * @returns 是否可以生成信号
   */
  protected checkCooldown(): boolean {
    const now = Date.now();
    return now - this.lastSignalTime >= this.config.cooldownPeriod;
  }

  /**
   * 处理信号
   * @param rawSignals 原始信号数组
   * @returns 处理后的信号数组
   */
  protected async processSignals(rawSignals: TradingSignal[]): Promise<TradingSignal[]> {
    const processedSignals: TradingSignal[] = [];

    for (const signal of rawSignals) {
      // 验证信号
      if (!this.validateSignal(signal)) {
        continue;
      }

      // 过滤重复信号
      if (this.isDuplicateSignal(signal)) {
        continue;
      }

      // 检查并发限制
      if (this.activeSignals.size >= this.config.maxConcurrentSignals) {
        break;
      }

      // 增强信号信息
      const enhancedSignal = await this.enhanceSignal(signal);

      // 添加到活跃信号
      this.activeSignals.set(enhancedSignal.id, enhancedSignal);

      processedSignals.push(enhancedSignal);
    }

    return processedSignals;
  }

  /**
   * 验证信号
   * @param signal 信号
   * @returns 是否有效
   */
  protected validateSignal(signal: TradingSignal): boolean {
    // 检查必要字段
    if (!signal.id || !signal.symbol || !signal.timestamp) {
      logger.warn('信号缺少必要字段');
      return false;
    }
    // 检查置信度
    if (signal.confidence.overall < this.config.minConfidence) {
      logger.warn('信号置信度低于阈值');
      return false;
    }
    // 检查价格
    if (!signal.priceSuggestion.entryPrice || signal.priceSuggestion.entryPrice <= 0) {
      logger.warn('入场价格必须大于0');
      return false;
    }
    // 检查交易方向
    if (!Object.values(OrderSide).includes(signal.side)) {
      logger.warn('无效的交易方向');
      return false;
    }

    return true;
  }

  /**
   * 检查重复信号
   * @param signal 信号
   * @returns 是否重复
   */
  protected isDuplicateSignal(signal: TradingSignal): boolean {
    // 检查最近5分钟内是否有相同的信号
    const recentTime = Date.now() - 5 * 60 * 1000; // 5分钟

    for (const activeSignal of this.activeSignals.values()) {
      if (activeSignal.symbol === signal.symbol &&
          activeSignal.side === signal.side &&
          activeSignal.timestamp > recentTime) {
        logger.warn('重复信号被过滤');
        return true;
      }
    }

    return false;
  }

  /**
   * 增强信号信息
   * @param signal 原始信号
   * @returns 增强后的信号
   */
  protected async enhanceSignal(signal: TradingSignal): Promise<TradingSignal> {
    // 添加生成器信息
    const enhancedSignal = {
      ...signal,
      metadata: {
        ...signal.metadata,
        generator: this.config.name,
        generatedAt: Date.now(),
        ttl: this.config.signalTTL
      }
    };

    // 计算止损止盈（如果没有设置）
    if (!enhancedSignal.priceSuggestion.stopLoss) {
      enhancedSignal.priceSuggestion.stopLoss = this.calculateStopLoss(signal);
    }
    if (!enhancedSignal.priceSuggestion.takeProfit) {
      enhancedSignal.priceSuggestion.takeProfit = this.calculateTakeProfit(signal);
    }

    return enhancedSignal;
  }

  /**
   * 计算止损价格
   * @param signal 信号
   * @returns 止损价格
   */
  protected calculateStopLoss(signal: TradingSignal): number {
    const stopLossPercent = 0.05; // 默认5%止损
    if (signal.side === OrderSide.BUY) {
      return signal.priceSuggestion.entryPrice * (1 - stopLossPercent);
    } else {
      return signal.priceSuggestion.entryPrice * (1 + stopLossPercent);
    }
  }

  /**
   * 计算止盈价格
   * @param signal 信号
   * @returns 止盈价格
   */
  protected calculateTakeProfit(signal: TradingSignal): number {
    const takeProfitPercent = 0.15; // 默认15%止盈
    if (signal.side === OrderSide.BUY) {
      return signal.priceSuggestion.entryPrice * (1 + takeProfitPercent);
    } else {
      return signal.priceSuggestion.entryPrice * (1 - takeProfitPercent);
    }
  }

  /**
   * 更新状态
   * @param signals 新生成的信号
   */
  protected updateStatus(signals: TradingSignal[]): void {
    if (signals.length > 0) {
      this.lastSignalTime = Date.now();
      this.signalHistory.push(...signals);

      // 限制历史记录大小
      if (this.signalHistory.length > 1000) {
        this.signalHistory = this.signalHistory.slice(-500);
      }
    }

    // 清理过期信号
    this.cleanupExpiredSignals();
  }

  /**
   * 计算成功率
   * @returns 成功率 (0-1)
   */
  protected calculateSuccessRate(): number {
    // 这里需要根据实际交易结果来计算
    // 暂时返回一个模拟值
    return 0.65;
  }

  /**
   * 创建信号
   * @param symbol 交易对符号
   * @param side 交易方向
   * @param price 价格
   * @param confidence 置信度
   * @param reason 原因
   * @param strength 信号强度
   * @returns 信号对象
   */
  protected createSignal(
    symbol: string,
    side: OrderSide,
    price: number,
    confidence: number,
    reason: string,
    strength: SignalStrength = SignalStrength.MODERATE
  ): TradingSignal {
    return {
      id: this.generateSignalId(),
      symbol,
      side,
      strength,
      confidence: {
        overall: Math.max(0, Math.min(1, confidence)),
        technical: 0,
        sources: [],
        threshold: 0.8,
        meetsThreshold: false
      },
      priceSuggestion: {
        entryPrice: price,
        stopLoss: 0,
        takeProfit: 0,
        validUntil: Date.now() + this.config.signalTTL,
        riskRewardRatio: 0
      },
      marketCondition: {
        trend: 'SIDEWAYS',
        trendStrength: 0,
        volatility: 'LOW',
        volume: 'LOW',
        phase: 'ACCUMULATION'
      },
      riskAssessment: {
        level: 'VERY_HIGH',
        score: 100,
        factors: [],
        maxPositionSize: 0,
        recommendations: []
      },
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.signalTTL,
      reason,
      analysis: '',
      shouldNotify: false,
      notificationChannels: [],
      priority: 'LOW'
    };
  }

  /**
   * 生成信号ID
   * @returns 唯一信号ID
   */
  protected generateSignalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${this.config.name}_${timestamp}_${random}`;
  }

  /**
   * 安全执行策略方法
   * @param strategyName 策略名称
   * @param method 方法名称
   * @param args 参数
   * @returns 执行结果
   */
  protected async safeExecuteStrategy<T>(
    strategyName: string,
    method: string,
    ...args: any[]
  ): Promise<T | null> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy || typeof (strategy as any)[method] !== 'function') {
      return null;
    }

    return ErrorUtils.safeExecute(
      async () => (strategy as any)[method](...args),
      null
    );
  }

  /**
   * 获取信号摘要
   * @returns 信号摘要信息
   */
  getSummary(): {
    name: string;
    status: SignalGeneratorStatus;
    activeSignals: number;
    recentSignals: TradingSignal[];
  } {
    const recentSignals = this.signalHistory
      .slice(-10) // 最近10个信号
      .sort((a, b) => b.timestamp - a.timestamp);

    return {
      name: this.config.name,
      status: this.getStatus(),
      activeSignals: this.activeSignals.size,
      recentSignals
    };
  }

  /**
   * 销毁生成器
   */
  destroy(): void {
    this.activeSignals.clear();
    this.strategies.clear();
    this.cache.clear();
    this.isEnabled = false;
    this.resetStatistics();
    logger.info('信号生成器已销毁');
  }

  /**
   * 更新处理时间统计
   */
  private updateProcessingTime(processingTime: number): void {
    const totalTime = this.statistics.averageProcessingTime * (this.statistics.totalProcessed - 1) + processingTime;
    this.statistics.averageProcessingTime = totalTime / this.statistics.totalProcessed;
  }

  /**
   * 更新成功率
   */
  private updateSuccessRate(): void {
    const successfulProcesses = this.statistics.totalProcessed - this.statistics.errorCount;
    this.statistics.successRate = successfulProcesses / this.statistics.totalProcessed;
  }

  /**
   * 获取运行时间（简化实现）
   */
  private getUptime(): number {
    // 简化实现，实际应该记录启动时间
    return this.statistics.lastProcessedTime ?
      Date.now() - (this.statistics.lastProcessedTime - this.statistics.averageProcessingTime) : 0;
  }

  /**
   * 日志记录辅助方法
   */
  protected logSignalGenerated(signal: TradingSignal): void {
    logger.info(`信号生成: ${signal.symbol} ${signal.type} 置信度=${(signal.confidence.overall * 100).toFixed(1)}%`);
  }

  /**
   * 日志记录辅助方法
   */
  protected logSignalFiltered(symbol: string, reason: string): void {
    logger.debug(`信号过滤: ${symbol} - ${reason}`);
  }

  /**
   * 创建错误信号（用于测试或调试）
   */
  protected createErrorSignal(symbol: string, error: string): TradingSignal {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'HOLD',
      symbol,
      side: 'BUY' as any,
      strength: 'VERY_WEAK',
      source: 'TECHNICAL_ANALYSIS',
      confidence: {
        overall: 0,
        technical: 0,
        sources: [],
        threshold: 0.8,
        meetsThreshold: false
      },
      priceSuggestion: {
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        validUntil: Date.now(),
        riskRewardRatio: 0
      },
      marketCondition: {
        trend: 'SIDEWAYS',
        trendStrength: 0,
        volatility: 'LOW',
        volume: 'LOW',
        phase: 'ACCUMULATION'
      },
      riskAssessment: {
        level: 'VERY_HIGH',
        score: 100,
        factors: [error],
        maxPositionSize: 0,
        recommendations: ['不建议交易']
      },
      timestamp: Date.now(),
      expiresAt: Date.now() + 1000,
      reason: error,
      analysis: `错误信号: ${error}`,
      shouldNotify: false,
      notificationChannels: [],
      priority: 'LOW'
    };
  }
}

/**
 * 复合信号生成器
 * 组合多个信号生成器的输出
 */
export class CompositeSignalGenerator extends BaseSignalGenerator {
  private generators: BaseSignalGenerator[] = [];

  constructor(config: SignalGeneratorConfig) {
    super(config);
  }

  /**
   * 添加子生成器
   * @param generator 信号生成器
   */
  addGenerator(generator: BaseSignalGenerator): void {
    this.generators.push(generator);
  }

  /**
   * 移除子生成器
   * @param generatorName 生成器名称
   */
  removeGenerator(generatorName: string): void {
    this.generators = this.generators.filter(g => g.config.name !== generatorName);
  }

  /**
   * 生成信号
   * @param data 市场数据
   * @returns 合并后的信号数组
   */
  async generateSignals(data: MarketData): Promise<TradingSignal[]> {
    const allSignals: TradingSignal[] = [];
    // 并行执行所有子生成器
    const signalPromises = this.generators.map(generator =>
      generator.processMarketData(data)
    );

    const signalArrays = await Promise.all(signalPromises);

    // 合并所有信号
    for (const signals of signalArrays) {
      allSignals.push(...signals);
    }

    // 去重和排序
    return this.deduplicateAndRankSignals(allSignals);
  }

  /**
   * 去重和排序信号
   * @param signals 信号数组
   * @returns 处理后的信号数组
   */
  private deduplicateAndRankSignals(signals: TradingSignal[]): TradingSignal[] {
    // 按符号和方向分组
    const signalGroups = new Map<string, TradingSignal[]>();
    for (const signal of signals) {
      const key = `${signal.symbol}_${signal.side}`;
      if (!signalGroups.has(key)) {
        signalGroups.set(key, []);
      }
      signalGroups.get(key)!.push(signal);
    }

    const finalSignals: TradingSignal[] = [];
    // 对每组信号选择最佳的
    for (const groupSignals of signalGroups.values()) {
      if (groupSignals.length === 1) {
        finalSignals.push(groupSignals[0]);
      } else {
        // 选择置信度最高的信号
        const bestSignal = groupSignals.reduce((best, current) =>
          current.confidence.overall > best.confidence.overall ? current : best
        );
        finalSignals.push(bestSignal);
      }
    }

    // 按置信度排序
    return finalSignals.sort((a, b) => b.confidence.overall - a.confidence.overall);
  }
}