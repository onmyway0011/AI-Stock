import { createLogger } from '../../utils/logger';

const logger = createLogger('SINA_CLI');
const program = new Command();

/**
 * 设置命令行程序
 */
function setupCLI(): void {
  program
    .name('sina-cli')
    .description('新浪财经数据查询命令行工具')
    .version('1.0.0');

  // 实时价格查询命令
  program
    .command('price <symbols...>')
    .description('查询股票实时价格')
    .option('-f, --format <format>', '输出格式 (table, json)', 'table')
    .option('-c, --cache', '启用缓存', false)
    .action(async (symbols, options) => {
      await getPrices(symbols, options);
    });

  // 历史数据查询命令
  program
    .command('history <symbol>')
    .description('查询股票历史数据')
    .option('-d, --days <days>', '查询天数', '30')
    .option('-i, --interval <interval>', '时间间隔', '1d')
    .option('-f, --format <format>', '输出格式 (table, json)', 'table')
    .action(async (symbol, options) => {
      await getHistory(symbol, options);
    });

  // 股票搜索命令
  program
    .command('search <keyword>')
    .description('搜索股票')
    .option('-l, --limit <limit>', '限制结果数量', '10')
    .action(async (keyword, options) => {
      await searchStocks(keyword, options);
    });

  // 热门股票命令
  program
    .command('hot')
    .description('获取热门股票')
    .option('-f, --format <format>', '输出格式 (table, json)', 'table')
    .option('-t, --top <number>', '显示前N只股票', '10')
    .action(async (options) => {
      await getHotStocks(options);
    });

  // 股票监控命令
  program
    .command('monitor <symbols...>')
    .description('监控股票价格变化')
    .option('-i, --interval <seconds>', '刷新间隔(秒)', '30')
    .option('-t, --threshold <percent>', '涨跌幅提醒阈值(%)', '5')
    .action(async (symbols, options) => {
      await monitorStocks(symbols, options);
    });

  // 市场概览命令
  program
    .command('market')
    .description('显示市场概览')
    .action(async () => {
      await getMarketOverview();
    });
}

/**
 * 获取股票实时价格
 */
async function getPrices(symbols: string[], options: any): Promise<void> {
  const collector = new SinaFinanceCollector({
    enableCache: options.cache,
    timeout: 10000
  });

  try {
    console.log(`📊 查询股票实时价格: ${symbols.join(', ')}`);
    console.log('');

    await collector.start();
    const data = await collector.getRealTimeData(symbols);

    if (options.format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      displayPriceTable(data);
    }

  } catch (error) {
    console.error(`❌ 查询失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await collector.stop();
  }
}

/**
 * 获取历史数据
 */
async function getHistory(symbol: string, options: any): Promise<void> {
  const collector = new SinaFinanceCollector();
  
  try {
    console.log(`📈 查询 ${symbol} 历史数据 (${options.days}天)`);
    console.log('');

    await collector.start();
    
    const endTime = Date.now();
    const startTime = endTime - parseInt(options.days) * 24 * 60 * 60 * 1000;
    
    const data = await collector.getHistoricalData(symbol, options.interval, startTime, endTime);

    if (options.format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      displayHistoryTable(data);
    }

  } catch (error) {
    console.error(`❌ 查询失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await collector.stop();
  }
}

/**
 * 搜索股票
 */
async function searchStocks(keyword: string, options: any): Promise<void> {
  const collector = new SinaFinanceCollector();
  
  try {
    console.log(`🔍 搜索股票: "${keyword}"`);
    console.log('');

    await collector.start();
    const results = await collector.searchStocks(keyword);
    
    const limitedResults = results.slice(0, parseInt(options.limit));
    
    if (limitedResults.length === 0) {
      console.log('未找到相关股票');
      return;
    }

    console.log('搜索结果:');
    console.log('股票代码'.padEnd(10) + '股票名称'.padEnd(15) + '交易所');
    console.log('-'.repeat(35));
    
    limitedResults.forEach(stock => {
      console.log(
        stock.symbol.padEnd(10) + 
        stock.name.padEnd(15) + 
        stock.exchange
      );
    });

  } catch (error) {
    console.error(`❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await collector.stop();
  }
}

/**
 * 获取热门股票
 */
async function getHotStocks(options: any): Promise<void> {
  const collector = new SinaFinanceCollector();
  
  try {
    console.log('⭐ 热门股票');
    console.log('');

    await collector.start();
    
    const hotStocks = await collector.getPopularStocks();
    const topStocks = hotStocks.slice(0, parseInt(options.top));
    const data = await collector.getMultipleRealTimeData(topStocks);

    if (options.format === 'json') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      displayPriceTable(data);
    }

  } catch (error) {
    console.error(`❌ 获取热门股票失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await collector.stop();
  }
}

/**
 * 监控股票
 */
async function monitorStocks(symbols: string[], options: any): Promise<void> {
  const collector = new SinaFinanceCollector();
  const interval = parseInt(options.interval) * 1000;
  const threshold = parseFloat(options.threshold) / 100;
  
  console.log(`👁️  开始监控股票: ${symbols.join(', ')}`);
  console.log(`刷新间隔: ${options.interval}秒, 提醒阈值: ${options.threshold}%`);
  console.log('按 Ctrl+C 停止监控');
  console.log('');

  await collector.start();

  // 存储上一次的价格用于比较
  let lastPrices: Map<string, number> = new Map();

  const monitor = async () => {
    try {
      const data = await collector.getRealTimeData(symbols);
      
      console.clear();
      console.log(`📊 股票监控 - ${new Date().toLocaleString()}`);
      console.log('='.repeat(60));
      
      displayPriceTable(data, lastPrices, threshold);
      
      // 更新最后价格
      data.forEach(stock => {
        if (stock.klines && stock.klines.length > 0) {
          lastPrices.set(stock.symbol, stock.klines[0].close);
        }
      });

    } catch (error) {
      console.error(`监控错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 立即执行一次
  await monitor();

  // 设置定时器
  const timer = setInterval(monitor, interval);

  // 处理退出信号
  process.on('SIGINT', async () => {
    clearInterval(timer);
    await collector.stop();
    console.log('\n\n👋 监控已停止');
    process.exit(0);
  });
}

/**
 * 获取市场概览
 */
async function getMarketOverview(): Promise<void> {
  const collector = new SinaFinanceCollector();
  
  try {
    console.log('📊 市场概览');
    console.log('');

    await collector.start();
    
    // 获取主要指数
    const indices = ['sh000001', 'sz399001', 'sh000300', 'sz399006'];
    const indexData = await collector.getRealTimeData(indices);
    
    console.log('📈 主要指数:');
    displayPriceTable(indexData);
    
    console.log('\n⭐ 热门股票:');
    const hotStocks = await collector.getPopularStocks();
    const hotData = await collector.getMultipleRealTimeData(hotStocks.slice(0, 5));
    displayPriceTable(hotData);

  } catch (error) {
    console.error(`❌ 获取市场概览失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await collector.stop();
  }
}

/**
 * 显示价格表格
 */
function displayPriceTable(data: any[], lastPrices?: Map<string, number>, threshold?: number): void {
  if (data.length === 0) {
    console.log('无数据');
    return;
  }

  console.log('股票代码'.padEnd(10) + '当前价'.padEnd(10) + '涨跌额'.padEnd(10) + '涨跌幅'.padEnd(10) + '成交量'.padEnd(12) + '成交额');
  console.log('-'.repeat(70));

  data.forEach(stock => {
    if (stock.klines && stock.klines.length > 0) {
      const kline = stock.klines[0];
      const change = kline.close - kline.open;
      const changePercent = (change / kline.open) * 100;
      
      // 价格变化提醒
      let priceAlert = '';
      if (lastPrices && threshold) {
        const lastPrice = lastPrices.get(stock.symbol);
        if (lastPrice) {
          const priceChange = Math.abs((kline.close - lastPrice) / lastPrice);
          if (priceChange >= threshold) {
            priceAlert = ' 🚨';
          }
        }
      }
      
      const symbol = stock.symbol.padEnd(9);
      const price = `¥${kline.close.toFixed(2)}`.padEnd(9);
      const changeAmount = `${change >= 0 ? '+' : ''}${change.toFixed(2)}`.padEnd(9);
      const changePct = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`.padEnd(9);
      const volume = `${(kline.volume / 10000).toFixed(0)}万`.padEnd(11);
      const amount = `${(kline.quoteVolume / 100000000).toFixed(2)}亿`;
      
      const indicator = changePercent >= 0 ? '🔴' : '🟢';
      
      console.log(`${indicator} ${symbol} ${price} ${changeAmount} ${changePct} ${volume} ${amount}${priceAlert}`);
    }
  });
}

/**
 * 显示历史数据表格
 */
function displayHistoryTable(data: any): void {
  if (!data.klines || data.klines.length === 0) {
    console.log('无历史数据');
    return;
  }

  console.log(`📊 ${data.symbol} 历史数据 (最近${data.klines.length}天):`);
  console.log('');
  console.log('日期'.padEnd(12) + '开盘'.padEnd(8) + '最高'.padEnd(8) + '最低'.padEnd(8) + '收盘'.padEnd(8) + '成交量(万)');
  console.log('-'.repeat(60));

  // 显示最近10天的数据
  const recentData = data.klines.slice(-10);
  
  recentData.forEach((kline: any) => {
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

  // 显示统计信息
  const prices = recentData.map((k: any) => k.close);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const avgPrice = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
  
  console.log('\n📊 统计信息:');
  console.log(`最高价: ¥${maxPrice.toFixed(2)}`);
  console.log(`最低价: ¥${minPrice.toFixed(2)}`);
  console.log(`平均价: ¥${avgPrice.toFixed(2)}`);
  console.log(`波动幅度: ¥${(maxPrice - minPrice).toFixed(2)} (${((maxPrice - minPrice) / minPrice * 100).toFixed(2)}%)`);
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  setupCLI();
  
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('❌ 命令执行失败:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

export { main as runSinaCLI };