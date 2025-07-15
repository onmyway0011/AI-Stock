/**
 * 移动平均线策略
 * 基于双均线交叉的经典技术分析策略
 * 当短期均线上穿长期均线时产生买入信号，下穿时产生卖出信号
 */

import { BaseStrategy } from '../base/BaseStrategy';
import { 
  MarketData, 
  Signal, 
  OrderSide, 
  SignalStrength, 
  StrategyConfig 
} from '../../types';
import { MathUtils } from '../../utils';

/**
 * 移动平均线策略参数接口
 */
export interface MovingAverageParams {
  /** 短期均线周期 */
  shortPeriod: number;
  /** 长期均线周期 */
  longPeriod: number;
  /** 均线类型 ('SMA' | 'EMA') */
  maType: 'SMA' | 'EMA';
  /** 信号确认阈值（百分比） */
  signalThreshold: number;
  /** 是否使用成交量确认 */
  useVolumeConfirmation: boolean;
  /** 成交量倍数阈值 */
  volumeMultiplier: number;
}

/**
 * 移动平均线策略类
 */
export class MovingAverageStrategy extends BaseStrategy {
  private params: MovingAverageParams;
  private lastCrossDirection: 'UP' | 'DOWN' | 'NONE' = 'NONE';
  private crossConfirmationCount = 0;

  constructor(config: StrategyConfig) {
    super('MovingAverageStrategy', config);
    
    // 设置默认参数
    this.params = {
      shortPeriod: 5,
      longPeriod: 20,
      maType: 'SMA',
      signalThreshold: 0.01, // 1%
      useVolumeConfirmation: true,
      volumeMultiplier: 1.5,
      ...config.parameters
    };
  }

  /**
   * 策略初始化
   */
  protected async onInitialize(): Promise<void> {
    // 验证参数
    this.validateParameters();
    
    console.log(`移动平均线策略初始化: 短期=${this.params.shortPeriod}, 长期=${this.params.longPeriod}, 类型=${this.params.maType}`);
  }

  /**
   * 生成交易信号
   * @param data 市场数据
   * @returns 交易信号或null
   */
  async generateSignal(data: MarketData): Promise<Signal | null> {
    // 计算技术指标
    this.calculateIndicators(data);
    // 检查数据充足性
    if (data.klines.length < this.params.longPeriod) {
      return null;
    }

    const prices = data.klines.map(k => k.close);
    const volumes = data.klines.map(k => k.volume);
    const currentPrice = prices[prices.length - 1];
    const symbol = data.klines[0].symbol;

    // 计算移动平均线
    const shortMA = this.calculateMovingAverage(prices, this.params.shortPeriod);
    const longMA = this.calculateMovingAverage(prices, this.params.longPeriod);

    if (shortMA.length < 2 || longMA.length < 2) {
      return null;
    }

    // 获取当前和前一个均线值
    const currentShortMA = shortMA[shortMA.length - 1];
    const currentLongMA = longMA[longMA.length - 1];
    const prevShortMA = shortMA[shortMA.length - 2];
    const prevLongMA = longMA[longMA.length - 2];

    // 检测均线交叉
    const crossDirection = this.detectCross(
      prevShortMA, prevLongMA,
      currentShortMA, currentLongMA
    );

    if (crossDirection === 'NONE') {
      return null;
    }

    // 确认信号强度
    const signalStrength = this.calculateSignalStrength(
      currentShortMA, currentLongMA, currentPrice
    );
    // 计算信号置信度
    const confidence = this.calculateConfidence(
      data, crossDirection, signalStrength
    );

    // 生成信号
    const signal = this.createTradeSignal(
      symbol,
      crossDirection,
      currentPrice,
      confidence,
      signalStrength,
      currentShortMA,
      currentLongMA
    );

    // 更新内部状态
    this.updateStrategyState(crossDirection);

    return signal;
  }

  /**
   * 参数更新处理
   * @param parameters 新参数
   */
  protected onParametersUpdated(parameters: Record<string, any>): void {
    this.params = { ...this.params, ...parameters };
    this.validateParameters();
    
    // 重置状态
    this.lastCrossDirection = 'NONE';
    this.crossConfirmationCount = 0;
  }

  /**
   * 计算移动平均线
   * @param prices 价格数组
   * @param period 周期
   * @returns 移动平均线数组
   */
  private calculateMovingAverage(prices: number[], period: number): number[] {
    if (this.params.maType === 'EMA') {
      return MathUtils.ema(prices, period);
    } else {
      return MathUtils.sma(prices, period);
    }
  }

  /**
   * 检测均线交叉
   * @param prevShort 前一个短期均线值
   * @param prevLong 前一个长期均线值
   * @param currShort 当前短期均线值
   * @param currLong 当前长期均线值
   * @returns 交叉方向
   */
  private detectCross(
    prevShort: number,
    prevLong: number,
    currShort: number,
    currLong: number
  ): 'UP' | 'DOWN' | 'NONE' {
    // 检查上穿（金叉）
    if (prevShort <= prevLong && currShort > currLong) {
      const crossStrength = (currShort - currLong) / currLong;
      if (crossStrength >= this.params.signalThreshold) {
        return 'UP';
      }
    }

    // 检查下穿（死叉）
    if (prevShort >= prevLong && currShort < currLong) {
      const crossStrength = (currLong - currShort) / currLong;
      if (crossStrength >= this.params.signalThreshold) {
        return 'DOWN';
      }
    }

    return 'NONE';
  }

  /**
   * 计算信号强度
   * @param shortMA 短期均线值
   * @param longMA 长期均线值
   * @param price 当前价格
   * @returns 信号强度
   */
  private calculateSignalStrength(
    shortMA: number,
    longMA: number,
    price: number
  ): SignalStrength {
    // 计算均线间距离
    const maDistance = Math.abs(shortMA - longMA) / longMA;
    
    // 计算价格与均线的关系
    const priceToMA = Math.abs(price - shortMA) / shortMA;

    // 根据距离和价格关系确定强度
    if (maDistance > 0.05 && priceToMA < 0.01) {
      return SignalStrength.VERY_STRONG;
    } else if (maDistance > 0.03 && priceToMA < 0.02) {
      return SignalStrength.STRONG;
    } else if (maDistance > 0.015) {
      return SignalStrength.MODERATE;
    } else {
      return SignalStrength.WEAK;
    }
  }

  /**
   * 计算信号置信度
   * @param data 市场数据
   * @param crossDirection 交叉方向
   * @param signalStrength 信号强度
   * @returns 置信度 (0-1)
   */
  private calculateConfidence(
    data: MarketData,
    crossDirection: 'UP' | 'DOWN',
    signalStrength: SignalStrength
  ): number {
    let confidence = 0.5; // 基础置信度

    // 根据信号强度调整
    switch (signalStrength) {
      case SignalStrength.VERY_STRONG:
        confidence += 0.3;
        break;
      case SignalStrength.STRONG:
        confidence += 0.2;
        break;
      case SignalStrength.MODERATE:
        confidence += 0.1;
        break;
      case SignalStrength.WEAK:
        confidence += 0.05;
        break;
    }

    // 成交量确认
    if (this.params.useVolumeConfirmation) {
      const volumeConfidence = this.calculateVolumeConfidence(data);
      confidence += volumeConfidence;
    }

    // 市场趋势确认
    const trendConfidence = this.calculateTrendConfidence(data, crossDirection);
    confidence += trendConfidence;

    // 确认次数奖励
    if (this.lastCrossDirection === crossDirection) {
      confidence += Math.min(this.crossConfirmationCount * 0.05, 0.15);
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 计算成交量置信度
   * @param data 市场数据
   * @returns 成交量置信度调整值
   */
  private calculateVolumeConfidence(data: MarketData): number {
    const volumes = data.klines.map(k => k.volume);
    
    if (volumes.length < 10) return 0;

    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-10).reduce((sum, v) => sum + v, 0) / 10;

    if (currentVolume >= avgVolume * this.params.volumeMultiplier) {
      return 0.1; // 成交量放大，增加置信度
    } else if (currentVolume < avgVolume * 0.5) {
      return -0.05; // 成交量萎缩，降低置信度
    }

    return 0;
  }

  /**
   * 计算趋势置信度
   * @param data 市场数据
   * @param crossDirection 交叉方向
   * @returns 趋势置信度调整值
   */
  private calculateTrendConfidence(
    data: MarketData,
    crossDirection: 'UP' | 'DOWN'
  ): number {
    const prices = data.klines.map(k => k.close);
    
    if (prices.length < 20) return 0;

    // 计算价格趋势
    const recentPrices = prices.slice(-10);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    const trendDirection = lastPrice > firstPrice ? 'UP' : 'DOWN';

    // 如果交叉方向与近期趋势一致，增加置信度
    if (crossDirection === trendDirection) {
      return 0.1;
    } else {
      return -0.05;
    }
  }

  /**
   * 创建交易信号
   * @param symbol 交易对符号
   * @param crossDirection 交叉方向
   * @param price 当前价格
   * @param confidence 置信度
   * @param strength 信号强度
   * @param shortMA 短期均线值
   * @param longMA 长期均线值
   * @returns 交易信号
   */
  private createTradeSignal(
    symbol: string,
    crossDirection: 'UP' | 'DOWN',
    price: number,
    confidence: number,
    strength: SignalStrength,
    shortMA: number,
    longMA: number
  ): Signal {
    const side = crossDirection === 'UP' ? OrderSide.BUY : OrderSide.SELL;
    const reason = this.generateSignalReason(crossDirection, shortMA, longMA, strength);

    return this.createSignal(
      symbol,
      side,
      price,
      confidence,
      reason,
      strength
    );
  }

  /**
   * 生成信号原因描述
   * @param crossDirection 交叉方向
   * @param shortMA 短期均线值
   * @param longMA 长期均线值
   * @param strength 信号强度
   * @returns 信号原因
   */
  private generateSignalReason(
    crossDirection: 'UP' | 'DOWN',
    shortMA: number,
    longMA: number,
    strength: SignalStrength
  ): string {
    const maType = this.params.maType;
    const shortPeriod = this.params.shortPeriod;
    const longPeriod = this.params.longPeriod;
    const crossType = crossDirection === 'UP' ? '金叉' : '死叉';
    const strengthDesc = this.getStrengthDescription(strength);

    const maGap = ((Math.abs(shortMA - longMA) / longMA) * 100).toFixed(2);

    return `${maType}${shortPeriod}/${longPeriod}${crossType}，信号强度：${strengthDesc}，均线间距：${maGap}%`;
  }

  /**
   * 获取强度描述
   * @param strength 信号强度
   * @returns 强度描述
   */
  private getStrengthDescription(strength: SignalStrength): string {
    switch (strength) {
      case SignalStrength.VERY_STRONG:
        return '非常强';
      case SignalStrength.STRONG:
        return '强';
      case SignalStrength.MODERATE:
        return '中等';
      case SignalStrength.WEAK:
        return '弱';
      default:
        return '未知';
    }
  }

  /**
   * 更新策略状态
   * @param crossDirection 交叉方向
   */
  private updateStrategyState(crossDirection: 'UP' | 'DOWN'): void {
    if (this.lastCrossDirection === crossDirection) {
      this.crossConfirmationCount++;
    } else {
      this.lastCrossDirection = crossDirection;
      this.crossConfirmationCount = 1;
    }
  }

  /**
   * 验证策略参数
   */
  private validateParameters(): void {
    if (this.params.shortPeriod >= this.params.longPeriod) {
      throw new Error('短期均线周期必须小于长期均线周期');
    }
    if (this.params.shortPeriod < 2 || this.params.longPeriod < 5) {
      throw new Error('均线周期必须大于等于2和5');
    }

    if (this.params.signalThreshold < 0 || this.params.signalThreshold > 0.1) {
      throw new Error('信号阈值必须在0-10%之间');
    }

    if (this.params.volumeMultiplier < 1) {
      throw new Error('成交量倍数必须大于等于1');
    }

    if (!['SMA', 'EMA'].includes(this.params.maType)) {
      throw new Error('均线类型必须是SMA或EMA');
    }
  }

  /**
   * 获取策略特有的状态信息
   */
  getStrategySpecificStatus(): {
    lastCrossDirection: string;
    crossConfirmationCount: number;
    parameters: MovingAverageParams;
  } {
    return {
      lastCrossDirection: this.lastCrossDirection,
      crossConfirmationCount: this.crossConfirmationCount,
      parameters: this.params
    };
  }
}