/**
 * 交易信号系统使用示例
 * 演示80%置信度判断、信号生成、微信推送和通知开关控制
 */

import { SignalService, SignalServiceConfig } from '../src/signals/SignalService';
import {
  SignalType,
  SignalStrength,
  NotificationChannel,
  SignalConfig,
  SignalFilter
} from '../src/types/signal';
import { NotificationConfig } from '../src/notifications/NotificationManager';
import { WeChatConfig } from '../src/notifications/channels/WeChatNotificationChannel';
import { MarketData, Kline } from '../src/types';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('SIGNAL_DEMO');

/**
 * 生成模拟市场数据
 */
function generateMockMarketData(symbol: string): MarketData {
  const basePrice = 100;
  const klines: Kline[] = [];
  
  // 生成100根K线数据
  for (let i = 0; i < 100; i++) {
    const variation = (Math.random() - 0.5) * 0.02; // ±1%变动
    const price = basePrice * (1 + variation * i * 0.01);
    
    const open = price * (1 + (Math.random() - 0.5) * 0.005);
    const close = price * (1 + (Math.random() - 0.5) * 0.005);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 1000000 + Math.random() * 5000000;
    
    klines.push({
      timestamp: Date.now() - (100 - i) * 60000, // 1分钟间隔
      open,
      high,
      low,
      close,
      volume
    });
  }

  return {
    symbol,
    timestamp: Date.now(),
    klines,
    ticker: {
      symbol,
      price: klines[klines.length - 1].close,
      change: 0,
      changePercent: 0,
      volume: klines[klines.length - 1].volume,
      timestamp: Date.now()
    }
  };
}

/**
 * 主演示函数
 */
async function signalSystemDemo(): Promise<void> {
  try {
    logger.info('🚀 启动交易信号系统演示');

    // 1. 配置信号生成器（80%置信度阈值）
    const signalConfig: SignalConfig = {
      enabled: true,
      filter: {
        minConfidence: 0.7, // 最小70%置信度
        allowedTypes: [SignalType.BUY, SignalType.SELL],
        allowedStrengths: [
          SignalStrength.MODERATE,
          SignalStrength.STRONG,
          SignalStrength.VERY_STRONG
        ],
        allowedSymbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'],
        cooldownPeriod: 5 * 60 * 1000, // 5分钟冷却期
        minRiskRewardRatio: 1.5
      },
      notification: {
        enabled: true,
        channels: [NotificationChannel.WECHAT],
        quietHours: {
          start: '23:00',
          end: '07:00'
        },
        maxDailyNotifications: 50
      },
      confidence: {
        threshold: 0.8, // 80%置信度阈值
        sources: {
          technical: 0.7,
          fundamental: 0.2,
          sentiment: 0.1
        }
      },
      riskControl: {
        maxRiskLevel: 'MEDIUM',
        requireStopLoss: true,
        minRiskRewardRatio: 1.5
      }
    };

    // 2. 配置微信推送（需要真实的微信配置）
    const wechatConfig: WeChatConfig = {
      appId: process.env.WECHAT_APP_ID || 'your_app_id',
      appSecret: process.env.WECHAT_APP_SECRET || 'your_app_secret',
      templateId: process.env.WECHAT_TEMPLATE_ID || 'your_template_id',
      userOpenIds: [
        process.env.WECHAT_USER_OPENID || 'user_openid_1'
      ],
      apiBaseUrl: 'https://api.weixin.qq.com',
      tokenCacheTime: 7200
    };

    // 3. 配置通知管理器
    const notificationConfig: NotificationConfig = {
      enabled: true,
      quietHours: {
        start: '23:00',
        end: '07:00'
      },
      maxDailyNotifications: 100,
      notificationInterval: 2000, // 2秒间隔
      enabledChannels: [NotificationChannel.WECHAT],
      channels: {
        wechat: wechatConfig
      },
      filters: {
        minConfidence: 0.8,
        allowedSignalTypes: ['BUY', 'SELL'],
        priorityOnly: false
      }
    };

    // 4. 创建信号服务
    const serviceConfig: SignalServiceConfig = {
      signalConfig,
      notificationConfig,
      autoRun: {
        enabled: false, // 演示中关闭自动运行
        interval: 60000, // 1分钟
        symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT']
      }
    };

    const signalService = new SignalService(serviceConfig);
    // 5. 设置事件监听器
    signalService.on('signal:generated', (signal) => {
      logger.info(`📊 信号生成:`, {
        symbol: signal.symbol,
        type: signal.type,
        confidence: `${(signal.confidence.overall * 100).toFixed(1)}%`,
        strength: signal.strength,
        price: signal.priceSuggestion.entryPrice.toFixed(4),
        stopLoss: signal.priceSuggestion.stopLoss.toFixed(4),
        takeProfit: signal.priceSuggestion.takeProfit.toFixed(4),
        risk: signal.riskAssessment.level
      });
    });

    signalService.on('notification:sent', (signal, channels) => {
      logger.info(`📨 通知发送成功: ${signal.symbol} ${signal.type} -> ${channels.join(', ')}`);
    });

    signalService.on('notification:failed', (signal, error) => {
      logger.error(`❌ 通知发送失败: ${signal.symbol} ${signal.type} - ${error}`);
    });

    signalService.on('service:status', (status) => {
      logger.info(`🔄 服务状态变更: ${status}`);
    });

    signalService.on('service:error', (error) => {
      logger.error(`⚠️ 服务错误: ${error.message}`);
    });

    // 6. 启动服务
    await signalService.start();
    logger.info('✅ 信号服务启动成功');

    // 7. 演示功能
    // 7.1 测试置信度阈值控制
    logger.info('\n📊 演示1: 置信度阈值控制');
    logger.info('当前置信度阈值: 80%');
    
    // 分析多个市场数据
    const symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'];
    for (const symbol of symbols) {
      const marketData = generateMockMarketData(symbol);
      const signal = await signalService.analyzeMarket(marketData);
      
      if (signal) {
        logger.info(`✅ ${symbol}: 信号通过80%置信度阈值`);
      } else {
        logger.info(`❌ ${symbol}: 信号未达到80%置信度阈值或其他过滤条件`);
      }
    }

    // 7.2 演示调整置信度阈值
    logger.info('\n📊 演示2: 调整置信度阈值到70%');
    signalService.setConfidenceThreshold(0.7);
    
    for (const symbol of symbols) {
      const marketData = generateMockMarketData(symbol);
      const signal = await signalService.analyzeMarket(marketData);
      
      if (signal) {
        logger.info(`✅ ${symbol}: 信号通过70%置信度阈值`);
      } else {
        logger.info(`❌ ${symbol}: 信号未达到70%置信度阈值`);
      }
    }

    // 7.3 演示通知开关控制
    logger.info('\n📨 演示3: 通知开关控制');
    
    // 发送测试通知
    logger.info('发送测试通知...');
    const testResult = await signalService.sendTestNotification(
      '🚀 测试通知',
      '这是一条交易信号系统的测试通知消息'
    );
    logger.info(`测试通知结果: ${testResult ? '成功' : '失败'}`);

    // 关闭通知
    logger.info('关闭通知推送...');
    signalService.setNotificationEnabled(false);
    
    const signal = await signalService.analyzeMarket(generateMockMarketData('BTCUSDT'));
    if (signal) {
      logger.info('✅ 信号生成成功，但通知已关闭');
    }

    // 重新开启通知
    logger.info('重新开启通知推送...');
    signalService.setNotificationEnabled(true);
    // 7.4 演示静默时间设置
    logger.info('\n🔕 演示4: 静默时间设置');
    const now = new Date();
    const currentHour = now.getHours();
    const quietStart = String(currentHour).padStart(2, '0') + ':00';
    const quietEnd = String((currentHour + 1) % 24).padStart(2, '0') + ':00';
    
    logger.info(`设置静默时间: ${quietStart} - ${quietEnd}`);
    signalService.setQuietHours(quietStart, quietEnd);
    
    const quietSignal = await signalService.analyzeMarket(generateMockMarketData('ETHUSDT'));
    if (quietSignal) {
      logger.info('📵 在静默时间内，只有紧急信号会推送');
    }

    // 7.5 演示批量分析
    logger.info('\n📈 演示5: 批量市场分析');
    const marketDataList = symbols.map(generateMockMarketData);
    const batchSignals = await signalService.analyzeMultipleMarkets(marketDataList);
    
    logger.info(`批量分析结果: ${batchSignals.length}/${symbols.length} 个信号通过筛选`);

    // 7.6 演示统计信息
    logger.info('\n📊 演示6: 服务统计信息');
    const statistics = signalService.getStatistics();
    
    console.log('📈 信号统计:', {
      总信号数: statistics.totalSignals,
      买入信号: statistics.buySignals,
      卖出信号: statistics.sellSignals,
      平均置信度: `${(statistics.averageConfidence * 100).toFixed(1)}%`,
      今日信号: statistics.todaySignals
    });

    console.log('📨 通知统计:', {
      发送成功: statistics.notifications.sent,
      发送失败: statistics.notifications.failed,
      队列待处理: statistics.notifications.pending
    });

    console.log('🔧 服务状态:', {
      状态: statistics.service.status,
      自动运行: statistics.service.autoRunEnabled,
      处理中品种: statistics.service.processedSymbols
    });

    // 7.7 演示通道健康检查
    logger.info('\n🏥 演示7: 通道健康检查');
    const healthStatus = await signalService.checkHealth();
    
    console.log('💚 健康状态:', {
      服务健康: healthStatus.isHealthy,
      运行状态: healthStatus.status,
      微信通道: healthStatus.channels.WECHAT ? '正常' : '异常',
      错误计数: healthStatus.errorCount
    });

    // 7.8 演示配置导出
    logger.info('\n💾 演示8: 配置管理');
    const exportedConfig = signalService.exportConfig();
    logger.info('配置已导出，包含信号配置和通知配置');

    // 7.9 演示信号历史查询
    logger.info('\n📜 演示9: 信号历史查询');
    const recentSignals = signalService.getSignalHistory(5);
    logger.info(`最近5个信号: ${recentSignals.length} 个`);

    const btcSignals = signalService.getSignalsBySymbol('BTCUSDT');
    logger.info(`BTCUSDT信号: ${btcSignals.length} 个`);

    const last30Minutes = Date.now() - 30 * 60 * 1000;
    const recentTimeSignals = signalService.getSignalsInTimeRange(last30Minutes, Date.now());
    logger.info(`最近30分钟信号: ${recentTimeSignals.length} 个`);

    // 7.10 演示实时监控
    logger.info('\n👀 演示10: 实时监控（运行10秒）');
    let monitorCount = 0;
    const monitorInterval = setInterval(async () => {
      monitorCount++;
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const marketData = generateMockMarketData(randomSymbol);
      
      await signalService.analyzeMarket(marketData);
      
      if (monitorCount >= 10) {
        clearInterval(monitorInterval);
        logger.info('✅ 实时监控演示完成');
        
        // 演示完成，停止服务
        await cleanup(signalService);
      }
    }, 1000);

  } catch (error) {
    logger.error('❌ 演示过程中发生错误:', error);
  }
}

/**
 * 清理资源
 */
async function cleanup(signalService: SignalService): Promise<void> {
  try {
    logger.info('\n🧹 清理资源...');
    // 获取最终统计
    const finalStats = signalService.getStatistics();
    
    console.log('\n📊 最终统计报告:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 总信号数量: ${finalStats.totalSignals}`);
    console.log(`✅ 通知成功: ${finalStats.notifications.sent}`);
    console.log(`❌ 通知失败: ${finalStats.notifications.failed}`);
    console.log(`🎯 平均置信度: ${(finalStats.averageConfidence * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 停止服务
    await signalService.stop();
    
    logger.info('✅ 交易信号系统演示完成');
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ 清理过程中发生错误:', error);
    process.exit(1);
  }
}

/**
 * 错误处理
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 启动演示
if (require.main === module) {
  signalSystemDemo();
}

export { signalSystemDemo };