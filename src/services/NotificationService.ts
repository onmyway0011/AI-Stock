/**
 * 通知服务
 * 支持微信、微信公众号、邮箱等多种推送方式
 */

import * as nodemailer from 'nodemailer';
import * as notifier from 'node-notifier';
import axios from 'axios';
import { EventEmitter } from 'events';
import { ConfigService } from './ConfigService';
import { Signal } from '../types';
import { createLogger } from '../utils';

const logger = createLogger('NOTIFICATION_SERVICE');

export interface NotificationChannel {
  type: 'wechat' | 'wechatPublic' | 'email' | 'desktop';
  enabled: boolean;
}

export interface NotificationRecord {
  id: string;
  type: string;
  channel: string;
  title: string;
  content: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

/**
 * 通知服务类
 */
export class NotificationService extends EventEmitter {
  private emailTransporter: nodemailer.Transporter | null = null;
  private wechatAccessToken: string | null = null;
  private wechatTokenExpires: number = 0;

  constructor(private configService: ConfigService) {
    super();
    this.initializeEmailTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  private async initializeEmailTransporter(): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const emailConfig = config.notifications.channels.email;

      if (emailConfig.enabled && emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass) {
        this.emailTransporter = nodemailer.createTransport(emailConfig.smtp);
        
        // 验证邮件配置
        await this.emailTransporter.verify();
        logger.info('邮件服务已初始化');
      }
    } catch (error) {
      logger.error('邮件服务初始化失败:', error);
    }
  }

  /**
   * 发送交易信号通知
   */
  async sendTradingSignal(signal: Signal): Promise<void> {
    const config = this.configService.getConfig();
    
    if (!config.notifications.enabled) {
      return;
    }

    const notificationData = {
      symbol: signal.symbol,
      side: signal.side === 'BUY' ? '买入' : '卖出',
      price: signal.price.toFixed(2),
      confidence: (signal.confidence * 100).toFixed(1),
      reason: signal.reason || '策略信号',
      time: new Date().toLocaleString('zh-CN')
    };

    const promises: Promise<void>[] = [];

    // 桌面通知
    if (config.notifications.desktop) {
      promises.push(this.sendDesktopNotification(
        '🚨 交易信号提醒',
        `${signal.symbol} ${notificationData.side} ¥${notificationData.price}`,
        'trading-signal'
      ));
    }

    // 微信通知
    if (config.notifications.channels.wechat.enabled) {
      promises.push(this.sendWeChatNotification(notificationData));
    }

    // 微信公众号通知
    if (config.notifications.channels.wechatPublic.enabled) {
      promises.push(this.sendWeChatPublicNotification(notificationData));
    }

    // 邮件通知
    if (config.notifications.channels.email.enabled) {
      promises.push(this.sendEmailNotification(notificationData));
    }

    await Promise.allSettled(promises);
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(message: string, type: 'info' | 'warning' | 'error'): Promise<void> {
    const config = this.configService.getConfig();
    
    if (!config.notifications.enabled) {
      return;
    }

    const iconMap = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };

    const title = `${iconMap[type]} 系统通知`;
    
    // 桌面通知
    if (config.notifications.desktop) {
      await this.sendDesktopNotification(title, message, type);
    }

    // 记录通知历史
    await this.recordNotification({
      id: this.generateId(),
      type: 'system',
      channel: 'desktop',
      title,
      content: message,
      timestamp: Date.now(),
      success: true
    });
  }

  /**
   * 发送桌面通知
   */
  private async sendDesktopNotification(title: string, message: string, type: string): Promise<void> {
    try {
      notifier.notify({
        title,
        message,
        icon: this.getNotificationIcon(type),
        timeout: 10,
        wait: false
      });

      await this.recordNotification({
        id: this.generateId(),
        type,
        channel: 'desktop',
        title,
        content: message,
        timestamp: Date.now(),
        success: true
      });

    } catch (error) {
      logger.error('桌面通知发送失败:', error);
      await this.recordNotification({
        id: this.generateId(),
        type,
        channel: 'desktop',
        title,
        content: message,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 发送微信群机器人通知
   */
  private async sendWeChatNotification(data: any): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const wechatConfig = config.notifications.channels.wechat;

      if (!wechatConfig.webhookUrl) {
        throw new Error('微信Webhook URL未配置');
      }

      const content = this.renderTemplate(wechatConfig.template, data);

      const response = await axios.post(wechatConfig.webhookUrl, {
        msgtype: 'text',
        text: {
          content
        }
      });

      if (response.data.errcode !== 0) {
        throw new Error(`微信API错误: ${response.data.errmsg}`);
      }

      await this.recordNotification({
        id: this.generateId(),
        type: 'trading-signal',
        channel: 'wechat',
        title: '交易信号',
        content,
        timestamp: Date.now(),
        success: true
      });

      logger.info('微信通知发送成功');

    } catch (error) {
      logger.error('微信通知发送失败:', error);
      await this.recordNotification({
        id: this.generateId(),
        type: 'trading-signal',
        channel: 'wechat',
        title: '交易信号',
        content: JSON.stringify(data),
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 发送微信公众号模板消息
   */
  private async sendWeChatPublicNotification(data: any): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const wechatConfig = config.notifications.channels.wechatPublic;

      if (!wechatConfig.appId || !wechatConfig.appSecret || !wechatConfig.templateId) {
        throw new Error('微信公众号配置不完整');
      }

      // 获取访问令牌
      const accessToken = await this.getWeChatAccessToken(wechatConfig.appId, wechatConfig.appSecret);

      // 发送模板消息给每个用户
      for (const openId of wechatConfig.userOpenIds) {
        const templateData = {
          first: { value: '交易信号提醒', color: '#173177' },
          keyword1: { value: data.symbol, color: '#173177' },
          keyword2: { value: data.side, color: data.side === '买入' ? '#ff0000' : '#00ff00' },
          keyword3: { value: `¥${data.price}`, color: '#173177' },
          keyword4: { value: `${data.confidence}%`, color: '#173177' },
          remark: { value: data.reason, color: '#666666' }
        };

        await axios.post(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`, {
          touser: openId,
          template_id: wechatConfig.templateId,
          data: templateData
        });
      }

      await this.recordNotification({
        id: this.generateId(),
        type: 'trading-signal',
        channel: 'wechatPublic',
        title: '交易信号',
        content: JSON.stringify(data),
        timestamp: Date.now(),
        success: true
      });

      logger.info('微信公众号通知发送成功');

    } catch (error) {
      logger.error('微信公众号通知发送失败:', error);
      await this.recordNotification({
        id: this.generateId(),
        type: 'trading-signal',
        channel: 'wechatPublic',
        title: '交易信号',
        content: JSON.stringify(data),
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(data: any): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const emailConfig = config.notifications.channels.email;

      if (!this.emailTransporter) {
        await this.initializeEmailTransporter();
      }

      if (!this.emailTransporter) {
        throw new Error('邮件服务未初始化');
      }

      const subject = `🚨 AI股票交易信号 - ${data.symbol} ${data.side}`;
      const html = this.renderTemplate(emailConfig.template, data);

      const mailOptions = {
        from: emailConfig.from,
        to: emailConfig.to,
        subject,
        html
      };

      await this.emailTransporter.sendMail(mailOptions);

      await this.recordNotification({
        id: this.generateId(),
        type: 'trading-signal',
        channel: 'email',
        title: subject,
        content: html,
        timestamp: Date.now(),
        success: true
      });

      logger.info('邮件通知发送成功');

    } catch (error) {
      logger.error('邮件通知发送失败:', error);
      await this.recordNotification({
        id: this.generateId(),
        type: 'trading-signal',
        channel: 'email',
        title: '交易信号',
        content: JSON.stringify(data),
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取微信访问令牌
   */
  private async getWeChatAccessToken(appId: string, appSecret: string): Promise<string> {
    // 如果令牌还有效，直接返回
    if (this.wechatAccessToken && Date.now() < this.wechatTokenExpires) {
      return this.wechatAccessToken;
    }

    try {
      const response = await axios.get(`https://api.weixin.qq.com/cgi-bin/token`, {
        params: {
          grant_type: 'client_credential',
          appid: appId,
          secret: appSecret
        }
      });

      if (response.data.errcode) {
        throw new Error(`获取访问令牌失败: ${response.data.errmsg}`);
      }

      this.wechatAccessToken = response.data.access_token;
      this.wechatTokenExpires = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期

      return this.wechatAccessToken;
    } catch (error) {
      logger.error('获取微信访问令牌失败:', error);
      throw error;
    }
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, data: any): string {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  /**
   * 获取通知图标
   */
  private getNotificationIcon(type: string): string {
    // 返回图标路径，可以根据需要自定义
    return '';
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 记录通知历史
   */
  private async recordNotification(record: NotificationRecord): Promise<void> {
    try {
      await this.configService.addNotificationHistory(record);
      this.emit('notification-sent', record);
    } catch (error) {
      logger.error('记录通知历史失败:', error);
    }
  }

  /**
   * 测试通知配置
   */
  async testNotification(config: any): Promise<boolean> {
    try {
      const testData = {
        symbol: 'TEST',
        side: '买入',
        price: '100.00',
        confidence: '85.0',
        reason: '这是一条测试消息',
        time: new Date().toLocaleString('zh-CN')
      };

      switch (config.type) {
        case 'wechat':
          await this.sendWeChatTestNotification(config, testData);
          break;
        case 'wechatPublic':
          await this.sendWeChatPublicTestNotification(config, testData);
          break;
        case 'email':
          await this.sendEmailTestNotification(config, testData);
          break;
        case 'desktop':
          await this.sendDesktopNotification('🧪 测试通知', '这是一条测试消息', 'test');
          break;
        default:
          throw new Error('不支持的通知类型');
      }

      return true;

    } catch (error) {
      logger.error('测试通知失败:', error);
      return false;
    }
  }

  /**
   * 发送微信测试通知
   */
  private async sendWeChatTestNotification(config: any, data: any): Promise<void> {
    const response = await axios.post(config.webhookUrl, {
      msgtype: 'text',
      text: {
        content: this.renderTemplate(config.template, data)
      }
    });

    if (response.data.errcode !== 0) {
      throw new Error(`微信API错误: ${response.data.errmsg}`);
    }
  }

  /**
   * 发送微信公众号测试通知
   */
  private async sendWeChatPublicTestNotification(config: any, data: any): Promise<void> {
    const accessToken = await this.getWeChatAccessToken(config.appId, config.appSecret);

    for (const openId of config.userOpenIds) {
      const templateData = {
        first: { value: '测试通知', color: '#173177' },
        keyword1: { value: data.symbol, color: '#173177' },
        keyword2: { value: data.side, color: '#ff0000' },
        keyword3: { value: `¥${data.price}`, color: '#173177' },
        keyword4: { value: `${data.confidence}%`, color: '#173177' },
        remark: { value: data.reason, color: '#666666' }
      };
      await axios.post(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`, {
        touser: openId,
        template_id: config.templateId,
        data: templateData
      });
    }
  }

  /**
   * 发送邮件测试通知
   */
  private async sendEmailTestNotification(config: any, data: any): Promise<void> {
    const transporter = nodemailer.createTransport(config.smtp);
    
    const mailOptions = {
      from: config.from,
      to: config.to,
      subject: '🧪 AI股票交易系统测试通知',
      html: this.renderTemplate(config.template, data)
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * 获取通知历史
   */
  getHistory(): NotificationRecord[] {
    const config = this.configService.getConfig();
    return config.notificationHistory || [];
  }

  /**
   * 清理通知历史
   */
  async clearHistory(): Promise<void> {
    await this.configService.clearHistory('notification');
  }

  /**
   * 获取通知统计
   */
  getStatistics(): any {
    const history = this.getHistory();
    const last24h = history.filter(record => 
      Date.now() - record.timestamp < 24 * 60 * 60 * 1000
    );

    return {
      total: history.length,
      last24h: last24h.length,
      success: history.filter(r => r.success).length,
      failed: history.filter(r => !r.success).length,
      byChannel: this.groupBy(history, 'channel'),
      byType: this.groupBy(history, 'type')
    };
  }

  /**
   * 分组统计
   */
  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const group = item[key];
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }
}