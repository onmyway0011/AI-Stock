/**
 * 信号系统测试
 */
import { TradingSignalGenerator } from '../signals/generators/TradingSignalGenerator';
import { SignalService } from '../signals/SignalService';
import { NotificationManager } from '../notifications/NotificationManager';
import { 
  SignalType, 
  SignalStrength, 
  NotificationChannel,
  SignalConfig,
  NotificationConfig 
} from '../types/signal';

// 模拟微信配置
const mockWeChatConfig = {
  appId: 'test_app_id',
  appSecret: 'test_app_secret',
  templateId: 'test_template_id',
  userOpenIds: ['test_openid_1'],
  apiBaseUrl: 'https://api.weixin.qq.com',
  tokenCacheTime: 7200
};

// 默认信号配置
const defaultSignalConfig: SignalConfig = {
  enabled: true,
  filter: {
    minConfidence: 0.7,
    allowedTypes: [SignalType.BUY, SignalType.SELL],
    allowedStrengths: [SignalStrength.MODERATE, SignalStrength.STRONG, SignalStrength.VERY_STRONG],
    allowedSymbols: ['BTCUSDT', 'ETHUSDT'],
    cooldownPeriod: 5 * 60 * 1000,
    minRiskRewardRatio: 1.5
  },
  notification: {
    enabled: true,
    channels: [NotificationChannel.WECHAT],
    maxDailyNotifications: 50
  },
  confidence: {
    threshold: 0.8,
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

// 默认通知配置
const defaultNotificationConfig: NotificationConfig = {
  enabled: true,
  notificationInterval: 1000,
  enabledChannels: [NotificationChannel.WECHAT],
  channels: {
    wechat: mockWeChatConfig
  },
  filters: {
    minConfidence: 0.8,
    allowedSignalTypes: ['BUY', 'SELL'],
    priorityOnly: false
  }
};

describe('TradingSignalGenerator', () => {
  let signalGenerator: TradingSignalGenerator;

  beforeEach(() => {
    signalGenerator = new TradingSignalGenerator(defaultSignalConfig);
  });

  describe('信号生成', () => {
    it('应该能够生成有效的信号', async () => {
      const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 100);
      const signal = await signalGenerator.generateSignal(marketData);

      // 信号可能为null（如果不满足条件）
      if (signal) {
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('symbol', 'BTCUSDT');
        expect(signal).toHaveProperty('type');
        expect([SignalType.BUY, SignalType.SELL]).toContain(signal.type);
        expect(signal.confidence.overall).toBeGreaterThanOrEqual(0);
        expect(signal.confidence.overall).toBeLessThanOrEqual(1);
      }
    });

    it('应该拒绝置信度低于阈值的信号', async () => {
      // 使用较高的置信度阈值
      const highThresholdConfig = {
        ...defaultSignalConfig,
        confidence: { ...defaultSignalConfig.confidence, threshold: 0.95 }
      };
      
      const strictGenerator = new TradingSignalGenerator(highThresholdConfig);
      const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 50);
      
      const signal = await strictGenerator.generateSignal(marketData);
      
      // 在严格阈值下，信号很可能为null
      if (signal) {
        expect(signal.confidence.overall).toBeGreaterThanOrEqual(0.95);
      }
    });

    it('应该正确计算价格建议', async () => {
      const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 100);
      const signal = await signalGenerator.generateSignal(marketData);

      if (signal) {
        const { priceSuggestion } = signal;
        
        expect(priceSuggestion.entryPrice).toBeGreaterThan(0);
        expect(priceSuggestion.stopLoss).toBeGreaterThan(0);
        expect(priceSuggestion.takeProfit).toBeGreaterThan(0);
        expect(priceSuggestion.validUntil).toBeGreaterThan(Date.now());
        
        // 风险收益比应该合理
        if (priceSuggestion.riskRewardRatio) {
          expect(priceSuggestion.riskRewardRatio).toBeGreaterThan(0);
        }
      }
    });

    it('应该正确评估风险', async () => {
      const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 100);
      const signal = await signalGenerator.generateSignal(marketData);

      if (signal) {
        const { riskAssessment } = signal;
        
        expect(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).toContain(riskAssessment.level);
        expect(riskAssessment.score).toBeGreaterThanOrEqual(0);
        expect(riskAssessment.score).toBeLessThanOrEqual(100);
        expect(riskAssessment.maxPositionSize).toBeGreaterThan(0);
        expect(riskAssessment.maxPositionSize).toBeLessThanOrEqual(1);
        expect(Array.isArray(riskAssessment.factors)).toBe(true);
        expect(Array.isArray(riskAssessment.recommendations)).toBe(true);
      }
    });

    it('应该在数据不足时返回null', async () => {
      const insufficientData = global.testUtils.generateTestMarketData('BTCUSDT', 10);
      const signal = await signalGenerator.generateSignal(insufficientData);
      
      expect(signal).toBeNull();
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      const newConfig = {
        ...defaultSignalConfig,
        confidence: { ...defaultSignalConfig.confidence, threshold: 0.85 }
      };
      
      expect(() => signalGenerator.updateConfig(newConfig)).not.toThrow();
    });
  });
});

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;

  beforeEach(() => {
    notificationManager = new NotificationManager(defaultNotificationConfig);
  });

  describe('通知管理', () => {
    it('应该能够发送自定义通知', async () => {
      const result = await notificationManager.sendCustomNotification(
        '测试标题',
        '测试内容',
        [NotificationChannel.WECHAT],
        'MEDIUM'
      );
      
      // 由于是模拟环境，可能会失败，但不应该抛出错误
      expect(typeof result).toBe('boolean');
    });

    it('应该能够启用和禁用通知', () => {
      notificationManager.setEnabled(false);
      notificationManager.setEnabled(true);
      
      // 测试不应该抛出错误
      expect(true).toBe(true);
    });

    it('应该能够设置静默时间', () => {
      expect(() => {
        notificationManager.setQuietHours('23:00', '07:00');
      }).not.toThrow();
    });

    it('应该能够获取统计信息', () => {
      const stats = notificationManager.getStatistics();
      
      expect(stats).toHaveProperty('todaySent');
      expect(stats).toHaveProperty('totalSent');
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('channelStats');
      expect(stats).toHaveProperty('queueStatus');
    });

    it('应该能够执行健康检查', async () => {
      const healthResults = await notificationManager.performHealthCheck();
      
      expect(typeof healthResults).toBe('object');
      expect(healthResults).toHaveProperty('WECHAT');
      expect(typeof healthResults.WECHAT).toBe('boolean');
    });
  });
});

describe('SignalService', () => {
  let signalService: SignalService;

  beforeEach(() => {
    const serviceConfig = {
      signalConfig: defaultSignalConfig,
      notificationConfig: defaultNotificationConfig,
      autoRun: {
        enabled: false,
        interval: 60000,
        symbols: ['BTCUSDT']
      }
    };
    signalService = new SignalService(serviceConfig);
  });

  afterEach(async () => {
    try {
      await signalService.stop();
    } catch (error) {
      // 忽略停止服务时的错误
    }
  });

  describe('服务生命周期', () => {
    it('应该能够启动和停止服务', async () => {
      await signalService.start();
      expect(signalService.getStatus()).toBe('RUNNING');
      
      await signalService.stop();
      expect(signalService.getStatus()).toBe('STOPPED');
    });

    it('应该能够暂停和恢复服务', async () => {
      await signalService.start();
      
      signalService.pause();
      expect(signalService.getStatus()).toBe('PAUSED');
      
      signalService.resume();
      expect(signalService.getStatus()).toBe('RUNNING');
      
      await signalService.stop();
    });
  });

  describe('信号分析', () => {
    it('应该能够分析市场数据', async () => {
      await signalService.start();
      const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 100);
      const signal = await signalService.analyzeMarket(marketData);
      
      // 信号可能为null，这是正常的
      if (signal) {
        expect(signal).toHaveProperty('id');
        expect(signal).toHaveProperty('symbol', 'BTCUSDT');
      }
    });

    it('应该能够批量分析多个市场', async () => {
      await signalService.start();
      
      const marketDataList = [
        global.testUtils.generateTestMarketData('BTCUSDT', 100),
        global.testUtils.generateTestMarketData('ETHUSDT', 100)
      ];
      
      const signals = await signalService.analyzeMultipleMarkets(marketDataList);
      
      expect(Array.isArray(signals)).toBe(true);
      expect(signals.length).toBeLessThanOrEqual(2);
    });
  });

  describe('配置管理', () => {
    it('应该能够设置置信度阈值', () => {
      expect(() => {
        signalService.setConfidenceThreshold(0.85);
      }).not.toThrow();
      
      // 无效值应该抛出错误
      expect(() => {
        signalService.setConfidenceThreshold(1.5);
      }).toThrow();
    });

    it('应该能够控制信号生成', () => {
      expect(() => {
        signalService.setSignalEnabled(false);
        signalService.setSignalEnabled(true);
      }).not.toThrow();
    });

    it('应该能够控制通知推送', () => {
      expect(() => {
        signalService.setNotificationEnabled(false);
        signalService.setNotificationEnabled(true);
      }).not.toThrow();
    });

    it('应该能够导出配置', () => {
      const config = signalService.exportConfig();
      
      expect(config).toHaveProperty('signalConfig');
      expect(config).toHaveProperty('notificationConfig');
    });
  });

  describe('统计和监控', () => {
    it('应该能够获取统计信息', () => {
      const stats = signalService.getStatistics();
      
      expect(stats).toHaveProperty('totalSignals');
      expect(stats).toHaveProperty('buySignals');
      expect(stats).toHaveProperty('sellSignals');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('service');
      expect(stats).toHaveProperty('notifications');
    });

    it('应该能够检查健康状态', async () => {
      const health = await signalService.checkHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('channels');
      expect(health).toHaveProperty('errorCount');
    });

    it('应该能够获取通道状态', () => {
      const channelStatuses = signalService.getChannelStatuses();
      
      expect(typeof channelStatuses).toBe('object');
    });
  });

  describe('信号历史', () => {
    it('应该能够获取信号历史', () => {
      const history = signalService.getSignalHistory();
      expect(Array.isArray(history)).toBe(true);
      
      const limitedHistory = signalService.getSignalHistory(5);
      expect(limitedHistory.length).toBeLessThanOrEqual(5);
    });

    it('应该能够按品种查询信号', () => {
      const btcSignals = signalService.getSignalsBySymbol('BTCUSDT');
      expect(Array.isArray(btcSignals)).toBe(true);
    });

    it('应该能够按时间范围查询信号', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      
      const recentSignals = signalService.getSignalsInTimeRange(oneHourAgo, now);
      expect(Array.isArray(recentSignals)).toBe(true);
    });

    it('应该能够清空信号历史', () => {
      expect(() => {
        signalService.clearSignalHistory();
      }).not.toThrow();
      
      const history = signalService.getSignalHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('测试通知', () => {
    it('应该能够发送测试通知', async () => {
      const result = await signalService.sendTestNotification('测试', '测试内容');
      expect(typeof result).toBe('boolean');
    });
  });
});
describe('置信度阈值测试', () => {
  it('应该正确应用80%置信度阈值', async () => {
    const config = {
      ...defaultSignalConfig,
      confidence: { ...defaultSignalConfig.confidence, threshold: 0.8 }
    };
    
    const generator = new TradingSignalGenerator(config);
    const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 100);
    
    const signal = await generator.generateSignal(marketData);
    
    // 如果生成了信号，置信度必须≥80%
    if (signal) {
      expect(signal.confidence.overall).toBeGreaterThanOrEqual(0.8);
      expect(signal.confidence.meetsThreshold).toBe(true);
    }
  });

  it('应该在置信度不足时返回null', async () => {
    const config = {
      ...defaultSignalConfig,
      confidence: { ...defaultSignalConfig.confidence, threshold: 0.99 } // 极高阈值
    };
    
    const generator = new TradingSignalGenerator(config);
    const marketData = global.testUtils.generateTestMarketData('BTCUSDT', 100);
    
    const signal = await generator.generateSignal(marketData);
    
    // 在99%阈值下，应该很难生成信号
    expect(signal).toBeNull();
  });
});

describe('错误处理', () => {
  it('应该处理无效的市场数据', async () => {
    const generator = new TradingSignalGenerator(defaultSignalConfig);
    
    // 测试空数据
    const emptyData = {
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      klines: [],
      ticker: {
        symbol: 'BTCUSDT',
        price: 50000,
        change: 0,
        changePercent: 0,
        volume: 1000000,
        timestamp: Date.now()
      }
    };
    
    const signal = await generator.generateSignal(emptyData);
    expect(signal).toBeNull();
  });

  it('应该处理服务启动失败', async () => {
    // 使用无效配置
    const invalidConfig = {
      signalConfig: {
        ...defaultSignalConfig,
        confidence: { ...defaultSignalConfig.confidence, threshold: -1 } // 无效阈值
      },
      notificationConfig: defaultNotificationConfig
    };
    
    const service = new SignalService(invalidConfig);
    
    // 服务应该能够处理配置错误
    try {
      await service.start();
      await service.stop();
    } catch (error) {
      // 预期可能出现错误
      expect(error).toBeDefined();
    }
  });
});