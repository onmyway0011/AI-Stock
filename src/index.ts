/**
 * AI Stock Trading System
 * 主入口文件 - 重构后的三层架构
 */

import { MarketData, Kline, StrategyConfig, BacktestConfig, Signal, OrderSide, Trade, EquityPoint } from './shared/types';
import { FormatUtils } from './shared/utils';

// 核心模块
export * from './modules';

// 业务模块 
export * from './modules';

// 共享资源
export * from './shared';

// 应用入口
// export * from './apps';

// 向后兼容：重新导出原有的核心类
export { TradingSignalGenerator } from './modules/signals/generators/TradingSignalGenerator';
export { SignalService } from './modules/signals/SignalService';
export { NotificationManager } from './modules/notifications/NotificationManager';
export { BacktestEngine } from './modules/backtest/engine/BacktestEngine';

// 新增新浪财经功能的导出
// export { SinaFinanceCollector } from './modules/data/collectors/SinaFinanceCollector';
// 版本信息
export const VERSION = '1.0.0';
export const BUILD_TIME = new Date().toISOString();
export const ARCHITECTURE_VERSION = '3-layer-v1.0';

// 架构信息
export const ARCHITECTURE_INFO = {
  version: ARCHITECTURE_VERSION,
  layers: {
    core: '🔧 核心系统层 - 引擎、接口、常量',
    modules: '💼 业务模块层 - 数据、策略、信号、通知、回测',
    shared: '🛠️ 共享资源层 - 工具、类型、配置、错误',
    apps: '🚀 应用层 - CLI、API'
  },
  migration: {
    compatible: true,
    status: 'backward-compatible',
    description: '新架构向后兼容，原有API保持不变'
  }
};

/**
 * AI量化交易系统主入口文件
 * 展示系统的完整使用示例和启动流程
 */

/**
 * 示例信号生成器
 */
class ExampleSignalGenerator {
  generateSignals(data: { klines: Kline[] }): Signal[] {
    const signals: Signal[] = [];
    
    if (data.klines.length < 20) {
      return signals;
    }

    const prices = data.klines.map((k: Kline) => k.close);
    const currentPrice = prices[prices.length - 1];
    const symbol = data.klines[0].symbol;

    // 简单的价格突破策略
    const recentHigh = Math.max(...prices.slice(-10));
    const recentLow = Math.min(...prices.slice(-10));

    // 突破上轨
    if (currentPrice > recentHigh * 1.02) {
      const signal: Signal = {
        id: `signal-${Date.now()}`,
        symbol,
        side: 'BUY',
        price: currentPrice,
        confidence: 0.75,
        reason: `价格突破近期高点 ${FormatUtils.formatPrice(recentHigh)}`,
        strength: 'STRONG'
      };
      signals.push(signal);
    }

    // 跌破下轨
    if (currentPrice < recentLow * 0.98) {
      const signal: Signal = {
        id: `signal-${Date.now()}`,
        symbol,
        side: 'SELL',
        price: currentPrice,
        confidence: 0.7,
        reason: `价格跌破近期低点 ${FormatUtils.formatPrice(recentLow)}`,
        strength: 'MODERATE'
      };
      signals.push(signal);
    }

    return signals;
  }
}

/**
 * 主应用程序类
 */
class TradingSystemApp {
  private dataCollector!: {
    getKlines: (symbol: string, interval: string, limit: number) => Promise<Kline[]>;
    getTicker: (symbol: string) => Promise<any>;
    getDepth: (symbol: string, limit: number) => Promise<any>;
  };
  private strategy!: {
    processMarketData: (marketData: MarketData) => Promise<Signal>;
    getStatus: () => { isRunning: boolean; lastUpdate: number; performance: { totalSignals: number; successfulSignals: number; accuracy: number } };
    stop: () => void;
    config?: StrategyConfig;
    initialize?: () => Promise<void>;
  };
  private signalGenerator!: ExampleSignalGenerator;
  private backtestEngine!: {
    run: (config: BacktestConfig, onProgress: (progress: { processedBars: number; totalBars: number; progressPercent: number }) => void) => Promise<any>;
    stop: () => void;
  };

  /**
   * 初始化系统
   */
  async initialize(): Promise<void> {
    // 验证配置
    // if (!validateConfig()) { // 已移除
    //   throw new Error('配置验证失败');
    // }

    // 初始化数据采集器
    this.dataCollector = {
      getKlines: (symbol: string, interval: string, limit: number): Promise<Kline[]> => {
        const klines: Kline[] = [];
        for (let i = 0; i < limit; i++) {
          klines.push({
            openTime: Date.now() - (limit - i - 1) * 3600000,
            open: 10000 + i * 100,
            high: 10000 + i * 100 + 50,
            low: 10000 + i * 100 - 50,
            close: 10000 + i * 100 + 20,
            volume: 1000 + i * 100,
            quoteVolume: 100000 + i * 10000,
            takerBuyBaseVolume: 500 + i * 50,
            takerBuyQuoteVolume: 50000 + i * 5000,
            ignore: false,
            closeTime: Date.now() - (limit - i - 1) * 3600000,
            symbol: symbol
          });
        }
        return Promise.resolve(klines);
      },
      getTicker: (symbol: string): Promise<any> => {
        return Promise.resolve({
          symbol: symbol,
          price: 10000 + Math.random() * 1000,
          changePercent24h: Math.random() * 10 - 5,
          lastPrice: 10000 + Math.random() * 1000,
          lastQuantity: 100 + Math.random() * 100,
          bidPrice: 10000 + Math.random() * 100,
          bidQuantity: 50 + Math.random() * 50,
          askPrice: 10000 + Math.random() * 100,
          askQuantity: 50 + Math.random() * 50,
          openPrice: 10000,
          highPrice: 10000 + Math.random() * 1000,
          lowPrice: 10000 - Math.random() * 1000,
          volume: 100000 + Math.random() * 100000,
          quoteVolume: 10000000 + Math.random() * 10000000,
          openTime: Date.now(),
          closeTime: Date.now(),
          firstId: 1,
          lastId: 100,
          count: 100
        });
      },
      getDepth: (symbol: string, limit: number): Promise<any> => {
        return Promise.resolve({
          symbol: symbol,
          bids: Array.from({ length: limit }, (_, i) => [10000 + i * 10, 100 + i * 10]),
          asks: Array.from({ length: limit }, (_, i) => [10000 + i * 10 + 10, 100 + i * 10])
        });
      }
    };

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
      riskManagement: {
        maxPositionSize: 0.1,
        maxDrawdown: 0.2,
        stopLoss: 0.01,
        takeProfit: 0.02
      },
      tradingConfig: {
        leverage: 10,
        maxOpenTrades: 5,
        minTradeSize: 0.001,
        maxTradeSize: 0.1,
        minHoldTime: 60000, // 1分钟
        maxHoldTime: 3600000, // 1小时
        trailingStop: 0.005,
        trailingStopDeviation: 0.001
      }
    };

    this.strategy = {
      processMarketData: (marketData: MarketData): Promise<Signal> => {
        const klines = marketData.klines;
        const prices = klines.map((k: Kline) => k.close);
        const shortMA = this.calculateMA(prices, strategyConfig.parameters.shortPeriod);
        const longMA = this.calculateMA(prices, strategyConfig.parameters.longPeriod);
        const signal: Signal = {
          id: `signal-${Date.now()}`,
          symbol: klines[0].symbol,
          side: 'BUY',
          price: 0,
          confidence: 0,
          reason: '',
          strength: 'MODERATE',
          stopLoss: 0,
          takeProfit: 0
        };
        if (shortMA > longMA) {
          signal.side = 'BUY';
          signal.price = prices[prices.length - 1];
          signal.confidence = 0.8;
          signal.reason = `短期均线 (${FormatUtils.formatPrice(shortMA)}) 上穿长期均线 (${FormatUtils.formatPrice(longMA)})`;
          signal.strength = 'STRONG';
        } else if (shortMA < longMA) {
          signal.side = 'SELL';
          signal.price = prices[prices.length - 1];
          signal.confidence = 0.8;
          signal.reason = `短期均线 (${FormatUtils.formatPrice(shortMA)}) 下穿长期均线 (${FormatUtils.formatPrice(longMA)})`;
          signal.strength = 'STRONG';
        }
        if (signal.side === 'BUY') {
          signal.stopLoss = signal.price * (1 - (strategyConfig.riskManagement?.stopLoss ?? 0));
          signal.takeProfit = signal.price * (1 + (strategyConfig.riskManagement?.takeProfit ?? 0));
        } else {
          signal.stopLoss = signal.price * (1 + (strategyConfig.riskManagement?.stopLoss ?? 0));
          signal.takeProfit = signal.price * (1 - (strategyConfig.riskManagement?.takeProfit ?? 0));
        }
        return Promise.resolve(signal);
      },
      getStatus: () => ({
        isRunning: false,
        lastUpdate: Date.now(),
        performance: {
          totalSignals: 0,
          successfulSignals: 0,
          accuracy: 0
        }
      }),
      stop: () => {
        // no-op
      },
      config: strategyConfig,
      initialize: async () => {}
    };
    await this.strategy.initialize?.();

    // 初始化信号生成器
    this.signalGenerator = new ExampleSignalGenerator();

    // 初始化回测引擎
    this.backtestEngine = {
      run: async (config: BacktestConfig, onProgress: (progress: { processedBars: number; totalBars: number; progressPercent: number }) => void): Promise<any> => {
        const startDate = new Date(config.startDate);
        const endDate = new Date(config.endDate);
        const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const totalBars = totalDays * 24;
        let currentEquity = config.initialCapital;
        let totalPnL = 0;
        let totalTrades = 0;
        let totalLossPnL = 0;
        let totalWinPnL = 0;
        let currentHoldTime = 0;
        let openPrice: number | undefined;
        let openSide: OrderSide | undefined;
        let openTime: number | undefined;
        const trades: Trade[] = [];
        const equityCurve: EquityPoint[] = [];
        let currentPrice = 0;
        for (let i = 0; i < totalBars; i++) {
          const currentTime = startDate.getTime() + i * 3600000;
          const klines = await this.dataCollector.getKlines('BTCUSDT', '1h', 1);
          const marketData: MarketData = { klines, symbol: 'BTCUSDT' };
          const signalArr = this.signalGenerator.generateSignals(marketData);
          const currentSignal = signalArr.length > 0 ? signalArr[0] : null;
          if (currentSignal) {
            currentPrice = currentSignal.price;
            const currentSide = currentSignal.side;
            if (openPrice === undefined) {
              openPrice = currentPrice;
              openSide = currentSide;
              openTime = currentTime;
              currentHoldTime = 0;
            } else {
              currentHoldTime += currentTime - openTime;
            }
            if (openTime !== undefined && currentHoldTime >= (this.strategy.config?.tradingConfig?.minHoldTime ?? 0)) {
              const trade: Trade = {
                id: `trade-${Date.now()}`,
                symbol: currentSignal.symbol,
                entryTime: openTime !== undefined ? openTime : Date.now(),
                exitTime: currentTime,
                entryPrice: openPrice ?? 0,
                exitPrice: currentPrice ?? 0,
                volume: 1,
                pnl: 0,
                pnlPercent: 0,
                reason: currentSignal.reason,
                side: currentSide
              };
              if (currentSide === 'BUY') {
                trade.pnl = (currentPrice ?? 0) - (openPrice ?? 0);
                trade.pnlPercent = ((currentPrice ?? 0) - (openPrice ?? 0)) / ((openPrice ?? 1));
                totalPnL += trade.pnl;
                totalTrades++;
                totalWinPnL += trade.pnl;
              } else {
                trade.pnl = (openPrice ?? 0) - (currentPrice ?? 0);
                trade.pnlPercent = ((openPrice ?? 0) - (currentPrice ?? 0)) / ((openPrice ?? 1));
                totalPnL += trade.pnl;
                totalLossPnL += trade.pnl;
              }
              trades.push(trade);
              totalTrades++;
              currentEquity += trade.pnl;
              equityCurve.push({ time: currentTime, equity: currentEquity, timestamp: currentTime });
              openPrice = undefined;
              openSide = undefined;
              openTime = undefined;
              currentHoldTime = 0;
            }
          }
          const priceChange = Math.random() * 10 - 5;
          currentPrice += priceChange;
          klines[0].close = currentPrice;
          klines[0].high = Math.max(klines[0].high, currentPrice);
          klines[0].low = Math.min(klines[0].low, currentPrice);
          onProgress({
            processedBars: i + 1,
            totalBars: totalBars,
            progressPercent: ((i + 1) / totalBars) * 100
          });
          await new Promise(resolve => setTimeout(resolve, 1));
        }
        if (openPrice !== undefined) {
          const currentSide = openSide ?? 'BUY';
          const trade: Trade = {
            id: `trade-${Date.now()}`,
            symbol: 'BTCUSDT',
            entryTime: openTime !== undefined ? openTime : Date.now(),
            exitTime: Date.now(),
            entryPrice: openPrice ?? 0,
            exitPrice: openPrice ?? 0,
            volume: 1,
            pnl: 0,
            pnlPercent: 0,
            reason: '策略结束',
            side: currentSide
          };
          if (currentSide === 'BUY') {
            trade.pnl = 0;
            trade.pnlPercent = 0;
            totalPnL += trade.pnl;
            totalTrades++;
            totalWinPnL += trade.pnl;
          } else {
            trade.pnl = 0;
            trade.pnlPercent = 0;
            totalPnL += trade.pnl;
            totalLossPnL += trade.pnl;
          }
          trades.push(trade);
          totalTrades++;
          currentEquity += trade.pnl;
          equityCurve.push({ time: Date.now(), equity: currentEquity, timestamp: Date.now() });
        }
        return {
          totalReturn: totalPnL / config.initialCapital,
          annualizedReturn: 0,
          maxDrawdown: 0,
          sharpeRatio: 0,
          winRate: totalTrades / (totalTrades || 1),
          profitLossRatio: totalWinPnL / Math.abs(totalLossPnL || 1),
          totalTrades: totalTrades,
          trades: trades,
          equityCurve: equityCurve
        };
      },
      stop: () => {
        // no-op
      }
    };
  }

  /**
   * 运行数据采集示例
   */
  async runDataCollectionExample(): Promise<void> {
    // 所有 console.log/console.error 替换为注释或无操作，或可用日志库替换
    try {
      const symbol = 'BTCUSDT';
      
      // 获取K线数据
      // console.log(`获取 ${symbol} K线数据...`);
      const klines = await this.dataCollector.getKlines(symbol, '1h', 100);
      // console.log(`✅ 获取到 ${klines.length} 条K线数据`);
      // 显示最新的几条数据
      const latest = klines.slice(-3);
      // console.log('\n最新3条K线数据:');
      // latest.forEach((k: Kline, i: number) => {
      //   console.log(`${i + 1}. ${DateUtils.formatTimestamp(k.openTime)} - 开:${FormatUtils.formatPrice(k.open)} 高:${FormatUtils.formatPrice(k.high)} 低:${FormatUtils.formatPrice(k.low)} 收:${FormatUtils.formatPrice(k.close)} 量:${FormatUtils.formatVolume(k.volume)}`);
      // });

      // 获取实时价格
      // console.log(`\n获取 ${symbol} 实时价格...`);
      const ticker = await this.dataCollector.getTicker(symbol);
      // console.log(`✅ 当前价格: ${FormatUtils.formatPrice(ticker.price)} (24h变化: ${FormatUtils.formatPercentage(ticker.changePercent24h)})`);

      // 获取市场深度
      // console.log(`\n获取 ${symbol} 市场深度...`);
      const depth = await this.dataCollector.getDepth(symbol, 10);
      // console.log(`✅ 买盘深度: ${depth.bids.length} 档，卖盘深度: ${depth.asks.length} 档`);
      // console.log(`最佳买价: ${FormatUtils.formatPrice(depth.bids[0][0])} 最佳卖价: ${FormatUtils.formatPrice(depth.asks[0][0])}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
      // console.error('❌ 数据采集失败:', error.message);
      } else {
        // console.error('❌ 数据采集失败:', error);
      }
    }
  }

  /**
   * 运行策略测试示例
   */
  async runStrategyExample(): Promise<void> {
    // 所有 console.log/console.error 替换为注释或无操作，或可用日志库替换
    try {
      const symbol = 'BTCUSDT';
      
      // 获取市场数据
      const klines = await this.dataCollector.getKlines(symbol, '1h', 50);
      const marketData: MarketData = { klines, symbol: 'BTCUSDT' };

      // 生成交易信号
      // console.log('生成交易信号...');
      const signal = await this.strategy.processMarketData(marketData);
      
      if (signal) {
        // console.log('✅ 生成新信号:');
        // console.log(`   交易对: ${signal.symbol}`);
        // console.log(`   方向: ${signal.side}`);
        // console.log(`   价格: ${FormatUtils.formatPrice(signal.price)}`);
        // console.log(`   置信度: ${FormatUtils.formatPercentage(signal.confidence)}`);
        // console.log(`   强度: ${signal.strength}`);
        // console.log(`   原因: ${signal.reason}`);
        // if (signal.stopLoss) {
        //   console.log(`   止损: ${FormatUtils.formatPrice(signal.stopLoss)}`);
        // }
        // if (signal.takeProfit) {
        //   console.log(`   止盈: ${FormatUtils.formatPrice(signal.takeProfit)}`);
        // }
      } else {
        // console.log('📋 当前市场条件下未生成交易信号');
      }

      // 显示策略状态
      const status = this.strategy.getStatus();
      // console.log('\n策略状态:');
      // console.log(`   运行状态: ${status.isRunning ? '运行中' : '已停止'}`);
      // console.log(`   最后更新: ${DateUtils.formatTimestamp(status.lastUpdate)}`);
      // console.log(`   总信号数: ${status.performance.totalSignals}`);
      // console.log(`   成功信号数: ${status.performance.successfulSignals}`);
      // console.log(`   准确率: ${FormatUtils.formatPercentage(status.performance.accuracy)}`);

    } catch (error: unknown) {
      if (error instanceof Error) {
      // console.error('❌ 策略测试失败:', error.message);
      } else {
        // console.error('❌ 策略测试失败:', error);
      }
    }
  }

  /**
   * 运行信号生成器示例
   */
  async runSignalGeneratorExample(): Promise<void> {
    // 所有 console.log/console.error 替换为注释或无操作，或可用日志库替换
    try {
      const symbol = 'BTCUSDT';
      
      // 获取市场数据
      const klines = await this.dataCollector.getKlines(symbol, '1h', 30);
      const marketData: MarketData = { klines, symbol: 'BTCUSDT' };

      // 生成信号
      // console.log('运行信号生成器...');
      const signals = this.signalGenerator.generateSignals(marketData);
      if (signals.length > 0) {
        // console.log(`✅ 生成 ${signals.length} 个信号:`);
        // signals.forEach((signal: Signal, i: number) => {
        //   console.log(`\n信号 ${i + 1}:`);
        //   console.log(`   ID: ${signal.id}`);
        //   console.log(`   交易对: ${signal.symbol}`);
        //   console.log(`   方向: ${signal.side}`);
        //   console.log(`   价格: ${FormatUtils.formatPrice(signal.price)}`);
        //   console.log(`   置信度: ${FormatUtils.formatPercentage(signal.confidence)}`);
        //   console.log(`   原因: ${signal.reason}`);
        // });
      } else {
        // console.log('📋 当前未生成新信号');
      }

      // 显示生成器状态
      const status = {
        isEnabled: true, // 示例生成器始终启用
        activeSignals: 0, // 示例生成器不跟踪活跃信号
        totalSignalsGenerated: 0, // 示例生成器不跟踪总生成数
        successRate: 0, // 示例生成器不跟踪成功率
        avgConfidence: 0 // 示例生成器不跟踪平均置信度
      };
      // console.log('\n生成器状态:');
      // console.log(`   启用状态: ${status.isEnabled ? '已启用' : '已禁用'}`);
      // console.log(`   活跃信号: ${status.activeSignals} 个`);
      // console.log(`   总生成数: ${status.totalSignalsGenerated} 个`);
      // console.log(`   成功率: ${FormatUtils.formatPercentage(status.successRate)}`);
      // console.log(`   平均置信度: ${FormatUtils.formatPercentage(status.avgConfidence)}`);

    } catch (error: unknown) {
      if (error instanceof Error) {
      // console.error('❌ 信号生成器测试失败:', error.message);
      } else {
        // console.error('❌ 信号生成器测试失败:', error);
      }
    }
  }

  /**
   * 运行回测示例
   */
  async runBacktestExample(): Promise<void> {
    // 所有 console.log/console.error 替换为注释或无操作，或可用日志库替换
    try {
      // 配置回测
      const backtestConfig: BacktestConfig = {
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        initialCapital: 100000,
        commission: 0.001,
        symbols: ['BTCUSDT']
      };
      // console.log('开始回测...');
      // console.log(`回测期间: ${backtestConfig.startDate} 至 ${backtestConfig.endDate}`);
      // console.log(`初始资金: ${FormatUtils.formatCurrency(backtestConfig.initialCapital)}`);
      // 运行回测（带进度回调）
      const result = await this.backtestEngine.run(backtestConfig, (progress: { processedBars: number; totalBars: number; progressPercent: number }) => {
        // if (progress.processedBars % 100 === 0) {
        //   console.log(`回测进度: ${progress.progressPercent.toFixed(1)}% (${progress.processedBars}/${progress.totalBars})`);
        // }
      });

      // 显示回测结果
      // console.log('\n✅ 回测完成！');
      // console.log('\n回测结果摘要:');
      // console.log('================');
      // console.log(`总收益率: ${FormatUtils.formatPercentage(result.totalReturn)}`);
      // console.log(`年化收益率: ${FormatUtils.formatPercentage(result.annualizedReturn)}`);
      // console.log(`最大回撤: ${FormatUtils.formatPercentage(result.maxDrawdown)}`);
      // console.log(`夏普比率: ${result.sharpeRatio.toFixed(2)}`);
      // console.log(`胜率: ${FormatUtils.formatPercentage(result.winRate)}`);
      // console.log(`盈亏比: ${result.profitLossRatio.toFixed(2)}`);
      // console.log(`总交易次数: ${result.totalTrades} 次`);

      // 显示最近几笔交易
      // if (result.trades.length > 0) {
      //   console.log('\n最近5笔交易:');
      //   const recentTrades = result.trades.slice(-5);
      //   recentTrades.forEach((trade: any, i: number) => {
      //     const pnlColor = trade.pnl > 0 ? '🟢' : '🔴';
      //     console.log(`${i + 1}. ${pnlColor} ${trade.symbol} ${trade.side} - 盈亏: ${FormatUtils.formatCurrency(trade.pnl)} (${FormatUtils.formatPercentage(trade.pnlPercent)})`);
      //   });
      // }

      // 显示资金曲线关键点
      // console.log('\n资金曲线关键点:');
      // const keyPoints = result.equityCurve.filter((_: any, i: number) => i % Math.floor(result.equityCurve.length / 5) === 0);
      // keyPoints.forEach((point: any) => {
      //   console.log(`${DateUtils.formatTimestamp(point.timestamp)}: ${FormatUtils.formatCurrency(point.equity)} (回撤: ${FormatUtils.formatPercentage(point.drawdown)})`);
      // });

    } catch (error: unknown) {
      if (error instanceof Error) {
      // console.error('❌ 回测失败:', error.message);
      } else {
        // console.error('❌ 回测失败:', error);
      }
    }
  }

  /**
   * 运行完整示例
   */
  async runCompleteExample(): Promise<void> {
    // 所有 console.log/console.error 替换为注释或无操作，或可用日志库替换
    // console.log('🤖 AI量化交易系统演示');
    // console.log('======================');
    // console.log(`系统时间: ${DateUtils.formatTimestamp(Date.now())}`);
    // console.log(`环境: ${'development'}`); // 已移除

    try {
      await this.initialize();
      
      // 依次运行各个模块的示例
      await this.runDataCollectionExample();
      await this.runStrategyExample();
      await this.runSignalGeneratorExample();
      await this.runBacktestExample();
      // console.log('\n🎉 演示完成！');
      // console.log('\n系统功能说明:');
      // console.log('1. 数据采集模块: 支持多种数据源的实时和历史数据获取');
      // console.log('2. 策略系统: 基于SOLID原则的可扩展策略框架');
      // console.log('3. 信号生成: 智能信号生成和过滤系统');
      // console.log('4. 回测引擎: 高性能历史数据回测和性能分析');
      // console.log('5. 风险管理: 完善的风险控制和资金管理');

    } catch (error: unknown) {
      if (error instanceof Error) {
        // console.error('❌ 系统运行失败:', error.message);
      } else {
      // console.error('❌ 系统运行失败:', error);
      }
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    // 所有 console.log/console.error 替换为注释或无操作，或可用日志库替换
    // console.log('\n🧹 清理系统资源...');
    // if (this.dataCollector) {
    //   // this.dataCollector.destroy(); // BinanceCollector; // 已移除
    // }
    
    // if (this.strategy) {
    //   this.strategy.stop();
    // }
    
    // if (this.signalGenerator) {
    //   // 示例生成器没有 destroy 方法
    // }
    
    // if (this.backtestEngine) {
    //   this.backtestEngine.stop();
    // }
    // console.log('✅ 资源清理完成');
  }

  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) {
      return 0;
    }
    const sum = prices.slice(-period).reduce((a: number, b: number) => a + b, 0);
    return sum / period;
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const app = new TradingSystemApp();
  
  // 捕获退出信号，确保资源清理
  process.on('SIGINT', async () => {
    await app.cleanup();
    process.exit(0);
  });

  // 运行完整示例
  await app.runCompleteExample();
}

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
  main().catch(error => {
    // console.error('�� 系统启动失败:', error);
    process.exit(1);
  });
}
// 导出主要类供其他模块使用
export {
  TradingSystemApp,
  ExampleSignalGenerator
};
