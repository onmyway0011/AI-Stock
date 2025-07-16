/**
 * 高级策略演示程序
 * 展示左侧建仓策略、机器学习优化和动态参数调整的完整使用流程
 */

import { LeftSideBuildingStrategy, LeftSideBuildingConfig } from '../src/strategies/advanced/LeftSideBuildingStrategy';
import { MLOptimizer } from '../src/strategies/ml/MLOptimizer';
import { DynamicParameterAdjuster } from '../src/strategies/optimization/DynamicParameterAdjuster';
import { MarketData, KlineData, Signal, OrderSide, SignalStrength } from '../src/types';

/**
 * 市场数据模拟器
 */
class MarketDataSimulator {
  /**
   * 生成模拟K线数据
   */
  generateKlineData(symbol: string, count: number, startPrice: number = 100): MarketData {
    const klines: KlineData[] = [];
    let currentPrice = startPrice;
    const baseTime = Date.now() - count * 3600000; // 往前推N小时

    for (let i = 0; i < count; i++) {
      const volatility = 0.02; // 2% 波动率
      const change = (Math.random() - 0.5) * volatility;
      const open = currentPrice;
      const high = currentPrice * (1 + Math.abs(change) + Math.random() * 0.01);
      const low = currentPrice * (1 - Math.abs(change) - Math.random() * 0.01);
      const close = currentPrice * (1 + change);
      const volume = Math.random() * 1000000 + 500000;

      klines.push({
        symbol,
        openTime: baseTime + i * 3600000,
        closeTime: baseTime + (i + 1) * 3600000,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume: volume * currentPrice,
        trades: Math.floor(Math.random() * 1000) + 100,
        interval: '1h'
      });

      currentPrice = close;
    }

    return {
      symbol,
      klines,
      timestamp: Date.now(),
      source: 'simulator'
    };
  }

  /**
   * 模拟牛市行情
   */
  simulateBullMarket(symbol: string = 'BTCUSDT', days: number = 30): MarketData {
    const klines: KlineData[] = [];
    let currentPrice = 45000;
    const baseTime = Date.now() - days * 24 * 3600000;
    const trend = 0.003; // 每小时0.3%的上涨趋势

    for (let i = 0; i < days * 24; i++) {
      const volatility = 0.015;
      const randomChange = (Math.random() - 0.5) * volatility;
      const trendChange = trend + randomChange;
      
      const open = currentPrice;
      const close = currentPrice * (1 + trendChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 2000000 + 1000000;

      klines.push({
        symbol,
        openTime: baseTime + i * 3600000,
        closeTime: baseTime + (i + 1) * 3600000,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume: volume * currentPrice,
        trades: Math.floor(Math.random() * 2000) + 500,
        interval: '1h'
      });

      currentPrice = close;
    }

    return {
      symbol,
      klines,
      timestamp: Date.now(),
      source: 'simulator'
    };
  }

  /**
   * 模拟熊市行情
   */
  simulateMarketCrash(symbol: string = 'BTCUSDT', days: number = 15): MarketData {
    const klines: KlineData[] = [];
    let currentPrice = 50000;
    const baseTime = Date.now() - days * 24 * 3600000;

    for (let i = 0; i < days * 24; i++) {
      const volatility = 0.025; // 更高的波动率
      const trend = -0.005; // 每小时-0.5%的下跌趋势
      const randomChange = (Math.random() - 0.5) * volatility;
      const trendChange = trend + randomChange;
      
      const open = currentPrice;
      const close = currentPrice * (1 + trendChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.015);
      const low = Math.min(open, close) * (1 - Math.random() * 0.02);
      const volume = Math.random() * 3000000 + 2000000; // 更高的成交量

      klines.push({
        symbol,
        openTime: baseTime + i * 3600000,
        closeTime: baseTime + (i + 1) * 3600000,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume: volume * currentPrice,
        trades: Math.floor(Math.random() * 3000) + 1000,
        interval: '1h'
      });

      currentPrice = close;
    }

    return {
      symbol,
      klines,
      timestamp: Date.now(),
      source: 'simulator'
    };
  }

  /**
   * 模拟震荡行情
   */
  simulateSidewaysMarket(symbol: string = 'BTCUSDT', days: number = 45): MarketData {
    const klines: KlineData[] = [];
    let currentPrice = 47000;
    const basePrice = currentPrice;
    const baseTime = Date.now() - days * 24 * 3600000;

    for (let i = 0; i < days * 24; i++) {
      const volatility = 0.02;
      const meanReversion = (basePrice - currentPrice) / basePrice * 0.01; // 回归均值的力量
      const randomChange = (Math.random() - 0.5) * volatility;
      const trendChange = meanReversion + randomChange;
      
      const open = currentPrice;
      const close = currentPrice * (1 + trendChange);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1500000 + 800000;

      klines.push({
        symbol,
        openTime: baseTime + i * 3600000,
        closeTime: baseTime + (i + 1) * 3600000,
        open,
        high,
        low,
        close,
        volume,
        quoteVolume: volume * currentPrice,
        trades: Math.floor(Math.random() * 1500) + 300,
        interval: '1h'
      });

      currentPrice = close;
    }

    return {
      symbol,
      klines,
      timestamp: Date.now(),
      source: 'simulator'
    };
  }
}

/**
 * 简化的持仓信息接口
 */
interface PositionInfo {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  level: number;
}

/**
 * 主演示函数
 */
async function runAdvancedStrategyDemo(): Promise<void> {
  console.log('🚀 AI股票交易系统 - 高级策略演示');
  console.log('='.repeat(60));
  console.log('本演示将展示左侧建仓策略的完整功能：');
  console.log('• 智能建仓逻辑');
  console.log('• 机器学习优化');
  console.log('• 动态参数调整');
  console.log('• 综合策略应用');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 初始化组件
    const marketSimulator = new MarketDataSimulator();
    const strategyConfig: LeftSideBuildingConfig = {
      minDropPercent: 0.05,           // 5%跌幅触发建仓
      addPositionDropInterval: 0.03,  // 3%间隔加仓
      maxBuildingTimes: 5,            // 最多5次建仓
      basePositionSize: 1000,         // 基础仓位1000
      positionMultiplier: 1.5,        // 加仓倍数1.5
      priceConfirmationPeriods: 3,    // 3个周期确认
      stopLossFromHigh: 0.25,         // 25%止损
      profitTakingThresholds: [0.10, 0.20, 0.35], // 分批减仓阈值
      reductionRatios: [0.3, 0.5, 1.0],           // 减仓比例
      buildPositionInterval: 3600000, // 1小时建仓间隔
      confidenceThreshold: 0.8        // 80%置信度阈值
    };

    const strategy = new LeftSideBuildingStrategy(strategyConfig);
    const mlOptimizer = new MLOptimizer({
      modelType: 'randomForest',
      trainingSamples: 100,
      validationRatio: 0.2,
      confidenceThreshold: 0.7
    });
    const parameterAdjuster = new DynamicParameterAdjuster({
      optimizationMethod: 'bayesian',
      maxIterations: 50,
      targetMetric: 'sharpeRatio',
      minImprovement: 0.05
    });

    // 运行各个演示
    await demoBasicStrategy(strategy, marketSimulator);
    await demoMLOptimization(strategy, mlOptimizer, marketSimulator);
    await demoDynamicParameterAdjustment(strategy, parameterAdjuster, marketSimulator);
    await demoIntegratedStrategy(strategy, mlOptimizer, parameterAdjuster, marketSimulator);

    console.log('🎉 演示完成！');
    console.log('\n💡 总结：');
    console.log('• 左侧建仓策略在下跌市场中能够有效分批建仓');
    console.log('• 机器学习优化可以提高策略的预测准确性');
    console.log('• 动态参数调整能够适应不同的市场环境');
    console.log('• 综合使用多种技术可以显著提升交易表现');

  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error);
  }
}

/**
 * 演示基础策略功能
 */
async function demoBasicStrategy(
  strategy: LeftSideBuildingStrategy,
  marketSimulator: MarketDataSimulator
): Promise<void> {
  console.log('📊 演示基础左侧建仓策略');
  console.log('='.repeat(50));

  // 模拟市场下跌场景
  console.log('\n🔻 模拟市场下跌场景...');
  const crashData = marketSimulator.simulateMarketCrash('BTCUSDT', 10);
  const startPrice = crashData.klines[0].close;
  const endPrice = crashData.klines[crashData.klines.length - 1].close;
  const totalDrop = (startPrice - endPrice) / startPrice;

  console.log(`市场表现: ${startPrice.toFixed(2)} -> ${endPrice.toFixed(2)}`);
  console.log(`总跌幅: ${(totalDrop * 100).toFixed(2)}%\n`);

  // 分段处理数据，模拟实时信号生成
  const segmentSize = 24; // 每24小时处理一次
  let totalSignals = 0;
  const positions: PositionInfo[] = [];

  for (let i = segmentSize; i <= crashData.klines.length; i += segmentSize) {
    const segmentData: MarketData = {
      symbol: crashData.symbol,
      klines: crashData.klines.slice(0, i),
      timestamp: crashData.klines[i - 1].closeTime,
      source: 'simulator'
    };

    const signal = await strategy.generateSignal(segmentData);
    if (signal) {
      totalSignals++;
      const currentPrice = segmentData.klines[segmentData.klines.length - 1].close;
      
      console.log(`📈 生成信号 #${totalSignals}:`);
      console.log(`   时间: ${new Date(segmentData.timestamp).toLocaleString()}`);
      console.log(`   操作: ${signal.side} ${signal.symbol}`);
      console.log(`   价格: ${currentPrice.toFixed(2)}`);
      console.log(`   数量: ${signal.quantity}`);
      console.log(`   置信度: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`   策略: ${signal.strategy}`);
      console.log(`   原因: ${signal.reason}`);

      if (signal.side === OrderSide.BUY) {
        positions.push({
          symbol: signal.symbol,
          price: currentPrice,
          quantity: signal.quantity,
          timestamp: segmentData.timestamp,
          level: positions.length + 1
        });
      }
      console.log('');
    }
  }

  // 显示建仓统计
  console.log('📊 建仓统计:');
  console.log(`   总信号数: ${totalSignals}`);
  console.log(`   建仓次数: ${positions.length}`);
  if (positions.length > 0) {
    const totalQuantity = positions.reduce((sum, p) => sum + p.quantity, 0);
    const totalCost = positions.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const avgPrice = totalCost / totalQuantity;
    console.log(`   总持仓量: ${totalQuantity.toFixed(2)}`);
    console.log(`   平均建仓价格: ${avgPrice.toFixed(2)}`);
    console.log(`   当前价格: ${endPrice.toFixed(2)}`);
    console.log(`   浮动盈亏: ${((endPrice - avgPrice) / avgPrice * 100).toFixed(2)}%`);
  }
  console.log('');

  // 获取策略当前状态
  const currentState = await strategy.getCurrentState();
  console.log(`   当前活跃仓位: ${currentState.positions.length}`);
  console.log('');
}

/**
 * 演示机器学习优化
 */
async function demoMLOptimization(
  strategy: LeftSideBuildingStrategy,
  mlOptimizer: MLOptimizer,
  marketSimulator: MarketDataSimulator
): Promise<void> {
  console.log('🤖 演示机器学习优化');
  console.log('='.repeat(50));

  // 生成训练数据
  console.log('\n📚 生成训练数据...');
  for (let i = 0; i < 50; i++) {
    const data = marketSimulator.generateKlineData('BTCUSDT', 100);
    const futureReturn = (Math.random() - 0.5) * 0.2; // 模拟未来收益
    mlOptimizer.addTrainingData(data, futureReturn);
  }

  const modelStatus = mlOptimizer.getModelStatus();
  console.log(`训练样本数: ${modelStatus.trainingSamples}`);
  console.log(`模型类型: ${modelStatus.modelType}`);
  console.log(`模型就绪: ${modelStatus.isReady ? '是' : '否'}\n`);

  // 训练模型
  if (modelStatus.isReady) {
    console.log('🏋️  开始训练ML模型...');
    await mlOptimizer.trainModel();
    console.log('✅ 模型训练完成\n');

    // 进行预测
    console.log('🔮 进行ML预测...');
    const testData = marketSimulator.generateKlineData('BTCUSDT', 60);
    const prediction = await mlOptimizer.predict(testData);

    if (prediction) {
      console.log(`预测结果:`);
      console.log(`   当前价格: ${testData.klines[testData.klines.length - 1].close.toFixed(2)}`);
      console.log(`   预测价格: ${prediction.predictedPrice.toFixed(2)}`);
      console.log(`   预测方向: ${prediction.direction}`);
      console.log(`   置信度: ${(prediction.confidence * 100).toFixed(1)}%`);
      console.log(`   时间范围: ${prediction.timeHorizon}小时`);
      
      // 显示特征重要性
      console.log(`\n📈 特征重要性:`);
      const featureImportance = mlOptimizer.getFeatureImportance();
      Object.entries(featureImportance)
        .sort(([,a], [,b]) => Number(b) - Number(a))
        .slice(0, 5)
        .forEach(([feature, importance]) => {
          console.log(`   ${feature}: ${(Number(importance) * 100).toFixed(1)}%`);
        });
    } else {
      console.log('❌ 预测置信度不足，未生成预测结果');
    }
  }
  console.log('');
}

/**
 * 演示动态参数调整
 */
async function demoDynamicParameterAdjustment(
  strategy: LeftSideBuildingStrategy,
  parameterAdjuster: DynamicParameterAdjuster,
  marketSimulator: MarketDataSimulator
): Promise<void> {
  console.log('⚙️  演示动态参数调整');
  console.log('='.repeat(50));

  // 模拟当前策略性能
  const currentPerformance = {
    totalReturn: 0.08,
    sharpeRatio: 0.45, // 低于阈值，需要优化
    maxDrawdown: 0.15,
    winRate: 0.55,
    profitFactor: 1.3,
    averageTrade: 0.02,
    tradeCount: 150,
    volatility: 0.25,
    calmarRatio: 0.6,
    sortinoRatio: 0.8
  };

  console.log('\n📊 当前策略性能:');
  console.log(`   总收益率: ${(currentPerformance.totalReturn * 100).toFixed(2)}%`);
  console.log(`   夏普比率: ${currentPerformance.sharpeRatio.toFixed(2)}`);
  console.log(`   最大回撤: ${(currentPerformance.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`   胜率: ${(currentPerformance.winRate * 100).toFixed(1)}%`);
  console.log(`   交易次数: ${currentPerformance.tradeCount}\n`);

  // 获取当前参数
  const currentParams = strategy.getParameters();
  console.log('🔧 当前策略参数:');
  console.log(`   最小跌幅触发: ${(currentParams.minDropPercent * 100).toFixed(1)}%`);
  console.log(`   加仓间隔: ${(currentParams.addPositionDropInterval * 100).toFixed(1)}%`);
  console.log(`   止损线: ${(currentParams.stopLossFromHigh * 100).toFixed(1)}%`);
  console.log(`   最大建仓次数: ${currentParams.maxBuildingTimes}次\n`);

  // 执行参数优化
  console.log('🔍 开始参数优化...');
  
  try {
    // 尝试贝叶斯优化
    const optimizationResult = await parameterAdjuster.optimizeParameters(
      currentParams,
      currentPerformance,
      'bayesian'
    );

    console.log('✅ 参数优化完成\n');
    
    console.log('📈 优化结果:');
    console.log(`   优化类型: ${optimizationResult.optimizationType}`);
    console.log(`   是否应用: ${optimizationResult.shouldApply ? '是' : '否'}`);
    
    console.log('\n🎯 性能对比:');
    console.log('   优化前:');
    console.log(`     收益率: ${(optimizationResult.beforePerformance.returns * 100).toFixed(2)}%`);
    console.log(`     夏普比率: ${optimizationResult.beforePerformance.sharpeRatio.toFixed(2)}`);
    console.log(`     最大回撤: ${(optimizationResult.beforePerformance.maxDrawdown * 100).toFixed(2)}%`);
    
    console.log('   优化后:');
    console.log(`     收益率: ${(optimizationResult.afterPerformance.returns * 100).toFixed(2)}%`);
    console.log(`     夏普比率: ${optimizationResult.afterPerformance.sharpeRatio.toFixed(2)}`);
    console.log(`     最大回撤: ${(optimizationResult.afterPerformance.maxDrawdown * 100).toFixed(2)}%`);
    if (Object.keys(optimizationResult.adjustedParameters).length > 0) {
      console.log('\n🔧 调整的参数:');
      Object.entries(optimizationResult.adjustedParameters).forEach(([key, value]) => {
        const oldValue = (currentParams as any)[key];
        if (oldValue !== undefined) {
          const change = ((Number(value) - Number(oldValue)) / Number(oldValue) * 100).toFixed(1);
          console.log(`   ${key}: ${oldValue} -> ${value} (${Number(change) > 0 ? '+' : ''}${change}%)`);
        }
      });
    }

    console.log('\n💡 优化建议:');
    optimizationResult.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    // 如果建议应用，更新策略参数
    if (optimizationResult.shouldApply) {
      console.log('\n🔄 应用新参数...');
      strategy.updateParameters(optimizationResult.adjustedParameters);
      console.log('✅ 参数更新完成');
    }

  } catch (error) {
    console.log('❌ 参数优化失败:', (error as Error).message);
  }
  
  console.log('');
}

/**
 * 综合策略演示
 */
async function demoIntegratedStrategy(
  strategy: LeftSideBuildingStrategy,
  mlOptimizer: MLOptimizer,
  parameterAdjuster: DynamicParameterAdjuster,
  marketSimulator: MarketDataSimulator
): Promise<void> {
  console.log('🎯 综合策略演示');
  console.log('='.repeat(50));

  console.log('\n🔄 运行完整策略流程...\n');

  let totalSignals = 0;
  let totalProfits = 0;
  const tradeHistory: Array<{
    cycle: string;
    signal: string;
    price: number;
    quantity: number;
    return: number;
    profit: number;
  }> = [];

  // 模拟多个市场周期
  const marketCycles = [
    { name: '牛市阶段', generator: () => marketSimulator.simulateBullMarket() },
    { name: '熊市阶段', generator: () => marketSimulator.simulateMarketCrash() },
    { name: '震荡阶段', generator: () => marketSimulator.simulateSidewaysMarket() }
  ];

  for (const cycle of marketCycles) {
    console.log(`📊 处理${cycle.name}...`);
    
    const marketData = cycle.generator();
    const startPrice = marketData.klines[0].close;
    const endPrice = marketData.klines[marketData.klines.length - 1].close;
    const marketReturn = (endPrice - startPrice) / startPrice;
    
    console.log(`   市场表现: ${startPrice.toFixed(2)} -> ${endPrice.toFixed(2)} (${(marketReturn * 100).toFixed(2)}%)`);
    // 1. 使用ML预测
    const mlPrediction = await mlOptimizer.predict(marketData);
    if (mlPrediction) {
      console.log(`   ML预测: ${mlPrediction.direction} (置信度: ${(mlPrediction.confidence * 100).toFixed(1)}%)`);
    }

    // 2. 生成策略信号
    const signal = await strategy.generateSignal(marketData);
    if (signal) {
      totalSignals++;
      const currentPrice = marketData.klines[marketData.klines.length - 1].close;
      
      console.log(`   策略信号: ${signal.side}`);
      console.log(`   价格: ${currentPrice.toFixed(2)}, 数量: ${signal.quantity}`);
      console.log(`   置信度: ${(signal.confidence * 100).toFixed(1)}%`);

      // 模拟交易结果
      const simulatedReturn = (Math.random() - 0.4) * 0.15; // 偏向盈利的随机收益
      const profit = signal.quantity * currentPrice * simulatedReturn;
      totalProfits += profit;

      tradeHistory.push({
        cycle: cycle.name,
        signal: signal.side,
        price: currentPrice,
        quantity: signal.quantity,
        return: simulatedReturn,
        profit
      });
      console.log(`   模拟收益: ${(simulatedReturn * 100).toFixed(2)}% (${profit.toFixed(2)})`);
    } else {
      console.log(`   无信号生成`);
    }

    // 3. 每个周期后进行ML模型训练
    mlOptimizer.addTrainingData(marketData, marketReturn);

    console.log('');
  }

  // 综合结果统计
  console.log('📈 综合结果统计:');
  console.log(`   总信号数: ${totalSignals}`);
  console.log(`   总盈亏: ${totalProfits.toFixed(2)}`);
  console.log(`   平均每笔: ${totalSignals > 0 ? (totalProfits / totalSignals).toFixed(2) : '0'}`);
  
  if (tradeHistory.length > 0) {
    const winningTrades = tradeHistory.filter(t => t.profit > 0).length;
    const winRate = winningTrades / tradeHistory.length;
    console.log(`   胜率: ${(winRate * 100).toFixed(1)}%`);
    
    const avgWin = tradeHistory.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0) / (winningTrades || 1);
    const avgLoss = Math.abs(tradeHistory.filter(t => t.profit <= 0).reduce((sum, t) => sum + t.profit, 0) / ((tradeHistory.length - winningTrades) || 1));
    console.log(`   盈亏比: ${(avgWin / (avgLoss || 1)).toFixed(2)}`);
  }

  // 最终策略状态
  console.log('\n🎯 最终策略状态:');
  const finalState = await strategy.getCurrentState();
  console.log(`   活跃仓位: ${finalState.positions.length}`);
  console.log(`   监控品种: ${finalState.activeSymbols.length}`);

  const modelStatus = mlOptimizer.getModelStatus();
  console.log(`   ML模型训练样本: ${modelStatus.trainingSamples}`);
  console.log(`   模型就绪状态: ${modelStatus.isReady ? '就绪' : '未就绪'}`);

  const optimizationHistory = parameterAdjuster.getOptimizationHistory();
  console.log(`   参数优化历史: ${optimizationHistory.length}次`);
}

/**
 * 运行演示程序
 */
if (require.main === module) {
  runAdvancedStrategyDemo().catch(console.error);
}

export { runAdvancedStrategyDemo };