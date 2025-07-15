/**
 * 基础通知通道抽象类
 * 定义通知通道的通用接口和行为
 */

import { NotificationMessage, TradingSignal, NotificationChannel } from '../../types/signal';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BASE_NOTIFICATION_CHANNEL');

/**
 * 通知通道状态
 */
export enum ChannelStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * 通知发送结果
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAfter?: number;
  deliveryStatus?: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
}

/**
 * 通道统计信息
 */
export interface ChannelStatistics {
  totalSent: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  lastSentTime?: number;
  lastErrorTime?: number;
  uptime: number;
}

/**
 * 基础通知通道抽象类
 */
export abstract class BaseNotificationChannel {
  protected isEnabled: boolean = true;
  protected status: ChannelStatus = ChannelStatus.ACTIVE;
  protected statistics: ChannelStatistics = {
    totalSent: 0,
    successCount: 0,
    failureCount: 0,
    averageResponseTime: 0,
    uptime: Date.now()
  };
  protected errorCount: number = 0;
  protected maxRetries: number = 3;
  protected retryDelay: number = 1000; // 1秒

  /**
   * 发送通知（抽象方法，子类必须实现）
   */
  abstract sendNotification(message: NotificationMessage, signal: TradingSignal): Promise<boolean>;

  /**
   * 获取通道类型（抽象方法，子类必须实现）
   */
  abstract getChannelType(): NotificationChannel;

  /**
   * 带重试的发送通知
   */
  async sendWithRetry(message: NotificationMessage, signal: TradingSignal): Promise<SendResult> {
    const startTime = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (!this.isEnabled || this.status !== ChannelStatus.ACTIVE) {
          throw new Error(`通道状态异常: ${this.status}`);
        }

        const success = await this.sendNotification(message, signal);
        
        if (success) {
          const responseTime = Date.now() - startTime;
          this.updateStatistics(true, responseTime);
          this.resetErrorCount();
          
          return {
            success: true,
            messageId: message.id,
            deliveryStatus: 'SENT'
          };
        } else {
          throw new Error('发送失败，返回false');
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        logger.warn(`通道 ${this.getChannelType()} 发送失败 (${attempt}/${this.maxRetries}): ${lastError}`);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    // 所有重试都失败
    const responseTime = Date.now() - startTime;
    this.updateStatistics(false, responseTime);
    this.incrementErrorCount();

    return {
      success: false,
      messageId: message.id,
      error: lastError,
      deliveryStatus: 'FAILED'
    };
  }

  /**
   * 测试连接（可选实现）
   */
  async testConnection(): Promise<boolean> {
    return true;
  }

  /**
   * 检查是否支持富文本（可选实现）
   */
  supportsRichContent(): boolean {
    return false;
  }

  /**
   * 获取通道状态
   */
  getStatus(): ChannelStatus {
    return this.status;
  }

  /**
   * 设置通道状态
   */
  setStatus(status: ChannelStatus): void {
    const oldStatus = this.status;
    this.status = status;
    
    if (oldStatus !== status) {
      logger.info(`通道 ${this.getChannelType()} 状态变更: ${oldStatus} -> ${status}`);
    }
  }

  /**
   * 启用通道
   */
  enable(): void {
    this.isEnabled = true;
    if (this.status === ChannelStatus.INACTIVE) {
      this.setStatus(ChannelStatus.ACTIVE);
    }
    logger.info(`通道 ${this.getChannelType()} 已启用`);
  }

  /**
   * 禁用通道
   */
  disable(): void {
    this.isEnabled = false;
    this.setStatus(ChannelStatus.INACTIVE);
    logger.info(`通道 ${this.getChannelType()} 已禁用`);
  }

  /**
   * 检查通道是否可用
   */
  isAvailable(): boolean {
    return this.isEnabled && this.status === ChannelStatus.ACTIVE;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): ChannelStatistics {
    return { ...this.statistics };
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = {
      totalSent: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      uptime: Date.now()
    };
    logger.info(`通道 ${this.getChannelType()} 统计信息已重置`);
  }

  /**
   * 获取错误计数
   */
  getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * 设置最大重试次数
   */
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = Math.max(0, maxRetries);
  }

  /**
   * 设置重试延迟
   */
  setRetryDelay(delay: number): void {
    this.retryDelay = Math.max(100, delay);
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    return Date.now() - this.statistics.uptime;
  }

  /**
   * 获取成功率
   */
  getSuccessRate(): number {
    if (this.statistics.totalSent === 0) {
      return 0;
    }
    return this.statistics.successCount / this.statistics.totalSent;
  }

  /**
   * 更新统计信息
   */
  protected updateStatistics(success: boolean, responseTime: number): void {
    this.statistics.totalSent++;
    
    if (success) {
      this.statistics.successCount++;
      this.statistics.lastSentTime = Date.now();
    } else {
      this.statistics.failureCount++;
      this.statistics.lastErrorTime = Date.now();
    }

    // 更新平均响应时间
    const totalTime = this.statistics.averageResponseTime * (this.statistics.totalSent - 1) + responseTime;
    this.statistics.averageResponseTime = totalTime / this.statistics.totalSent;
  }

  /**
   * 增加错误计数
   */
  protected incrementErrorCount(): void {
    this.errorCount++;
    
    // 如果错误过多，自动禁用通道
    if (this.errorCount >= 10 && this.status === ChannelStatus.ACTIVE) {
      this.setStatus(ChannelStatus.ERROR);
      logger.error(`通道 ${this.getChannelType()} 因错误过多自动禁用`);
    }
  }

  /**
   * 重置错误计数
   */
  protected resetErrorCount(): void {
    if (this.errorCount > 0) {
      this.errorCount = 0;
      
      // 如果之前因错误禁用，现在恢复
      if (this.status === ChannelStatus.ERROR) {
        this.setStatus(ChannelStatus.ACTIVE);
        logger.info(`通道 ${this.getChannelType()} 已恢复正常`);
      }
    }
  }

  /**
   * 等待指定时间
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 验证消息格式（可被子类重写）
   */
  protected validateMessage(message: NotificationMessage): boolean {
    if (!message.id || !message.title || !message.content) {
      logger.error('消息格式无效：缺少必要字段');
      return false;
    }
    
    if (message.content.length > 5000) {
      logger.warn('消息内容过长，可能影响发送');
    }
    
    return true;
  }

  /**
   * 格式化消息内容（可被子类重写）
   */
  protected formatMessage(message: NotificationMessage, signal: TradingSignal): string {
    return `${message.title}\n\n${message.content}`;
  }

  /**
   * 处理发送前的准备工作（可被子类重写）
   */
  protected async beforeSend(message: NotificationMessage, signal: TradingSignal): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 处理发送后的清理工作（可被子类重写）
   */
  protected async afterSend(
    message: NotificationMessage, 
    signal: TradingSignal, 
    result: SendResult
  ): Promise<void> {
    // 默认实现为空，子类可以重写
  }

  /**
   * 获取通道健康状态
   */
  getHealthStatus(): {
    status: ChannelStatus;
    isHealthy: boolean;
    uptime: number;
    successRate: number;
    errorCount: number;
    lastError?: number;
  } {
    const successRate = this.getSuccessRate();
    const isHealthy = this.isAvailable() && 
                     successRate >= 0.9 && 
                     this.errorCount < 5;

    return {
      status: this.status,
      isHealthy,
      uptime: this.getUptime(),
      successRate,
      errorCount: this.errorCount,
      lastError: this.statistics.lastErrorTime
    };
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      const isConnected = await this.testConnection();
      
      if (!isConnected) {
        this.setStatus(ChannelStatus.ERROR);
        return false;
      }

      if (this.status === ChannelStatus.ERROR) {
        this.setStatus(ChannelStatus.ACTIVE);
        this.resetErrorCount();
      }

      return true;

    } catch (error) {
      logger.error(`通道 ${this.getChannelType()} 健康检查失败`, error);
      this.setStatus(ChannelStatus.ERROR);
      return false;
    }
  }

  /**
   * 导出配置（子类应该重写以返回具体配置）
   */
  exportConfig(): Record<string, any> {
    return {
      type: this.getChannelType(),
      enabled: this.isEnabled,
      status: this.status,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay
    };
  }

  /**
   * 导入配置（子类应该重写以应用具体配置）
   */
  importConfig(config: Record<string, any>): void {
    if (typeof config.enabled === 'boolean') {
      this.isEnabled = config.enabled;
    }
    
    if (typeof config.maxRetries === 'number') {
      this.setMaxRetries(config.maxRetries);
    }
    
    if (typeof config.retryDelay === 'number') {
      this.setRetryDelay(config.retryDelay);
    }
  }
}