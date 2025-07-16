/**
 * 机器学习优化模块
 * 使用机器学习算法优化交易策略的买卖点位和参数
 */

import { MarketData, Kline } from '../../../shared/types';
import { MathUtils } from '../../../shared/utils';
import { MLConfig } from '../base/AdvancedStrategyInterface';

// 移除 createLogger 相关引用和 logger 变量，直接用 console.log/info/warn/error 替代

/**
 * 特征工程接口
 */
export interface FeatureSet {
  /** 价格特征 */
  priceFeatures: number[];
  /** 技术指标特征 */
  technicalFeatures: number[];
  /** 成交量特征 */
  volumeFeatures: number[];
  /** 市场微观结构特征 */
  microstructureFeatures: number[];
  /** 时间特征 */
  timeFeatures: number[];
}

/**
 * 预测结果接口
 */
export interface MLPrediction {
  /** 预测价格 */
  predictedPrice: number;
  /** 价格方向 */
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  /** 置信度 */
  confidence: number;
  /** 预测时间范围 */
  timeHorizon: number;
  /** 使用的模型 */
  modelType: string;
  /** 特征重要性 */
  featureImportance: Record<string, number>;
}

/**
 * 模型性能指标
 */
export interface ModelPerformance {
  /** 准确率 */
  accuracy: number;
  /** 精确率 */
  precision: number;
  /** 召回率 */
  recall: number;
  /** F1分数 */
  f1Score: number;
  /** 均方误差 */
  mse: number;
  /** 夏普比率 */
  sharpeRatio: number;
  /** 最大回撤 */
  maxDrawdown: number;
}

/**
 * 训练数据点
 */
interface TrainingDataPoint {
  features: FeatureSet;
  target: {
    priceChange: number;
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    profitability: number;
  };
  timestamp: number;
  metadata: {
    symbol: string;
    marketCondition: string;
    volatility: number;
  };
}

/**
 * 模型接口
 */
interface MLModel {
  type: string;
  train(data: TrainingDataPoint[]): Promise<void>;
  predict(features: FeatureSet): Promise<MLPrediction>;
  evaluate(testData: TrainingDataPoint[]): Promise<ModelPerformance>;
  getFeatureImportance(): Record<string, number>;
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}

/**
 * 随机森林模型实现
 */
class RandomForestModel implements MLModel {
  type = 'RandomForest';
  private trees: any[] = [];
  private featureImportance: Record<string, number> = {};
  private trained = false;

  async train(data: TrainingDataPoint[]): Promise<void> {
    console.info(`开始训练随机森林模型，样本数: ${data.length}`);
    // 模拟随机森林训练过程
    const numTrees = 100;
    const sampleRatio = 0.8;
    
    for (let i = 0; i < numTrees; i++) {
      // 自助采样
      const sampleSize = Math.floor(data.length * sampleRatio);
      const sample = this.bootstrapSample(data, sampleSize);
      
      // 训练决策树
      const tree = this.trainDecisionTree(sample);
      this.trees.push(tree);
    }
    
    // 计算特征重要性
    this.calculateFeatureImportance(data);
    this.trained = true;
    
    console.info('随机森林模型训练完成');
  }

  async predict(features: FeatureSet): Promise<MLPrediction> {
    if (!this.trained) {
      throw new Error('模型未训练');
    }

    // 集成所有树的预测结果
    const predictions = this.trees.map(tree => this.predictWithTree(tree, features));
    
    // 投票决定方向
    const directions = predictions.map(p => p.direction);
    const directionCounts = this.countDirections(directions);
    const finalDirection = this.getMajorityDirection(directionCounts);
    
    // 平均价格预测
    const avgPredictedPrice = predictions.reduce((sum, p) => sum + p.price, 0) / predictions.length;
    
    // 计算置信度
    const maxVotes = Math.max(...Object.values(directionCounts));
    const confidence = maxVotes / predictions.length;
    
    return {
      predictedPrice: avgPredictedPrice,
      direction: finalDirection,
      confidence,
      timeHorizon: 24, // 24小时
      modelType: this.type,
      featureImportance: this.featureImportance
    };
  }

  /**
   * 评估模型性能
   * @param testData 测试数据
   * @returns 模型性能指标
   */
  async evaluate(testData: TrainingDataPoint[]): Promise<ModelPerformance> {
    let correctPredictions = 0;
    let totalPredictions = testData.length;
    const errors: number[] = [];

    for (const dataPoint of testData) {
      const prediction = await this.predict(dataPoint.features);
      
      // 检查方向预测准确性
      if (prediction.direction === dataPoint.target.direction) {
        correctPredictions++;
      }
      
      // 计算价格预测误差
      const actualPrice = dataPoint.features.priceFeatures[0]; // 假设第一个是当前价格
      const error = Math.abs(prediction.predictedPrice - actualPrice) / actualPrice;
      errors.push(error);
    }

    const accuracy = correctPredictions / totalPredictions;
    const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;

    return {
      accuracy,
      precision: accuracy, // 简化实现
      recall: accuracy,
      f1Score: accuracy,
      mse,
      sharpeRatio: 1.2, // 模拟值
      maxDrawdown: 0.15 // 模拟值
    };
  }

  getFeatureImportance(): Record<string, number> {
    return { ...this.featureImportance };
  }

  async save(path: string): Promise<void> {
    // 模拟保存模型
    console.info(`保存模型到: ${path}`);
  }

  async load(path: string): Promise<void> {
    // 模拟加载模型
    console.info(`从文件加载模型: ${path}`);
    this.trained = true;
  }

  private bootstrapSample(data: TrainingDataPoint[], sampleSize: number): TrainingDataPoint[] {
    const sample: TrainingDataPoint[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      sample.push(data[randomIndex]);
    }
    return sample;
  }

  private trainDecisionTree(data: TrainingDataPoint[]): any {
    // 简化的决策树训练
    return {
      split: Math.random(),
      threshold: Math.random() * 100,
      leftChild: null,
      rightChild: null,
      prediction: this.calculateMajorityClass(data)
    };
  }

  private predictWithTree(tree: any, features: FeatureSet): { direction: string; price: number } {
    // 简化的树预测
    const basePrice = features.priceFeatures[0] || 100;
    const priceChange = (Math.random() - 0.5) * 0.1; // ±5%变动
    
    return {
      direction: priceChange > 0.02 ? 'UP' : priceChange < -0.02 ? 'DOWN' : 'SIDEWAYS',
      price: basePrice * (1 + priceChange)
    };
  }

  private countDirections(directions: string[]): Record<string, number> {
    const counts: Record<string, number> = { UP: 0, DOWN: 0, SIDEWAYS: 0 };
    directions.forEach(dir => counts[dir]++);
    return counts;
  }

  private getMajorityDirection(counts: Record<string, number>): 'UP' | 'DOWN' | 'SIDEWAYS' {
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as 'UP' | 'DOWN' | 'SIDEWAYS';
  }

  private calculateMajorityClass(data: TrainingDataPoint[]): string {
    const counts = this.countDirections(data.map(d => d.target.direction));
    return this.getMajorityDirection(counts);
  }

  private calculateFeatureImportance(data: TrainingDataPoint[]): void {
    // 简化的特征重要性计算
    this.featureImportance = {
      'price_sma_5': 0.15,
      'price_sma_20': 0.12,
      'rsi': 0.18,
      'macd': 0.14,
      'volume_ratio': 0.10,
      'volatility': 0.11,
      'support_distance': 0.08,
      'resistance_distance': 0.07,
      'time_of_day': 0.05
    };
  }
}

/**
 * LSTM模型实现（简化版）
 */
class LSTMModel implements MLModel {
  type = 'LSTM';
  private model: any = null;
  private trained = false;
  private sequenceLength = 60;

  async train(data: TrainingDataPoint[]): Promise<void> {
    console.info(`开始训练LSTM模型，样本数: ${data.length}`);
    
    // 准备序列数据
    const sequences = this.prepareSequenceData(data);
    
    // 模拟LSTM训练
    this.model = {
      weights: Array.from({ length: 100 }, () => Math.random()),
      biases: Array.from({ length: 50 }, () => Math.random()),
      layers: 3
    };
    
    this.trained = true;
    console.info('LSTM模型训练完成');
  }

  async predict(features: FeatureSet): Promise<MLPrediction> {
    if (!this.trained) {
      throw new Error('LSTM模型未训练');
    }

    // 模拟LSTM预测
    const currentPrice = features.priceFeatures[0] || 100;
    const priceChange = this.simulateLSTMPrediction(features);
    const predictedPrice = currentPrice * (1 + priceChange);
    
    let direction: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
    if (Math.abs(priceChange) > 0.02) {
      direction = priceChange > 0 ? 'UP' : 'DOWN';
    }

    return {
      predictedPrice,
      direction,
      confidence: 0.75,
      timeHorizon: 24,
      modelType: this.type,
      featureImportance: {
        'sequence_pattern': 0.4,
        'trend_momentum': 0.3,
        'volatility_regime': 0.2,
        'volume_pattern': 0.1
      }
    };
  }

  /**
   * 模拟LSTM预测
   * @param features 特征集
   * @returns 预测信号
   */
  private simulateLSTMPrediction(features: FeatureSet): number {
    // 简化的LSTM预测逻辑
    const priceFeatures = features.priceFeatures;
    const technicalFeatures = features.technicalFeatures;
    // 基于RSI和移动平均的简单逻辑
    let signal = 0;
    
    if (technicalFeatures.length >= 3) {
      const rsi = technicalFeatures[2];
      if (rsi < 30) signal += 0.05; // 超卖
      if (rsi > 70) signal -= 0.05; // 超买
    }
    
    if (priceFeatures.length >= 3) {
      const shortMA = priceFeatures[1];
      const longMA = priceFeatures[2];
      const current = priceFeatures[0];
      
      if (current > shortMA && shortMA > longMA) signal += 0.03; // 上涨趋势
      if (current < shortMA && shortMA < longMA) signal -= 0.03; // 下跌趋势
    }
    return signal + (Math.random() - 0.5) * 0.02; // 添加随机噪声
  }

  /**
   * 评估模型性能
   * @param testData 测试数据
   * @returns 模型性能指标
   */
  async evaluate(testData: TrainingDataPoint[]): Promise<ModelPerformance> {
    // 简化的评估实现
    return {
      accuracy: 0.72,
      precision: 0.70,
      recall: 0.75,
      f1Score: 0.72,
      mse: 0.0025,
      sharpeRatio: 1.5,
      maxDrawdown: 0.12
    };
  }

  getFeatureImportance(): Record<string, number> {
    return {
      'sequence_pattern': 0.4,
      'trend_momentum': 0.3,
      'volatility_regime': 0.2,
      'volume_pattern': 0.1
    };
  }

  async save(path: string): Promise<void> {
    console.info(`保存LSTM模型到: ${path}`);
  }
  async load(path: string): Promise<void> {
    console.info(`从文件加载LSTM模型: ${path}`);
    this.trained = true;
  }

  private prepareSequenceData(data: TrainingDataPoint[]): number[][][] {
    // 准备LSTM序列数据
    const sequences: number[][][] = [];
    
    for (let i = this.sequenceLength; i < data.length; i++) {
      const sequence: number[][] = [];
      for (let j = i - this.sequenceLength; j < i; j++) {
        const features = [
          ...data[j].features.priceFeatures,
          ...data[j].features.technicalFeatures,
          ...data[j].features.volumeFeatures
        ];
        sequence.push(features);
      }
      sequences.push(sequence);
    }
    
    return sequences;
  }
}

/**
 * 机器学习优化器
 * 用于策略参数的机器学习优化
 * @class MLOptimizer
 */
export class MLOptimizer {
  private config: MLConfig;
  private models = new Map<string, MLModel>();
  private trainingData: TrainingDataPoint[] = [];
  private lastTrainingTime = 0;

  constructor(config: MLConfig) {
    this.config = config;
    this.initializeModels();
  }

  /**
   * 初始化模型
   */
  private initializeModels(): void {
    switch (this.config.modelType) {
      case 'RandomForest':
        this.models.set('primary', new RandomForestModel());
        break;
      case 'LSTM':
        this.models.set('primary', new LSTMModel());
        break;
      case 'XGBoost':
        // 实际项目中可以实现XGBoost
        this.models.set('primary', new RandomForestModel());
        break;
      default:
        this.models.set('primary', new RandomForestModel());
    }
    
    console.info(`初始化ML模型: ${this.config.modelType}`);
  }

  /**
   * 添加训练数据
   */
  addTrainingData(data: MarketData, futureReturn: number): void {
    const features = this.extractFeatures(data);
    const target = this.createTarget(futureReturn);
    
    const dataPoint: TrainingDataPoint = {
      features,
      target,
      timestamp: Date.now(),
      metadata: {
        symbol: data.klines[0]?.symbol || 'UNKNOWN',
        marketCondition: this.assessMarketCondition(data),
        volatility: this.calculateVolatility(data)
      }
    };
    
    this.trainingData.push(dataPoint);
    
    // 限制训练数据大小
    if (this.trainingData.length > 10000) {
      this.trainingData = this.trainingData.slice(-8000);
    }
  }

  /**
   * 训练模型
   */
  async trainModel(): Promise<void> {
    if (this.trainingData.length < this.config.minTrainSamples) {
      console.warn(`训练样本不足: ${this.trainingData.length} < ${this.config.minTrainSamples}`);
      return;
    }

    const now = Date.now();
    const retrainInterval = this.config.retrainInterval * 60 * 60 * 1000;
    
    if (now - this.lastTrainingTime < retrainInterval) {
      return;
    }
    try {
      // 分割训练和测试数据
      const trainSize = Math.floor(this.trainingData.length * 0.8);
      const trainData = this.trainingData.slice(0, trainSize);
      const testData = this.trainingData.slice(trainSize);

      // 训练主模型
      const primaryModel = this.models.get('primary');
      if (primaryModel) {
        await primaryModel.train(trainData);
        
        // 评估模型性能
        const performance = await primaryModel.evaluate(testData);
        console.info('模型训练完成', {
          modelType: this.config.modelType,
          trainSamples: trainData.length,
          testSamples: testData.length,
          accuracy: performance.accuracy,
          mse: performance.mse
        });
      }

      this.lastTrainingTime = now;
    } catch (error) {
      console.error('模型训练失败', error);
    }
  }

  /**
   * 预测
   */
  async predict(data: MarketData): Promise<MLPrediction | null> {
    const primaryModel = this.models.get('primary');
    if (!primaryModel) {
      return null;
    }

    try {
      const features = this.extractFeatures(data);
      const prediction = await primaryModel.predict(features);
      
      // 检查置信度阈值
      if (prediction.confidence < this.config.confidenceThreshold) {
        return null;
      }

      return prediction;
    } catch (error) {
      console.error('预测失败', error);
      return null;
    }
  }

  /**
   * 提取特征
   */
  private extractFeatures(data: MarketData): FeatureSet {
    const klines = data.klines;
    const prices = klines.map((k: Kline) => k.close);
    const volumes = klines.map((k: Kline) => k.volume);
    const highs = klines.map((k: Kline) => k.high);
    const lows = klines.map((k: Kline) => k.low);
    // 价格特征
    const priceFeatures = [
      prices[prices.length - 1], // 当前价格
      ...this.calculateMovingAverages(prices),
      this.calculatePricePosition(prices),
      this.calculatePriceVelocity(prices)
    ];

    // 技术指标特征
    const technicalFeatures = [
      this.calculateRSI(prices),
      ...this.calculateMACD(prices),
      ...this.calculateBollingerBands(prices),
      this.calculateStochastic(highs, lows, prices)
    ];

    // 成交量特征
    const volumeFeatures = [
      volumes[volumes.length - 1],
      this.calculateVolumeMA(volumes),
      this.calculateVolumeRatio(volumes),
      this.calculateOnBalanceVolume(prices, volumes)
    ];

    // 市场微观结构特征
    const microstructureFeatures = [
      this.calculateVolatility(data),
      this.calculateLiquidity(data),
      this.calculateSpread(data),
      this.calculateOrderFlow(data)
    ];

    // 时间特征
    const now = new Date();
    const timeFeatures = [
      now.getHours() / 24, // 小时特征
      now.getDay() / 7,    // 星期特征
      now.getMonth() / 12, // 月份特征
      this.calculateSeasonality(now)
    ];

    return {
      priceFeatures,
      technicalFeatures,
      volumeFeatures,
      microstructureFeatures,
      timeFeatures
    };
  }

  /**
   * 创建目标变量
   */
  private createTarget(futureReturn: number): {
    priceChange: number;
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    profitability: number;
  } {
    let direction: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
    if (Math.abs(futureReturn) > 0.02) {
      direction = futureReturn > 0 ? 'UP' : 'DOWN';
    }

    return {
      priceChange: futureReturn,
      direction,
      profitability: Math.abs(futureReturn) > 0.03 ? 1 : 0 // 盈利阈值3%
    };
  }

  // =================== 技术指标计算方法 ===================

  private calculateMovingAverages(prices: number[]): number[] {
    const sma5 = MathUtils.sma(prices, 5);
    const sma20 = MathUtils.sma(prices, 20);
    const ema12 = MathUtils.ema(prices, 12);
    
    return [
      sma5[sma5.length - 1] || 0,
      sma20[sma20.length - 1] || 0,
      ema12[ema12.length - 1] || 0
    ];
  }
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): number[] {
    const ema12 = MathUtils.ema(prices, 12);
    const ema26 = MathUtils.ema(prices, 26);
    
    if (ema12.length === 0 || ema26.length === 0) return [0, 0, 0];
    
    const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    const signalLine = macdLine * 0.9; // 简化实现
    const histogram = macdLine - signalLine;
    
    return [macdLine, signalLine, histogram];
  }

  private calculateBollingerBands(prices: number[], period: number = 20): number[] {
    if (prices.length < period) return [0, 0, 0];
    
    const sma = MathUtils.sma(prices, period);
    const currentSMA = sma[sma.length - 1];
    
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - currentSMA, 2);
    }, 0) / period;
    
    const stdDev = Math.sqrt(variance);
    const upperBand = currentSMA + (stdDev * 2);
    const lowerBand = currentSMA - (stdDev * 2);
    return [upperBand, lowerBand, (prices[prices.length - 1] - lowerBand) / (upperBand - lowerBand)];
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period) return 50;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    if (highestHigh === lowestLow) return 50;
    
    return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  }

  private calculatePricePosition(prices: number[]): number {
    if (prices.length < 20) return 0.5;
    
    const recent20 = prices.slice(-20);
    const min = Math.min(...recent20);
    const max = Math.max(...recent20);
    const current = prices[prices.length - 1];
    
    return max === min ? 0.5 : (current - min) / (max - min);
  }

  private calculatePriceVelocity(prices: number[]): number {
    if (prices.length < 5) return 0;
    
    const recent5 = prices.slice(-5);
    const slope = (recent5[4] - recent5[0]) / 4;
    return slope / recent5[0]; // 相对速度
  }

  private calculateVolumeMA(volumes: number[], period: number = 20): number {
    if (volumes.length < period) return volumes[volumes.length - 1] || 0;
    
    const recentVolumes = volumes.slice(-period);
    return recentVolumes.reduce((sum: number, v: number) => sum + v, 0) / period;
  }

  private calculateVolumeRatio(volumes: number[]): number {
    const currentVolume = volumes[volumes.length - 1] || 0;
    const avgVolume = this.calculateVolumeMA(volumes);
    
    return avgVolume === 0 ? 1 : currentVolume / avgVolume;
  }

  private calculateOnBalanceVolume(prices: number[], volumes: number[]): number {
    let obv = 0;
    for (let i = 1; i < Math.min(prices.length, volumes.length); i++) {
      if (prices[i] > prices[i - 1]) {
        obv += volumes[i];
      } else if (prices[i] < prices[i - 1]) {
        obv -= volumes[i];
      }
    }
    
    return obv;
  }

  private calculateVolatility(data: MarketData): number {
    const prices = data.klines.map(k => k.close);
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    return MathUtils.standardDeviation(returns);
  }

  private calculateLiquidity(data: MarketData): number {
    // 简化的流动性计算
    const volumes = data.klines.map(k => k.volume);
    const avgVolume = volumes.reduce((sum: number, v: number) => sum + v, 0) / volumes.length;
    return Math.log(avgVolume + 1); // 对数变换
  }

  private calculateSpread(data: MarketData): number {
    // 简化的价差计算
    const lastKline = data.klines[data.klines.length - 1];
    return (lastKline.high - lastKline.low) / lastKline.close;
  }
  private calculateOrderFlow(data: MarketData): number {
    // 简化的订单流计算
    const volumes = data.klines.map(k => k.volume);
    const prices = data.klines.map(k => k.close);
    
    let buyVolume = 0;
    let sellVolume = 0;
    
    for (let i = 1; i < Math.min(prices.length, volumes.length); i++) {
      if (prices[i] > prices[i - 1]) {
        buyVolume += volumes[i];
      } else {
        sellVolume += volumes[i];
      }
    }
    
    const totalVolume = buyVolume + sellVolume;
    return totalVolume === 0 ? 0 : (buyVolume - sellVolume) / totalVolume;
  }

  private calculateSeasonality(date: Date): number {
    // 简化的季节性特征
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return Math.sin(2 * Math.PI * dayOfYear / 365);
  }

  private assessMarketCondition(data: MarketData): string {
    const prices = data.klines.map(k => k.close);
    const sma20 = MathUtils.sma(prices, 20);
    const currentPrice = prices[prices.length - 1];
    const sma20Current = sma20[sma20.length - 1];
    
    if (currentPrice > sma20Current * 1.05) return 'BULL_MARKET';
    if (currentPrice < sma20Current * 0.95) return 'BEAR_MARKET';
    return 'SIDEWAYS_MARKET';
  }

  /**
   * 获取模型状态
   */
  getModelStatus(): {
    modelType: string;
    trainingSamples: number;
    lastTrainingTime: number;
    isReady: boolean;
  } {
    return {
      modelType: this.config.modelType,
      trainingSamples: this.trainingData.length,
      lastTrainingTime: this.lastTrainingTime,
      isReady: this.trainingData.length >= this.config.minTrainSamples
    };
  }

  /**
   * 获取特征重要性
   */
  getFeatureImportance(): Record<string, number> {
    const primaryModel = this.models.get('primary');
    return primaryModel ? primaryModel.getFeatureImportance() : {};
  }
}