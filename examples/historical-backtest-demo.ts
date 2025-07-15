/**
 * 历史回测演示程序
 * 展示如何使用回测系统进行2年历史数据回测、参数优化和报告生成
 */

import { HistoricalBacktestRunner, HistoricalBacktestConfig } from '../src/backtest/runners/HistoricalBacktestRunner';
import { LeftSideBuildingStrategy } from '../src/strategies/advanced/LeftSideBuildingStrategy';
import { MovingAverageStrategy } from '../src/strategies/traditional/MovingAverageStrategy';
import { createLogger } from '../src/utils/logger';
import { DateUtils } from '../src/utils';
import * as path from 'path';

const logger = createLogger('BACKTEST_DEMO');

/**
 * 演示基础回测
 */
async function demoBasicBacktest(): Promise<void> {
  console.log('🚀 演示基础历史回测');
  console.log('='.repeat(50));

  const runner = new HistoricalBacktestRunner();

  // 配置移动平均策略回测
  const config: HistoricalBacktestConfig = {
    strategy: {
      name: 'MovingAverageStrategy',
      class: MovingAverageStrategy,
      config: {
        name: 'MA_Demo',
        enabled: true,
        parameters: {
          shortPeriod: 10,
          longPeriod: 30,
          rsiPeriod: 14,
          rsiOverbought: 70,
          rsiOversold: 30
        },
        riskManagement: {
          maxPositionSize: 0.2,
          stopLossPercent: 0.05,
          takeProfitPercent: 0.15
        }
      }
    },
    
    symbol: 'BTCUSDT',
    interval: '1h',
    
    timeRange: {
      years: 2 // 最近2年
    },
    
    backtest: {
      initialCapital: 100000,
      commission: 0.001, // 0.1%手续费
      slippage: 5, // 5个基点滑点
      compoundReturns: true,
      riskFreeRate: 0.03, // 3%无风险利率
      benchmarkReturn: 0.08 // 8%基准收益
    },
    
    report: {
      title: '移动平均策略 - BTCUSDT 2年回测报告',
      includeTradeDetails: true,
      includeMonthlyAnalysis: true,
      includeRiskAnalysis: true,
      format: 'html',
      outputPath: './reports/basic_backtest_report.html'
    },
    
    dataCache: {
      enabled: true,
      cacheDir: './cache/backtest',
      expireHours: 24
    }
  };

  try {
    console.log(`\n📊 开始回测配置:`);
    console.log(`策略: ${config.strategy.name}`);
    console.log(`品种: ${config.symbol}`);
    console.log(`K线周期: ${config.interval}`);
    console.log(`初始资金: $${config.backtest.initialCapital.toLocaleString()}`);
    console.log(`回测年数: ${config.timeRange.years}年\n`);

    const result = await runner.runHistoricalBacktest(config);

    console.log('\n✅ 回测完成!');
    console.log(`📈 总收益率: ${(result.backtest.returns.totalReturn * 100).toFixed(2)}%`);
    console.log(`📊 年化收益率: ${(result.backtest.returns.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`📉 最大回撤: ${(result.backtest.risk.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`⚡ 夏普比率: ${result.backtest.riskAdjusted.sharpeRatio.toFixed(2)}`);
    console.log(`🎯 胜率: ${(result.backtest.trading.winRate * 100).toFixed(1)}%`);
    console.log(`💼 交易次数: ${result.backtest.trading.totalTrades}`);
    console.log(`📋 报告文件: ${result.reportPath}`);
    console.log(`⏱️  总耗时: ${(result.execution.totalDuration / 1000).toFixed(2)}秒\n`);

  } catch (error) {
    console.error('❌ 回测失败:', error.message);
  }
}

/**
 * 演示参数优化回测
 */
async function demoOptimizationBacktest(): Promise<void> {
  console.log('🎛️  演示参数优化回测');
  console.log('='.repeat(50));

  const runner = new HistoricalBacktestRunner();

  // 配置带参数优化的左侧建仓策略回测
  const config: HistoricalBacktestConfig = {
    strategy: {
      name: 'LeftSideBuildingStrategy',
      class: LeftSideBuildingStrategy,
      config: {
        name: 'LeftSide_Optimized',
        enabled: true,
        parameters: {
          minDropPercent: 0.05,
          addPositionDropInterval: 0.03,
          maxBuildingTimes: 4,
          basePositionSize: 1000,
          positionMultiplier: 1.5,
          stopLossFromHigh: 0.20
        },
        riskManagement: {
          maxPositionSize: 0.3,
          stopLossPercent: 0.08,
          takeProfitPercent: 0.25
        },
        batchTrading: {
          maxBatches: 5,
          enableBatchOpening: true,
          enableBatchClosing: true,
          initialPositionRatio: 0.2,
          addPositionInterval: 0.03,
          reducePositionInterval: 0.10,
          minBatchSize: 100
        },
        leftSideTrading: {
          enabled: true,
          priceDropThreshold: 0.05,
          maxBuildPositions: 4,
          buildPositionInterval: 300000,
          quantityIncreaseRatio: 0.5,
          priceConfirmationPeriod: 3
        },
        mlConfig: {
          enabled: false,
          modelType: 'RandomForest',
          featureWindowSize: 60,
          predictionWindowSize: 24,
          retrainInterval: 24,
          minTrainSamples: 1000,
          confidenceThreshold: 0.65,
          features: []
        },
        dynamicParameter: {
          enabled: false,
          adjustmentFrequency: 24,
          evaluationPeriod: 7,
          adjustmentMagnitude: 0.2,
          minPerformanceThreshold: 0.5,
          adjustableParameters: []
        }
      }
    },
    
    symbol: 'ETHUSDT',
    interval: '4h',
    
    timeRange: {
      years: 1.5 // 1.5年，减少优化时间
    },
    
    backtest: {
      initialCapital: 50000,
      commission: 0.001,
      slippage: 10,
      compoundReturns: true,
      riskFreeRate: 0.03
    },
    
    optimization: {
      enabled: true,
      parameterRanges: {
        minDropPercent: { min: 0.03, max: 0.08, step: 0.01 },
        addPositionDropInterval: { min: 0.02, max: 0.05, step: 0.01 },
        stopLossFromHigh: { min: 0.15, max: 0.30, step: 0.05 },
        maxBuildingTimes: { min: 3, max: 6, step: 1 }
      },
      metric: 'sharpeRatio',
      maxOptimizationTime: 1800 // 30分钟
    },
    
    report: {
      title: '左侧建仓策略 - ETHUSDT 参数优化回测报告',
      includeTradeDetails: true,
      includeMonthlyAnalysis: true,
      includeRiskAnalysis: true,
      format: 'html',
      outputPath: './reports/optimization_backtest_report.html'
    },
    
    dataCache: {
      enabled: true,
      cacheDir: './cache/backtest',
      expireHours: 12
    }
  };

  try {
    console.log(`\n🔧 参数优化配置:`);
    console.log(`优化目标: ${config.optimization!.metric}`);
    console.log(`参数范围:`);
    
    Object.entries(config.optimization!.parameterRanges).forEach(([param, range]) => {
      console.log(`  ${param}: ${range.min} - ${range.max} (步长: ${range.step})`);
    });

    // 计算优化组合数
    const combinations = Object.values(config.optimization!.parameterRanges).reduce((total, range) => {
      const steps = Math.floor((range.max - range.min) / range.step) + 1;
      return total * steps;
    }, 1);
    
    console.log(`总参数组合数: ${combinations}`);
    console.log(`预计优化时间: ${(combinations * 0.5 / 60).toFixed(1)}分钟\n`);

    const result = await runner.runHistoricalBacktest(config);

    console.log('\n✅ 参数优化回测完成!');
    
    if (result.optimization) {
      console.log('\n🎯 优化结果:');
      console.log(`最优${config.optimization!.metric}: ${result.optimization.bestPerformance.value.toFixed(4)}`);
      console.log('最优参数:');
      
      Object.entries(result.optimization.bestParameters).forEach(([param, value]) => {
        console.log(`  ${param}: ${value}`);
      });

      console.log('\n📊 参数敏感性分析:');
      Object.entries(result.optimization.sensitivity).forEach(([param, sensitivity]) => {
        console.log(`  ${param}: 影响度 ${(sensitivity.impact * 100).toFixed(1)}%, 最优值 ${sensitivity.optimal}`);
      });
    }

    console.log('\n📈 最终回测结果:');
    console.log(`总收益率: ${(result.backtest.returns.totalReturn * 100).toFixed(2)}%`);
    console.log(`年化收益率: ${(result.backtest.returns.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`最大回撤: ${(result.backtest.risk.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`夏普比率: ${result.backtest.riskAdjusted.sharpeRatio.toFixed(2)}`);
    console.log(`胜率: ${(result.backtest.trading.winRate * 100).toFixed(1)}%`);
    console.log(`报告文件: ${result.reportPath}`);
    
    if (result.execution.optimizationTime) {
      console.log(`优化耗时: ${(result.execution.optimizationTime / 1000 / 60).toFixed(1)}分钟`);
    }
    console.log(`总耗时: ${(result.execution.totalDuration / 1000 / 60).toFixed(1)}分钟\n`);

  } catch (error) {
    console.error('❌ 参数优化回测失败:', error.message);
  }
}

/**
 * 演示批量回测对比
 */
async function demoBatchBacktest(): Promise<void> {
  console.log('📊 演示批量回测对比');
  console.log('='.repeat(50));

  const runner = new HistoricalBacktestRunner();

  // 创建多个策略配置进行对比
  const configs: HistoricalBacktestConfig[] = [
    // 移动平均策略 - 保守参数
    {
      strategy: {
        name: 'MA_Conservative',
        class: MovingAverageStrategy,
        config: {
          name: 'MA_Conservative',
          enabled: true,
          parameters: {
            shortPeriod: 5,
            longPeriod: 20,
            rsiPeriod: 14,
            rsiOverbought: 75,
            rsiOversold: 25
          },
          riskManagement: {
            maxPositionSize: 0.15,
            stopLossPercent: 0.03,
            takeProfitPercent: 0.10
          }
        }
      },
      symbol: 'BTCUSDT',
      interval: '1h',
      timeRange: { years: 1 },
      backtest: {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 5,
        compoundReturns: true,
        riskFreeRate: 0.03
      },
      report: {
        title: '移动平均策略(保守) - BTC 1年回测',
        includeTradeDetails: false,
        includeMonthlyAnalysis: true,
        includeRiskAnalysis: true,
        format: 'markdown',
        outputPath: './reports/batch_ma_conservative.md'
      }
    },

    // 移动平均策略 - 激进参数
    {
      strategy: {
        name: 'MA_Aggressive',
        class: MovingAverageStrategy,
        config: {
          name: 'MA_Aggressive',
          enabled: true,
          parameters: {
            shortPeriod: 3,
            longPeriod: 10,
            rsiPeriod: 7,
            rsiOverbought: 65,
            rsiOversold: 35
          },
          riskManagement: {
            maxPositionSize: 0.3,
            stopLossPercent: 0.08,
            takeProfitPercent: 0.20
          }
        }
      },
      symbol: 'BTCUSDT',
      interval: '1h',
      timeRange: { years: 1 },
      backtest: {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 5,
        compoundReturns: true,
        riskFreeRate: 0.03
      },
      report: {
        title: '移动平均策略(激进) - BTC 1年回测',
        includeTradeDetails: false,
        includeMonthlyAnalysis: true,
        includeRiskAnalysis: true,
        format: 'markdown',
        outputPath: './reports/batch_ma_aggressive.md'
      }
    },

    // 左侧建仓策略
    {
      strategy: {
        name: 'LeftSideBuilding',
        class: LeftSideBuildingStrategy,
        config: {
          name: 'LeftSideBuilding',
          enabled: true,
          parameters: {
            minDropPercent: 0.06,
            addPositionDropInterval: 0.04,
            maxBuildingTimes: 4,
            basePositionSize: 1000,
            positionMultiplier: 1.5,
            stopLossFromHigh: 0.22
          },
          riskManagement: {
            maxPositionSize: 0.25,
            stopLossPercent: 0.10,
            takeProfitPercent: 0.30
          },
          batchTrading: {
            maxBatches: 5,
            enableBatchOpening: true,
            enableBatchClosing: true,
            initialPositionRatio: 0.2,
            addPositionInterval: 0.04,
            reducePositionInterval: 0.12,
            minBatchSize: 100
          },
          leftSideTrading: {
            enabled: true,
            priceDropThreshold: 0.06,
            maxBuildPositions: 4,
            buildPositionInterval: 600000,
            quantityIncreaseRatio: 0.5,
            priceConfirmationPeriod: 3
          },
          mlConfig: {
            enabled: false,
            modelType: 'RandomForest',
            featureWindowSize: 60,
            predictionWindowSize: 24,
            retrainInterval: 24,
            minTrainSamples: 1000,
            confidenceThreshold: 0.65,
            features: []
          },
          dynamicParameter: {
            enabled: false,
            adjustmentFrequency: 24,
            evaluationPeriod: 7,
            adjustmentMagnitude: 0.2,
            minPerformanceThreshold: 0.5,
            adjustableParameters: []
          }
        }
      },
      symbol: 'BTCUSDT',
      interval: '1h',
      timeRange: { years: 1 },
      backtest: {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 5,
        compoundReturns: true,
        riskFreeRate: 0.03
      },
      report: {
        title: '左侧建仓策略 - BTC 1年回测',
        includeTradeDetails: false,
        includeMonthlyAnalysis: true,
        includeRiskAnalysis: true,
        format: 'markdown',
        outputPath: './reports/batch_leftside.md'
      }
    }
  ];

  try {
    console.log(`\n🔄 开始批量回测: ${configs.length}个策略`);
    configs.forEach((config, index) => {
      console.log(`  ${index + 1}. ${config.strategy.name}`);
    });
    console.log('');

    const results = await runner.runBatchBacktest(configs, {
      maxConcurrency: 2,
      failFast: false
    });

    console.log('\n📊 批量回测结果对比:');
    console.log('='.repeat(80));
    console.log('策略名称'.padEnd(20) + 
                '总收益率'.padEnd(12) +
                '年化收益'.padEnd(12) + 
                '最大回撤'.padEnd(12) + 
                '夏普比率'.padEnd(12) + 
                '胜率'.padEnd(10));
    console.log('-'.repeat(80));

    results.forEach((result, index) => {
      const backtest = result.backtest;
      const name = configs[index].strategy.name;
      
      console.log(
        name.padEnd(20) +
        `${(backtest.returns.totalReturn * 100).toFixed(2)}%`.padEnd(12) +
        `${(backtest.returns.annualizedReturn * 100).toFixed(2)}%`.padEnd(12) +
        `${(backtest.risk.maxDrawdown * 100).toFixed(2)}%`.padEnd(12) +
        `${backtest.riskAdjusted.sharpeRatio.toFixed(2)}`.padEnd(12) +
        `${(backtest.trading.winRate * 100).toFixed(1)}%`.padEnd(10)
      );
    });

    // 找出最佳策略
    let bestStrategy = results[0];
    let bestIndex = 0;
    
    for (let i = 1; i < results.length; i++) {
      if (results[i].backtest.riskAdjusted.sharpeRatio > bestStrategy.backtest.riskAdjusted.sharpeRatio) {
        bestStrategy = results[i];
        bestIndex = i;
      }
    }

    console.log('\n🏆 最佳策略:');
    console.log(`策略: ${configs[bestIndex].strategy.name}`);
    console.log(`夏普比率: ${bestStrategy.backtest.riskAdjusted.sharpeRatio.toFixed(2)}`);
    console.log(`年化收益率: ${(bestStrategy.backtest.returns.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`最大回撤: ${(bestStrategy.backtest.risk.maxDrawdown * 100).toFixed(2)}%\n`);

  } catch (error) {
    console.error('❌ 批量回测失败:', error.message);
  }
}

/**
 * 演示缓存管理
 */
async function demoCacheManagement(): Promise<void> {
  console.log('🗄️  演示缓存管理');
  console.log('='.repeat(50));

  const runner = new HistoricalBacktestRunner();
  const cacheDir = './cache/backtest';

  try {
    // 获取缓存统计
    const stats = await runner.getCacheStats(cacheDir);
    
    console.log('\n📋 缓存统计:');
    console.log(`文件数量: ${stats.fileCount}`);
    console.log(`总大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`最老文件: ${stats.oldestFile || '无'}`);
    console.log(`最新文件: ${stats.newestFile || '无'}`);

    if (stats.fileCount > 0) {
      console.log('\n🧹 清理7天前的缓存文件...');
      await runner.clearCache(cacheDir, 7 * 24); // 清理7天前的文件
      
      const newStats = await runner.getCacheStats(cacheDir);
      console.log(`清理后文件数量: ${newStats.fileCount}`);
      console.log(`节省空间: ${((stats.totalSize - newStats.totalSize) / 1024 / 1024).toFixed(2)} MB`);
    }

  } catch (error) {
    console.error('❌ 缓存管理失败:', error.message);
  }
}

/**
 * 主函数 - 运行所有演示
 */
async function main(): Promise<void> {
  console.log('🎯 AI股票交易系统 - 历史回测演示');
  console.log('='.repeat(60));
  console.log(`开始时间: ${DateUtils.formatTimestamp(Date.now())}`);
  console.log('');

  try {
    // 1. 基础回测演示
    await demoBasicBacktest();
    console.log('\n' + '='.repeat(60) + '\n');

    // 2. 参数优化回测演示 (注释掉以节省时间)
    console.log('⏭️  跳过参数优化演示 (取消注释以运行)');
    // await demoOptimizationBacktest();
    // console.log('\n' + '='.repeat(60) + '\n');

    // 3. 批量回测演示
    await demoBatchBacktest();
    console.log('\n' + '='.repeat(60) + '\n');

    // 4. 缓存管理演示
    await demoCacheManagement();

    console.log('\n🎉 所有演示完成!');
    console.log('📁 查看 ./reports/ 目录获取生成的回测报告');
    
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行演示
if (require.main === module) {
  main().catch(console.error);
}

// 导出演示函数供其他模块使用
export {
  demoBasicBacktest,
  demoOptimizationBacktest,
  demoBatchBacktest,
  demoCacheManagement
};