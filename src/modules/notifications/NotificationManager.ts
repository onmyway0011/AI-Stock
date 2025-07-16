/**
 * 通知管理器
 * 统一管理多个通知通道，支持消息通知开关控制
 * @class NotificationManager
 */

import {
  NotificationMessage,
  TradingSignal,
  NotificationChannel,
  SignalConfig,
  SignalStatistics
} from '../../../shared/types';
import { BaseNotificationChannel, ChannelStatus, SendResult } from './channels/BaseNotificationChannel';
import { WeChatNotificationChannel, WeChatConfig } from './channels/WeChatNotificationChannel';
import { DateUtils } from '../../../shared/utils';

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  /** 是否启用通知 */
  enabled: boolean;
  /** 全局静默时间 */
  quietHours?: {
    start: string; // HH:mm格式
    end: string;
  };
  /** 每日最大通知数量 */
  maxDailyNotifications?: number;
  /** 通知间隔（毫秒） */
  notificationInterval: number;
  /** 启用的通道 */
  enabledChannels: NotificationChannel[];
  /** 通道配置 */
  channels: {
    wechat?: WeChatConfig;
    email?: any;
    sms?: any;
    webhook?: any;
  };
  /** 过滤规则 */
  filters: {
    minConfidence: number;
    allowedSignalTypes: string[];
    priorityOnly: boolean;
  };
}

/**
 * 消息队列项
 */
interface QueueItem {
  message: NotificationMessage;
  signal: TradingSignal;
  channels: NotificationChannel[];
  priority: number;
  timestamp: number;
  attempts: number;
}

/**
 * 通知统计
 */
export interface NotificationStatistics {
  /** 今日发送总数 */
  todaySent: number;
  /** 总发送数 */
  totalSent: number;
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failureCount: number;
  /** 各通道统计 */
  channelStats: Record<string, {
    sent: number;
    success: number;
    failure: number;
    lastSent?: number;
  }>;
  /** 队列状态 */
  queueStatus: {
    pending: number;
    processing: number;
    failed: number;
  };
}

/**
 * 通知管理器
 */
export class NotificationManager {
  private config: NotificationConfig;
  private channels = new Map<NotificationChannel, BaseNotificationChannel>();
  private messageQueue: QueueItem[] = [];
  private processingQueue = new Set<string>();
  private isProcessing = false;
  private lastNotificationTime = 0;
  private dailyNotificationCount = 0;
  private currentDate = new Date().toDateString();
  private statistics: NotificationStatistics;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.statistics = this.initStatistics();
    this.initializeChannels();
    this.startQueueProcessor();
  }

  /**
   * 发送信号通知
   * @param signal 交易信号
   * @returns Promise<boolean> 发送成功返回true，失败返回false
   */
  async sendSignalNotification(signal: TradingSignal): Promise<boolean> {
    try {
      if (!this.shouldSendNotification(signal)) {
        console.debug(`信号通知被过滤: ${signal.id}`);
        return false;
      }

      // 创建通知消息
      const message = this.createNotificationMessage(signal);
      
      // 确定发送通道
      const channels = this.determineChannels(signal);
      
      if (channels.length === 0) {
        console.warn('没有可用的通知通道');
        return false;
      }

      // 添加到队列
      this.addToQueue(message, signal, channels);
      
      console.info(`信号通知已加入队列: ${signal.symbol} ${signal.type}`);
      return true;

    } catch (error) {
      console.error('发送信号通知失败', error);
      return false;
    }
  }

  /**
   * 发送自定义通知
   * @param title 通知标题
   * @param content 通知内容
   * @param channels 可选，指定发送的通道，默认为配置的启用的通道
   * @param priority 可选，通知优先级，默认为MEDIUM
   * @returns Promise<boolean> 发送成功返回true，失败返回false
   */
  async sendCustomNotification(
    title: string,
    content: string,
    channels?: NotificationChannel[],
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM'
  ): Promise<boolean> {
    try {
      if (!this.config.enabled) {
        console.debug('通知功能已禁用');
        return false;
      }

      const message: NotificationMessage = {
        id: this.generateMessageId(),
        signalId: '',
        channel: NotificationChannel.WECHAT,
        title,
        content,
        timestamp: Date.now(),
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3
      };

      const targetChannels = channels || this.config.enabledChannels;
      const priorityValue = this.getPriorityValue(priority);

      this.addToQueue(message, null, targetChannels, priorityValue);
      
      console.info(`自定义通知已加入队列: ${title}`);
      return true;

    } catch (error) {
      console.error('发送自定义通知失败', error);
      return false;
    }
  }

  /**
   * 添加通知通道
   * @param channel 通知通道实例
   */
  addChannel(channel: BaseNotificationChannel): void {
    const type = channel.getChannelType();
    this.channels.set(type, channel);
    
    // 初始化通道统计
    if (!this.statistics.channelStats[type]) {
      this.statistics.channelStats[type] = {
        sent: 0,
        success: 0,
        failure: 0
      };
    }
    
    console.info(`通知通道已添加: ${type}`);
  }

  /**
   * 移除通知通道
   * @param channelType 通道类型
   */
  removeChannel(channelType: NotificationChannel): void {
    const channel = this.channels.get(channelType);
    if (channel) {
      channel.disable();
      this.channels.delete(channelType);
      console.info(`通知通道已移除: ${channelType}`);
    }
  }

  /**
   * 启用/禁用通知
   * @param enabled 是否启用通知
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.info(`通知功能${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 设置静默时间
   * @param start 开始时间 (HH:mm格式)
   * @param end 结束时间 (HH:mm格式)
   */
  setQuietHours(start: string, end: string): void {
    this.config.quietHours = { start, end };
    console.info(`静默时间已设置: ${start} - ${end}`);
  }

  /**
   * 设置每日最大通知数量
   * @param max 每日最大通知数量
   */
  setMaxDailyNotifications(max: number): void {
    this.config.maxDailyNotifications = max;
    console.info(`每日最大通知数量已设置: ${max}`);
  }

  /**
   * 获取统计信息
   * @returns NotificationStatistics 通知统计信息
   */
  getStatistics(): NotificationStatistics {
    // 更新队列状态
    this.statistics.queueStatus = {
      pending: this.messageQueue.length,
      processing: this.processingQueue.size,
      failed: this.messageQueue.filter(item => item.attempts >= 3).length
    };
    return { ...this.statistics };
  }

  /**
   * 获取通道状态
   * @returns Record<string, any> 所有通道的状态
   */
  getChannelStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    for (const [type, channel] of this.channels) {
      statuses[type] = {
        status: channel.getStatus(),
        isAvailable: channel.isAvailable(),
        statistics: channel.getStatistics(),
        health: channel.getHealthStatus()
      };
    }
    
    return statuses;
  }

  /**
   * 执行健康检查
   * @returns Promise<Record<string, boolean>> 所有通道的健康检查结果
   */
  async performHealthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [type, channel] of this.channels) {
      try {
        results[type] = await channel.performHealthCheck();
      } catch (error) {
        console.error(`通道 ${type} 健康检查失败`, error);
        results[type] = false;
      }
    }
    
    return results;
  }

  /**
   * 清空消息队列
   */
  clearQueue(): void {
    this.messageQueue = [];
    this.processingQueue.clear();
    console.info('消息队列已清空');
  }

  /**
   * 重置统计信息
   */
  resetStatistics(): void {
    this.statistics = this.initStatistics();
    console.info('通知统计已重置');
  }

  /**
   * 更新配置
   * @param newConfig 新的配置
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重新初始化通道
    if (newConfig.channels) {
      this.initializeChannels();
    }
    
    console.info('通知配置已更新');
  }

  /**
   * 导出配置
   * @returns NotificationConfig 当前配置
   */
  exportConfig(): NotificationConfig {
    return { ...this.config };
  }

  // =================== 私有方法 ===================

  /**
   * 初始化统计信息
   * @private
   * @returns NotificationStatistics 初始化的统计信息
   */
  private initStatistics(): NotificationStatistics {
    return {
      todaySent: 0,
      totalSent: 0,
      successCount: 0,
      failureCount: 0,
      channelStats: {},
      queueStatus: {
        pending: 0,
        processing: 0,
        failed: 0
      }
    };
  }

  /**
   * 初始化通知通道
   * @private
   */
  private initializeChannels(): void {
    // 清除现有通道
    for (const channel of this.channels.values()) {
      channel.disable();
    }
    this.channels.clear();

    // 初始化微信通道
    if (this.config.channels.wechat && this.config.enabledChannels.includes(NotificationChannel.WECHAT)) {
      try {
        const wechatChannel = new WeChatNotificationChannel(this.config.channels.wechat);
        this.addChannel(wechatChannel);
      } catch (error) {
        console.error('初始化微信通道失败', error);
      }
    }

    // 可以在这里添加其他通道的初始化
    // 如邮件、短信、Webhook等
  }

  /**
   * 启动队列处理器
   * @private
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.messageQueue.length > 0) {
        this.processQueue();
      }
    }, 1000); // 每秒检查一次队列
  }

  /**
   * 处理消息队列
   * @private
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      // 按优先级排序
      this.messageQueue.sort((a, b) => b.priority - a.priority);
      
      const batch = this.messageQueue.splice(0, 5); // 批量处理5个消息
      
      for (const item of batch) {
        await this.processQueueItem(item);
      }
      
    } catch (error) {
      console.error('处理消息队列失败', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 处理队列中的单个消息
   * @private
   * @param item 消息队列项
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    const { message, signal, channels } = item;
    
    try {
      this.processingQueue.add(message.id);
      
      // 检查通知间隔
      if (Date.now() - this.lastNotificationTime < this.config.notificationInterval) {
        // 延迟处理
        this.messageQueue.unshift(item);
        return;
      }

      // 并行发送到所有通道
      const sendPromises = channels.map(async (channelType) => {
        const channel = this.channels.get(channelType);
        if (!channel || !channel.isAvailable()) {
          return { channelType, success: false, error: '通道不可用' };
        }

        try {
          const result = await channel.sendWithRetry(message, signal!);
          return { channelType, ...result };
        } catch (error) {
          return { 
            channelType, 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      });

      const results = await Promise.allSettled(sendPromises);
      
      // 处理发送结果
      let hasSuccess = false;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { channelType, success } = result.value;
          this.updateChannelStats(channelType, success);
          if (success) hasSuccess = true;
        }
      }

      // 更新统计
      this.updateGlobalStats(hasSuccess);
      
      if (hasSuccess) {
        this.lastNotificationTime = Date.now();
        this.updateDailyCount();
        console.info(`消息发送成功: ${message.title}`);
      } else {
        // 重试逻辑
        item.attempts++;
        if (item.attempts < 3) {
          this.messageQueue.push(item);
          console.warn(`消息发送失败，将重试: ${message.title}`);
        } else {
          console.error(`消息发送最终失败: ${message.title}`);
        }
      }

    } catch (error) {
      console.error(`处理消息失败: ${message.title}`, error);
    } finally {
      this.processingQueue.delete(message.id);
    }
  }

  /**
   * 判断是否应该发送通知
   * @private
   * @param signal 交易信号
   * @returns boolean 是否应该发送
   */
  private shouldSendNotification(signal: TradingSignal): boolean {
    // 检查通知开关
    if (!this.config.enabled) {
      return false;
    }

    // 检查信号是否需要通知
    if (!signal.shouldNotify) {
      return false;
    }

    // 检查置信度阈值
    if (signal.confidence.overall < this.config.filters.minConfidence) {
      return false;
    }

    // 检查信号类型
    if (!this.config.filters.allowedSignalTypes.includes(signal.type)) {
      return false;
    }

    // 检查优先级过滤
    if (this.config.filters.priorityOnly && signal.priority !== 'HIGH' && signal.priority !== 'URGENT') {
      return false;
    }
    // 检查静默时间
    if (this.isInQuietHours()) {
      return signal.priority === 'URGENT'; // 只有紧急信号可以在静默时间发送
    }

    // 检查每日限制
    if (this.isDailyLimitReached()) {
      return signal.priority === 'URGENT';
    }

    return true;
  }

  /**
   * 检查是否在静默时间
   * @private
   * @returns boolean 是否在静默时间
   */
  private isInQuietHours(): boolean {
    if (!this.config.quietHours) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.config.quietHours;
    
    if (start < end) {
      // 正常情况，如 22:00 - 08:00
      return currentTime >= start && currentTime <= end;
    } else {
      // 跨日情况，如 22:00 - 08:00
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * 检查每日限制是否达到
   * @private
   * @returns boolean 是否达到每日限制
   */
  private isDailyLimitReached(): boolean {
    this.checkDateReset();
    
    if (!this.config.maxDailyNotifications) {
      return false;
    }
    
    return this.dailyNotificationCount >= this.config.maxDailyNotifications;
  }

  /**
   * 检查日期重置
   * @private
   */
  private checkDateReset(): void {
    const today = new Date().toDateString();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.dailyNotificationCount = 0;
      this.statistics.todaySent = 0;
    }
  }

  /**
   * 更新每日计数
   * @private
   */
  private updateDailyCount(): void {
    this.checkDateReset();
    this.dailyNotificationCount++;
    this.statistics.todaySent++;
  }

  /**
   * 创建通知消息
   * @private
   * @param signal 交易信号
   * @returns NotificationMessage 通知消息
   */
  private createNotificationMessage(signal: TradingSignal): NotificationMessage {
    const title = this.generateMessageTitle(signal);
    const content = this.generateMessageContent(signal);

    return {
      id: this.generateMessageId(),
      signalId: signal.id,
      channel: NotificationChannel.WECHAT, // 默认通道
      title,
      content,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      maxRetries: 3
    };
  }

  /**
   * 生成消息标题
   * @private
   * @param signal 交易信号
   * @returns string 消息标题
   */
  private generateMessageTitle(signal: TradingSignal): string {
    const action = signal.type === 'BUY' ? '买入' : '卖出';
    const strength = this.translateStrength(signal.strength);
    return `${action}信号 | ${signal.symbol} | ${strength}`;
  }

  /**
   * 生成消息内容
   * @private
   * @param signal 交易信号
   * @returns string 消息内容
   */
  private generateMessageContent(signal: TradingSignal): string {
    const action = signal.type === 'BUY' ? '买入' : '卖出';
    const confidence = (signal.confidence.overall * 100).toFixed(1);
    
    return `
🔔 ${action}信号提醒

📊 交易品种: ${signal.symbol}
💪 信号强度: ${this.translateStrength(signal.strength)}
🎯 置信度: ${confidence}%
💰 建议价格: ${signal.priceSuggestion.entryPrice.toFixed(4)}
⛔ 止损价格: ${signal.priceSuggestion.stopLoss.toFixed(4)}
🎁 止盈价格: ${signal.priceSuggestion.takeProfit.toFixed(4)}
⚠️ 风险等级: ${signal.riskAssessment.level}

📝 分析: ${signal.reason}

⏰ 时间: ${DateUtils.formatTimestamp(signal.timestamp)}
    `.trim();
  }

  /**
   * 翻译信号强度
   * @private
   * @param strength 信号强度
   * @returns string 翻译后的强度
   */
  private translateStrength(strength: string): string {
    const map: Record<string, string> = {
      'VERY_STRONG': '很强',
      'STRONG': '强',
      'MODERATE': '中等',
      'WEAK': '弱',
      'VERY_WEAK': '很弱'
    };
    return map[strength] || strength;
  }

  /**
   * 确定发送通道
   * @private
   * @param signal 交易信号
   * @returns NotificationChannel[] 确定的发送通道
   */
  private determineChannels(signal: TradingSignal): NotificationChannel[] {
    if (signal.notificationChannels && signal.notificationChannels.length > 0) {
      return signal.notificationChannels.filter(channel => 
        this.config.enabledChannels.includes(channel)
      );
    }
    
    return this.config.enabledChannels;
  }

  /**
   * 添加到队列
   * @private
   * @param message 通知消息
   * @param signal 交易信号
   * @param channels 发送通道
   * @param priority 优先级
   */
  private addToQueue(
    message: NotificationMessage,
    signal: TradingSignal | null,
    channels: NotificationChannel[],
    priority?: number
  ): void {
    const priorityValue = priority || this.getPriorityValue(signal?.priority || 'MEDIUM');
    
    this.messageQueue.push({
      message,
      signal: signal!,
      channels,
      priority: priorityValue,
      timestamp: Date.now(),
      attempts: 0
    });
  }

  /**
   * 获取优先级数值
   * @private
   * @param priority 通知优先级
   * @returns number 优先级数值
   */
  private getPriorityValue(priority: string): number {
    const map: Record<string, number> = {
      'URGENT': 100,
      'HIGH': 75,
      'MEDIUM': 50,
      'LOW': 25
    };
    return map[priority] || 50;
  }

  /**
   * 更新通道统计
   * @private
   * @param channelType 通道类型
   * @param success 发送是否成功
   */
  private updateChannelStats(channelType: NotificationChannel, success: boolean): void {
    const stats = this.statistics.channelStats[channelType];
    if (stats) {
      stats.sent++;
      if (success) {
        stats.success++;
        stats.lastSent = Date.now();
      } else {
        stats.failure++;
      }
    }
  }

  /**
   * 更新全局统计
   * @private
   * @param success 发送是否成功
   */
  private updateGlobalStats(success: boolean): void {
    this.statistics.totalSent++;
    if (success) {
      this.statistics.successCount++;
    } else {
      this.statistics.failureCount++;
    }
  }

  /**
   * 生成消息ID
   * @private
   * @returns string 消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 停止服务
   */
  destroy(): void {
    // 禁用所有通道
    for (const channel of this.channels.values()) {
      channel.disable();
    }
    
    // 清空队列
    this.clearQueue();
    
    console.info('通知管理器已销毁');
  }
}