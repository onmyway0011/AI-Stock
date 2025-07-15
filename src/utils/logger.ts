/**
 * 日志记录模块
 * 提供结构化日志记录和错误追踪功能
 */

import { DateUtils } from './index';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  module: string;
  data?: any;
  error?: Error;
  correlation_id?: string;
}

/**
 * 日志配置接口
 */
export interface LoggerConfig {
  /** 最低日志级别 */
  minLevel: LogLevel;
  /** 是否输出到控制台 */
  console: boolean;
  /** 是否输出到文件 */
  file: boolean;
  /** 日志文件路径 */
  filePath: string;
  /** 日志格式 */
  format: 'json' | 'text';
  /** 是否包含堆栈跟踪 */
  includeStack: boolean;
  /** 最大日志文件大小（字节） */
  maxFileSize: number;
  /** 保留的日志文件数量 */
  maxFiles: number;
}

/**
 * 日志器类
 */
export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private currentCorrelationId?: string;

  // 单例实例
  private static instance: Logger;
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      console: true,
      file: false,
      filePath: './logs/app.log',
      format: 'json',
      includeStack: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      ...config
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * 设置关联ID（用于跟踪请求）
   */
  setCorrelationId(id: string): void {
    this.currentCorrelationId = id;
  }

  /**
   * 清除关联ID
   */
  clearCorrelationId(): void {
    this.currentCorrelationId = undefined;
  }

  /**
   * 调试日志
   */
  debug(message: string, data?: any, module: string = 'UNKNOWN'): void {
    this.log(LogLevel.DEBUG, message, module, data);
  }

  /**
   * 信息日志
   */
  info(message: string, data?: any, module: string = 'UNKNOWN'): void {
    this.log(LogLevel.INFO, message, module, data);
  }

  /**
   * 警告日志
   */
  warn(message: string, data?: any, module: string = 'UNKNOWN'): void {
    this.log(LogLevel.WARN, message, module, data);
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error, data?: any, module: string = 'UNKNOWN'): void {
    this.log(LogLevel.ERROR, message, module, data, error);
  }

  /**
   * 致命错误日志
   */
  fatal(message: string, error?: Error, data?: any, module: string = 'UNKNOWN'): void {
    this.log(LogLevel.FATAL, message, module, data, error);
  }

  /**
   * 记录数据采集相关日志
   */
  dataCollection = {
    info: (symbol: string, message: string, data?: any) => {
      this.info(`[${symbol}] ${message}`, data, 'DATA_COLLECTION');
    },
    warn: (symbol: string, message: string, data?: any) => {
      this.warn(`[${symbol}] ${message}`, data, 'DATA_COLLECTION');
    },
    error: (symbol: string, message: string, error?: Error, data?: any) => {
      this.error(`[${symbol}] ${message}`, error, data, 'DATA_COLLECTION');
    }
  };

  /**
   * 记录策略相关日志
   */
  strategy = {
    info: (strategyName: string, message: string, data?: any) => {
      this.info(`[${strategyName}] ${message}`, data, 'STRATEGY');
    },
    warn: (strategyName: string, message: string, data?: any) => {
      this.warn(`[${strategyName}] ${message}`, data, 'STRATEGY');
    },
    error: (strategyName: string, message: string, error?: Error, data?: any) => {
      this.error(`[${strategyName}] ${message}`, error, data, 'STRATEGY');
    }
  };

  /**
   * 记录回测相关日志
   */
  backtest = {
    info: (message: string, data?: any) => {
      this.info(message, data, 'BACKTEST');
    },
    warn: (message: string, data?: any) => {
      this.warn(message, data, 'BACKTEST');
    },
    error: (message: string, error?: Error, data?: any) => {
      this.error(message, error, data, 'BACKTEST');
    }
  };

  /**
   * 记录信号相关日志
   */
  signal = {
    info: (message: string, data?: any) => {
      this.info(message, data, 'SIGNAL');
    },
    warn: (message: string, data?: any) => {
      this.warn(message, data, 'SIGNAL');
    },
    error: (message: string, error?: Error, data?: any) => {
      this.error(message, error, data, 'SIGNAL');
    }
  };

  /**
   * 核心日志记录方法
   */
  private log(
    level: LogLevel,
    message: string,
    module: string,
    data?: any,
    error?: Error
  ): void {
    // 检查日志级别
    if (level < this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      module,
      data,
      error,
      correlation_id: this.currentCorrelationId
    };

    // 添加到缓冲区
    this.logBuffer.push(entry);

    // 输出到控制台
    if (this.config.console) {
      this.writeToConsole(entry);
    }

    // 输出到文件
    if (this.config.file) {
      this.writeToFile(entry);
    }

    // 限制缓冲区大小
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
  }

  /**
   * 输出到控制台
   */
  private writeToConsole(entry: LogEntry): void {
    const timestamp = DateUtils.formatTimestamp(entry.timestamp);
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.module}]`;

    if (this.config.format === 'json') {
      const logData = {
        ...entry,
        timestamp: new Date(entry.timestamp).toISOString(),
        level: levelName
      };
      console.log(JSON.stringify(logData));
    } else {
      let output = `${prefix} ${entry.message}`;
      
      if (entry.data) {
        output += ` | Data: ${JSON.stringify(entry.data)}`;
      }

      if (entry.correlation_id) {
        output += ` | ID: ${entry.correlation_id}`;
      }

      // 根据级别选择输出方法
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(output);
          break;
        case LogLevel.INFO:
          console.info(output);
          break;
        case LogLevel.WARN:
          console.warn(output);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(output);
          if (entry.error && this.config.includeStack) {
            console.error(entry.error.stack);
          }
          break;
      }
    }
  }

  /**
   * 输出到文件（模拟实现）
   */
  private writeToFile(entry: LogEntry): void {
    // 在真实环境中，这里应该实现文件写入逻辑
    // 包括日志轮转、压缩等功能
    const logLine = this.config.format === 'json' 
      ? JSON.stringify({
          ...entry,
          timestamp: new Date(entry.timestamp).toISOString(),
          level: LogLevel[entry.level]
        })
      : this.formatTextLog(entry);

    // 模拟文件写入
    console.debug(`[FILE LOG] ${logLine}`);
  }

  /**
   * 格式化文本日志
   */
  private formatTextLog(entry: LogEntry): string {
    const timestamp = DateUtils.formatTimestamp(entry.timestamp);
    const level = LogLevel[entry.level].padEnd(5);
    const module = entry.module.padEnd(15);
    
    let line = `${timestamp} ${level} ${module} ${entry.message}`;
    if (entry.data) {
      line += ` | ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.correlation_id) {
      line += ` | ID=${entry.correlation_id}`;
    }
    
    if (entry.error) {
      line += ` | Error: ${entry.error.message}`;
      if (this.config.includeStack && entry.error.stack) {
        line += `\n${entry.error.stack}`;
      }
    }
    
    return line;
  }

  /**
   * 获取最近的日志条目
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * 按级别过滤日志
   */
  getLogsByLevel(level: LogLevel, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-count);
  }

  /**
   * 按模块过滤日志
   */
  getLogsByModule(module: string, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.module === module)
      .slice(-count);
  }

  /**
   * 清空日志缓冲区
   */
  clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取日志统计信息
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    byModule: Record<string, number>;
    oldestLog?: number;
    newestLog?: number;
  } {
    const byLevel: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    for (const entry of this.logBuffer) {
      const levelName = LogLevel[entry.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;
      byModule[entry.module] = (byModule[entry.module] || 0) + 1;
    }

    return {
      totalLogs: this.logBuffer.length,
      byLevel,
      byModule,
      oldestLog: this.logBuffer.length > 0 ? this.logBuffer[0].timestamp : undefined,
      newestLog: this.logBuffer.length > 0 ? this.logBuffer[this.logBuffer.length - 1].timestamp : undefined
    };
  }
}

/**
 * 性能监控装饰器
 */
export function logPerformance(logger: Logger, module: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const correlationId = `${module}_${propertyKey}_${startTime}`;
      
      logger.setCorrelationId(correlationId);
      logger.debug(`开始执行 ${propertyKey}`, { args }, module);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.info(`完成执行 ${propertyKey}`, { duration, success: true }, module);
        return result;

      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`执行失败 ${propertyKey}`, error, { duration, success: false }, module);
        throw error;
      } finally {
        logger.clearCorrelationId();
      }
    };

    return descriptor;
  };
}

/**
 * 错误跟踪装饰器
 */
export function trackErrors(logger: Logger, module: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error(`方法 ${propertyKey} 发生错误`, error, { args }, module);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 默认日志器实例
 */
export const logger = Logger.getInstance({
  minLevel: LogLevel.INFO,
  console: true,
  file: false,
  format: 'text',
  includeStack: true
});

/**
 * 创建带模块名的日志器
 */
export function createLogger(module: string): {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: Error, data?: any) => void;
  fatal: (message: string, error?: Error, data?: any) => void;
} {
  const moduleLogger = Logger.getInstance();

  return {
    debug: (message: string, data?: any) => moduleLogger.debug(message, data, module),
    info: (message: string, data?: any) => moduleLogger.info(message, data, module),
    warn: (message: string, data?: any) => moduleLogger.warn(message, data, module),
    error: (message: string, error?: Error, data?: any) => moduleLogger.error(message, error, data, module),
    fatal: (message: string, error?: Error, data?: any) => moduleLogger.fatal(message, error, data, module)
  };
}