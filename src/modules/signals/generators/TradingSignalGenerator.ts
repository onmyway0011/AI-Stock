/**
 * 交易信号生成器
 * 实现置信度判断、信号生成和价格建议
 * @class TradingSignalGenerator
 * @extends BaseSignalGenerator
 */

import { MarketData, Kline, Signal } from '../../../shared/types/index';
import { MathUtils } from '../../../shared/utils';
import { BaseSignalGenerator, SignalGeneratorConfig } from './BaseSignalGenerator';

/**
 * 技术指标计算结果
 */
interface TechnicalIndicators {
  sma: { short: number; long: number };
  ema: { short: number; long: number };
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  bollinger: { upper: number; middle: number; lower: number; position: number };
  stochastic: { k: number; d: number };
  atr: number;
  volume: { current: number; average: number; ratio: number };
  support: number[];
  resistance: number[];
}

/**
 * 信号权重配置
 */
interface SignalWeights {
  trend: number;
  momentum: number;
  volume: number;
  volatility: number;
  support_resistance: number;
}

/**
 * 交易信号生成器
 */
export class TradingSignalGenerator extends BaseSignalGenerator {
  protected config: SignalGeneratorConfig;
  protected lastSignalTime: number;
  protected signalHistory: Signal[] = [];
  private weights: SignalWeights;

  constructor(config: SignalGeneratorConfig) {
    super(config);
    this.config = config;
    this.lastSignalTime = 0;
    this.weights = {
      trend: 0.3,
      momentum: 0.25,
      volume: 0.15,
      volatility: 0.15,
      support_resistance: 0.15
    };
  }

  /**
   * 生成交易信号
   * @param marketData 市场数据
   * @returns 交易信号或 null
   */
  generateSignal(marketData: MarketData): Promise<Signal | null> {
    if (!this.config.enabled || !marketData.klines || marketData.klines.length < 50) {
      return Promise.resolve(null);
    }

    const symbol = marketData.symbol;
    const currentPrice = marketData.klines[marketData.klines.length - 1].close;

    // 检查冷却时间
    if (this.isInCooldown(symbol)) {
      return Promise.resolve(null);
    }

    // 计算技术指标
    const indicators = this.calculateTechnicalIndicators(marketData.klines);
    
    // 分析市场状态
    const marketCondition = this.analyzeMarketCondition(marketData.klines, indicators);
    
    // 生成信号类型
    const signalType = this.determineSignalType(indicators, marketCondition);
    
    if (signalType === 'HOLD') {
      return Promise.resolve(null); // 不生成HOLD信号
    }

    // 置信度
    const confidence = this.calculateConfidence(indicators, marketCondition, signalType);
    
    // 检查置信度阈值
    if (!confidence.meetsThreshold) {
      return Promise.resolve(null);
    }

    // 风险评估
    const riskAssessment = this.assessRisk(indicators, marketCondition, currentPrice);

    // 信号强度
    const strength = this.determineSignalStrength(confidence);

    // 检查过滤条件
    if (!this.passesFilter(signalType, strength, confidence)) {
      return Promise.resolve(null);
    }

    // 创建信号对象（只保留类型声明中的字段）
    const signal: Signal = {
      id: this.generateSignalId(),
      symbol,
      side: signalType === 'BUY' ? 'BUY' : 'SELL',
      price: currentPrice,
      confidence: confidence.value ?? 0,
      reason: this.generateSignalReason(signalType, indicators, confidence),
      strength,
      stopLoss: riskAssessment.stopLoss,
      takeProfit: riskAssessment.takeProfit
    };

    // 记录信号生成时间
    this.lastSignalTime = Date.now();
    this.signalHistory.push(signal);

    // 限制历史记录数量
    if (this.signalHistory.length > 1000) {
      this.signalHistory = this.signalHistory.slice(-500);
    }

    return Promise.resolve(signal);
  }

  /**
   * 计算技术指标
   */
  private calculateTechnicalIndicators(klines: Kline[]): TechnicalIndicators {
    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => k.volume);

    // 移动平均线
    const sma20 = MathUtils.sma(closes, 20);
    const sma50 = MathUtils.sma(closes, 50);
    const ema12 = MathUtils.ema(closes, 12);
    const ema26 = MathUtils.ema(closes, 26);

    // RSI
    const rsiArr = MathUtils.rsi(closes, 14);
    const rsi = Array.isArray(rsiArr) ? rsiArr : [rsiArr];

    // MACD
    const macdLine = MathUtils.subtract(ema12, ema26);
    const signalLine = MathUtils.ema(macdLine, 9);
    const histogram = MathUtils.subtract(macdLine, signalLine);

    // 布林带
    const sma20Values = MathUtils.sma(closes, 20);
    const std20 = MathUtils.standardDeviation(closes.slice(-20));
    const upperBand = sma20Values.length ? sma20Values[sma20Values.length - 1] + (2 * std20) : 0;
    const lowerBand = sma20Values.length ? sma20Values[sma20Values.length - 1] - (2 * std20) : 0;
    const currentPrice = closes[closes.length - 1];
    const bollingerPosition = (upperBand - lowerBand) !== 0 ? (currentPrice - lowerBand) / (upperBand - lowerBand) : 0;

    // 随机指标
    const stochK = this.calculateStochastic(highs, lows, closes, 14);
    const stochD = MathUtils.sma(stochK, 3);

    // ATR
    const atr = this.calculateATR(highs, lows, closes, 14);

    // 成交量分析
    const avgVolume = MathUtils.average(volumes.slice(-20));
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = avgVolume !== 0 ? currentVolume / avgVolume : 0;

    // 支撑阻力位
    const { support, resistance } = this.calculateSupportResistance(highs, lows, closes);

    return {
      sma: { 
        short: sma20.length ? sma20[sma20.length - 1] : 0, 
        long: sma50.length ? sma50[sma50.length - 1] : 0 
      },
      ema: { 
        short: ema12.length ? ema12[ema12.length - 1] : 0, 
        long: ema26.length ? ema26[ema26.length - 1] : 0 
      },
      rsi: rsi.length ? rsi[rsi.length - 1] : 0,
      macd: {
        macd: macdLine.length ? macdLine[macdLine.length - 1] : 0,
        signal: signalLine.length ? signalLine[signalLine.length - 1] : 0,
        histogram: histogram.length ? histogram[histogram.length - 1] : 0
      },
      bollinger: {
        upper: upperBand,
        middle: sma20Values.length ? sma20Values[sma20Values.length - 1] : 0,
        lower: lowerBand,
        position: bollingerPosition
      },
      stochastic: {
        k: stochK.length ? stochK[stochK.length - 1] : 0,
        d: stochD.length ? stochD[stochD.length - 1] : 0
      },
      atr,
      volume: {
        current: currentVolume,
        average: avgVolume,
        ratio: volumeRatio
      },
      support,
      resistance
    };
  }

  /**
   * 分析市场状态
   */
  private analyzeMarketCondition(klines: Kline[], indicators: TechnicalIndicators): any {
    const closes = klines.map(k => k.close);
    const currentPrice = closes[closes.length - 1];

    // 趋势分析
    let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
    let trendStrength = 0;

    if (indicators.sma.short > indicators.sma.long && indicators.ema.short > indicators.ema.long) {
      trend = 'UPTREND';
      trendStrength = Math.min(
        (indicators.sma.short - indicators.sma.long) / indicators.sma.long,
        0.2
      ) / 0.2;
    } else if (indicators.sma.short < indicators.sma.long && indicators.ema.short < indicators.ema.long) {
      trend = 'DOWNTREND';
      trendStrength = Math.min(
        (indicators.sma.long - indicators.sma.short) / indicators.sma.long,
        0.2
      ) / 0.2;
    }

    // 波动率分析
    const priceChangePercent = Math.abs(
      (currentPrice - closes[closes.length - 20]) / closes[closes.length - 20]
    );
    let volatility: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    
    if (priceChangePercent < 0.05) volatility = 'LOW';
    else if (priceChangePercent > 0.15) volatility = 'HIGH';

    // 成交量状态
    let volume: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL';
    if (indicators.volume.ratio < 0.7) volume = 'LOW';
    else if (indicators.volume.ratio > 1.5) volume = 'HIGH';

    // 市场阶段判断
    let phase: 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN' = 'ACCUMULATION';
    if (trend === 'UPTREND' && indicators.volume.ratio > 1.2) {
      phase = 'MARKUP';
    } else if (trend === 'DOWNTREND' && indicators.volume.ratio > 1.2) {
      phase = 'MARKDOWN';
    } else if (volatility === 'LOW' && volume === 'HIGH') {
      phase = 'DISTRIBUTION';
    }

    return {
      trend,
      trendStrength,
      volatility,
      volume,
      phase
    };
  }

  /**
   * 确定信号类型
   */
  private determineSignalType(indicators: TechnicalIndicators, market: any): 'BUY' | 'SELL' | 'HOLD' {
    let buyScore = 0;
    let sellScore = 0;

    // 趋势信号
    if (market.trend === 'UPTREND') {
      buyScore += this.weights.trend;
    } else if (market.trend === 'DOWNTREND') {
      sellScore += this.weights.trend;
    }

    // 动量信号
    if (indicators.rsi < 30 && indicators.macd.histogram > 0) {
      buyScore += this.weights.momentum;
    } else if (indicators.rsi > 70 && indicators.macd.histogram < 0) {
      sellScore += this.weights.momentum;
    }

    // 成交量确认
    if (market.volume === 'HIGH') {
      if (buyScore > sellScore) {
        buyScore += this.weights.volume;
      } else if (sellScore > buyScore) {
        sellScore += this.weights.volume;
      }
    }

    // 布林带位置
    if (indicators.bollinger.position < 0.2) {
      buyScore += this.weights.volatility;
    } else if (indicators.bollinger.position > 0.8) {
      sellScore += this.weights.volatility;
    }
    // 支撑阻力
    const currentPrice = indicators.bollinger.middle; // 使用中轨作为当前价格参考
    const nearSupport = indicators.support.some(s => Math.abs(currentPrice - s) / currentPrice < 0.02);
    const nearResistance = indicators.resistance.some(r => Math.abs(currentPrice - r) / currentPrice < 0.02);

    if (nearSupport) {
      buyScore += this.weights.support_resistance;
    } else if (nearResistance) {
      sellScore += this.weights.support_resistance;
    }

    // 判断信号类型
    const threshold = 0.6;
    if (buyScore > threshold && buyScore > sellScore) {
      return 'BUY';
    } else if (sellScore > threshold && sellScore > buyScore) {
      return 'SELL';
    }

    return 'HOLD';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    indicators: TechnicalIndicators, 
    market: any, 
    signalType: 'BUY' | 'SELL'
  ): any {
    let technicalConfidence = 0;

    // 技术面置信度计算
    if (signalType === 'BUY') {
      let buyConfidence = 0;
      let factors = 0;
      if (market.trend === 'UPTREND') {
        buyConfidence += 0.25 * market.trendStrength;
        factors++;
      }
      if (indicators.rsi < 35) {
        buyConfidence += 0.2 * ((35 - indicators.rsi) / 35);
        factors++;
      }
      if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
        buyConfidence += 0.2;
        factors++;
      }
      if (indicators.bollinger.position < 0.3) {
        buyConfidence += 0.15 * (0.3 - indicators.bollinger.position) / 0.3;
        factors++;
      }
      if (indicators.volume.ratio > 1.2) {
        buyConfidence += 0.2;
        factors++;
      }
      technicalConfidence = factors > 0 ? buyConfidence / Math.min(factors * 0.2, 1) : 0;
    } else if (signalType === 'SELL') {
      let sellConfidence = 0;
      let factors = 0;
      if (market.trend === 'DOWNTREND') {
        sellConfidence += 0.25 * market.trendStrength;
        factors++;
      }
      if (indicators.rsi > 65) {
        sellConfidence += 0.2 * ((indicators.rsi - 65) / 35);
        factors++;
      }
      if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
        sellConfidence += 0.2;
        factors++;
      }
      if (indicators.bollinger.position > 0.7) {
        sellConfidence += 0.15 * (indicators.bollinger.position - 0.7) / 0.3;
        factors++;
      }
      if (indicators.volume.ratio > 1.2) {
        sellConfidence += 0.2;
        factors++;
      }
      technicalConfidence = factors > 0 ? sellConfidence / Math.min(factors * 0.2, 1) : 0;
    }

    // 直接用常量权重和阈值
    const technicalWeight = 1;
    const threshold = this.config.minConfidence ?? 0.7;
    const sourcesArr = [{ source: 'TECHNICAL_ANALYSIS', weight: technicalWeight, confidence: technicalConfidence }];
    const weightedConfidence = sourcesArr.reduce((sum, source) => sum + (source.confidence * source.weight), 0);
    const totalWeight = sourcesArr.reduce((sum, source) => sum + source.weight, 0);
    const overall = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
    const meetsThreshold = overall >= threshold;
    return {
      overall,
      technical: technicalConfidence,
      sources: sourcesArr,
      threshold,
      meetsThreshold
    };
  }

  /**
   * 生成价格建议
   */
  private generatePriceSuggestion(
    signalType: 'BUY' | 'SELL',
    currentPrice: number,
    indicators: TechnicalIndicators,
    market: any
  ): any {
    const atrMultiplier = market.volatility === 'HIGH' ? 1.5 :
                         market.volatility === 'MEDIUM' ? 1.0 : 0.8;

    if (signalType === 'BUY') {
      // 买入建议
      const entryPrice = currentPrice * 0.999; // 稍低于当前价格入场
      const stopLoss = Math.max(
        entryPrice - (indicators.atr * atrMultiplier),
        indicators.support.length > 0 ? Math.min(...indicators.support) * 0.99 : entryPrice * 0.95
      );
      const takeProfit = Math.min(
        entryPrice + (indicators.atr * atrMultiplier * 2.5),
        indicators.resistance.length > 0 ? Math.max(...indicators.resistance) * 0.99 : entryPrice * 1.15
      );

      const riskRewardRatio = (takeProfit - entryPrice) / (entryPrice - stopLoss);

      return {
        entryPrice,
        stopLoss,
        takeProfit,
        validUntil: Date.now() + (2 * 60 * 60 * 1000), // 2小时有效
        riskRewardRatio,
        positionSize: this.calculatePositionSize(entryPrice, stopLoss)
      };

    } else {
      // 卖出建议
      const entryPrice = currentPrice * 1.001; // 稍高于当前价格入场
      const stopLoss = Math.min(
        entryPrice + (indicators.atr * atrMultiplier),
        indicators.resistance.length > 0 ? Math.max(...indicators.resistance) * 1.01 : entryPrice * 1.05
      );
      const takeProfit = Math.max(
        entryPrice - (indicators.atr * atrMultiplier * 2.5),
        indicators.support.length > 0 ? Math.min(...indicators.support) * 1.01 : entryPrice * 0.85
      );
      const riskRewardRatio = (entryPrice - takeProfit) / (stopLoss - entryPrice);

      return {
        entryPrice,
        stopLoss,
        takeProfit,
        validUntil: Date.now() + (2 * 60 * 60 * 1000),
        riskRewardRatio,
        positionSize: this.calculatePositionSize(entryPrice, stopLoss)
      };
    }
  }

  /**
   * 风险评估
   * @param indicators 技术指标
   * @param market 市场状态
   * @param priceSuggestion 价格建议
   * @returns 风险评估结果
   */
  private assessRisk(
    indicators: TechnicalIndicators,
    market: any,
    priceSuggestion: any
  ): any {
    let riskScore = 0;
    const factors: string[] = [];

    // 波动率风险
    if (market.volatility === 'HIGH') {
      riskScore += 30;
      factors.push('高波动率市场');
    } else if (market.volatility === 'LOW') {
      riskScore += 10;
      factors.push('低波动率环境');
    } else {
      riskScore += 15;
    }

    // 趋势风险
    if (market.trend === 'SIDEWAYS') {
      riskScore += 20;
      factors.push('横盘整理，方向不明');
    } else if (market.trendStrength < 0.3) {
      riskScore += 15;
      factors.push('趋势强度较弱');
    }

    // 成交量风险
    if (market.volume === 'LOW') {
      riskScore += 15;
      factors.push('成交量不足');
    }

    // 技术指标极端值
    if (indicators.rsi > 80 || indicators.rsi < 20) {
      riskScore += 10;
      factors.push('RSI处于极端水平');
    }

    // 风险收益比
    if (priceSuggestion.riskRewardRatio && priceSuggestion.riskRewardRatio < 1.5) {
      riskScore += 25;
      factors.push('风险收益比不理想');
    }

    // 确定风险等级
    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    let maxPositionSize: number;

    if (riskScore <= 25) {
      level = 'LOW';
      maxPositionSize = 0.3;
    } else if (riskScore <= 50) {
      level = 'MEDIUM';
      maxPositionSize = 0.2;
    } else if (riskScore <= 75) {
      level = 'HIGH';
      maxPositionSize = 0.1;
    } else {
      level = 'VERY_HIGH';
      maxPositionSize = 0.05;
    }

    // 风险控制建议
    const recommendations: string[] = [];
    if (level === 'HIGH' || level === 'VERY_HIGH') {
      recommendations.push('建议降低仓位');
      recommendations.push('设置更严格的止损');
    }
    if (market.volatility === 'HIGH') {
      recommendations.push('考虑分批建仓');
    }
    if (market.volume === 'LOW') {
      recommendations.push('等待成交量确认');
    }

    return {
      level,
      score: riskScore,
      factors,
      maxPositionSize,
      recommendations
    };
  }

  /**
   * 确定信号强度
   */
  private determineSignalStrength(confidence: any): 'STRONG' | 'MODERATE' | 'WEAK' {
    const confidenceLevel = confidence.overall;
    
    if (confidenceLevel >= 0.85) {
      return 'STRONG';
    } else if (confidenceLevel >= 0.7) {
      return 'MODERATE';
    } else {
      return 'WEAK';
    }
  }

  /**
   * 检查是否通过过滤条件
   */
  private passesFilter(
    signalType: 'BUY' | 'SELL' | 'HOLD',
    strength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'VERY_WEAK',
    confidence: any
  ): boolean {
    if (confidence.overall < (this.config.minConfidence ?? 0.7)) {
      return false;
    }
    return true;
  }

  /**
   * 判断是否应该发送通知
   */
  private shouldSendNotification(
    confidence: any,
    strength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'VERY_WEAK',
    risk: any
  ): boolean {
    // 仅根据置信度和强度判断
    if (confidence.overall >= 0.9) {
      return true;
    }
    if (strength === 'VERY_STRONG' || strength === 'STRONG') {
      return true;
    }
    if (risk.level === 'LOW' && confidence.overall >= 0.85) {
      return true;
    }
    return false;
  }

  /**
   * 确定优先级
   */
  private determinePriority(
    confidence: any,
    strength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'VERY_WEAK',
    risk: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (confidence.overall >= 0.95 && strength === 'VERY_STRONG') {
      return 'URGENT';
    } else if (confidence.overall >= 0.9 || strength === 'VERY_STRONG') {
      return 'HIGH';
    } else if (confidence.overall >= 0.85 || strength === 'STRONG') {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // =================== 辅助方法 ===================

  /**
   * 检查是否在冷却期
   */
  private isInCooldown(symbol: string): boolean {
    const lastTime = this.lastSignalTime;
    if (!lastTime) return false;
    // 默认冷却期 0，始终返回 false
    return false;
  }

  /**
   * 生成信号ID
   */
  protected generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成信号原因
   * @param signalType 信号类型
   * @param indicators 技术指标
   * @param confidence 置信度分析
   * @returns 原因字符串
   */
  private generateSignalReason(signalType: 'BUY' | 'SELL' | 'HOLD', indicators: TechnicalIndicators, confidence: any): string {
    const reasons: string[] = [];

    if (signalType === 'BUY') {
      if (indicators.rsi < 35) reasons.push('RSI超卖');
      if (indicators.macd.histogram > 0) reasons.push('MACD金叉');
      if (indicators.bollinger.position < 0.3) reasons.push('接近布林带下轨');
    } else if (signalType === 'SELL') {
      if (indicators.rsi > 65) reasons.push('RSI超买');
      if (indicators.macd.histogram < 0) reasons.push('MACD死叉');
      if (indicators.bollinger.position > 0.7) reasons.push('接近布林带上轨');
    }

    return reasons.length > 0 ? reasons.join(', ') : '综合技术分析';
  }

  /**
   * 生成详细分析
   */
  private generateDetailedAnalysis(
    indicators: TechnicalIndicators,
    market: any,
    confidence: any
  ): string {
    return `
市场状态: ${market.trend} (强度: ${(market.trendStrength * 100).toFixed(1)}%)
波动率: ${market.volatility}, 成交量: ${market.volume}
RSI: ${indicators.rsi.toFixed(2)}
MACD: ${indicators.macd.macd.toFixed(4)} (信号线: ${indicators.macd.signal.toFixed(4)})
布林带位置: ${(indicators.bollinger.position * 100).toFixed(1)}%
置信度: ${(confidence.overall * 100).toFixed(1)}%
    `.trim();
  }

  /**
   * 提取关键指标
   */
  private extractKeyIndicators(indicators: TechnicalIndicators): Record<string, number> {
    return {
      rsi: indicators.rsi,
      macd: indicators.macd.macd,
      macd_signal: indicators.macd.signal,
      macd_histogram: indicators.macd.histogram,
      bollinger_position: indicators.bollinger.position,
      volume_ratio: indicators.volume.ratio,
      atr: indicators.atr
    };
  }

  /**
   * 计算仓位大小
   */
  private calculatePositionSize(entryPrice: number, stopLoss: number): number {
    const riskPercent = Math.abs(entryPrice - stopLoss) / entryPrice;
    const maxRisk = 0.02; // 最大2%风险
    
    return Math.min(maxRisk / riskPercent, 0.2); // 最大20%仓位
  }

  /**
   * 获取风险等级分数
   */
  private getRiskLevelScore(level: string): number {
    switch (level) {
      case 'LOW': return 1;
      case 'MEDIUM': return 2;
      case 'HIGH': return 3;
      case 'VERY_HIGH': return 4;
      default: return 2;
    }
  }

  /**
   * 计算随机指标
   */
  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const currentClose = closes[i];
      
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      result.push(k);
    }
    
    return result;
  }

  /**
   * 计算ATR
   */
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    const trueRanges: number[] = [];
    
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
    return MathUtils.average(trueRanges.slice(-period));
  }

  /**
   * 计算支撑阻力位
   */
  private calculateSupportResistance(highs: number[], lows: number[], closes: number[]): {
    support: number[];
    resistance: number[];
  } {
    const recentData = 50; // 使用最近50根K线
    const recentHighs = highs.slice(-recentData);
    const recentLows = lows.slice(-recentData);
    // 简化的支撑阻力计算
    const support = [Math.min(...recentLows), MathUtils.percentile(recentLows, 25)];
    const resistance = [Math.max(...recentHighs), MathUtils.percentile(recentHighs, 75)];
    
    return { support, resistance };
  }

  /**
   * 获取信号历史
   */
  getSignalHistory(): Signal[] {
    return [...this.signalHistory];
  }

  /**
   * 获取指定时间范围的信号
   */
  getSignalsInRange(startTime: number, endTime: number): Signal[] {
    // 无 timestamp 字段，直接返回全部历史或根据其它条件筛选
    return [...this.signalHistory];
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: any): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 清理过期信号
   */
  cleanExpiredSignals(): void {
    // 无 expiresAt 字段，直接保留全部历史
    this.signalHistory = [...this.signalHistory];
  }
}