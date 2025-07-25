#!/usr/bin/env ts-node
/**
 * AI股票交易系统 - 回测运行脚本
 * 支持单策略回测、参数优化、策略对比等功能
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { HistoricalBacktestRunner, HistoricalBacktestConfig } from '../src/backtest/runners/HistoricalBacktestRunner';
import { MovingAverageStrategy } from '../src/strategies/traditional/MovingAverageStrategy';
import { LeftSideBuildingStrategy } from '../src/strategies/advanced/LeftSideBuildingStrategy';
import { BaseStrategy } from '../src/strategies/base/BaseStrategy';

const program = new Command();

/**
 * 策略类型定义
 */
type StrategyConstructor = new (config: any) => BaseStrategy;

/**
 * 策略映射
 */
const STRATEGIES: Record<string, StrategyConstructor> = {
  'ma': MovingAverageStrategy as StrategyConstructor,
  'moving-average': MovingAverageStrategy as StrategyConstructor,
  'leftside': LeftSideBuildingStrategy as StrategyConstructor,
  'left-side-building': LeftSideBuildingStrategy as StrategyConstructor
};

/**
 * 设置命令行参数
 */
function setupCommander(): void {
  program
    .name('run-backtest')
    .description('AI股票交易系统回测工具')
    .version('1.0.0');

  // 基础回测命令
  program
    .command('run')
    .description('运行回测')
    .requiredOption('-s, --strategy <strategy>', '策略名称 (ma, leftside)')
    .requiredOption('--symbol <symbol>', '交易品种', 'BTCUSDT')
    .option('--interval <interval>', 'K线周期', '1h')
    .option('--years <years>', '历史数据年数', '2')
    .option('--capital <capital>', '初始资金', '100000')
    .option('--output <output>', '输出目录', './reports')
    .option('--report <format>', '报告格式 (html, markdown, json)', 'html')
    .option('--cache', '启用数据缓存', false)
    .option('--optimize', '启用参数优化', false)
    .option('--config <config>', '配置文件路径')
    .action(async (options) => {
      await runSingleBacktest(options);
    });

  // 参数优化命令
  program
    .command('optimize <strategy>')
    .description('运行参数优化')
    .requiredOption('--symbol <symbol>', '交易品种', 'BTCUSDT')
    .option('--interval <interval>', 'K线周期', '1h')
    .option('--years <years>', '历史数据年数', '2')
    .option('--metric <metric>', '优化目标 (sharpeRatio, totalReturn, maxDrawdown)', 'sharpeRatio')
    .action(async (strategy, options) => {
      await runOptimization(strategy, options);
    });

  // 策略对比命令
  program
    .command('compare')
    .description('运行策略对比')
    .requiredOption('--symbol <symbol>', '交易品种', 'BTCUSDT')
    .option('--interval <interval>', 'K线周期', '1h')
    .option('--years <years>', '历史数据年数', '2')
    .action(async (options) => {
      await runComparison(options);
    });

  // 列出策略命令
  program
    .command('list')
    .description('列出可用策略')
    .action(() => {
      listStrategies();
    });

  // 缓存管理命令
  program
    .command('cache')
    .description('缓存管理')
    .option('--clear', '清理缓存', false)
    .option('--stats', '显示缓存统计', false)
    .option('--days <days>', '清理天数', '7')
    .action(async (options) => {
      await manageCache(options);
    });
}

/**
 * 运行单个回测
 */
async function runSingleBacktest(options: any): Promise<void> {
  try {
    console.log(`🚀 启动回测: ${options.strategy} - ${options.symbol}`);
    
    // 获取策略类
    const StrategyClass = STRATEGIES[options.strategy as keyof typeof STRATEGIES];
    if (!StrategyClass) {
      throw new Error(`未知策略: ${options.strategy}，可用策略: ${Object.keys(STRATEGIES).join(', ')}`);
    }

    // 加载策略配置
    let strategyConfig: any;
    if (options.config) {
      strategyConfig = await loadConfigFile(options.config);
    } else {
      strategyConfig = getDefaultStrategyConfig(options.strategy);
    }

    console.log(`📊 策略配置:`, JSON.stringify(strategyConfig, null, 2));

    // 创建回测配置
    const backtestConfig: HistoricalBacktestConfig = {
      strategy: {
        name: options.strategy,
        class: StrategyClass,
        config: strategyConfig
      },
      symbol: options.symbol,
      interval: options.interval,
      timeRange: {
        years: parseFloat(options.years.toString())
      },
      backtest: {
        initialCapital: parseInt(options.capital.toString()),
        commission: 0.001,
        slippage: 5,
        compoundReturns: true,
        riskFreeRate: 0.03
      },
      report: {
        title: `${options.strategy} - ${options.symbol} 回测报告`,
        includeTradeDetails: true,
        includeMonthlyAnalysis: true,
        includeRiskAnalysis: true,
        format: options.report as any,
        outputPath: path.join(options.output, `${options.strategy}_${options.symbol}_backtest.${options.report}`)
      },
      dataCache: options.cache ? {
        enabled: true,
        cacheDir: './cache/backtest',
        expireHours: 24
      } : undefined
    };

    // 添加参数优化配置
    if (options.optimize) {
      backtestConfig.optimization = getOptimizationConfig(options.strategy);
    }

    // 运行回测
    const runner = new HistoricalBacktestRunner();
    const result = await runner.runHistoricalBacktest(backtestConfig);

    // 输出结果
    console.log('\n✅ 回测完成!');
    console.log('='.repeat(50));
    console.log(`📈 总收益率: ${(result.backtest.returns.totalReturn * 100).toFixed(2)}%`);
    console.log(`📊 年化收益率: ${(result.backtest.returns.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`📉 最大回撤: ${(result.backtest.risk.maxDrawdown * 100).toFixed(2)}%`);
    console.log(`⚡ 夏普比率: ${result.backtest.riskAdjusted.sharpeRatio.toFixed(2)}`);
    console.log(`🎯 胜率: ${(result.backtest.trading.winRate * 100).toFixed(1)}%`);
    console.log(`💼 交易次数: ${result.backtest.trading.totalTrades}`);
    console.log(`📋 报告文件: ${result.reportPath}`);
    console.log(`⏱️  总耗时: ${(result.execution.totalDuration / 1000).toFixed(2)}秒`);

    if (result.optimization) {
      console.log('\n🎯 优化结果:');
      console.log(`最优${backtestConfig.optimization!.metric}: ${result.optimization.bestPerformance.value.toFixed(4)}`);
      console.log('最优参数:', JSON.stringify(result.optimization.bestParameters, null, 2));
    }

  } catch (error) {
    console.error('❌ 回测失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * 列出可用策略
 */
function listStrategies(): void {
  console.log('📋 可用策略:');
  console.log('');
  
  const strategies = [
    {
      name: 'ma (moving-average)',
      description: '移动平均策略 - 基于短期和长期移动平均线的交叉信号',
      parameters: 'shortPeriod, longPeriod, rsiPeriod'
    },
    {
      name: 'leftside (left-side-building)',
      description: '左侧建仓策略 - 在价格下跌过程中分批建仓',
      parameters: 'minDropPercent, addPositionDropInterval, maxBuildingTimes'
    }
  ];

  strategies.forEach((strategy, index) => {
    console.log(`${index + 1}. ${strategy.name}`);
    console.log(`   描述: ${strategy.description}`);
    console.log(`   参数: ${strategy.parameters}`);
    console.log('');
  });
}

/**
 * 运行参数优化
 */
async function runOptimization(strategyName: string, options: any): Promise<void> {
  try {
    console.log(`🎛️  启动参数优化: ${strategyName}`);
    
    const StrategyClass = STRATEGIES[strategyName as keyof typeof STRATEGIES];
    if (!StrategyClass) {
      throw new Error(`未知策略: ${strategyName}`);
    }

    const config: HistoricalBacktestConfig = {
      strategy: {
        name: strategyName,
        class: StrategyClass,
        config: getDefaultStrategyConfig(strategyName)
      },
      symbol: options.symbol,
      interval: options.interval,
      timeRange: {
        years: parseFloat(options.years)
      },
      backtest: {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 10,
        compoundReturns: true,
        riskFreeRate: 0.03
      },
      optimization: getOptimizationConfig(strategyName, options.metric),
      report: {
        title: `${strategyName} 参数优化报告`,
        includeTradeDetails: true,
        includeMonthlyAnalysis: true,
        includeRiskAnalysis: true,
        format: 'html',
        outputPath: `./reports/${strategyName}_optimization.html`
      },
      dataCache: {
        enabled: true,
        cacheDir: './cache/backtest',
        expireHours: 12
      }
    };
    
    const runner = new HistoricalBacktestRunner();
    const result = await runner.runHistoricalBacktest(config);

    console.log('\n✅ 参数优化完成!');
    
    if (result.optimization) {
      console.log(`🎯 最优${options.metric}: ${result.optimization.bestPerformance.value.toFixed(4)}`);
      console.log('🔧 最优参数:');
      
      Object.entries(result.optimization.bestParameters).forEach(([param, value]) => {
        console.log(`   ${param}: ${value}`);
      });

      console.log('\n📊 参数敏感性:');
      Object.entries(result.optimization.sensitivity).forEach(([param, sensitivityData]) => {
        const sensitivity = sensitivityData as any;
        const impact = typeof sensitivity === 'object' && sensitivity.impact ? sensitivity.impact : sensitivity;
        console.log(`   ${param}: 影响度 ${(Number(impact) * 100).toFixed(1)}%`);
      });
    }

    console.log(`\n📋 报告文件: ${result.reportPath}`);

  } catch (error) {
    console.error('❌ 参数优化失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * 运行策略对比
 */
async function runComparison(options: any): Promise<void> {
  try {
    console.log('📊 启动策略对比...');

    const strategies = ['ma', 'leftside'];
    const configs: HistoricalBacktestConfig[] = strategies.map(strategy => ({
      strategy: {
        name: strategy,
        class: STRATEGIES[strategy as keyof typeof STRATEGIES],
        config: getDefaultStrategyConfig(strategy)
      },
      symbol: options.symbol,
      interval: options.interval,
      timeRange: {
        years: parseFloat(options.years)
      },
      backtest: {
        initialCapital: 100000,
        commission: 0.001,
        slippage: 5,
        compoundReturns: true,
        riskFreeRate: 0.03
      },
      report: {
        title: `${strategy} 对比报告`,
        includeTradeDetails: false,
        includeMonthlyAnalysis: true,
        includeRiskAnalysis: true,
        format: 'markdown',
        outputPath: `./reports/compare_${strategy}.md`
      }
    }));

    const runner = new HistoricalBacktestRunner();
    const results = await runner.runBatchBacktest(configs, {
      maxConcurrency: 2,
      failFast: false
    });

    console.log('\n📊 策略对比结果:');
    console.log('='.repeat(70));
    console.log('策略'.padEnd(15) + 
                '总收益率'.padEnd(12) + 
                '年化收益'.padEnd(12) + 
                '最大回撤'.padEnd(12) + 
                '夏普比率'.padEnd(10));
    console.log('-'.repeat(70));

    results.forEach((result, index) => {
      const backtest = result.backtest;
      const name = strategies[index];
      
      console.log(
        name.padEnd(15) +
        `${(backtest.returns.totalReturn * 100).toFixed(2)}%`.padEnd(12) +
        `${(backtest.returns.annualizedReturn * 100).toFixed(2)}%`.padEnd(12) +
        `${(backtest.risk.maxDrawdown * 100).toFixed(2)}%`.padEnd(12) +
        `${backtest.riskAdjusted.sharpeRatio.toFixed(2)}`.padEnd(10)
      );
    });

  } catch (error) {
    console.error('❌ 策略对比失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * 缓存管理
 */
async function manageCache(options: any): Promise<void> {
  try {
    const runner = new HistoricalBacktestRunner();
    const cacheDir = './cache/backtest';
    
    if (options.stats) {
      console.log('📊 缓存统计:');
      const stats = await runner.getCacheStats(cacheDir);
      console.log(`文件数量: ${stats.fileCount}`);
      console.log(`总大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`最老文件: ${stats.oldestFile || '无'}`);
      console.log(`最新文件: ${stats.newestFile || '无'}`);
    }

    if (options.clear) {
      console.log(`🧹 清理${options.days}天前的缓存...`);
      await runner.clearCache(cacheDir, parseInt(options.days) * 24);
      console.log('✅ 缓存清理完成');
    }

  } catch (error) {
    console.error('❌ 缓存管理失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * 获取默认策略配置
 */
function getDefaultStrategyConfig(strategyName: string): any {
  switch (strategyName) {
    case 'ma':
    case 'moving-average':
      return {
        name: 'MovingAverage',
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
      };

    case 'leftside':
    case 'left-side-building':
      return {
        name: 'LeftSideBuilding',
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
      };

    default:
      throw new Error(`未知策略: ${strategyName}`);
  }
}

/**
 * 获取优化配置
 */
function getOptimizationConfig(strategyName: string, metric: string = 'sharpeRatio'): any {
  switch (strategyName) {
    case 'ma':
    case 'moving-average':
      return {
        enabled: true,
        parameterRanges: {
          shortPeriod: { min: 5, max: 15, step: 2 },
          longPeriod: { min: 20, max: 40, step: 5 },
          rsiOverbought: { min: 65, max: 80, step: 5 },
          rsiOversold: { min: 20, max: 35, step: 5 }
        },
        metric,
        maxOptimizationTime: 1200 // 20分钟
      };

    case 'leftside':
    case 'left-side-building':
      return {
        enabled: true,
        parameterRanges: {
          minDropPercent: { min: 0.03, max: 0.08, step: 0.01 },
          addPositionDropInterval: { min: 0.02, max: 0.05, step: 0.01 },
          stopLossFromHigh: { min: 0.15, max: 0.30, step: 0.05 },
          maxBuildingTimes: { min: 3, max: 6, step: 1 }
        },
        metric,
        maxOptimizationTime: 1800 // 30分钟
      };

    default:
      return {
        enabled: false,
        parameterRanges: {},
        metric
      };
  }
}

/**
 * 加载配置文件
 */
async function loadConfigFile(configPath: string): Promise<any> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`无法加载配置文件 ${configPath}: ${error.message}`);
  }
}

/**
 * 主入口点
 */
async function main(): Promise<void> {
  console.log('🎯 AI股票交易系统 - 回测工具 v1.0.0');
  console.log('='.repeat(50));
  
  setupCommander();
  
  // 解析命令行参数
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('❌ 命令执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序异常:', error.message);
    process.exit(1);
  });
}

export { main };