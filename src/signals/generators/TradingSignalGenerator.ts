/**
 * 交易信号生成器
 * 实现置信度判断、信号生成和价格建议
 */

import {
  TradingSignal,
  SignalType,
  SignalStrength,
  OrderSide,
  SignalSource,
  ConfidenceAnalysis,
  PriceSuggestion,
  MarketCondition,
  RiskAssessment,
  SignalConfig,
  SignalFilter,
  NotificationChannel
} from '../../types/signal';
import { MarketData, Kline } from '../../types';
import { MathUtils, createLogger } from '../../utils';
import { BaseSignalGenerator } from './BaseSignalGenerator';

const logger = createLogger('TRADING_SIGNAL_GENERATOR');

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
  private config: SignalConfig;
  private lastSignalTime = new Map<string, number>();
  private signalHistory: TradingSignal[] = [];
  private weights: SignalWeights;

  constructor(config: SignalConfig) {
    super();
    this.config = config;
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
   */
  async generateSignal(marketData: MarketData): Promise<TradingSignal | null> {
    try {
      if (!this.config.enabled || !marketData.klines || marketData.klines.length < 50) {
        return null;
      }

      const symbol = marketData.symbol;
      const currentPrice = marketData.klines[marketData.klines.length - 1].close;

      // 检查冷却时间
      if (this.isInCooldown(symbol)) {
        return null;
      }

      // 计算技术指标
      const indicators = this.calculateTechnicalIndicators(marketData.klines);
      
      // 分析市场状态
      const marketCondition = this.analyzeMarketCondition(marketData.klines, indicators);
      
      // 生成信号
      const signalType = this.determineSignalType(indicators, marketCondition);
      
      if (signalType === SignalType.HOLD) {
        return null; // 不生成HOLD信号
      }

      // 计算置信度
      const confidence = this.calculateConfidence(indicators, marketCondition, signalType);
      
      // 检查置信度阈值
      if (!confidence.meetsThreshold) {
        logger.debug(`信号置信度不足: ${confidence.overall.toFixed(3)} < ${confidence.threshold}`);
        return null;
      }

      // 生成价格建议
      const priceSuggestion = this.generatePriceSuggestion(
        signalType,
        currentPrice,
        indicators,
        marketCondition
      );

      // 风险评估
      const riskAssessment = this.assessRisk(indicators, marketCondition, priceSuggestion);

      // 确定信号强度
      const strength = this.determineSignalStrength(confidence, indicators);

      // 检查过滤条件
      if (!this.passesFilter(signalType, strength, confidence, riskAssessment)) {
        return null;
      }

      // 创建信号
      const signal: TradingSignal = {
        id: this.generateSignalId(),
        type: signalType,
        symbol,
        side: signalType === SignalType.BUY ? OrderSide.BUY : OrderSide.SELL,
        strength,
        source: SignalSource.TECHNICAL_ANALYSIS,
        confidence,
        priceSuggestion,
        marketCondition,
        riskAssessment,
        timestamp: Date.now(),
        expiresAt: Date.now() + (4 * 60 * 60 * 1000), // 4小时有效期
        reason: this.generateSignalReason(signalType, indicators, confidence),
        analysis: this.generateDetailedAnalysis(indicators, marketCondition, confidence),
        indicators: this.extractKeyIndicators(indicators),
        shouldNotify: this.shouldSendNotification(confidence, strength, riskAssessment),
        notificationChannels: this.config.notification.channels,
        priority: this.determinePriority(confidence, strength, riskAssessment)
      };

      // 记录信号生成时间
      this.lastSignalTime.set(symbol, Date.now());
      this.signalHistory.push(signal);

      // 限制历史记录数量
      if (this.signalHistory.length > 1000) {
        this.signalHistory = this.signalHistory.slice(-500);
      }

      logger.info(`生成${signalType}信号: ${symbol} 置信度=${confidence.overall.toFixed(3)} 强度=${strength}`);
      
      return signal;

    } catch (error) {
      logger.error('生成交易信号失败', error);
      return null;
    }
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
    const rsi = MathUtils.rsi(closes, 14);

    // MACD
    const macdLine = MathUtils.subtract(ema12, ema26);
    const signalLine = MathUtils.ema(macdLine, 9);
    const histogram = MathUtils.subtract(macdLine, signalLine);

    // 布林带
    const sma20Values = MathUtils.sma(closes, 20);
    const std20 = MathUtils.standardDeviation(closes.slice(-20));
    const upperBand = sma20Values[sma20Values.length - 1] + (2 * std20);
    const lowerBand = sma20Values[sma20Values.length - 1] - (2 * std20);
    const currentPrice = closes[closes.length - 1];
    const bollingerPosition = (currentPrice - lowerBand) / (upperBand - lowerBand);

    // 随机指标
    const stochK = this.calculateStochastic(highs, lows, closes, 14);
    const stochD = MathUtils.sma(stochK, 3);

    // ATR
    const atr = this.calculateATR(highs, lows, closes, 14);

    // 成交量分析
    const avgVolume = MathUtils.average(volumes.slice(-20));
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    // 支撑阻力位
    const { support, resistance } = this.calculateSupportResistance(highs, lows, closes);

    return {
      sma: { 
        short: sma20[sma20.length - 1], 
        long: sma50[sma50.length - 1] 
      },
      ema: { 
        short: ema12[ema12.length - 1], 
        long: ema26[ema26.length - 1] 
      },
      rsi: rsi[rsi.length - 1],
      macd: {
        macd: macdLine[macdLine.length - 1],
        signal: signalLine[signalLine.length - 1],
        histogram: histogram[histogram.length - 1]
      },
      bollinger: {
        upper: upperBand,
        middle: sma20Values[sma20Values.length - 1],
        lower: lowerBand,
        position: bollingerPosition
      },
      stochastic: {
        k: stochK[stochK.length - 1],
        d: stochD[stochD.length - 1]
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
  private analyzeMarketCondition(klines: Kline[], indicators: TechnicalIndicators): MarketCondition {
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
  private determineSignalType(indicators: TechnicalIndicators, market: MarketCondition): SignalType {
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
      return SignalType.BUY;
    } else if (sellScore > threshold && sellScore > buyScore) {
      return SignalType.SELL;
    }

    return SignalType.HOLD;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    indicators: TechnicalIndicators, 
    market: MarketCondition, 
    signalType: SignalType
  ): ConfidenceAnalysis {
    const sources: ConfidenceAnalysis['sources'] = [];
    let technicalConfidence = 0;

    // 技术面置信度计算
    if (signalType === SignalType.BUY) {
      // 买入信号置信度
      let buyConfidence = 0;
      let factors = 0;
      // 趋势确认
      if (market.trend === 'UPTREND') {
        buyConfidence += 0.25 * market.trendStrength;
        factors++;
      }

      // RSI超卖
      if (indicators.rsi < 35) {
        buyConfidence += 0.2 * ((35 - indicators.rsi) / 35);
        factors++;
      }

      // MACD金叉
      if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
        buyConfidence += 0.2;
        factors++;
      }

      // 布林带下轨支撑
      if (indicators.bollinger.position < 0.3) {
        buyConfidence += 0.15 * (0.3 - indicators.bollinger.position) / 0.3;
        factors++;
      }

      // 成交量确认
      if (indicators.volume.ratio > 1.2) {
        buyConfidence += 0.2;
        factors++;
      }

      technicalConfidence = factors > 0 ? buyConfidence / Math.min(factors * 0.2, 1) : 0;

    } else if (signalType === SignalType.SELL) {
      // 卖出信号置信度
      let sellConfidence = 0;
      let factors = 0;

      // 趋势确认
      if (market.trend === 'DOWNTREND') {
        sellConfidence += 0.25 * market.trendStrength;
        factors++;
      }

      // RSI超买
      if (indicators.rsi > 65) {
        sellConfidence += 0.2 * ((indicators.rsi - 65) / 35);
        factors++;
      }

      // MACD死叉
      if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
        sellConfidence += 0.2;
        factors++;
      }

      // 布林带上轨阻力
      if (indicators.bollinger.position > 0.7) {
        sellConfidence += 0.15 * (indicators.bollinger.position - 0.7) / 0.3;
        factors++;
      }

      // 成交量确认
      if (indicators.volume.ratio > 1.2) {
        sellConfidence += 0.2;
        factors++;
      }

      technicalConfidence = factors > 0 ? sellConfidence / Math.min(factors * 0.2, 1) : 0;
    }

    // 添加技术面分析源
    sources.push({
      source: SignalSource.TECHNICAL_ANALYSIS,
      weight: this.config.confidence.sources.technical,
      confidence: technicalConfidence
    });

    // 计算总体置信度
    const weightedConfidence = sources.reduce((sum, source) => {
      return sum + (source.confidence * source.weight);
    }, 0);

    const totalWeight = sources.reduce((sum, source) => sum + source.weight, 0);
    const overall = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

    const threshold = this.config.confidence.threshold;
    const meetsThreshold = overall >= threshold;

    return {
      overall,
      technical: technicalConfidence,
      sources,
      threshold,
      meetsThreshold
    };
  }

  /**
   * 生成价格建议
   */
  private generatePriceSuggestion(
    signalType: SignalType,
    currentPrice: number,
    indicators: TechnicalIndicators,
    market: MarketCondition
  ): PriceSuggestion {
    const atrMultiplier = market.volatility === 'HIGH' ? 1.5 :
                         market.volatility === 'MEDIUM' ? 1.0 : 0.8;

    if (signalType === SignalType.BUY) {
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
   */
  private assessRisk(
    indicators: TechnicalIndicators,
    market: MarketCondition,
    priceSuggestion: PriceSuggestion
  ): RiskAssessment {
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
  private determineSignalStrength(confidence: ConfidenceAnalysis, indicators: TechnicalIndicators): SignalStrength {
    const confidenceLevel = confidence.overall;
    
    if (confidenceLevel >= 0.9) {
      return SignalStrength.VERY_STRONG;
    } else if (confidenceLevel >= 0.85) {
      return SignalStrength.STRONG;
    } else if (confidenceLevel >= 0.8) {
      return SignalStrength.MODERATE;
    } else if (confidenceLevel >= 0.7) {
      return SignalStrength.WEAK;
    } else {
      return SignalStrength.VERY_WEAK;
    }
  }

  /**
   * 检查是否通过过滤条件
   */
  private passesFilter(
    signalType: SignalType,
    strength: SignalStrength,
    confidence: ConfidenceAnalysis,
    risk: RiskAssessment
  ): boolean {
    const filter = this.config.filter;

    // 置信度检查
    if (confidence.overall < filter.minConfidence) {
      return false;
    }

    // 信号类型检查
    if (!filter.allowedTypes.includes(signalType)) {
      return false;
    }

    // 信号强度检查
    if (!filter.allowedStrengths.includes(strength)) {
      return false;
    }

    // 风险等级检查
    if (filter.maxRiskLevel && this.getRiskLevelScore(risk.level) > this.getRiskLevelScore(filter.maxRiskLevel)) {
      return false;
    }

    return true;
  }

  /**
   * 判断是否应该发送通知
   */
  private shouldSendNotification(
    confidence: ConfidenceAnalysis,
    strength: SignalStrength,
    risk: RiskAssessment
  ): boolean {
    if (!this.config.notification.enabled) {
      return false;
    }

    // 高置信度信号必须通知
    if (confidence.overall >= 0.9) {
      return true;
    }

    // 强信号通知
    if (strength === SignalStrength.VERY_STRONG || strength === SignalStrength.STRONG) {
      return true;
    }

    // 低风险高置信度信号
    if (risk.level === 'LOW' && confidence.overall >= 0.85) {
      return true;
    }

    return false;
  }

  /**
   * 确定优先级
   */
  private determinePriority(
    confidence: ConfidenceAnalysis,
    strength: SignalStrength,
    risk: RiskAssessment
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (confidence.overall >= 0.95 && strength === SignalStrength.VERY_STRONG) {
      return 'URGENT';
    } else if (confidence.overall >= 0.9 || strength === SignalStrength.VERY_STRONG) {
      return 'HIGH';
    } else if (confidence.overall >= 0.85 || strength === SignalStrength.STRONG) {
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
    const lastTime = this.lastSignalTime.get(symbol);
    if (!lastTime) return false;
    return Date.now() - lastTime < this.config.filter.cooldownPeriod;
  }

  /**
   * 生成信号ID
   */
  private generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成信号原因
   */
  private generateSignalReason(signalType: SignalType, indicators: TechnicalIndicators, confidence: ConfidenceAnalysis): string {
    const reasons: string[] = [];

    if (signalType === SignalType.BUY) {
      if (indicators.rsi < 35) reasons.push('RSI超卖');
      if (indicators.macd.histogram > 0) reasons.push('MACD金叉');
      if (indicators.bollinger.position < 0.3) reasons.push('接近布林带下轨');
    } else if (signalType === SignalType.SELL) {
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
    market: MarketCondition,
    confidence: ConfidenceAnalysis
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
  getSignalHistory(): TradingSignal[] {
    return [...this.signalHistory];
  }

  /**
   * 获取指定时间范围的信号
   */
  getSignalsInRange(startTime: number, endTime: number): TradingSignal[] {
    return this.signalHistory.filter(signal => 
      signal.timestamp >= startTime && signal.timestamp <= endTime
    );
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SignalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('信号生成器配置已更新');
  }

  /**
   * 清理过期信号
   */
  cleanExpiredSignals(): void {
    const now = Date.now();
    this.signalHistory = this.signalHistory.filter(signal => signal.expiresAt > now);
  }
}