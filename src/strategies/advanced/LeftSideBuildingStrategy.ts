/**
 * 左侧建仓策略
 * 在价格下跌过程中分批建仓，采用金字塔式加仓方式
 */

import { BaseStrategy } from '../base/BaseStrategy';
import { MarketData, OrderSide, SignalStrength, Signal } from '../../types';
import { MathUtils } from '../../utils';

// 创建简单的日志函数，避免导入问题
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || '')
};

/**
 * 左侧建仓策略配置
 */
export interface LeftSideBuildingConfig {
  /** 触发建仓的最小跌幅 */
  minDropPercent: number;
  /** 每次加仓的跌幅间隔 */
  addPositionDropInterval: number;
  /** 最大建仓次数 */
  maxBuildingTimes: number;
  /** 基础仓位大小 */
  basePositionSize: number;
  /** 加仓倍数 */
  positionMultiplier: number;
  /** 价格确认期数 */
  priceConfirmationPeriods: number;
  /** 止损线比例 */
  stopLossFromHigh: number;
  /** 分批减仓盈利阈值 */
  profitTakingThresholds: number[];
  /** 减仓比例 */
  reductionRatios: number[];
  /** 建仓间隔时间（毫秒） */
  buildPositionInterval: number;
  /** 置信度阈值 */
  confidenceThreshold?: number;
}

/**
 * 建仓记录
 */
interface BuildingRecord {
  level: number;
  price: number;
  quantity: number;
  timestamp: number;
  highPrice: number;
  dropPercent: number;
}

/**
 * 简化的持仓信息
 */
interface SimplePosition {
  isActive: boolean;
  avgPrice: number;
  totalQuantity: number;
}

/**
 * 左侧建仓策略类
 */
export class LeftSideBuildingStrategy extends BaseStrategy {
  private params: LeftSideBuildingConfig;
  private buildingRecords = new Map<string, BuildingRecord[]>();
  private highPrices = new Map<string, number>();
  private lastBuildTime = new Map<string, number>();
  private reductionFlags = new Map<string, Set<number>>();

  constructor(config: LeftSideBuildingConfig) {
    // 构建基础配置，不包含不兼容的字段
    const baseConfig = {
      name: 'LeftSideBuildingStrategy',
      description: '左侧建仓策略 - 在价格下跌过程中分批建仓',
      parameters: { ...config },
      riskManagement: {
        maxPositionSize: 0.3,
        stopLossPercent: config.stopLossFromHigh || 0.25,
        takeProfitPercent: 0.5,
        maxDailyLoss: 0.05,
        maxDrawdown: 0.15
      },
      tradingConfig: {
        minConfidence: config.confidenceThreshold || 0.8,
        maxConcurrentTrades: 3,
        tradingHours: {
          start: '00:00',
          end: '23:59'
        },
        allowedAssetTypes: ['CRYPTO']
      }
    };
    
    super(baseConfig);
    
    // 合并配置，避免重复属性
    this.params = {
      ...config, // 先使用传入的配置
      // 然后设置默认值（只在传入配置中没有时使用）
      minDropPercent: config.minDropPercent ?? 0.05,
      addPositionDropInterval: config.addPositionDropInterval ?? 0.03,
      maxBuildingTimes: config.maxBuildingTimes ?? 5,
      basePositionSize: config.basePositionSize ?? 1000,
      positionMultiplier: config.positionMultiplier ?? 1.5,
      priceConfirmationPeriods: config.priceConfirmationPeriods ?? 3,
      stopLossFromHigh: config.stopLossFromHigh ?? 0.25,
      profitTakingThresholds: config.profitTakingThresholds ?? [0.10, 0.20, 0.35],
      reductionRatios: config.reductionRatios ?? [0.3, 0.5, 1.0],
      buildPositionInterval: config.buildPositionInterval ?? 3600000, // 1小时
      confidenceThreshold: config.confidenceThreshold ?? 0.8
    };
  }

  /**
   * 生成信号
   */
  async generateSignal(data: MarketData): Promise<Signal | null> {
    if (!data.klines || data.klines.length < this.params.priceConfirmationPeriods + 20) {
      return null;
    }

    const symbol = data.klines[0].symbol;
    const currentPrice = data.klines[data.klines.length - 1].close;
    
    this.updateHighPrice(symbol, data);

    const buildSignal = await this.checkBuildingSignal(symbol, currentPrice, data);
    if (buildSignal) return buildSignal;

    const reductionSignal = await this.checkReductionSignal(symbol, currentPrice, data);
    if (reductionSignal) return reductionSignal;

    const stopLossSignal = await this.checkStopLossSignal(symbol, currentPrice, data);
    if (stopLossSignal) return stopLossSignal;

    return null;
  }

  /**
   * 更新最高价
   */
  private updateHighPrice(symbol: string, data: MarketData): void {
    if (!data.klines || data.klines.length === 0) return;

    const currentHigh = Math.max(...data.klines.slice(-20).map(k => k.high));
    const existingHigh = this.highPrices.get(symbol) || 0;
    
    if (currentHigh > existingHigh) {
      this.highPrices.set(symbol, currentHigh);
    }
  }

  /**
   * 确认价格趋势
   */
  private confirmPriceMovement(data: MarketData, direction: 'UP' | 'DOWN'): boolean {
    if (!data.klines || data.klines.length < this.params.priceConfirmationPeriods) {
      return false;
    }

    const recentPrices = data.klines
      .slice(-this.params.priceConfirmationPeriods)
      .map(k => k.close);

    let confirmCount = 0;
    for (let i = 1; i < recentPrices.length; i++) {
      if (direction === 'DOWN' && recentPrices[i] < recentPrices[i - 1]) {
        confirmCount++;
      } else if (direction === 'UP' && recentPrices[i] > recentPrices[i - 1]) {
        confirmCount++;
      }
    }

    return confirmCount >= Math.floor(this.params.priceConfirmationPeriods * 0.6);
  }

  /**
   * 计算建仓数量
   */
  private calculateBuildingQuantity(level: number): number {
    return this.params.basePositionSize * Math.pow(this.params.positionMultiplier, level - 1);
  }

  /**
   * 检查建仓信号
   */
  private async checkBuildingSignal(
    symbol: string, 
    currentPrice: number, 
    data: MarketData
  ): Promise<Signal | null> {
    const highPrice = this.highPrices.get(symbol);
    if (!highPrice) return null;

    const dropPercent = (highPrice - currentPrice) / highPrice;
    const buildingRecords = this.buildingRecords.get(symbol) || [];
    const lastBuildTime = this.lastBuildTime.get(symbol) || 0;
    const currentTime = Date.now();

    if (currentTime - lastBuildTime < this.params.buildPositionInterval) {
      return null;
    }

    let shouldBuild = false;
    let buildLevel = 0;

    if (buildingRecords.length === 0) {
      if (dropPercent >= this.params.minDropPercent) {
        shouldBuild = true;
        buildLevel = 1;
      }
    } else {
      const lastRecord = buildingRecords[buildingRecords.length - 1];
      const additionalDrop = dropPercent - lastRecord.dropPercent;
      
      if (additionalDrop >= this.params.addPositionDropInterval && 
          buildingRecords.length < this.params.maxBuildingTimes) {
        shouldBuild = true;
        buildLevel = buildingRecords.length + 1;
      }
    }

    if (!shouldBuild) return null;

    if (!this.confirmPriceMovement(data, 'DOWN')) {
      return null;
    }

    const quantity = this.calculateBuildingQuantity(buildLevel);
    
    const buildingRecord: BuildingRecord = {
      level: buildLevel,
      price: currentPrice,
      quantity,
      timestamp: currentTime,
      highPrice,
      dropPercent
    };

    if (!this.buildingRecords.has(symbol)) {
      this.buildingRecords.set(symbol, []);
    }
    this.buildingRecords.get(symbol)!.push(buildingRecord);
    this.lastBuildTime.set(symbol, currentTime);

    logger.info(`左侧建仓信号: ${symbol} 第${buildLevel}次建仓`, {
      price: currentPrice,
      dropPercent: (dropPercent * 100).toFixed(2) + '%',
      quantity,
      fromHigh: highPrice
    });

    return this.createSignal(
      symbol,
      OrderSide.BUY,
      currentPrice,
      quantity,
      0.8,
      `左侧建仓L${buildLevel}: 从高点${highPrice.toFixed(2)}下跌${(dropPercent * 100).toFixed(2)}%`,
      SignalStrength.STRONG
    );
  }

  /**
   * 检查减仓信号
   */
  private async checkReductionSignal(
    symbol: string, 
    currentPrice: number,
    data: MarketData
  ): Promise<Signal | null> {
    const position = await this.getPosition(symbol);
    if (!position || !position.isActive) return null;

    const profitPercent = (currentPrice - position.avgPrice) / position.avgPrice;
    const reductionFlags = this.reductionFlags.get(symbol) || new Set<number>();

    for (let i = 0; i < this.params.profitTakingThresholds.length; i++) {
      const threshold = this.params.profitTakingThresholds[i];
      const reductionRatio = this.params.reductionRatios[i];
      
      if (profitPercent >= threshold && !reductionFlags.has(i)) {
        const reductionQuantity = position.totalQuantity * reductionRatio;
        // 标记该级别已减仓
        reductionFlags.add(i);
        this.reductionFlags.set(symbol, reductionFlags);
        
        logger.info(`分批减仓信号: ${symbol} 第${i + 1}次减仓`, {
          profitPercent: (profitPercent * 100).toFixed(2) + '%',
          reductionRatio: (reductionRatio * 100).toFixed(0) + '%',
          quantity: reductionQuantity
        });

        return this.createSignal(
          symbol,
          OrderSide.SELL,
          currentPrice,
          reductionQuantity,
          0.85,
          `分批减仓T${i + 1}: 盈利${(profitPercent * 100).toFixed(2)}%，减仓${(reductionRatio * 100).toFixed(0)}%`,
          SignalStrength.MODERATE
        );
      }
    }

    return null;
  }

  /**
   * 检查止损信号
   */
  private async checkStopLossSignal(
    symbol: string, 
    currentPrice: number, 
    data: MarketData
  ): Promise<Signal | null> {
    const position = await this.getPosition(symbol);
    if (!position || !position.isActive) return null;

    const highPrice = this.highPrices.get(symbol);
    if (!highPrice) return null;

    const dropFromHigh = (highPrice - currentPrice) / highPrice;
    if (dropFromHigh >= this.params.stopLossFromHigh) {
      logger.warn(`止损信号: ${symbol} 从高点跌幅${(dropFromHigh * 100).toFixed(2)}%`, {
        highPrice,
        currentPrice,
        avgCost: position.avgPrice
      });

      return this.createSignal(
        symbol,
        OrderSide.SELL,
        currentPrice,
        position.totalQuantity,
        0.9,
        `止损出场: 从高点${highPrice.toFixed(2)}跌幅${(dropFromHigh * 100).toFixed(2)}%`,
        SignalStrength.VERY_STRONG
      );
    }

    return null;
  }

  /**
   * 创建信号的辅助方法
   */
  private createSignal(
    symbol: string,
    side: OrderSide,
    price: number,
    quantity: number,
    confidence: number,
    reasoning: string,
    strength: SignalStrength
  ): Signal {
    return {
      id: `${symbol}_${Date.now()}`,
      symbol,
      side,
      price,
      quantity,
      timestamp: Date.now(),
      confidence, // 使用简单的数字类型
      strength,
      reason: reasoning,
      strategy: this.name,
      metadata: {
        strategyVersion: '1.0.0',
        buildLevel: this.buildingRecords.get(symbol)?.length || 0
      }
    };
  }

  /**
   * 获取持仓信息的模拟方法
   */
  private async getPosition(symbol: string): Promise<SimplePosition | null> {
    // 这里应该从实际的持仓管理系统获取数据
    // 暂时返回模拟数据
    const buildingRecords = this.buildingRecords.get(symbol);
    if (!buildingRecords || buildingRecords.length === 0) {
      return null;
    }
    const totalCost = buildingRecords.reduce((sum, record) => sum + record.price * record.quantity, 0);
    const totalQuantity = buildingRecords.reduce((sum, record) => sum + record.quantity, 0);
    const avgPrice = totalCost / totalQuantity;

    return {
      isActive: true,
      avgPrice,
      totalQuantity
    };
  }

  /**
   * 重置策略状态
   */
  reset(): void {
    super.reset();
    this.buildingRecords.clear();
    this.highPrices.clear();
    this.lastBuildTime.clear();
    this.reductionFlags.clear();
  }

  /**
   * 获取策略参数
   */
  getParameters(): Record<string, any> {
    return { ...this.params };
  }

  /**
   * 更新策略参数
   */
  updateParameters(params: Partial<LeftSideBuildingConfig>): void {
    this.params = { ...this.params, ...params };
  }

  /**
   * 获取策略状态
   */
  getStatus(): string {
    return `左侧建仓策略 - 监控${this.buildingRecords.size}个品种`;
  }
}