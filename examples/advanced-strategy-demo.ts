  console.log(`   平均建仓价格: ${(positions.reduce((sum, p) => sum + p.price * p.quantity, 0) / positions.reduce((sum, p) => sum + p.quantity, 0)).toFixed(2)}`);
  
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
    const data = marketSimulator.generateKlineData('TSLA', 100);
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
    const testData = marketSimulator.generateKlineData('TSLA', 60);
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
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([feature, importance]) => {
          console.log(`   ${feature}: ${(importance * 100).toFixed(1)}%`);
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
        const oldValue = currentParams[key];
        if (oldValue !== undefined) {
          const change = ((value - oldValue) / oldValue * 100).toFixed(1);
          console.log(`   ${key}: ${oldValue} -> ${value} (${change > 0 ? '+' : ''}${change}%)`);
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
    console.log('❌ 参数优化失败:', error.message);
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
  const tradeHistory = [];

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
    const signal = await strategy.generateAdvancedSignal(marketData);
    if (signal) {
      totalSignals++;
      const currentPrice = marketData.klines[marketData.klines.length - 1].close;
      
      console.log(`   策略信号: ${signal.signalType} ${signal.side}`);
      console.log(`   价格: ${currentPrice.toFixed(2)}, 数量: ${signal.quantity}`);
      console.log(`   置信度: ${(signal.confidence * 100).toFixed(1)}%`);

      // 模拟交易结果
      const simulatedReturn = (Math.random() - 0.4) * 0.15; // 偏向盈利的随机收益
      const profit = signal.quantity * currentPrice * simulatedReturn;
      totalProfits += profit;

      tradeHistory.push({
        cycle: cycle.name,
        signal: signal.signalType,
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