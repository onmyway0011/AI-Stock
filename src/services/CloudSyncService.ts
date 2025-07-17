/**
 * 云同步服务
 * 支持将配置和通知记录同步到腾讯云COS
 */

import * as COS from 'cos-nodejs-sdk-v5';
import * as STS from 'qcloud-cos-sts';
import { EventEmitter } from 'events';
import { ConfigService } from './ConfigService';
import { createLogger } from '../utils';

const logger = createLogger('CLOUD_SYNC_SERVICE');

export interface SyncProgress {
  type: 'upload' | 'download';
  filename: string;
  progress: number;
  total: number;
  completed: boolean;
  error?: string;
}

export interface CloudFile {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

/**
 * 云同步服务类
 */
export class CloudSyncService extends EventEmitter {
  private cosClient: COS | null = null;
  private isInitialized = false;
  private syncInProgress = false;

  constructor(private configService: ConfigService) {
    super();
  }

  /**
   * 初始化COS客户端
   */
  private async initializeCOS(): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const cloudConfig = config.cloud;

      if (!cloudConfig.enabled || cloudConfig.provider !== 'tencent') {
        throw new Error('腾讯云配置未启用');
      }

      const tencentConfig = cloudConfig.tencentCloud;
      if (!tencentConfig.secretId || !tencentConfig.secretKey) {
        throw new Error('腾讯云密钥配置不完整');
      }

      this.cosClient = new COS({
        SecretId: tencentConfig.secretId,
        SecretKey: tencentConfig.secretKey,
        Region: tencentConfig.region
      });

      // 测试连接
      await this.testConnection();
      this.isInitialized = true;
      
      logger.info('腾讯云COS客户端初始化成功');

    } catch (error) {
      logger.error('初始化COS客户端失败:', error);
      throw error;
    }
  }

  /**
   * 测试云连接
   */
  private async testConnection(): Promise<void> {
    if (!this.cosClient) {
      throw new Error('COS客户端未初始化');
    }

    const config = this.configService.getConfig();
    const bucket = config.cloud.tencentCloud.bucket;

    return new Promise((resolve, reject) => {
      this.cosClient!.headBucket({
        Bucket: bucket,
        Region: config.cloud.tencentCloud.region
      }, (err) => {
        if (err) {
          reject(new Error(`存储桶访问失败: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 同步到云端
   */
  async syncToCloud(): Promise<void> {
    if (this.syncInProgress) {
      logger.warn('同步正在进行中');
      return;
    }

    try {
      this.syncInProgress = true;
      
      if (!this.isInitialized) {
        await this.initializeCOS();
      }

      const config = this.configService.getConfig();
      
      // 准备同步数据
      const syncData = {
        config: this.sanitizeConfig(config),
        signalHistory: config.signalHistory || [],
        notificationHistory: config.notificationHistory || [],
        timestamp: Date.now(),
        version: '2.0.0'
      };

      // 上传配置文件
      await this.uploadFile('config/app-config.json', JSON.stringify(syncData, null, 2));

      // 分别上传历史记录
      if (config.signalHistory && config.signalHistory.length > 0) {
        await this.uploadFile('data/signal-history.json', JSON.stringify(config.signalHistory, null, 2));
      }

      if (config.notificationHistory && config.notificationHistory.length > 0) {
        await this.uploadFile('data/notification-history.json', JSON.stringify(config.notificationHistory, null, 2));
      }

      // 创建备份索引
      const backupIndex = {
        timestamp: Date.now(),
        files: [
          'config/app-config.json',
          'data/signal-history.json',
          'data/notification-history.json'
        ],
        deviceInfo: {
          platform: process.platform,
          arch: process.arch,
          hostname: require('os').hostname()
        }
      };

      await this.uploadFile('index/backup-index.json', JSON.stringify(backupIndex, null, 2));

      logger.info('数据同步到云端完成');
      this.emit('sync-completed', { type: 'upload', success: true });

    } catch (error) {
      logger.error('同步到云端失败:', error);
      this.emit('sync-completed', { type: 'upload', success: false, error });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 从云端同步
   */
  async syncFromCloud(): Promise<void> {
    if (this.syncInProgress) {
      logger.warn('同步正在进行中');
      return;
    }

    try {
      this.syncInProgress = true;
      
      if (!this.isInitialized) {
        await this.initializeCOS();
      }

      // 下载配置文件
      const configData = await this.downloadFile('config/app-config.json');
      const syncData = JSON.parse(configData);

      if (!this.validateSyncData(syncData)) {
        throw new Error('云端数据格式不正确');
      }

      // 合并配置（保留敏感信息）
      const currentConfig = this.configService.getConfig();
      const mergedConfig = this.mergeCloudConfig(currentConfig, syncData.config);

      // 恢复历史记录
      if (syncData.signalHistory) {
        mergedConfig.signalHistory = syncData.signalHistory;
      }

      if (syncData.notificationHistory) {
        mergedConfig.notificationHistory = syncData.notificationHistory;
      }

      // 应用配置
      await this.configService.setConfig(mergedConfig);

      logger.info('从云端同步数据完成');
      this.emit('sync-completed', { type: 'download', success: true });

    } catch (error) {
      logger.error('从云端同步失败:', error);
      this.emit('sync-completed', { type: 'download', success: false, error });
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 上传文件到COS
   */
  private async uploadFile(key: string, content: string): Promise<void> {
    if (!this.cosClient) {
      throw new Error('COS客户端未初始化');
    }

    const config = this.configService.getConfig();
    const bucket = config.cloud.tencentCloud.bucket;
    const region = config.cloud.tencentCloud.region;

    return new Promise((resolve, reject) => {
      this.cosClient!.putObject({
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: content,
        ContentType: 'application/json'
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          this.emit('sync-progress', {
            type: 'upload',
            filename: key,
            progress: 100,
            total: 100,
            completed: true
          });
          resolve();
        }
      });
    });
  }

  /**
   * 从COS下载文件
   */
  private async downloadFile(key: string): Promise<string> {
    if (!this.cosClient) {
      throw new Error('COS客户端未初始化');
    }

    const config = this.configService.getConfig();
    const bucket = config.cloud.tencentCloud.bucket;
    const region = config.cloud.tencentCloud.region;

    return new Promise((resolve, reject) => {
      this.cosClient!.getObject({
        Bucket: bucket,
        Region: region,
        Key: key
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          this.emit('sync-progress', {
            type: 'download',
            filename: key,
            progress: 100,
            total: 100,
            completed: true
          });
          resolve(data.Body.toString());
        }
      });
    });
  }

  /**
   * 列出云端文件
   */
  async listCloudFiles(): Promise<CloudFile[]> {
    if (!this.isInitialized) {
      await this.initializeCOS();
    }

    if (!this.cosClient) {
      throw new Error('COS客户端未初始化');
    }

    const config = this.configService.getConfig();
    const bucket = config.cloud.tencentCloud.bucket;
    const region = config.cloud.tencentCloud.region;

    return new Promise((resolve, reject) => {
      this.cosClient!.getBucket({
        Bucket: bucket,
        Region: region,
        Prefix: 'ai-stock-trading/'
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const files = data.Contents?.map(item => ({
            key: item.Key || '',
            size: item.Size || 0,
            lastModified: item.LastModified || '',
            etag: item.ETag || ''
          })) || [];
          resolve(files);
        }
      });
    });
  }

  /**
   * 删除云端文件
   */
  async deleteCloudFile(key: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeCOS();
    }

    if (!this.cosClient) {
      throw new Error('COS客户端未初始化');
    }

    const config = this.configService.getConfig();
    const bucket = config.cloud.tencentCloud.bucket;
    const region = config.cloud.tencentCloud.region;

    return new Promise((resolve, reject) => {
      this.cosClient!.deleteObject({
        Bucket: bucket,
        Region: region,
        Key: key
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 清理配置中的敏感信息
   */
  private sanitizeConfig(config: any): any {
    const sanitized = JSON.parse(JSON.stringify(config));
    
    // 移除敏感信息
    if (sanitized.cloud?.tencentCloud) {
      sanitized.cloud.tencentCloud.secretId = '';
      sanitized.cloud.tencentCloud.secretKey = '';
    }
    
    if (sanitized.notifications?.channels?.wechatPublic) {
      sanitized.notifications.channels.wechatPublic.appSecret = '';
    }
    
    if (sanitized.notifications?.channels?.email?.smtp?.auth) {
      sanitized.notifications.channels.email.smtp.auth.pass = '';
    }
    
    return sanitized;
  }

  /**
   * 验证同步数据格式
   */
  private validateSyncData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.config &&
      data.timestamp &&
      data.version
    );
  }

  /**
   * 合并云端配置
   */
  private mergeCloudConfig(currentConfig: any, cloudConfig: any): any {
    const merged = JSON.parse(JSON.stringify(cloudConfig));
    
    // 保留当前的敏感信息
    if (currentConfig.cloud?.tencentCloud) {
      merged.cloud.tencentCloud.secretId = currentConfig.cloud.tencentCloud.secretId;
      merged.cloud.tencentCloud.secretKey = currentConfig.cloud.tencentCloud.secretKey;
    }
    
    if (currentConfig.notifications?.channels?.wechatPublic) {
      merged.notifications.channels.wechatPublic.appSecret = 
        currentConfig.notifications.channels.wechatPublic.appSecret;
    }
    
    if (currentConfig.notifications?.channels?.email?.smtp?.auth) {
      merged.notifications.channels.email.smtp.auth.pass = 
        currentConfig.notifications.channels.email.smtp.auth.pass;
    }
    
    return merged;
  }

  /**
   * 获取STS临时密钥
   */
  async getSTSCredentials(): Promise<any> {
    const config = this.configService.getConfig();
    const tencentConfig = config.cloud.tencentCloud;

    return new Promise((resolve, reject) => {
      STS.getCredential({
        secretId: tencentConfig.secretId,
        secretKey: tencentConfig.secretKey,
        region: tencentConfig.region,
        durationInSeconds: 3600,
        bucket: tencentConfig.bucket,
        allowPrefix: 'ai-stock-trading/*',
        allowActions: [
          'cos:PutObject',
          'cos:GetObject',
          'cos:DeleteObject',
          'cos:GetBucket'
        ]
      }, (err, credential) => {
        if (err) {
          reject(err);
        } else {
          resolve(credential);
        }
      });
    });
  }

  /**
   * 检查云同步状态
   */
  getSyncStatus(): any {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      lastSync: this.configService.get('cloud.lastSync', 0),
      provider: this.configService.get('cloud.provider', 'tencent'),
      enabled: this.configService.get('cloud.enabled', false)
    };
  }

  /**
   * 测试云配置
   */
  async testCloudConfig(): Promise<boolean> {
    try {
      await this.initializeCOS();
      return true;
    } catch (error) {
      logger.error('云配置测试失败:', error);
      return false;
    }
  }

  /**
   * 设置自动同步
   */
  async setAutoSync(enabled: boolean, intervalMinutes: number = 60): Promise<void> {
    // 这里可以实现定时自动同步功能
    await this.configService.set('cloud.autoSync', enabled);
    await this.configService.set('cloud.autoSyncInterval', intervalMinutes);
    
    if (enabled) {
      logger.info(`自动同步已启用，间隔 ${intervalMinutes} 分钟`);
    } else {
      logger.info('自动同步已禁用');
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.cosClient = null;
    this.isInitialized = false;
    this.removeAllListeners();
  }
}