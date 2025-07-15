/**
 * AI量化交易系统配置文件
 * 包含数据源配置、策略配置、系统配置等
 */

import { AssetType, TradingConfig, RiskManagementConfig } from '../types';

// ============= 环境配置 =============

/**
 * 环境类型
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production'
}

/**
 * 当前环境
 */
export const ENVIRONMENT = (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT;

/**
 * 是否为生产环境
 */
export const IS_PRODUCTION = ENVIRONMENT === Environment.PRODUCTION;

/**
 * 是否为开发环境
 */
export const IS_DEVELOPMENT = ENVIRONMENT === Environment.DEVELOPMENT;

// ============= 数据源配置 =============

/**
 * 数据提供商枚举
 */
export enum DataProvider {
  TUSHARE = 'tushare',
  BINANCE = 'binance',
  ALPACA = 'alpaca',
  YAHOO = 'yahoo',
  MOCK = 'mock'
}

/**
 * 数据源配置接口
 */
export interface DataSourceConfig {
  provider: DataProvider;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  rateLimit?: number;
  timeout?: number;
  retryCount?: number;
}

/**
 * 数据配置
 */
export const dataConfig = {
  // 股票数据源
  stock: {
    provider: DataProvider.TUSHARE,
    apiKey: process.env.TUSHARE_API_KEY,
    baseUrl: 'http://api.tushare.pro',
    rateLimit: 200, // 每分钟请求次数
    timeout: 10000,
    retryCount: 3
  } as DataSourceConfig,

  // 数字货币数据源
  crypto: {
    provider: DataProvider.BINANCE,
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    baseUrl: 'https://api.binance.com',
    rateLimit: 1200,
    timeout: 5000,
    retryCount: 3
  } as DataSourceConfig,

  // 美股数据源
  us_stock: {
    provider: DataProvider.ALPACA,
    apiKey: process.env.ALPACA_API_KEY,
    apiSecret: process.env.ALPACA_API_SECRET,
    baseUrl: 'https://paper-api.alpaca.markets',
    rateLimit: 200,
    timeout: 10000,
    retryCount: 3
  } as DataSourceConfig,

  // 通用数据源（Yahoo Finance）
  general: {
    provider: DataProvider.YAHOO,
    baseUrl: 'https://query1.finance.yahoo.com',
    rateLimit: 2000,
    timeout: 15000,
    retryCount: 5
  } as DataSourceConfig,

  // 模拟数据源（用于测试）
  mock: {
    provider: DataProvider.MOCK,
    baseUrl: 'http://localhost:3001',
    timeout: 1000,
    retryCount: 1
  } as DataSourceConfig
};

// ============= 数据库配置 =============

/**
 * 数据库配置
 */
export const databaseConfig = {
  // SQLite配置
  sqlite: {
    path: process.env.DB_PATH || './data/trading.db',
    options: {
      cache: true,
      fileMustExist: false,
      timeout: 5000
    }
  },

  // Redis配置（用于缓存）
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryCount: 3
  }
};

// ============= 策略配置 =============

/**
 * 默认风险管理配置
 */
export const defaultRiskConfig: RiskManagementConfig = {
  maxPositionSize: 0.1,        // 最大仓位10%
  stopLossPercent: 0.05,       // 止损5%
  takeProfitPercent: 0.15,     // 止盈15%
  maxDailyLoss: 0.02,          // 最大日损失2%
  maxDrawdown: 0.20            // 最大回撤20%
};

/**
 * 默认交易配置
 */
export const defaultTradingConfig: TradingConfig = {
  minConfidence: 0.7,          // 最小信号置信度70%
  maxConcurrentTrades: 5,      // 最大并发交易数
  tradingHours: {
    start: '09:30',
    end: '15:00'
  },
  allowedAssetTypes: [
    AssetType.STOCK,
    AssetType.CRYPTO,
    AssetType.FOREX
  ]
};

/**
 * 策略配置映射
 */
export const strategyConfigs = {
  // 均线策略配置
  movingAverage: {
    shortPeriod: 5,
    longPeriod: 20,
    signalThreshold: 0.02
  },

  // RSI策略配置
  rsi: {
    period: 14,
    overbought: 70,
    oversold: 30,
    smoothing: 2
  },

  // MACD策略配置
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    threshold: 0.001
  },

  // 布林带策略配置
  bollinger: {
    period: 20,
    standardDeviation: 2,
    bandwidth: 0.1
  },

  // AI策略配置
  ai: {
    modelPath: './models/lstm_model.json',
    sequenceLength: 60,
    features: ['close', 'volume', 'rsi', 'macd'],
    threshold: 0.8,
    retrainInterval: 7 * 24 * 60 * 60 * 1000 // 7天
  }
};

// ============= 系统配置 =============

/**
 * 系统配置
 */
export const systemConfig = {
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
    format: 'json',
    maxFiles: 10,
    maxSize: '100m',
    datePattern: 'YYYY-MM-DD'
  },

  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  // WebSocket配置
  websocket: {
    port: parseInt(process.env.WS_PORT || '3001'),
    heartbeatInterval: 30000,
    maxConnections: 1000
  },

  // 缓存配置
  cache: {
    ttl: 60 * 1000,           // 默认TTL 1分钟
    maxSize: 1000,            // 最大缓存条数
    checkInterval: 60 * 1000  // 清理间隔
  },

  // 任务调度配置
  scheduler: {
    dataCollection: {
      klines: '0 */1 * * * *',     // 每分钟采集K线数据
      tickers: '*/10 * * * * *',   // 每10秒采集价格数据
      depth: '*/5 * * * * *'       // 每5秒采集深度数据
    },
    strategy: {
      execution: '*/30 * * * * *', // 每30秒执行策略
      optimization: '0 0 2 * * *'  // 每天凌晨2点优化策略
    },
    maintenance: {
      cleanup: '0 0 3 * * 0',      // 每周日凌晨3点清理数据
      backup: '0 0 4 * * *'        // 每天凌晨4点备份数据
    }
  }
};

// ============= 回测配置 =============

/**
 * 回测配置
 */
export const backtestConfig = {
  // 默认回测参数
  defaults: {
    initialCapital: 100000,      // 初始资金10万
    commission: 0.001,           // 手续费0.1%
    slippage: 0.0005,           // 滑点0.05%
    startDate: '2023-01-01',
    endDate: '2024-01-01'
  },

  // 性能计算配置
  performance: {
    riskFreeRate: 0.03,         // 无风险利率3%
    tradingDaysPerYear: 252,    // 每年交易日数
    confidenceLevel: 0.95       // VaR置信度
  },

  // 并行回测配置
  parallel: {
    maxWorkers: 4,              // 最大工作进程数
    batchSize: 100,             // 批处理大小
    timeout: 300000             // 超时时间5分钟
  }
};

// ============= 监控和告警配置 =============

/**
 * 监控配置
 */
export const monitoringConfig = {
  // 系统监控
  system: {
    checkInterval: 60000,       // 检查间隔1分钟
    memoryThreshold: 0.8,       // 内存使用阈值80%
    cpuThreshold: 0.8,          // CPU使用阈值80%
    diskThreshold: 0.9          // 磁盘使用阈值90%
  },

  // 交易监控
  trading: {
    maxDrawdownAlert: 0.1,      // 回撤告警阈值10%
    dailyLossAlert: 0.05,       // 日损失告警阈值5%
    consecutiveLossAlert: 5,    // 连续亏损告警次数
    positionSizeAlert: 0.2      // 仓位告警阈值20%
  },

  // 数据监控
  data: {
    delayAlert: 60000,          // 数据延迟告警阈值1分钟
    missingDataAlert: 5,        // 数据缺失告警阈值5个周期
    qualityThreshold: 0.95      // 数据质量阈值95%
  }
};

// ============= 通知配置 =============

/**
 * 通知配置
 */
export const notificationConfig = {
  // 邮件通知
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO?.split(',') || []
  },

  // 短信通知
  sms: {
    enabled: process.env.SMS_ENABLED === 'true',
    provider: process.env.SMS_PROVIDER,
    apiKey: process.env.SMS_API_KEY,
    phones: process.env.SMS_PHONES?.split(',') || []
  },

  // Webhook通知
  webhook: {
    enabled: process.env.WEBHOOK_ENABLED === 'true',
    url: process.env.WEBHOOK_URL,
    secret: process.env.WEBHOOK_SECRET
  }
};

// ============= 安全配置 =============

/**
 * 安全配置
 */
export const securityConfig = {
  // API安全
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,  // 15分钟窗口
      max: 100                   // 最大请求数
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'default-secret',
      expiresIn: '1h'
    }
  },

  // 数据加密
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16
  },

  // 访问控制
  access: {
    allowedIPs: process.env.ALLOWED_IPS?.split(',') || [],
    blockedIPs: process.env.BLOCKED_IPS?.split(',') || []
  }
};

// ============= 导出配置验证函数 =============

/**
 * 验证配置的完整性
 */
export function validateConfig(): boolean {
  const requiredEnvVars = [
    'TUSHARE_API_KEY',
    'BINANCE_API_KEY',
    'BINANCE_API_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar] && IS_PRODUCTION) {
      console.error(`Missing required environment variable: ${envVar}`);
      return false;
    }
  }

  return true;
}

/**
 * 获取当前环境的配置
 */
export function getConfig() {
  return {
    environment: ENVIRONMENT,
    data: dataConfig,
    database: databaseConfig,
    system: systemConfig,
    backtest: backtestConfig,
    monitoring: monitoringConfig,
    notification: notificationConfig,
    security: securityConfig,
    strategies: strategyConfigs,
    trading: defaultTradingConfig,
    risk: defaultRiskConfig
  };
}

// 导出所有配置
export default getConfig();