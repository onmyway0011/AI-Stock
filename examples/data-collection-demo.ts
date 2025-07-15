/**
 * 股票数据采集演示程序
 * 演示如何使用Alpha Vantage数据采集器获取美股数据
 */

import { AlphaVantageCollector } from '../src/data/collectors/AlphaVantageCollector';
import { DataProcessor } from '../src/data/processors/DataProcessor';
import { DataStorage } from '../src/data/storage/DataStorage';
import { Logger, createLogger } from '../src/utils/logger';
import { DateUtils, FormatUtils } from '../src/utils';
const logger = createLogger('DATA_DEMO');

/**
 * 数据采集演示主函数
 */
async function runDataCollectionDemo(): Promise<void> {
  console.log('🚀 开始股票数据采集演示\n');

  try {
    // 1. 初始化Alpha Vantage数据采集器
    logger.info('初始化Alpha Vantage数据采集器');
    const collector = new AlphaVantageCollector({
      apiKey: process.env.ALPHA_VANTAGE_API_KEY || 'demo',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCache: true
    });

    // 2. 初始化数据处理器
    logger.info('初始化数据处理器');
    const processor = new DataProcessor(
      {
        removeDuplicates: true,
        fillMissingData: true,
        fillMethod: 'forward',
        outlierThreshold: 3,
        removeOutliers: false,
        priceChangeThreshold: 0.15,
        volumeAnomalyThreshold: 5
      },
      {
        pricePrecision: 4,
        volumePrecision: 0,
        timeAlignment: 'start',
        unifyTimezone: true,
        targetTimezone: 'UTC'
      }
    );

    // 3. 初始化数据存储
    logger.info('初始化数据存储');
    const storage = new DataStorage({
      dbPath: './data/stocks.db',
      timeout: 30000,
      enableWAL: true,
      enableForeignKeys: true,
      cacheSize: 2000
    });
    await storage.initialize();

    // 4. 演示获取特斯拉(TSLA)股票数据
    await demoStockData(collector, processor, storage, 'TSLA');

    // 等待一段时间以避免API限制
    console.log('\n⏳ 等待15秒以避免API频率限制...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 5. 演示获取Coinbase(COIN)股票数据
    await demoStockData(collector, processor, storage, 'COIN');

    // 6. 演示批量获取多只股票的价格数据
    await demoBatchTickers(collector, processor, storage);

    // 7. 显示存储统计信息
    await showStorageStats(storage);

    // 8. 关闭存储连接
    await storage.close();
    console.log('\n✅ 数据采集演示完成');

  } catch (error) {
    logger.error('数据采集演示失败', error);
    console.error('❌ 演示程序执行失败:', error.message);
  }
}

/**
 * 演示单个股票数据采集
 */
async function demoStockData(
  collector: AlphaVantageCollector,
  processor: DataProcessor,
  storage: DataStorage,
  symbol: string
): Promise<void> {
  console.log(`\n📈 演示${symbol}股票数据采集`);
  console.log('='.repeat(50));

  try {
    // 1. 获取实时价格数据
    console.log(`\n1. 获取${symbol}实时价格数据:`);
    const ticker = await collector.getTicker(symbol);
    
    console.log(`   价格: $${FormatUtils.formatPrice(ticker.price)}`);
    console.log(`   24h变动: ${FormatUtils.formatChange(ticker.change24h)} (${FormatUtils.formatPercent(ticker.changePercent24h)})`);
    console.log(`   24h最高: $${FormatUtils.formatPrice(ticker.high24h)}`);
    console.log(`   24h最低: $${FormatUtils.formatPrice(ticker.low24h)}`);
    console.log(`   24h成交量: ${FormatUtils.formatVolume(ticker.volume24h)}`);
    console.log(`   更新时间: ${DateUtils.formatTimestamp(ticker.timestamp)}`);

    // 处理并存储价格数据
    const processedTickers = await processor.processTickers([ticker]);
    await storage.saveTickers(processedTickers);

    // 2. 获取日线K线数据
    console.log(`\n2. 获取${symbol}日线K线数据:`);
    const dailyKlines = await collector.getKlines(symbol, '1d', 30);
    if (dailyKlines.length > 0) {
      console.log(`   获取到${dailyKlines.length}条日线数据`);
      console.log(`   时间范围: ${DateUtils.formatTimestamp(dailyKlines[0].openTime)} 到 ${DateUtils.formatTimestamp(dailyKlines[dailyKlines.length - 1].closeTime)}`);
      
      // 显示最近几天的数据
      const recentKlines = dailyKlines.slice(-5);
      console.log('\n   最近5天数据:');
      console.log('   日期         开盘     最高     最低     收盘     成交量');
      console.log('   ' + '-'.repeat(65));
      
      for (const kline of recentKlines) {
        const date = DateUtils.formatTimestamp(kline.openTime, 'YYYY-MM-DD');
        const open = FormatUtils.formatPrice(kline.open).padStart(8);
        const high = FormatUtils.formatPrice(kline.high).padStart(8);
        const low = FormatUtils.formatPrice(kline.low).padStart(8);
        const close = FormatUtils.formatPrice(kline.close).padStart(8);
        const volume = FormatUtils.formatVolume(kline.volume).padStart(10);
        
        console.log(`   ${date} ${open} ${high} ${low} ${close} ${volume}`);
      }

      // 3. 数据处理和质量检查
      console.log(`\n3. 数据处理和质量检查:`);
      const { processedData, qualityReport } = await processor.processKlines(dailyKlines, symbol);
      
      console.log(`   原始数据: ${qualityReport.totalRecords}条`);
      console.log(`   有效数据: ${qualityReport.validRecords}条`);
      console.log(`   质量评分: ${(qualityReport.integrityScore * 100).toFixed(1)}%`);
      console.log(`   缺失数据: ${qualityReport.missingData}条`);
      console.log(`   异常数据: ${qualityReport.anomalousData}条`);
      console.log(`   重复数据: ${qualityReport.duplicateData}条`);
      console.log(`   处理后数据: ${processedData.length}条`);

      // 4. 存储K线数据
      console.log(`\n4. 存储K线数据:`);
      const savedCount = await storage.saveKlines(processedData);
      console.log(`   成功存储: ${savedCount}条`);

      // 5. 计算统计信息
      console.log(`\n5. 数据统计信息:`);
      const stats = processor.calculateStatistics(processedData);
      
      console.log(`   价格统计:`);
      console.log(`     平均价格: $${FormatUtils.formatPrice(stats.priceStats.mean)}`);
      console.log(`     中位数价格: $${FormatUtils.formatPrice(stats.priceStats.median)}`);
      console.log(`     价格标准差: $${FormatUtils.formatPrice(stats.priceStats.std)}`);
      console.log(`     最低价格: $${FormatUtils.formatPrice(stats.priceStats.min)}`);
      console.log(`     最高价格: $${FormatUtils.formatPrice(stats.priceStats.max)}`);
      
      console.log(`   成交量统计:`);
      console.log(`     平均成交量: ${FormatUtils.formatVolume(stats.volumeStats.mean)}`);
      console.log(`     中位数成交量: ${FormatUtils.formatVolume(stats.volumeStats.median)}`);
      console.log(`     最小成交量: ${FormatUtils.formatVolume(stats.volumeStats.min)}`);
      console.log(`     最大成交量: ${FormatUtils.formatVolume(stats.volumeStats.max)}`);

    } else {
      console.log('   未获取到K线数据');
    }

  } catch (error) {
    logger.error(`${symbol}数据采集失败`, error);
    console.error(`   ❌ ${symbol}数据采集失败:`, error.message);
  }
}

/**
 * 演示批量获取股票价格
 */
async function demoBatchTickers(
  collector: AlphaVantageCollector,
  processor: DataProcessor,
  storage: DataStorage
): Promise<void> {
  console.log('\n📊 演示批量获取股票价格');
  console.log('='.repeat(50));

  try {
    const symbols = ['AAPL', 'GOOGL', 'MSFT']; // 选择3只股票以避免API限制
    console.log(`\n批量获取股票: ${symbols.join(', ')}`);
    console.log('⏳ 这可能需要几分钟时间（API频率限制）...\n');

    const tickersMap = await collector.getBatchTickers(symbols);
    
    if (tickersMap.size > 0) {
      console.log('📋 批量价格数据汇总:');
      console.log('股票   价格        24h变动      24h变动%     更新时间');
      console.log('-'.repeat(70));

      const allTickers: any[] = [];
      
      for (const [symbol, ticker] of tickersMap.entries()) {
        const price = FormatUtils.formatPrice(ticker.price).padStart(10);
        const change = FormatUtils.formatChange(ticker.change24h).padStart(10);
        const changePercent = FormatUtils.formatPercent(ticker.changePercent24h).padStart(10);
        const time = DateUtils.formatTimestamp(ticker.timestamp, 'MM-DD HH:mm');
        
        console.log(`${symbol.padEnd(6)} ${price} ${change} ${changePercent} ${time}`);
        allTickers.push(ticker);
      }

      // 处理并存储批量数据
      const processedTickers = await processor.processTickers(allTickers);
      const savedCount = await storage.saveTickers(processedTickers);
      
      console.log(`\n✅ 批量数据处理完成，存储了${savedCount}条价格数据`);

    } else {
      console.log('❌ 未获取到批量价格数据');
    }

  } catch (error) {
    logger.error('批量获取价格数据失败', error);
    console.error('❌ 批量获取失败:', error.message);
  }
}

/**
 * 显示存储统计信息
 */
async function showStorageStats(storage: DataStorage): Promise<void> {
  console.log('\n📊 数据库统计信息');
  console.log('='.repeat(50));

  try {
    const stats = await storage.getStats();
    
    console.log('K线数据:');
    console.log(`  总记录数: ${stats.klines.totalRecords}`);
    console.log(`  股票数量: ${stats.klines.symbols.length}`);
    console.log(`  股票列表: ${stats.klines.symbols.join(', ')}`);
    console.log(`  时间间隔: ${stats.klines.intervals.join(', ')}`);
    
    if (stats.klines.timeRange.start > 0) {
      console.log(`  时间范围: ${DateUtils.formatTimestamp(stats.klines.timeRange.start)} 到 ${DateUtils.formatTimestamp(stats.klines.timeRange.end)}`);
    }

    console.log('\n价格数据:');
    console.log(`  总记录数: ${stats.tickers.totalRecords}`);
    console.log(`  股票数量: ${stats.tickers.symbols.length}`);
    console.log(`  股票列表: ${stats.tickers.symbols.join(', ')}`);
    
    if (stats.tickers.lastUpdate > 0) {
      console.log(`  最后更新: ${DateUtils.formatTimestamp(stats.tickers.lastUpdate)}`);
    }

    // 健康检查
    const healthCheck = await storage.healthCheck();
    console.log(`\n数据库健康状态: ${healthCheck.isHealthy ? '✅ 健康' : '❌ 异常'}`);
    
    if (healthCheck.issues.length > 0) {
      console.log('发现问题:');
      healthCheck.issues.forEach(issue => console.log(`  - ${issue}`));
    }

  } catch (error) {
    logger.error('获取存储统计信息失败', error);
    console.error('❌ 获取统计信息失败:', error.message);
  }
}

/**
 * 演示日志功能
 */
function demoLogging(): void {
  console.log('\n📝 日志系统演示');
  console.log('='.repeat(50));

  const logger = Logger.getInstance();
  
  // 设置关联ID
  logger.setCorrelationId('demo-123');
  
  // 记录不同级别的日志
  logger.debug('这是调试信息', { debugData: 'test' }, 'DEMO');
  logger.info('这是普通信息', { infoData: 'test' }, 'DEMO');
  logger.warn('这是警告信息', { warnData: 'test' }, 'DEMO');
  logger.error('这是错误信息', new Error('测试错误'), { errorData: 'test' }, 'DEMO');

  // 使用专门的日志方法
  logger.dataCollection.info('TSLA', '成功获取数据', { records: 100 });
  logger.strategy.warn('MA_STRATEGY', '信号强度较弱', { strength: 0.3 });

  // 显示日志统计
  const stats = logger.getStats();
  console.log('\n日志统计:');
  console.log(`  总日志数: ${stats.totalLogs}`);
  console.log(`  按级别分布:`, stats.byLevel);
  console.log(`  按模块分布:`, stats.byModule);
  
  logger.clearCorrelationId();
}

/**
 * 主程序入口
 */
if (require.main === module) {
  // 演示日志功能
  demoLogging();
  
  // 运行数据采集演示
  runDataCollectionDemo().catch(error => {
    console.error('程序执行失败:', error);
    process.exit(1);
  });
}

export {
  runDataCollectionDemo,
  demoStockData,
  demoBatchTickers,
  showStorageStats
};