/**
 * 微信服务号推送通道
 * 实现微信公众号模板消息推送功能
 */

import axios from 'axios';
import { BaseNotificationChannel } from './BaseNotificationChannel';
import { NotificationMessage, TradingSignal, NotificationChannel } from '../../types/signal';
import { createLogger } from '../../utils/logger';
import { DateUtils } from '../../utils';

const logger = createLogger('WECHAT_NOTIFICATION');

/**
 * 微信配置接口
 */
export interface WeChatConfig {
  /** 应用ID */
  appId: string;
  /** 应用密钥 */
  appSecret: string;
  /** 模板ID */
  templateId: string;
  /** 用户OpenID列表 */
  userOpenIds: string[];
  /** 跳转URL */
  url?: string;
  /** 小程序配置 */
  miniProgram?: {
    appId: string;
    pagePath: string;
  };
  /** API基础URL */
  apiBaseUrl: string;
  /** 访问令牌缓存时间（秒） */
  tokenCacheTime: number;
}

/**
 * 微信模板消息数据
 */
interface TemplateMessageData {
  /** 信号类型 */
  signal_type: { value: string; color: string };
  /** 交易品种 */
  symbol: { value: string; color: string };
  /** 置信度 */
  confidence: { value: string; color: string };
  /** 建议价格 */
  price: { value: string; color: string };
  /** 止损价格 */
  stop_loss: { value: string; color: string };
  /** 止盈价格 */
  take_profit: { value: string; color: string };
  /** 生成时间 */
  time: { value: string; color: string };
  /** 备注 */
  remark?: { value: string; color: string };
}

/**
 * 访问令牌缓存
 */
interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

/**
 * 微信推送通道
 */
export class WeChatNotificationChannel extends BaseNotificationChannel {
  private config: WeChatConfig;
  private tokenCache: AccessTokenCache | null = null;

  constructor(config: WeChatConfig) {
    super();
    this.config = config;
    this.validateConfig();
  }

  /**
   * 发送通知消息
   */
  async sendNotification(message: NotificationMessage, signal: TradingSignal): Promise<boolean> {
    try {
      logger.info(`发送微信通知: ${message.title}`);

      // 获取访问令牌
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('无法获取微信访问令牌');
      }

      // 准备模板消息数据
      const templateData = this.prepareTemplateData(signal);

      // 发送给所有用户
      const results = await Promise.allSettled(
        this.config.userOpenIds.map(openId => 
          this.sendTemplateMessage(accessToken, openId, templateData, signal)
        )
      );

      // 检查发送结果
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const totalCount = results.length;

      logger.info(`微信消息发送完成: ${successCount}/${totalCount} 成功`);

      // 记录失败的发送
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`发送给用户 ${this.config.userOpenIds[index]} 失败:`, result.reason);
        }
      });

      return successCount > 0; // 至少有一个用户发送成功即认为成功

    } catch (error) {
      logger.error('微信推送失败', error);
      return false;
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const required = ['appId', 'appSecret', 'templateId', 'userOpenIds', 'apiBaseUrl'];
    
    for (const field of required) {
      if (!this.config[field as keyof WeChatConfig]) {
        throw new Error(`微信配置缺少必要字段: ${field}`);
      }
    }

    if (!Array.isArray(this.config.userOpenIds) || this.config.userOpenIds.length === 0) {
      throw new Error('微信配置必须包含至少一个用户OpenID');
    }
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      // 检查缓存
      if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
        return this.tokenCache.token;
      }

      // 请求新的访问令牌
      const url = `${this.config.apiBaseUrl}/cgi-bin/token`;
      const params = {
        grant_type: 'client_credential',
        appid: this.config.appId,
        secret: this.config.appSecret
      };

      const response = await axios.get(url, { params, timeout: 10000 });
      
      if (response.data.errcode) {
        throw new Error(`微信API错误 ${response.data.errcode}: ${response.data.errmsg}`);
      }

      const { access_token, expires_in } = response.data;
      
      // 缓存访问令牌（提前5分钟过期）
      this.tokenCache = {
        token: access_token,
        expiresAt: Date.now() + (expires_in - 300) * 1000
      };

      logger.info('微信访问令牌获取成功');
      return access_token;

    } catch (error) {
      logger.error('获取微信访问令牌失败', error);
      return null;
    }
  }

  /**
   * 发送模板消息
   */
  private async sendTemplateMessage(
    accessToken: string,
    openId: string,
    templateData: TemplateMessageData,
    signal: TradingSignal
  ): Promise<void> {
    const url = `${this.config.apiBaseUrl}/cgi-bin/message/template/send?access_token=${accessToken}`;
    
    const messageBody = {
      touser: openId,
      template_id: this.config.templateId,
      url: this.config.url,
      miniprogram: this.config.miniProgram,
      data: templateData
    };
    const response = await axios.post(url, messageBody, { timeout: 10000 });
    
    if (response.data.errcode !== 0) {
      throw new Error(`发送模板消息失败 ${response.data.errcode}: ${response.data.errmsg}`);
    }

    logger.debug(`模板消息发送成功: ${openId}, msgid: ${response.data.msgid}`);
  }

  /**
   * 准备模板消息数据
   */
  private prepareTemplateData(signal: TradingSignal): TemplateMessageData {
    // 根据信号类型确定颜色
    const getSignalColor = (type: string): string => {
      switch (type) {
        case 'BUY': return '#00AA00';
        case 'SELL': return '#FF0000';
        default: return '#333333';
      }
    };

    const getConfidenceColor = (confidence: number): string => {
      if (confidence >= 0.9) return '#00AA00';
      if (confidence >= 0.8) return '#FFA500';
      return '#FF0000';
    };

    const formatPrice = (price: number): string => {
      return price.toFixed(4);
    };

    const formatTime = (timestamp: number): string => {
      return DateUtils.formatTimestamp(timestamp, 'MM-DD HH:mm');
    };

    const confidencePercent = (signal.confidence.overall * 100).toFixed(1);

    return {
      signal_type: {
        value: signal.type === 'BUY' ? '买入信号' : '卖出信号',
        color: getSignalColor(signal.type)
      },
      symbol: {
        value: signal.symbol,
        color: '#333333'
      },
      confidence: {
        value: `${confidencePercent}%`,
        color: getConfidenceColor(signal.confidence.overall)
      },
      price: {
        value: formatPrice(signal.priceSuggestion.entryPrice),
        color: '#333333'
      },
      stop_loss: {
        value: formatPrice(signal.priceSuggestion.stopLoss),
        color: '#FF0000'
      },
      take_profit: {
        value: formatPrice(signal.priceSuggestion.takeProfit),
        color: '#00AA00'
      },
      time: {
        value: formatTime(signal.timestamp),
        color: '#666666'
      },
      remark: {
        value: `${signal.strength} | 风险: ${signal.riskAssessment.level}`,
        color: '#666666'
      }
    };
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return token !== null;
    } catch (error) {
      logger.error('微信连接测试失败', error);
      return false;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(openId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }

      const url = `${this.config.apiBaseUrl}/cgi-bin/user/info`;
      const params = {
        access_token: accessToken,
        openid: openId,
        lang: 'zh_CN'
      };

      const response = await axios.get(url, { params, timeout: 10000 });
      
      if (response.data.errcode) {
        throw new Error(`获取用户信息失败: ${response.data.errmsg}`);
      }

      return response.data;

    } catch (error) {
      logger.error(`获取用户信息失败: ${openId}`, error);
      return null;
    }
  }

  /**
   * 发送客服消息
   */
  async sendCustomMessage(openId: string, content: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }
      const url = `${this.config.apiBaseUrl}/cgi-bin/message/custom/send?access_token=${accessToken}`;
      
      const messageBody = {
        touser: openId,
        msgtype: 'text',
        text: {
          content
        }
      };

      const response = await axios.post(url, messageBody, { timeout: 10000 });
      
      if (response.data.errcode !== 0) {
        throw new Error(`发送客服消息失败: ${response.data.errmsg}`);
      }

      logger.debug(`客服消息发送成功: ${openId}`);
      return true;

    } catch (error) {
      logger.error(`发送客服消息失败: ${openId}`, error);
      return false;
    }
  }

  /**
   * 发送图文消息
   */
  async sendNewsMessage(openId: string, articles: Array<{
    title: string;
    description: string;
    url: string;
    picurl?: string;
  }>): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }
      const url = `${this.config.apiBaseUrl}/cgi-bin/message/custom/send?access_token=${accessToken}`;
      
      const messageBody = {
        touser: openId,
        msgtype: 'news',
        news: {
          articles: articles.slice(0, 8) // 最多8篇图文
        }
      };

      const response = await axios.post(url, messageBody, { timeout: 10000 });
      
      if (response.data.errcode !== 0) {
        throw new Error(`发送图文消息失败: ${response.data.errmsg}`);
      }

      logger.debug(`图文消息发送成功: ${openId}`);
      return true;

    } catch (error) {
      logger.error(`发送图文消息失败: ${openId}`, error);
      return false;
    }
  }

  /**
   * 创建菜单
   */
  async createMenu(menu: any): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }

      const url = `${this.config.apiBaseUrl}/cgi-bin/menu/create?access_token=${accessToken}`;
      const response = await axios.post(url, menu, { timeout: 10000 });
      
      if (response.data.errcode !== 0) {
        throw new Error(`创建菜单失败: ${response.data.errmsg}`);
      }

      logger.info('微信菜单创建成功');
      return true;

    } catch (error) {
      logger.error('创建微信菜单失败', error);
      return false;
    }
  }

  /**
   * 获取用户列表
   */
  async getUserList(nextOpenId?: string): Promise<{
    total: number;
    count: number;
    data?: { openid: string[] };
    next_openid?: string;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }

      const url = `${this.config.apiBaseUrl}/cgi-bin/user/get`;
      const params: any = { access_token: accessToken };
      
      if (nextOpenId) {
        params.next_openid = nextOpenId;
      }

      const response = await axios.get(url, { params, timeout: 10000 });
      
      if (response.data.errcode) {
        throw new Error(`获取用户列表失败: ${response.data.errmsg}`);
      }

      return response.data;

    } catch (error) {
      logger.error('获取用户列表失败', error);
      return { total: 0, count: 0 };
    }
  }

  /**
   * 清空访问令牌缓存
   */
  clearTokenCache(): void {
    this.tokenCache = null;
    logger.info('微信访问令牌缓存已清空');
  }

  /**
   * 获取渠道类型
   */
  getChannelType(): NotificationChannel {
    return NotificationChannel.WECHAT;
  }

  /**
   * 检查是否支持富文本
   */
  supportsRichContent(): boolean {
    return true;
  }

  /**
   * 获取配置信息
   */
  getConfig(): Partial<WeChatConfig> {
    return {
      appId: this.config.appId,
      templateId: this.config.templateId,
      userOpenIds: [...this.config.userOpenIds],
      apiBaseUrl: this.config.apiBaseUrl
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<WeChatConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果更新了关键配置，清空token缓存
    if (newConfig.appId || newConfig.appSecret) {
      this.clearTokenCache();
    }
    
    this.validateConfig();
    logger.info('微信推送配置已更新');
  }

  /**
   * 添加用户
   */
  addUser(openId: string): void {
    if (!this.config.userOpenIds.includes(openId)) {
      this.config.userOpenIds.push(openId);
      logger.info(`添加微信用户: ${openId}`);
    }
  }

  /**
   * 移除用户
   */
  removeUser(openId: string): void {
    const index = this.config.userOpenIds.indexOf(openId);
    if (index > -1) {
      this.config.userOpenIds.splice(index, 1);
      logger.info(`移除微信用户: ${openId}`);
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    userCount: number;
    tokenCached: boolean;
    tokenExpiresIn?: number;
  }> {
    return {
      userCount: this.config.userOpenIds.length,
      tokenCached: this.tokenCache !== null,
      tokenExpiresIn: this.tokenCache ? Math.max(0, this.tokenCache.expiresAt - Date.now()) : undefined
    };
  }
}