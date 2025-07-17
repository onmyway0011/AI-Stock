/**
 * Electron 预加载脚本
 * 在渲染进程中安全地暴露主进程API
 */

import { contextBridge, ipcRenderer } from 'electron';

// 定义暴露给渲染进程的API接口
export interface ElectronAPI {
  // 配置管理
  config: {
    get: () => Promise<any>;
    update: (updates: any) => Promise<void>;
    reset: () => Promise<void>;
  };

  // 监控服务
  monitoring: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    getStatus: () => Promise<any>;
    getStockData: (symbols: string[]) => Promise<any>;
  };

  // 通知服务
  notifications: {
    test: (config: any) => Promise<boolean>;
    send: (notification: any) => Promise<void>;
    getHistory: () => Promise<any[]>;
  };

  // 云同步
  cloudSync: {
    syncToCloud: () => Promise<void>;
    syncFromCloud: () => Promise<void>;
    getStatus: () => Promise<any>;
  };

  // 数据服务
  data: {
    getHistory: (params: any) => Promise<any>;
    exportData: (type: string) => Promise<string>;
    clearData: (type: string) => Promise<void>;
    getStats: () => Promise<any>;
  };

  // 股票数据
  stocks: {
    search: (keyword: string) => Promise<any[]>;
    getRealTimeData: (symbols: string[]) => Promise<any>;
    getHistoricalData: (symbol: string, period: string) => Promise<any>;
  };

  // 分析服务
  analysis: {
    getTechnicalAnalysis: (symbol: string, period: string) => Promise<any>;
    getFundamentalAnalysis: (symbol: string) => Promise<any>;
    getRiskAnalysis: (symbol: string) => Promise<any>;
  };

  // 系统功能
  system: {
    getInfo: () => Promise<any>;
    openExternal: (url: string) => Promise<void>;
    showInFolder: (path: string) => Promise<void>;
    minimizeToTray: () => Promise<void>;
    quit: () => Promise<void>;
  };

  // 文件操作
  files: {
    saveFile: (content: string, filename: string) => Promise<string>;
    loadFile: (path: string) => Promise<string>;
    showSaveDialog: (options: any) => Promise<string | null>;
    showOpenDialog: (options: any) => Promise<string[] | null>;
  };

  // 事件监听
  events: {
    on: (channel: string, callback: (...args: any[]) => void) => void;
    off: (channel: string, callback: (...args: any[]) => void) => void;
    once: (channel: string, callback: (...args: any[]) => void) => void;
  };

  // 应用信息
  app: {
    getVersion: () => string;
    getPlatform: () => string;
    getPath: (name: string) => Promise<string>;
  };
}

// 验证事件名称是否安全
const validateEventName = (eventName: string): boolean => {
  const allowedEvents = [
    'config-changed',
    'monitoring-status-changed',
    'monitoring-data-updated',
    'notification-sent',
    'cloud-sync-progress',
    'cloud-sync-completed',
    'cloud-sync-error',
    'system-notification',
    'update-available',
    'download-progress',
    'update-downloaded',
    'protocol-open',
    'app-error',
    'log-message',
  ];
  
  return allowedEvents.includes(eventName);
};

// 验证IPC调用是否安全
const validateIPCCall = (channel: string): boolean => {
  const allowedChannels = [
    // 配置管理
    'config:get',
    'config:update',
    'config:reset',
    
    // 监控服务
    'monitoring:start',
    'monitoring:stop',
    'monitoring:status',
    'monitoring:stock-data',
    
    // 通知服务
    'notifications:test',
    'notifications:send',
    'notifications:history',
    
    // 云同步
    'cloud-sync:to-cloud',
    'cloud-sync:from-cloud',
    'cloud-sync:status',
    
    // 数据服务
    'data:history',
    'data:export',
    'data:clear',
    'data:stats',
    
    // 股票数据
    'stocks:search',
    'stocks:real-time',
    'stocks:historical',
    
    // 分析服务
    'analysis:technical',
    'analysis:fundamental',
    'analysis:risk',
    
    // 系统功能
    'system:info',
    'system:open-external',
    'system:show-in-folder',
    'system:minimize-to-tray',
    'system:quit',
    
    // 文件操作
    'files:save',
    'files:load',
    'files:save-dialog',
    'files:open-dialog',
    
    // 应用信息
    'app:version',
    'app:platform',
    'app:path',
  ];
  
  return allowedChannels.includes(channel);
};

// 创建安全的IPC调用包装器
const createSecureIPCInvoke = (channel: string) => {
  return async (...args: any[]) => {
    if (!validateIPCCall(channel)) {
      throw new Error(`Unauthorized IPC call: ${channel}`);
    }
    
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`IPC call failed for ${channel}:`, error);
      throw error;
    }
  };
};

// 创建安全的事件监听包装器
const createSecureEventListener = () => {
  const listeners = new Map<string, Set<Function>>();
  
  return {
    on: (channel: string, callback: (...args: any[]) => void) => {
      if (!validateEventName(channel)) {
        throw new Error(`Unauthorized event listener: ${channel}`);
      }
      
      if (!listeners.has(channel)) {
        listeners.set(channel, new Set());
        
        // 为新频道注册真实的事件监听器
        ipcRenderer.on(channel, (event, ...args) => {
          const channelListeners = listeners.get(channel);
          if (channelListeners) {
            channelListeners.forEach(listener => {
              try {
                listener(...args);
              } catch (error) {
                console.error(`Event listener error for ${channel}:`, error);
              }
            });
          }
        });
      }
      
      listeners.get(channel)!.add(callback);
    },
    
    off: (channel: string, callback: (...args: any[]) => void) => {
      if (!validateEventName(channel)) {
        return; // 静默忽略无效频道
      }
      
      const channelListeners = listeners.get(channel);
      if (channelListeners) {
        channelListeners.delete(callback);
        
        // 如果没有监听器了，移除真实的事件监听器
        if (channelListeners.size === 0) {
          ipcRenderer.removeAllListeners(channel);
          listeners.delete(channel);
        }
      }
    },
    
    once: (channel: string, callback: (...args: any[]) => void) => {
      if (!validateEventName(channel)) {
        throw new Error(`Unauthorized event listener: ${channel}`);
      }
      
      const wrappedCallback = (...args: any[]) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`One-time event listener error for ${channel}:`, error);
        } finally {
          // 自动移除监听器
          this.off(channel, wrappedCallback);
        }
      };
      
      this.on(channel, wrappedCallback);
    },
  };
};

// 构建API对象
const electronAPI: ElectronAPI = {
  // 配置管理
  config: {
    get: createSecureIPCInvoke('config:get'),
    update: createSecureIPCInvoke('config:update'),
    reset: createSecureIPCInvoke('config:reset'),
  },

  // 监控服务
  monitoring: {
    start: createSecureIPCInvoke('monitoring:start'),
    stop: createSecureIPCInvoke('monitoring:stop'),
    getStatus: createSecureIPCInvoke('monitoring:status'),
    getStockData: createSecureIPCInvoke('monitoring:stock-data'),
  },

  // 通知服务
  notifications: {
    test: createSecureIPCInvoke('notifications:test'),
    send: createSecureIPCInvoke('notifications:send'),
    getHistory: createSecureIPCInvoke('notifications:history'),
  },

  // 云同步
  cloudSync: {
    syncToCloud: createSecureIPCInvoke('cloud-sync:to-cloud'),
    syncFromCloud: createSecureIPCInvoke('cloud-sync:from-cloud'),
    getStatus: createSecureIPCInvoke('cloud-sync:status'),
  },

  // 数据服务
  data: {
    getHistory: createSecureIPCInvoke('data:history'),
    exportData: createSecureIPCInvoke('data:export'),
    clearData: createSecureIPCInvoke('data:clear'),
    getStats: createSecureIPCInvoke('data:stats'),
  },

  // 股票数据
  stocks: {
    search: createSecureIPCInvoke('stocks:search'),
    getRealTimeData: createSecureIPCInvoke('stocks:real-time'),
    getHistoricalData: createSecureIPCInvoke('stocks:historical'),
  },

  // 分析服务
  analysis: {
    getTechnicalAnalysis: createSecureIPCInvoke('analysis:technical'),
    getFundamentalAnalysis: createSecureIPCInvoke('analysis:fundamental'),
    getRiskAnalysis: createSecureIPCInvoke('analysis:risk'),
  },

  // 系统功能
  system: {
    getInfo: createSecureIPCInvoke('system:info'),
    openExternal: createSecureIPCInvoke('system:open-external'),
    showInFolder: createSecureIPCInvoke('system:show-in-folder'),
    minimizeToTray: createSecureIPCInvoke('system:minimize-to-tray'),
    quit: createSecureIPCInvoke('system:quit'),
  },

  // 文件操作
  files: {
    saveFile: createSecureIPCInvoke('files:save'),
    loadFile: createSecureIPCInvoke('files:load'),
    showSaveDialog: createSecureIPCInvoke('files:save-dialog'),
    showOpenDialog: createSecureIPCInvoke('files:open-dialog'),
  },

  // 事件监听
  events: createSecureEventListener(),

  // 应用信息
  app: {
    getVersion: () => process.env.APP_VERSION || '1.0.0',
    getPlatform: () => process.platform,
    getPath: createSecureIPCInvoke('app:path'),
  },
};

// 通过contextBridge安全地暴露API
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  
  // 暴露一些基本信息
  contextBridge.exposeInMainWorld('APP_INFO', {
    version: process.env.APP_VERSION || '1.0.0',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
  });
  
  console.log('Electron API exposed successfully');
} catch (error) {
  console.error('Failed to expose Electron API:', error);
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Renderer process error:', event.error);
  
  // 发送错误到主进程
  if (validateIPCCall('app:error')) {
    ipcRenderer.send('app:error', {
      message: event.error?.message || 'Unknown error',
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // 发送错误到主进程
  if (validateIPCCall('app:error')) {
    ipcRenderer.send('app:error', {
      type: 'unhandledrejection',
      reason: event.reason,
    });
  }
});

// 开发环境调试信息
if (process.env.NODE_ENV === 'development') {
  console.log('Preload script loaded in development mode');
  console.log('Available Electron API:', Object.keys(electronAPI));
}