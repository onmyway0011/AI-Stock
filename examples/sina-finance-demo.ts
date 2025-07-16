/**
 * 新浪财经数据收集演示程序
 * 展示如何使用新浪财经API获取A股数据
 */

import { SinaFinanceCollector } from '../src/data/collectors/SinaFinanceCollector';
import { createLogger } from '../src/utils';

const logger = createLogger('SINA_DEMO');

/**
 * 主演示函数
 */
async function runSinaFinanceDemo(): Promise<void> {
  console.log('🚀 新浪财经数据收集演示');
  console.log('='.repeat(50));
  console.log('本演示将展示：');
  console.log('• A股实时价格查询');
  console.log('• 历史K线数据获取');
  console.log('• 多股票批量查询');
  console.log('• 股票搜索功能');
  console.log('• 热门股票');
  console.log('• 股票信息查询');
  console.log('='.repeat(50));
  console.log('');

  try {
    // 创建新浪财经收集器
    const collector = new SinaFinanceCollector({
      timeout: 15000,
      enableCache: true,
      cacheExpiry: 60,
      requestInterval: 500
    });

    await collector.start();
    console.log('✅ 新浪财经收集器启动成功\n');

    // 演示各种功能
    await demoRealTimeData(collector);
    await demoHistoricalData(collector);
    await demoMultipleStocks(collector);
    await demoStockSearch(collector);
    await demoPopularStocks(collector);
    await demoStockInfo(collector);

    await collector.stop();
    console.log('\n✅ 演示完成，收集器已停止');

  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error);
  }
}

/**
 * 演示实时数据获取
 */
async function demoRealTimeData(collector: SinaFinanceCollector): Promise<void> {
  console.log('📊 演示实时数据获取');
  console.log('-'.repeat(30));

  try {
    // 获取几个热门股票的实时数据
    const symbols = ['600036', '000001', '600000', '600519'];
    console.log(`查询股票: ${symbols.join(', ')}\n`);

    const realTimeData = await collector.getRealTimeData(symbols);

    realTimeData.forEach((data, index) => {
      if (data.klines && data.klines.length > 0) {
        const kline = data.klines[0];
        console.log(`📈 ${data.symbol}:`);
        console.log(`   开盘价: ¥${kline.open.toFixed(2)}`);
        console.log(`   最高价: ¥${kline.high.toFixed(2)}`);
        console.log(`   最低价: ¥${kline.low.toFixed(2)}`);
        console.log(`   当前价: ¥${kline.close.toFixed(2)}`);
        console.log(`   成交量: ${(kline.volume / 10000).toFixed(2)}万股`);
        console.log(`   成交额: ¥${(kline.quoteVolume / 100000000).toFixed(2)}亿`);
        
        // 计算涨跌幅
        const change = kline.close - kline.open;
        const changePercent = (change / kline.open * 100);
        const changeColor = change >= 0 ? '🔴' : '🟢';
        console.log(`   涨跌额: ${changeColor} ${change >= 0 ? '+' : ''}¥${change.toFixed(2)}`);
        console.log(`   涨跌幅: ${changeColor} ${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`);
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ 获取实时数据失败:', error);
  }
}

/**
 * 演示历史数据获取
 */
async function demoHistoricalData(collector: SinaFinanceCollector): Promise<void> {
  console.log('📈 演示历史数据获取');
  console.log('-'.repeat(30));

  try {
    const symbol = '600036'; // 招商银行
    console.log(`获取 ${symbol} 的历史数据...\n`);

    const endTime = Date.now();
    const startTime = endTime - 30 * 24 * 60 * 60 * 1000; // 30天前

    const historicalData = await collector.getHistoricalData(
      symbol,
      '1d',
      startTime,
      endTime,
      30
    );

    if (historicalData.klines && historicalData.klines.length > 0) {
      console.log(`📊 ${symbol} 近期历史数据 (最近${historicalData.klines.length}天):\n`);
      
      // 显示最近5天的数据
      const recentData = historicalData.klines.slice(-5);
      
      console.log('日期'.padEnd(12) + '开盘'.padEnd(8) + '最高'.padEnd(8) + '最低'.padEnd(8) + '收盘'.padEnd(8) + '成交量(万)');
      console.log('-'.repeat(60));
      
      recentData.forEach(kline => {
        const date = new Date(kline.openTime).toLocaleDateString();
        const volume = (kline.volume / 10000).toFixed(0);
        
        console.log(
          date.padEnd(12) +
          kline.open.toFixed(2).padEnd(8) +
          kline.high.toFixed(2).padEnd(8) +
          kline.low.toFixed(2).padEnd(8) +
          kline.close.toFixed(2).padEnd(8) +
          volume
        );
      });

      // 计算一些统计数据
      const prices = recentData.map(k => k.close);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      console.log('\n📊 统计数据:');
      console.log(`   最高价: ¥${maxPrice.toFixed(2)}`);
      console.log(`   最低价: ¥${minPrice.toFixed(2)}`);
      console.log(`   平均价: ¥${avgPrice.toFixed(2)}`);
      console.log(`   价格区间: ¥${(maxPrice - minPrice).toFixed(2)} (${((maxPrice - minPrice) / minPrice * 100).toFixed(2)}%)`);
    }

  } catch (error) {
    console.error('❌ 获取历史数据失败:', error);
  }
  
  console.log('');
}

/**
 * 演示多股票批量查询
 */
async function demoMultipleStocks(collector: SinaFinanceCollector): Promise<void> {
  console.log('📋 演示多股票批量查询');
  console.log('-'.repeat(30));

  try {
    const symbols = [
      '600036', // 招商银行
      '000001', // 平安银行
      '600000', // 浦发银行
      '600519', // 贵州茅台
      '000858', // 五粮液
      '002415', // 海康威视
      '000725', // 京东方A
      '600276', // 恒瑞医药
    ];

    console.log(`批量查询 ${symbols.length} 只股票...\n`);

    const startTime = Date.now();
    const multipleData = await collector.getMultipleRealTimeData(symbols);
    const endTime = Date.now();

    console.log(`🚀 查询完成，耗时: ${endTime - startTime}ms\n`);

    // 按涨跌幅排序
    const sortedStocks = multipleData
      .filter(data => data.klines && data.klines.length > 0)
      .map(data => {
        const kline = data.klines[0];
        const change = kline.close - kline.open;
        const changePercent = (change / kline.open * 100);
        return {
          symbol: data.symbol,
          price: kline.close,
          change,
          changePercent,
          volume: kline.volume
        };
      })
      .sort((a, b) => b.changePercent - a.changePercent);

    console.log('📊 今日涨跌幅排行榜:');
    console.log('股票代码'.padEnd(10) + '当前价'.padEnd(10) + '涨跌额'.padEnd(10) + '涨跌幅'.padEnd(10) + '成交量(万)');
    console.log('-'.repeat(55));

    sortedStocks.forEach((stock, index) => {
      const rank = (index + 1).toString().padEnd(2);
      const symbol = stock.symbol.padEnd(8);
      const price = `¥${stock.price.toFixed(2)}`.padEnd(9);
      const change = `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}`.padEnd(9);
      const changePercent = `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`.padEnd(9);
      const volume = (stock.volume / 10000).toFixed(0);
      
      const indicator = stock.changePercent >= 0 ? '🔴' : '🟢';
      
      console.log(`${indicator} ${rank}${symbol} ${price} ${change} ${changePercent} ${volume}`);
    });

  } catch (error) {
    console.error('❌ 批量查询失败:', error);
  }
  
  console.log('');
}

/**
 * 演示股票搜索
 */
async function demoStockSearch(collector: SinaFinanceCollector): Promise<void> {
  console.log('🔍 演示股票搜索');
  console.log('-'.repeat(30));

  try {
    const keywords = ['银行', '600'];
    
    for (const keyword of keywords) {
      console.log(`搜索关键词: "${keyword}"`);
      const searchResults = await collector.searchStocks(keyword);
      
      if (searchResults.length > 0) {
        console.log('搜索结果:');
        searchResults.forEach(result => {
          console.log(`   ${result.symbol} - ${result.name} (${result.exchange})`);
        });
      } else {
        console.log('   未找到相关股票');
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ 股票搜索失败:', error);
  }
}

/**
 * 演示热门股票
 */
async function demoPopularStocks(collector: SinaFinanceCollector): Promise<void> {
  console.log('⭐ 演示热门股票');
  console.log('-'.repeat(30));

  try {
    const popularStocks = await collector.getPopularStocks();
    console.log('热门股票列表:');
    
    const popularData = await collector.getMultipleRealTimeData(popularStocks.slice(0, 5));
    
    popularData.forEach(data => {
      if (data.klines && data.klines.length > 0) {
        const kline = data.klines[0];
        const change = kline.close - kline.open;
        const changePercent = (change / kline.open * 100);
        const trend = change >= 0 ? '📈' : '📉';
        
        console.log(`   ${trend} ${data.symbol}: ¥${kline.close.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
      }
    });

  } catch (error) {
    console.error('❌ 获取热门股票失败:', error);
  }
  
  console.log('');
}

/**
 * 演示股票信息查询
 */
async function demoStockInfo(collector: SinaFinanceCollector): Promise<void> {
  console.log('ℹ️  演示股票信息查询');
  console.log('-'.repeat(30));

  try {
    const symbols = ['600036', '000001'];
    
    for (const symbol of symbols) {
      console.log(`查询 ${symbol} 的基本信息:`);
      const info = await collector.getSymbolInfo(symbol);
      
      console.log(`   股票代码: ${info.symbol}`);
      console.log(`   股票名称: ${info.name}`);
      console.log(`   交易所: ${info.exchange}`);
      console.log(`   类型: ${info.type}`);
      console.log(`   货币: ${info.currency}`);
      console.log(`   时区: ${info.timezone}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ 获取股票信息失败:', error);
  }
}

/**
 * 运行演示程序
 */
if (require.main === module) {
  runSinaFinanceDemo().catch(console.error);
}

export { runSinaFinanceDemo };