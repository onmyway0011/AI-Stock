/**
 * 信号服务
 * 整合信号生成、通知推送和配置管理功能
 */

import {
  TradingSignal,
  SignalConfig,
  SignalStatistics,
  SignalFilter,
  NotificationChannel
} from '../types/signal';
import { MarketData } from '../types';
import { TradingSignalGenerator } from './generators/TradingSignalGenerator';
import { NotificationManager, NotificationConfig } from '../notifications/NotificationManager';
import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('SIGNAL_SERVICE');

/**
 * 信号服务配置
 */
export interface SignalServiceConfig {
  /** 信号生成配置 */
  signalConfig: SignalConfig;
  /** 通知配置 */
  notificationConfig: NotificationConfig;
  /** 自动运行配置 */
  autoRun?: {
    enabled: boolean;
    interval: number; // 毫秒
    symbols: string[];
  };
}

/**
 * 服务状态
 */
export enum ServiceStatus {
  STOPPED = 'STOPPED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR'
}

/**
 * 信号事件
 */
export interface SignalEvents {
  'signal:generated': (signal: TradingSignal) => void;
  'signal:filtered': (signal: TradingSignal, reason: string) => void;
  'notification:sent': (signal: TradingSignal, channels: NotificationChannel[]) => void;
  'notification:failed': (signal: TradingSignal, error: string) => void;
  'service:status': (status: ServiceStatus) => void;
  'service:error': (error: Error) => void;
}

/**
 * 信号服务
 */
export class SignalService extends EventEmitter {
  private config: SignalServiceConfig;
  private signalGenerator: TradingSignalGenerator;
  private notificationManager: NotificationManager;
  private status: ServiceStatus = ServiceStatus.STOPPED;
  private autoRunTimer?: NodeJS.Timeout;
  private signalHistory: TradingSignal[] = [];
  private processingSymbols = new Set<string>();
  private startTime?: number;

  constructor(config: SignalServiceConfig) {
    super();
    this.config = config;
    this.signalGenerator = new TradingSignalGenerator(config.signalConfig);
    this.notificationManager = new NotificationManager(config.notificationConfig);
    this.setupEventHandlers();
  }

  /**
   * 启动服务
   */
  async start(): Promise<void> {
    try {
      logger.info('启动信号服务...');
      this.setStatus(ServiceStatus.STARTING);

      // 检查通知通道健康状态
      const healthCheck = await this.notificationManager.performHealthCheck();
      const healthyChannels = Object.entries(healthCheck).filter(([_, healthy]) => healthy);
      
      if (healthyChannels.length === 0) {
        logger.warn('没有健康的通知通道，服务将继续运行但无法发送通知');
      } else {
        logger.info(`健康的通知通道: ${healthyChannels.map(([type]) => type).join(', ')}`);
      }

      // 启动自动运行
      if (this.config.autoRun?.enabled) {
        this.startAutoRun();
      }

      this.setStatus(ServiceStatus.RUNNING);
      logger.info('信号服务启动成功');
      this.startTime = Date.now();

    } catch (error) {
      logger.error('启动信号服务失败', error);
      this.setStatus(ServiceStatus.ERROR);
      throw error;
    }
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    try {
      logger.info('停止信号服务...');
      
      // 停止自动运行
      this.stopAutoRun();
      
      // 等待处理中的任务完成
      await this.waitForProcessingComplete();
      
      this.setStatus(ServiceStatus.STOPPED);
      logger.info('信号服务已停止');

    } catch (error) {
      logger.error('停止信号服务失败', error);
      this.setStatus(ServiceStatus.ERROR);
      throw error;
    }
  }

  /**
   * 暂停服务
   */
  pause(): void {
    if (this.status === ServiceStatus.RUNNING) {
      this.stopAutoRun();
      this.setStatus(ServiceStatus.PAUSED);
      logger.info('信号服务已暂停');
    }
  }

  /**
   * 恢复服务
   */
  resume(): void {
    if (this.status === ServiceStatus.PAUSED) {
      if (this.config.autoRun?.enabled) {
        this.startAutoRun();
      }
      this.setStatus(ServiceStatus.RUNNING);
      logger.info('信号服务已恢复');
    }
  }

  /**
   * 分析市场数据并生成信号
   */
  async analyzeMarket(marketData: MarketData): Promise<TradingSignal | null> {
    try {
      if (this.status !== ServiceStatus.RUNNING) {
        logger.debug(`服务状态为 ${this.status}，跳过市场分析`);
        return null;
      }

      const symbol = marketData.symbol;
      
      if (this.processingSymbols.has(symbol)) {
        logger.debug(`${symbol} 正在处理中，跳过重复分析`);
        return null;
      }

      this.processingSymbols.add(symbol);

      try {
        // 生成信号
        const signal = await this.signalGenerator.generateSignal(marketData);
        
        if (!signal) {
          return null;
        }

        // 记录信号
        this.addToHistory(signal);
        this.emit('signal:generated', signal);

        // 发送通知
        await this.handleSignalNotification(signal);

        logger.info(`信号生成成功: ${signal.symbol} ${signal.type} (置信度: ${(signal.confidence.overall * 100).toFixed(1)}%)`);
        
        return signal;

      } finally {
        this.processingSymbols.delete(symbol);
      }

    } catch (error) {
      logger.error('分析市场数据失败', error);
      this.emit('service:error', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * 批量分析多个市场数据
   */
  async analyzeMultipleMarkets(marketDataList: MarketData[]): Promise<TradingSignal[]> {
    const results = await Promise.allSettled(
      marketDataList.map(data => this.analyzeMarket(data))
    );

    const signals: TradingSignal[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        signals.push(result.value);
      }
    }

    return signals;
  }

  /**
   * 手动发送测试通知
   */
  async sendTestNotification(
    title: string = '测试通知',
    content: string = '这是一条测试通知消息',
    channels?: NotificationChannel[]
  ): Promise<boolean> {
    try {
      return await this.notificationManager.sendCustomNotification(title, content, channels, 'LOW');
    } catch (error) {
      logger.error('发送测试通知失败', error);
      return false;
    }
  }

  /**
   * 获取信号历史
   */
  getSignalHistory(limit?: number): TradingSignal[] {
    const history = [...this.signalHistory];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * 获取指定时间范围的信号
   */
  getSignalsInTimeRange(startTime: number, endTime: number): TradingSignal[] {
    return this.signalHistory.filter(signal => 
      signal.timestamp >= startTime && signal.timestamp <= endTime
    );
  }

  /**
   * 获取指定品种的信号
   */
  getSignalsBySymbol(symbol: string, limit?: number): TradingSignal[] {
    const signals = this.signalHistory.filter(signal => signal.symbol === symbol);
    if (limit && limit > 0) {
      return signals.slice(-limit);
    }
    return signals;
  }

  /**
   * 获取服务统计信息
   */
  getStatistics(): SignalStatistics & {
    service: {
      status: ServiceStatus;
      uptime: number;
      processedSymbols: number;
      autoRunEnabled: boolean;
    };
    notifications: any;
  } {
    const signalStats = this.calculateSignalStatistics();
    const notificationStats = this.notificationManager.getStatistics();

    return {
      ...signalStats,
      service: {
        status: this.status,
        uptime: this.getUptime(),
        processedSymbols: this.processingSymbols.size,
        autoRunEnabled: this.config.autoRun?.enabled || false
      },
      notifications: notificationStats
    };
  }

  /**
   * 获取通道状态
   */
  getChannelStatuses(): Record<string, any> {
    return this.notificationManager.getChannelStatuses();
  }

  /**
   * 更新信号配置
   */
  updateSignalConfig(newConfig: Partial<SignalConfig>): void {
    this.config.signalConfig = { ...this.config.signalConfig, ...newConfig };
    this.signalGenerator.updateConfig(this.config.signalConfig);
    logger.info('信号配置已更新');
  }

  /**
   * 更新通知配置
   */
  updateNotificationConfig(newConfig: Partial<NotificationConfig>): void {
    this.config.notificationConfig = { ...this.config.notificationConfig, ...newConfig };
    this.notificationManager.updateConfig(this.config.notificationConfig);
    logger.info('通知配置已更新');
  }

  /**
   * 启用/禁用信号生成
   */
  setSignalEnabled(enabled: boolean): void {
    this.updateSignalConfig({ enabled });
  }

  /**
   * 启用/禁用通知推送
   */
  setNotificationEnabled(enabled: boolean): void {
    this.notificationManager.setEnabled(enabled);
  }

  /**
   * 设置置信度阈值
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.updateSignalConfig({
        confidence: {
          ...this.config.signalConfig.confidence,
          threshold
        }
      });
      logger.info(`置信度阈值已设置为: ${(threshold * 100).toFixed(1)}%`);
    } else {
      throw new Error('置信度阈值必须在0-1之间');
    }
  }

  /**
   * 设置静默时间
   */
  setQuietHours(start: string, end: string): void {
    this.notificationManager.setQuietHours(start, end);
  }

  /**
   * 清空信号历史
   */
  clearSignalHistory(): void {
    this.signalHistory = [];
    logger.info('信号历史已清空');
  }

  /**
   * 清空通知队列
   */
  clearNotificationQueue(): void {
    this.notificationManager.clearQueue();
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.signalGenerator = new TradingSignalGenerator(this.config.signalConfig);
    this.notificationManager.resetStatistics();
    this.clearSignalHistory();
    logger.info('统计信息已重置');
  }

  /**
   * 导出配置
   */
  exportConfig(): SignalServiceConfig {
    return {
      signalConfig: { ...this.config.signalConfig },
      notificationConfig: this.notificationManager.exportConfig(),
      autoRun: this.config.autoRun ? { ...this.config.autoRun } : undefined
    };
  }

  /**
   * 获取服务状态
   */
  getStatus(): ServiceStatus {
    return this.status;
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth(): Promise<{
    status: ServiceStatus;
    isHealthy: boolean;
    uptime: number;
    channels: Record<string, boolean>;
    lastSignalTime?: number;
    errorCount: number;
  }> {
    const channelHealth = await this.notificationManager.performHealthCheck();
    const lastSignal = this.signalHistory[this.signalHistory.length - 1];
    
    return {
      status: this.status,
      isHealthy: this.status === ServiceStatus.RUNNING,
      uptime: this.getUptime(),
      channels: channelHealth,
      lastSignalTime: lastSignal?.timestamp,
      errorCount: this.listenerCount('service:error')
    };
  }

  // =================== 私有方法 ===================

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 监听进程退出事件
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * 优雅关闭
   */
  private async gracefulShutdown(): Promise<void> {
    logger.info('收到关闭信号，正在优雅关闭服务...');
    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      logger.error('优雅关闭失败', error);
      process.exit(1);
    }
  }

  /**
   * 设置服务状态
   */
  private setStatus(status: ServiceStatus): void {
    if (this.status !== status) {
      const oldStatus = this.status;
      this.status = status;
      this.emit('service:status', status);
      logger.debug(`服务状态变更: ${oldStatus} -> ${status}`);
    }
  }

  /**
   * 启动自动运行
   */
  private startAutoRun(): void {
    if (!this.config.autoRun?.enabled) {
      return;
    }

    const { interval, symbols } = this.config.autoRun;
    this.autoRunTimer = setInterval(async () => {
      try {
        // 这里应该从数据源获取市场数据
        // 现在作为示例，我们只是记录日志
        logger.debug(`自动运行检查: ${symbols.length} 个品种`);
        
        // 实际实现中，应该：
        // 1. 获取指定品种的最新市场数据
        // 2. 调用 analyzeMarket 方法
        // 3. 处理结果
        
      } catch (error) {
        logger.error('自动运行执行失败', error);
        this.emit('service:error', error instanceof Error ? error : new Error(String(error)));
      }
    }, interval);

    logger.info(`自动运行已启动，间隔: ${interval}ms，品种: ${this.config.autoRun.symbols.join(', ')}`);
  }

  /**
   * 停止自动运行
   */
  private stopAutoRun(): void {
    if (this.autoRunTimer) {
      clearInterval(this.autoRunTimer);
      this.autoRunTimer = undefined;
      logger.info('自动运行已停止');
    }
  }

  /**
   * 等待处理完成
   */
  private async waitForProcessingComplete(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (this.processingSymbols.size > 0) {
      if (Date.now() - startTime > timeout) {
        logger.warn('等待处理完成超时');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 处理信号通知
   */
  private async handleSignalNotification(signal: TradingSignal): Promise<void> {
    try {
      const success = await this.notificationManager.sendSignalNotification(signal);
      
      if (success) {
        this.emit('notification:sent', signal, signal.notificationChannels);
      } else {
        this.emit('notification:failed', signal, '发送失败');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`发送信号通知失败: ${signal.id}`, error);
      this.emit('notification:failed', signal, errorMsg);
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(signal: TradingSignal): void {
    this.signalHistory.push(signal);
    
    // 限制历史记录数量
    if (this.signalHistory.length > 5000) {
      this.signalHistory = this.signalHistory.slice(-2500);
    }
  }

  /**
   * 计算信号统计
   */
  private calculateSignalStatistics(): SignalStatistics {
    const today = new Date().toDateString();
    const todaySignals = this.signalHistory.filter(signal => 
      new Date(signal.timestamp).toDateString() === today
    );
    const buySignals = this.signalHistory.filter(signal => signal.type === 'BUY').length;
    const sellSignals = this.signalHistory.filter(signal => signal.type === 'SELL').length;
    
    const avgConfidence = this.signalHistory.length > 0 
      ? this.signalHistory.reduce((sum, signal) => sum + signal.confidence.overall, 0) / this.signalHistory.length
      : 0;

    // 按强度分组
    const byStrength: Record<string, number> = {};
    this.signalHistory.forEach(signal => {
      byStrength[signal.strength] = (byStrength[signal.strength] || 0) + 1;
    });

    // 按品种分组
    const bySymbol: Record<string, number> = {};
    this.signalHistory.forEach(signal => {
      bySymbol[signal.symbol] = (bySymbol[signal.symbol] || 0) + 1;
    });

    const notificationStats = this.notificationManager.getStatistics();

    return {
      totalSignals: this.signalHistory.length,
      validSignals: this.signalHistory.length,
      buySignals,
      sellSignals,
      averageConfidence: avgConfidence,
      successRate: 0, // 需要实际交易结果来计算
      todaySignals: todaySignals.length,
      byStrength: byStrength as any,
      bySymbol,
      notifications: {
        sent: notificationStats.successCount,
        failed: notificationStats.failureCount,
        pending: notificationStats.queueStatus.pending
      }
    };
  }

  /**
   * 获取运行时间
   */
  private getUptime(): number {
    if (this.startTime) {
      return Date.now() - this.startTime;
    }
    return 0;
  }
  /**
   * 销毁服务
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
    this.notificationManager.destroy?.();
    logger.info('信号服务已销毁');
  }
}

// 类型声明，让 TypeScript 知道 EventEmitter 的事件类型
declare interface SignalService {
  on<K extends keyof SignalEvents>(event: K, listener: SignalEvents[K]): this;
  emit<K extends keyof SignalEvents>(event: K, ...args: Parameters<SignalEvents[K]>): boolean;
}
