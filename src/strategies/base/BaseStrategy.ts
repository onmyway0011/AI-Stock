/**
 * 策略基类
 * 定义所有交易策略的通用接口和基础功能
 */

import { 
  IStrategy, 
  StrategyConfig, 
  StrategyStatus, 
  MarketData, 
  Signal, 
  OrderSide, 
  SignalStrength,
  StrategyError,
  RiskManagementConfig,
  TradingConfig
} from '../../types';
import { MathUtils, DateUtils, ValidationUtils } from '../../utils';

/**
 * 策略状态枚举
 */
export enum StrategyState {
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

/**
 * 策略执行上下文
 */
export interface StrategyContext {
  /** 当前资金 */
  currentCapital: number;
  /** 当前仓位 */
  currentPosition: number;
  /** 历史信号 */
  signalHistory: Signal[];
  /** 市场状态 */
  marketState: 'BULL' | 'BEAR' | 'SIDEWAYS' | 'UNKNOWN';
  /** 最后更新时间 */
  lastUpdateTime: number;
}

/**
 * 策略性能指标
 */
export interface StrategyPerformance {
  /** 总信号数 */
  totalSignals: number;
  /** 成功信号数 */
  successfulSignals: number;
  /** 准确率 */
  accuracy: number;
  /** 平均信号置信度 */
  avgConfidence: number;
  /** 最后30天信号数 */
  signals30d: number;
  /** 信号胜率 */
  winRate: number;
}

/**
 * 策略基类
 * 提供通用的策略功能和生命周期管理
 */
export abstract class BaseStrategy implements IStrategy {
  public readonly name: string;
  public config: StrategyConfig;
  
  protected state: StrategyState = StrategyState.INITIALIZING;
  protected context: StrategyContext;
  protected performance: StrategyPerformance;
  protected indicators: Map<string, number[]> = new Map();
  protected lastSignalTime = 0;
  private initPromise: Promise<void> | null = null;

  constructor(name: string, config: StrategyConfig) {
    this.name = name;
    this.config = config;
    
    // 初始化上下文
    this.context = {
      currentCapital: 0,
      currentPosition: 0,
      signalHistory: [],
      marketState: 'UNKNOWN',
      lastUpdateTime: Date.now()
    };

    // 初始化性能指标
    this.performance = {
      totalSignals: 0,
      successfulSignals: 0,
      accuracy: 0,
      avgConfidence: 0,
      signals30d: 0,
      winRate: 0
    };
  }

  /**
   * 初始化策略
   * 只能被调用一次，后续调用将返回相同的Promise
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  /**
   * 执行策略初始化
   */
  private async doInitialize(): Promise<void> {
    try {
      this.state = StrategyState.INITIALIZING;
      
      // 验证配置
      this.validateConfig();
      
      // 执行子类初始化
      await this.onInitialize();
      
      this.state = StrategyState.RUNNING;
      console.log(`策略 ${this.name} 初始化完成`);
    } catch (error) {
      this.state = StrategyState.ERROR;
      throw new StrategyError(`策略初始化失败: ${error.message}`, error);
    }
  }

  /**
   * 子类初始化钩子（子类可重写）
   */
  protected async onInitialize(): Promise<void> {
    // 默认实现为空，子类可重写
  }

  /**
   * 抽象方法：生成交易信号
   * 子类必须实现此方法
   */
  abstract generateSignal(data: MarketData): Promise<Signal | null>;

  /**
   * 更新策略参数
   * @param parameters 新参数
   */
  updateParameters(parameters: Record<string, any>): void {
    try {
      // 合并参数
      this.config.parameters = { ...this.config.parameters, ...parameters };
      
      // 验证新配置
      this.validateConfig();
      
      // 通知子类参数已更新
      this.onParametersUpdated(parameters);
      
      console.log(`策略 ${this.name} 参数已更新`);
    } catch (error) {
      throw new StrategyError(`更新策略参数失败: ${error.message}`, error);
    }
  }

  /**
   * 参数更新钩子（子类可重写）
   * @param parameters 更新的参数
   */
  protected onParametersUpdated(parameters: Record<string, any>): void {
    // 默认实现为空，子类可重写
  }

  /**
   * 获取策略状态
   */
  getStatus(): StrategyStatus {
    return {
      isRunning: this.state === StrategyState.RUNNING,
      lastUpdate: this.context.lastUpdateTime,
      performance: this.performance
    };
  }

  /**
   * 暂停策略
   */
  pause(): void {
    if (this.state === StrategyState.RUNNING) {
      this.state = StrategyState.PAUSED;
      console.log(`策略 ${this.name} 已暂停`);
    }
  }

  /**
   * 恢复策略
   */
  resume(): void {
    if (this.state === StrategyState.PAUSED) {
      this.state = StrategyState.RUNNING;
      console.log(`策略 ${this.name} 已恢复`);
    }
  }

  /**
   * 停止策略
   */
  stop(): void {
    this.state = StrategyState.STOPPED;
    this.onStop();
    console.log(`策略 ${this.name} 已停止`);
  }

  /**
   * 停止钩子（子类可重写）
   */
  protected onStop(): void {
    // 默认实现为空，子类可重写
  }

  /**
   * 处理市场数据并生成信号
   * @param data 市场数据
   * @returns 生成的信号或null
   */
  async processMarketData(data: MarketData): Promise<Signal | null> {
    try {
      // 检查策略状态
      if (this.state !== StrategyState.RUNNING) {
        return null;
      }

      // 验证数据
      if (!this.validateMarketData(data)) {
        return null;
      }

      // 更新上下文
      this.updateContext(data);

      // 生成信号
      const signal = await this.generateSignal(data);

      // 处理生成的信号
      if (signal) {
        const processedSignal = await this.processSignal(signal);
        if (processedSignal) {
          this.recordSignal(processedSignal);
          return processedSignal;
        }
      }

      return null;
    } catch (error) {
      console.error(`策略 ${this.name} 处理市场数据失败:`, error);
      return null;
    }
  }

  /**
   * 验证市场数据
   * @param data 市场数据
   * @returns 是否有效
   */
  protected validateMarketData(data: MarketData): boolean {
    if (!data.klines || data.klines.length === 0) {
      return false;
    }

    // 验证K线数据
    const validation = ValidationUtils.validateKlines(data.klines);
    return validation.isValid;
  }

  /**
   * 更新策略上下文
   * @param data 市场数据
   */
  protected updateContext(data: MarketData): void {
    this.context.lastUpdateTime = Date.now();
    
    // 更新市场状态（简单实现）
    if (data.klines.length >= 20) {
      const recentPrices = data.klines.slice(-20).map(k => k.close);
      const ma5 = MathUtils.sma(recentPrices.slice(-5), 5)[0];
      const ma20 = MathUtils.sma(recentPrices, 20)[0];
      
      if (ma5 > ma20 * 1.02) {
        this.context.marketState = 'BULL';
      } else if (ma5 < ma20 * 0.98) {
        this.context.marketState = 'BEAR';
      } else {
        this.context.marketState = 'SIDEWAYS';
      }
    }
  }

  /**
   * 处理生成的信号
   * @param signal 原始信号
   * @returns 处理后的信号或null
   */
  protected async processSignal(signal: Signal): Promise<Signal | null> {
    // 检查信号频率限制
    if (!this.checkSignalFrequency()) {
      return null;
    }

    // 检查信号置信度
    if (signal.confidence < this.config.tradingConfig.minConfidence) {
      return null;
    }

    // 风险管理检查
    if (!this.checkRiskManagement(signal)) {
      return null;
    }

    // 更新信号时间戳
    this.lastSignalTime = Date.now();

    return signal;
  }

  /**
   * 检查信号频率
   * @returns 是否允许生成信号
   */
  protected checkSignalFrequency(): boolean {
    const now = Date.now();
    const timeSinceLastSignal = now - this.lastSignalTime;
    const minInterval = 60000; // 最小间隔1分钟

    return timeSinceLastSignal >= minInterval;
  }

  /**
   * 风险管理检查
   * @param signal 信号
   * @returns 是否通过风险检查
   */
  protected checkRiskManagement(signal: Signal): boolean {
    const riskConfig = this.config.riskManagement;
    
    // 检查最大仓位
    if (Math.abs(this.context.currentPosition) >= riskConfig.maxPositionSize) {
      return false;
    }

    // 检查日交易次数限制
    const today = new Date();
    const todaySignals = this.context.signalHistory.filter(s => {
      const signalDate = new Date(s.timestamp);
      return signalDate.toDateString() === today.toDateString();
    });

    if (todaySignals.length >= this.config.tradingConfig.maxConcurrentTrades) {
      return false;
    }

    return true;
  }

  /**
   * 记录信号
   * @param signal 信号
   */
  protected recordSignal(signal: Signal): void {
    this.context.signalHistory.push(signal);
    this.performance.totalSignals++;

    // 限制历史记录数量
    if (this.context.signalHistory.length > 1000) {
      this.context.signalHistory = this.context.signalHistory.slice(-500);
    }

    // 更新性能指标
    this.updatePerformanceMetrics();
  }

  /**
   * 更新性能指标
   */
  protected updatePerformanceMetrics(): void {
    const signals = this.context.signalHistory;
    
    if (signals.length > 0) {
      // 计算平均置信度
      const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
      this.performance.avgConfidence = totalConfidence / signals.length;

      // 计算最近30天信号数
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      this.performance.signals30d = signals.filter(s => s.timestamp > thirtyDaysAgo).length;
    }
  }

  /**
   * 计算技术指标
   * @param data 市场数据
   */
  protected calculateIndicators(data: MarketData): void {
    const prices = data.klines.map(k => k.close);
    const volumes = data.klines.map(k => k.volume);

    // 计算移动平均线
    if (prices.length >= 5) {
      this.indicators.set('ma5', MathUtils.sma(prices, 5));
    }
    if (prices.length >= 20) {
      this.indicators.set('ma20', MathUtils.sma(prices, 20));
    }
    if (prices.length >= 50) {
      this.indicators.set('ma50', MathUtils.sma(prices, 50));
    }

    // 计算EMA
    if (prices.length >= 12) {
      this.indicators.set('ema12', MathUtils.ema(prices, 12));
    }
    if (prices.length >= 26) {
      this.indicators.set('ema26', MathUtils.ema(prices, 26));
    }
  }

  /**
   * 获取指标值
   * @param name 指标名称
   * @param index 索引（默认为最新值）
   * @returns 指标值
   */
  protected getIndicator(name: string, index: number = -1): number | undefined {
    const values = this.indicators.get(name);
    if (!values || values.length === 0) return undefined;

    const actualIndex = index < 0 ? values.length + index : index;
    return values[actualIndex];
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
  ): Signal {
    return {
      id: this.generateSignalId(),
      symbol,
      timestamp: Date.now(),
      side,
      strength,
      confidence: Math.max(0, Math.min(1, confidence)),
      price,
      reason,
      strategy: this.name,
      stopLoss: this.calculateStopLoss(side, price),
      takeProfit: this.calculateTakeProfit(side, price)
    };
  }

  /**
   * 生成信号ID
   * @returns 唯一信号ID
   */
  private generateSignalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${this.name}_${timestamp}_${random}`;
  }

  /**
   * 计算止损价格
   * @param side 交易方向
   * @param price 入场价格
   * @returns 止损价格
   */
  protected calculateStopLoss(side: OrderSide, price: number): number {
    const stopLossPercent = this.config.riskManagement.stopLossPercent;
    
    if (side === OrderSide.BUY) {
      return price * (1 - stopLossPercent);
    } else {
      return price * (1 + stopLossPercent);
    }
  }

  /**
   * 计算止盈价格
   * @param side 交易方向
   * @param price 入场价格
   * @returns 止盈价格
   */
  protected calculateTakeProfit(side: OrderSide, price: number): number {
    const takeProfitPercent = this.config.riskManagement.takeProfitPercent;
    
    if (side === OrderSide.BUY) {
      return price * (1 + takeProfitPercent);
    } else {
      return price * (1 - takeProfitPercent);
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.name) {
      throw new StrategyError('策略名称不能为空');
    }

    if (!this.config.riskManagement) {
      throw new StrategyError('风险管理配置不能为空');
    }

    if (!this.config.tradingConfig) {
      throw new StrategyError('交易配置不能为空');
    }

    // 验证风险管理参数
    const risk = this.config.riskManagement;
    if (risk.maxPositionSize <= 0 || risk.maxPositionSize > 1) {
      throw new StrategyError('最大仓位比例必须在0-1之间');
    }

    if (risk.stopLossPercent <= 0 || risk.stopLossPercent > 0.5) {
      throw new StrategyError('止损比例必须在0-50%之间');
    }

    // 验证交易配置
    const trading = this.config.tradingConfig;
    if (trading.minConfidence < 0 || trading.minConfidence > 1) {
      throw new StrategyError('最小信号置信度必须在0-1之间');
    }
  }

  /**
   * 获取策略摘要信息
   */
  getSummary(): {
    name: string;
    state: StrategyState;
    performance: StrategyPerformance;
    context: StrategyContext;
  } {
    return {
      name: this.name,
      state: this.state,
      performance: this.performance,
      context: this.context
    };
  }
}