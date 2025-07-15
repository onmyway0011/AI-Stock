/**
 * AI量化交易系统主入口文件
 * 展示系统的完整使用示例和启动流程
 */

import { config, validateConfig } from './config';
import { BinanceCollector } from './data/collectors/BinanceCollector';
import { MovingAverageStrategy } from './strategies/traditional/MovingAverageStrategy';
import { BacktestEngine } from './backtest/engine/BacktestEngine';
import { BaseSignalGenerator } from './signals/generators/BaseSignalGenerator';
import { 
  StrategyConfig,
  BacktestConfig, 
  MarketData, 
  Signal,
  OrderSide,
  SignalStrength
} from './types';
import { DateUtils, FormatUtils } from './utils';

/**
 * 示例信号生成器
 */
class ExampleSignalGenerator extends BaseSignalGenerator {
  async generateSignals(data: MarketData): Promise<Signal[]> {
    const signals: Signal[] = [];
    
    if (data.klines.length < 20) {
      return signals;
    }

    const prices = data.klines.map(k => k.close);
    const currentPrice = prices[prices.length - 1];
    const symbol = data.klines[0].symbol;

    // 简单的价格突破策略
    const recentHigh = Math.max(...prices.slice(-10));
    const recentLow = Math.min(...prices.slice(-10));

    // 突破上轨
    if (currentPrice > recentHigh * 1.02) {
      const signal = this.createSignal(
        symbol,
        OrderSide.BUY,
        currentPrice,
        0.75,
        `价格突破近期高点 ${FormatUtils.formatPrice(recentHigh)}`,
        SignalStrength.STRONG
      );
      signals.push(signal);
    }

    // 跌破下轨
    if (currentPrice < recentLow * 0.98) {
      const signal = this.createSignal(
        symbol,
        OrderSide.SELL,
        currentPrice,
        0.70,
        `价格跌破近期低点 ${FormatUtils.formatPrice(recentLow)}`,
        SignalStrength.MODERATE
      );
      signals.push(signal);
    }

    return signals;
  }
}

/**
 * 主应用程序类
 */
class TradingSystemApp {
  private dataCollector!: BinanceCollector;
  private strategy!: MovingAverageStrategy;
  private signalGenerator!: ExampleSignalGenerator;
  private backtestEngine!: BacktestEngine;

  /**
   * 初始化系统
   */
  async initialize(): Promise<void> {
    console.log('🚀 初始化AI量化交易系统...');

    // 验证配置
    if (!validateConfig()) {
      throw new Error('配置验证失败');
    }

    // 初始化数据采集器
    this.dataCollector = new BinanceCollector({
      baseUrl: config.data.crypto.baseUrl,
      apiKey: config.data.crypto.apiKey,
      apiSecret: config.data.crypto.apiSecret,
      timeout: config.data.crypto.timeout,
      retryCount: config.data.crypto.retryCount,
      rateLimit: config.data.crypto.rateLimit,
      enableCache: true,
      cacheTTL: 60000
    });

    // 初始化策略
    const strategyConfig: StrategyConfig = {
      name: 'MovingAverageStrategy',
      description: '双均线交叉策略',
      parameters: {
        shortPeriod: 5,
        longPeriod: 20,
        maType: 'SMA',
        signalThreshold: 0.02
      },
      riskManagement: config.risk,
      tradingConfig: config.trading
    };

    this.strategy = new MovingAverageStrategy(strategyConfig);
    await this.strategy.initialize();

    // 初始化信号生成器
    this.signalGenerator = new ExampleSignalGenerator({
      name: 'ExampleSignalGenerator',
      enabled: true,
      minConfidence: 0.6,
      signalTTL: 300000, // 5分钟
      cooldownPeriod: 60000, // 1分钟
      maxConcurrentSignals: 5,
      parameters: {}
    });

    // 初始化回测引擎
    this.backtestEngine = new BacktestEngine();

    console.log('✅ 系统初始化完成');
  }

  /**
   * 运行数据采集示例
   */
  async runDataCollectionExample(): Promise<void> {
    console.log('\n📊 数据采集示例');
    console.log('================');

    try {
      const symbol = 'BTCUSDT';
      
      // 获取K线数据
      console.log(`获取 ${symbol} K线数据...`);
      const klines = await this.dataCollector.getKlines(symbol, '1h', 100);
      console.log(`✅ 获取到 ${klines.length} 条K线数据`);
      
      // 显示最新的几条数据
      const latest = klines.slice(-3);
      console.log('\n最新3条K线数据:');
      latest.forEach((k, i) => {
        console.log(`${i + 1}. ${DateUtils.formatTimestamp(k.openTime)} - 开:${FormatUtils.formatPrice(k.open)} 高:${FormatUtils.formatPrice(k.high)} 低:${FormatUtils.formatPrice(k.low)} 收:${FormatUtils.formatPrice(k.close)} 量:${FormatUtils.formatVolume(k.volume)}`);
      });

      // 获取实时价格
      console.log(`\n获取 ${symbol} 实时价格...`);
      const ticker = await this.dataCollector.getTicker(symbol);
      console.log(`✅ 当前价格: ${FormatUtils.formatPrice(ticker.price)} (24h变化: ${FormatUtils.formatPercentage(ticker.changePercent24h)})`);

      // 获取市场深度
      console.log(`\n获取 ${symbol} 市场深度...`);
      const depth = await this.dataCollector.getDepth(symbol, 10);
      console.log(`✅ 买盘深度: ${depth.bids.length} 档，卖盘深度: ${depth.asks.length} 档`);
      console.log(`最佳买价: ${FormatUtils.formatPrice(depth.bids[0][0])} 最佳卖价: ${FormatUtils.formatPrice(depth.asks[0][0])}`);

    } catch (error) {
      console.error('❌ 数据采集失败:', error.message);
    }
  }

  /**
   * 运行策略测试示例
   */
  async runStrategyExample(): Promise<void> {
    console.log('\n📈 策略测试示例');
    console.log('================');

    try {
      const symbol = 'BTCUSDT';
      
      // 获取市场数据
      const klines = await this.dataCollector.getKlines(symbol, '1h', 50);
      const marketData: MarketData = { klines };

      // 生成交易信号
      console.log('生成交易信号...');
      const signal = await this.strategy.processMarketData(marketData);
      
      if (signal) {
        console.log('✅ 生成新信号:');
        console.log(`   交易对: ${signal.symbol}`);
        console.log(`   方向: ${signal.side}`);
        console.log(`   价格: ${FormatUtils.formatPrice(signal.price)}`);
        console.log(`   置信度: ${FormatUtils.formatPercentage(signal.confidence)}`);
        console.log(`   强度: ${signal.strength}`);
        console.log(`   原因: ${signal.reason}`);
        if (signal.stopLoss) {
          console.log(`   止损: ${FormatUtils.formatPrice(signal.stopLoss)}`);
        }
        if (signal.takeProfit) {
          console.log(`   止盈: ${FormatUtils.formatPrice(signal.takeProfit)}`);
        }
      } else {
        console.log('📋 当前市场条件下未生成交易信号');
      }

      // 显示策略状态
      const status = this.strategy.getStatus();
      console.log('\n策略状态:');
      console.log(`   运行状态: ${status.isRunning ? '运行中' : '已停止'}`);
      console.log(`   最后更新: ${DateUtils.formatTimestamp(status.lastUpdate)}`);
      console.log(`   总信号数: ${status.performance.totalSignals}`);
      console.log(`   成功信号数: ${status.performance.successfulSignals}`);
      console.log(`   准确率: ${FormatUtils.formatPercentage(status.performance.accuracy)}`);

    } catch (error) {
      console.error('❌ 策略测试失败:', error.message);
    }
  }

  /**
   * 运行信号生成器示例
   */
  async runSignalGeneratorExample(): Promise<void> {
    console.log('\n🔔 信号生成器示例');
    console.log('===================');

    try {
      const symbol = 'BTCUSDT';
      
      // 获取市场数据
      const klines = await this.dataCollector.getKlines(symbol, '1h', 30);
      const marketData: MarketData = { klines };

      // 生成信号
      console.log('运行信号生成器...');
      const signals = await this.signalGenerator.processMarketData(marketData);
      
      if (signals.length > 0) {
        console.log(`✅ 生成 ${signals.length} 个信号:`);
        signals.forEach((signal, i) => {
          console.log(`\n信号 ${i + 1}:`);
          console.log(`   ID: ${signal.id}`);
          console.log(`   交易对: ${signal.symbol}`);
          console.log(`   方向: ${signal.side}`);
          console.log(`   价格: ${FormatUtils.formatPrice(signal.price)}`);
          console.log(`   置信度: ${FormatUtils.formatPercentage(signal.confidence)}`);
          console.log(`   原因: ${signal.reason}`);
        });
      } else {
        console.log('📋 当前未生成新信号');
      }

      // 显示生成器状态
      const status = this.signalGenerator.getStatus();
      console.log('\n生成器状态:');
      console.log(`   启用状态: ${status.isEnabled ? '已启用' : '已禁用'}`);
      console.log(`   活跃信号: ${status.activeSignals} 个`);
      console.log(`   总生成数: ${status.totalSignalsGenerated} 个`);
      console.log(`   成功率: ${FormatUtils.formatPercentage(status.successRate)}`);
      console.log(`   平均置信度: ${FormatUtils.formatPercentage(status.avgConfidence)}`);

    } catch (error) {
      console.error('❌ 信号生成器测试失败:', error.message);
    }
  }

  /**
   * 运行回测示例
   */
  async runBacktestExample(): Promise<void> {
    console.log('\n📊 回测示例');
    console.log('============');

    try {
      // 配置回测
      const backtestConfig: BacktestConfig = {
        strategy: this.strategy.config,
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        initialCapital: 100000,
        commission: 0.001,
        slippage: 0.0005,
        symbols: ['BTCUSDT']
      };

      console.log('开始回测...');
      console.log(`回测期间: ${backtestConfig.startDate} 至 ${backtestConfig.endDate}`);
      console.log(`初始资金: ${FormatUtils.formatCurrency(backtestConfig.initialCapital)}`);

      // 运行回测（带进度回调）
      const result = await this.backtestEngine.run(backtestConfig, (progress) => {
        if (progress.processedBars % 100 === 0) {
          console.log(`回测进度: ${progress.progressPercent.toFixed(1)}% (${progress.processedBars}/${progress.totalBars})`);
        }
      });

      // 显示回测结果
      console.log('\n✅ 回测完成！');
      console.log('\n回测结果摘要:');
      console.log('================');
      console.log(`总收益率: ${FormatUtils.formatPercentage(result.totalReturn)}`);
      console.log(`年化收益率: ${FormatUtils.formatPercentage(result.annualizedReturn)}`);
      console.log(`最大回撤: ${FormatUtils.formatPercentage(result.maxDrawdown)}`);
      console.log(`夏普比率: ${result.sharpeRatio.toFixed(2)}`);
      console.log(`胜率: ${FormatUtils.formatPercentage(result.winRate)}`);
      console.log(`盈亏比: ${result.profitLossRatio.toFixed(2)}`);
      console.log(`总交易次数: ${result.totalTrades} 次`);

      // 显示最近几笔交易
      if (result.trades.length > 0) {
        console.log('\n最近5笔交易:');
        const recentTrades = result.trades.slice(-5);
        recentTrades.forEach((trade, i) => {
          const pnlColor = trade.pnl > 0 ? '🟢' : '🔴';
          console.log(`${i + 1}. ${pnlColor} ${trade.symbol} ${trade.side} - 盈亏: ${FormatUtils.formatCurrency(trade.pnl)} (${FormatUtils.formatPercentage(trade.pnlPercent)})`);
        });
      }

      // 显示资金曲线关键点
      console.log('\n资金曲线关键点:');
      const keyPoints = result.equityCurve.filter((_, i) => i % Math.floor(result.equityCurve.length / 5) === 0);
      keyPoints.forEach(point => {
        console.log(`${DateUtils.formatTimestamp(point.timestamp)}: ${FormatUtils.formatCurrency(point.equity)} (回撤: ${FormatUtils.formatPercentage(point.drawdown)})`);
      });

    } catch (error) {
      console.error('❌ 回测失败:', error.message);
    }
  }

  /**
   * 运行完整示例
   */
  async runCompleteExample(): Promise<void> {
    console.log('🤖 AI量化交易系统演示');
    console.log('======================');
    console.log(`系统时间: ${DateUtils.formatTimestamp(Date.now())}`);
    console.log(`环境: ${config.environment}`);

    try {
      await this.initialize();
      
      // 依次运行各个模块的示例
      await this.runDataCollectionExample();
      await this.runStrategyExample();
      await this.runSignalGeneratorExample();
      await this.runBacktestExample();

      console.log('\n🎉 演示完成！');
      console.log('\n系统功能说明:');
      console.log('1. 数据采集模块: 支持多种数据源的实时和历史数据获取');
      console.log('2. 策略系统: 基于SOLID原则的可扩展策略框架');
      console.log('3. 信号生成: 智能信号生成和过滤系统');
      console.log('4. 回测引擎: 高性能历史数据回测和性能分析');
      console.log('5. 风险管理: 完善的风险控制和资金管理');

    } catch (error) {
      console.error('❌ 系统运行失败:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 清理系统资源...');
    
    if (this.dataCollector) {
      this.dataCollector.destroy();
    }
    
    if (this.strategy) {
      this.strategy.stop();
    }
    
    if (this.signalGenerator) {
      this.signalGenerator.destroy();
    }
    
    if (this.backtestEngine) {
      this.backtestEngine.stop();
    }

    console.log('✅ 资源清理完成');
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const app = new TradingSystemApp();
  
  // 捕获退出信号，确保资源清理
  process.on('SIGINT', async () => {
    console.log('\n⚠️  接收到退出信号，正在清理资源...');
    await app.cleanup();
    process.exit(0);
  });

  // 运行完整示例
  await app.runCompleteExample();
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('💥 系统启动失败:', error);
    process.exit(1);
  });
}
// 导出主要类供其他模块使用
export {
  TradingSystemApp,
  ExampleSignalGenerator
};