/**
 * 左侧建仓策略
 * 在价格下跌过程中分批建仓，采用金字塔式加仓方式
 */
import { BaseStrategy } from '../base/BaseStrategy';
import { AdvancedSignal, AdvancedSignalType, Position } from '../base/AdvancedStrategyInterface';
import { MarketData, OrderSide, SignalStrength } from '../../types';
import { MathUtils, createLogger } from '../../utils';

const logger = createLogger('LEFT_SIDE_STRATEGY');

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
 * 左侧建仓策略类
 */
export class LeftSideBuildingStrategy extends BaseStrategy {
  private params: LeftSideBuildingConfig;
  private buildingRecords = new Map<string, BuildingRecord[]>();
  private highPrices = new Map<string, number>();
  private lastBuildTime = new Map<string, number>();
  private reductionFlags = new Map<string, Set<number>>();

  constructor(config: LeftSideBuildingConfig) {
    super('LeftSideBuildingStrategy', {
      ...config,
      confidenceThreshold: config.confidenceThreshold || 0.8
    });
    
    this.params = {
      minDropPercent: 0.05,
      addPositionDropInterval: 0.03,
      maxBuildingTimes: 5,
      basePositionSize: 1000,
      positionMultiplier: 1.5,
      priceConfirmationPeriods: 3,
      stopLossFromHigh: 0.25,
      profitTakingThresholds: [0.10, 0.20, 0.35],
      reductionRatios: [0.3, 0.5, 1.0],
      buildPositionInterval: 3600000, // 1小时
      ...config
    };
  }

  /**
   * 生成信号
   */
  async generateSignal(data: MarketData): Promise<AdvancedSignal | null> {
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
      
      // 重置建仓记录（新高点，重新开始监控）
      this.buildingRecords.delete(symbol);
      this.reductionFlags.delete(symbol);
      
      logger.info(`更新高点价格: ${symbol} ${currentHigh}`);
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
    return Math.floor(this.params.basePositionSize * Math.pow(this.params.positionMultiplier, level - 1));
  }

  /**
   * 检查建仓信号
   */
  private async checkBuildingSignal(
    symbol: string, 
    currentPrice: number, 
    data: MarketData
  ): Promise<AdvancedSignal | null> {
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

    return this.createAdvancedSignal(
      symbol,
      OrderSide.BUY,
      currentPrice,
      quantity,
      0.8,
      `左侧建仓L${buildLevel}: 从高点${highPrice.toFixed(2)}下跌${(dropPercent * 100).toFixed(2)}%`,
      AdvancedSignalType.LEFT_SIDE_BUILD,
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
  ): Promise<AdvancedSignal | null> {
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

        const signal = this.createAdvancedSignal(
          symbol,
          OrderSide.SELL,
          currentPrice,
          reductionQuantity,
          0.85,
          `分批减仓T${i + 1}: 盈利${(profitPercent * 100).toFixed(2)}%，减仓${(reductionRatio * 100).toFixed(0)}%`,
          AdvancedSignalType.BATCH_REDUCE,
          SignalStrength.MODERATE
        );
        signal.batchInfo = {
          batchNumber: i + 1,
          totalBatches: this.params.profitTakingThresholds.length,
          batchRatio: reductionRatio
        };

        return signal;
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
  ): Promise<AdvancedSignal | null> {
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

      return this.createAdvancedSignal(
        symbol,
        OrderSide.SELL,
        currentPrice,
        position.totalQuantity,
        0.9,
        `止损出场: 从高点${highPrice.toFixed(2)}跌幅${(dropFromHigh * 100).toFixed(2)}%`,
        AdvancedSignalType.CLOSE_POSITION,
        SignalStrength.VERY_STRONG
      );
    }

    return null;
  }

  /**
   * 创建高级信号的辅助方法
   */
  private createAdvancedSignal(
    symbol: string,
    side: OrderSide,
    price: number,
    quantity: number,
    confidence: number,
    reasoning: string,
    type: AdvancedSignalType,
    strength: SignalStrength
  ): AdvancedSignal {
    return {
      id: `${symbol}_${Date.now()}`,
      symbol,
      side,
      price,
      quantity,
      timestamp: Date.now(),
      confidence: {
        overall: confidence,
        technical: confidence,
        volume: 0.7,
        momentum: 0.8
      },
      strength,
      reasoning,
      type,
      metadata: {
        strategy: this.name,
        strategyVersion: '1.0.0'
      }
    };
  }

  /**
   * 获取持仓信息的模拟方法
   */
  private async getPosition(symbol: string): Promise<{
    isActive: boolean;
    avgPrice: number;
    totalQuantity: number;
  } | null> {
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
   * 获取当前持仓
   */
  private async getCurrentPositions(): Promise<Position[]> {
    // 这里应该从实际的持仓管理系统获取数据
    // 暂时返回模拟数据
    const symbols = Array.from(this.buildingRecords.keys());
    const positions: Position[] = [];

    for (const symbol of symbols) {
      const position = await this.getPosition(symbol);
      if (position) {
        positions.push({
          symbol,
          avgPrice: position.avgPrice,
          totalQuantity: position.totalQuantity,
          isActive: position.isActive
        });
      }
    }

    return positions;
  }

  /**
   * 重置策略状态
   */
  async resetStrategy(symbol?: string): Promise<void> {
    if (symbol) {
      this.buildingRecords.delete(symbol);
      this.highPrices.delete(symbol);
      this.lastBuildTime.delete(symbol);
      this.reductionFlags.delete(symbol);
      logger.info(`重置策略状态: ${symbol}`);
    } else {
      this.buildingRecords.clear();
      this.highPrices.clear();
      this.lastBuildTime.clear();
      this.reductionFlags.clear();
      logger.info('重置所有策略状态');
    }
  }

  /**
   * 获取策略描述
   */
  getDescription(): string {
    return `左侧建仓策略 - 在下跌过程中分批建仓
参数配置:
- 最小触发跌幅: ${(this.params.minDropPercent * 100).toFixed(1)}%
- 加仓间隔: ${(this.params.addPositionDropInterval * 100).toFixed(1)}%
- 最大建仓次数: ${this.params.maxBuildingTimes}次
- 基础仓位: ${this.params.basePositionSize}
- 加仓倍数: ${this.params.positionMultiplier}
- 止损线: 从高点跌${(this.params.stopLossFromHigh * 100).toFixed(1)}%
- 减仓阈值: ${this.params.profitTakingThresholds.map(t => (t * 100).toFixed(0) + '%').join(', ')}`;
  }

  /**
   * 获取当前状态
   */
  async getCurrentState(): Promise<{
    activeSymbols: string[];
    buildingProgress: Record<string, {
      highPrice: number;
      currentDrop: number;
      buildingLevel: number;
      totalInvestment: number;
    }>;
    positions: Position[];
  }> {
    const activeSymbols = Array.from(this.buildingRecords.keys());
    const buildingProgress: Record<string, any> = {};
    
    for (const symbol of activeSymbols) {
      const records = this.buildingRecords.get(symbol) || [];
      const highPrice = this.highPrices.get(symbol) || 0;
      const totalInvestment = records.reduce((sum, r) => sum + r.price * r.quantity, 0);
      const currentPrice = records[records.length - 1]?.price || highPrice;
      const currentDrop = (highPrice - currentPrice) / highPrice;

      buildingProgress[symbol] = {
        highPrice,
        currentDrop: currentDrop,
        buildingLevel: records.length,
        totalInvestment
      };
    }

    const positions = await this.getCurrentPositions();

    return {
      activeSymbols,
      buildingProgress,
      positions
    };
  }

  /**
   * 更新策略参数
   */
  updateParameters(newParams: Partial<LeftSideBuildingConfig>): void {
    this.params = { ...this.params, ...newParams };
    logger.info('更新策略参数', newParams);
  }

  /**
   * 获取策略参数
   */
  getParameters(): LeftSideBuildingConfig {
    return { ...this.params };
  }

  /**
   * 计算预期收益率
   */
  async calculateExpectedReturn(data: MarketData): Promise<{
    expectedReturn: number;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    reasoning: string[];
  }> {
    const symbol = data.klines[0].symbol;
    const currentPrice = data.klines[data.klines.length - 1].close;
    const highPrice = this.highPrices.get(symbol) || currentPrice;
    const dropPercent = (highPrice - currentPrice) / highPrice;
    
    const reasoning: string[] = [];
    let expectedReturn = 0;
    let confidence = 0.5;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    // 基于历史回测数据的收益预期
    if (dropPercent >= this.params.minDropPercent) {
      expectedReturn = 0.15; // 15%预期收益
      confidence = 0.7;
      reasoning.push(`价格已从高点下跌${(dropPercent * 100).toFixed(1)}%，符合建仓条件`);
      
      if (dropPercent >= 0.15) {
        expectedReturn = 0.25; // 大跌后更高收益预期
        confidence = 0.8;
        riskLevel = 'MEDIUM';
        reasoning.push('大幅下跌提供更好的建仓机会');
      }
      
      if (dropPercent >= 0.25) {
        riskLevel = 'HIGH';
        reasoning.push('下跌幅度过大，市场可能出现系统性风险');
      }
    } else {
      expectedReturn = 0.05;
      confidence = 0.3;
      riskLevel = 'LOW';
      reasoning.push('当前跌幅不足，建议等待更好的建仓机会');
    }

    return {
      expectedReturn,
      confidence,
      riskLevel,
      reasoning
    };
  }
}