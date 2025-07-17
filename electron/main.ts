/**
 * Electron 主进程入口文件
 * 负责创建应用窗口、处理系统事件和IPC通信
 */

import { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, powerMonitor } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// 导入应用服务
import { ConfigManager } from './services/ConfigManager';
import { MonitoringService } from './services/MonitoringService';
import { NotificationService } from './services/NotificationService';
import { CloudSyncService } from './services/CloudSyncService';
import { DataService } from './services/DataService';
import { LogService } from './services/LogService';
import { MenuService } from './services/MenuService';
import { TrayService } from './services/TrayService';
import { IPCService } from './services/IPCService';

// 应用配置
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// 全局变量
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// 服务实例
let configManager: ConfigManager;
let monitoringService: MonitoringService;
let notificationService: NotificationService;
let cloudSyncService: CloudSyncService;
let dataService: DataService;
let logService: LogService;
let menuService: MenuService;
let trayService: TrayService;
let ipcService: IPCService;

/**
 * 创建应用窗口
 */
const createWindow = async (): Promise<void> => {
  try {
    // 加载配置
    const config = await configManager.getConfig();
    
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
      width: config.window?.width || 1200,
      height: config.window?.height || 800,
      minWidth: 800,
      minHeight: 600,
      x: config.window?.x,
      y: config.window?.y,
      show: false, // 初始隐藏，等加载完成后显示
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      frame: process.platform !== 'darwin',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: isProduction,
        allowRunningInsecureContent: isDevelopment,
      },
      icon: path.join(__dirname, '../assets/icon.png'),
    });

    // 设置窗口属性
    if (config.general?.startMinimized) {
      mainWindow.minimize();
    }

    // 加载应用
    if (isDevelopment) {
      // 开发环境：连接到开发服务器
      await mainWindow.loadURL('http://localhost:3000');
      
      // 打开开发者工具
      if (process.env.OPEN_DEVTOOLS === 'true') {
        mainWindow.webContents.openDevTools();
      }
    } else {
      // 生产环境：加载构建的文件
      const indexPath = path.join(__dirname, '../frontend/build/index.html');
      await mainWindow.loadFile(indexPath);
    }

    // 窗口事件处理
    mainWindow.once('ready-to-show', () => {
      if (mainWindow) {
        if (!config.general?.startMinimized) {
          mainWindow.show();
          mainWindow.focus();
        }
        
        logService.info('Main window created and ready');
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    mainWindow.on('close', async (event) => {
      if (!isQuitting && config.general?.minimizeToTray) {
        event.preventDefault();
        mainWindow?.hide();
        
        // 首次最小化到托盘时显示提示
        if (!config.internal?.hasShownTrayTip) {
          notificationService.showDesktopNotification({
            title: 'AI股票交易系统',
            body: '应用已最小化到系统托盘，点击托盘图标可重新打开',
            icon: path.join(__dirname, '../assets/icon.png'),
          });
          
          await configManager.updateConfig({
            internal: { ...config.internal, hasShownTrayTip: true }
          });
        }
        
        return false;
      }
    });

    // 窗口大小和位置变化时保存配置
    const saveWindowState = async () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        await configManager.updateConfig({
          window: {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
          }
        });
      }
    };

    mainWindow.on('resize', saveWindowState);
    mainWindow.on('move', saveWindowState);

    // 外部链接处理
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 导航安全检查
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    });

    logService.info('Main window created successfully');
    
  } catch (error) {
    logService.error('Failed to create main window:', error);
    throw error;
  }
};

/**
 * 初始化应用服务
 */
const initializeServices = async (): Promise<void> => {
  try {
    // 创建应用数据目录
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // 初始化日志服务
    logService = new LogService();
    logService.info('Starting AI Stock Trading System...');

    // 初始化配置管理器
    configManager = new ConfigManager(path.join(userDataPath, 'config.json'));
    await configManager.initialize();

    // 初始化数据服务
    dataService = new DataService(path.join(userDataPath, 'data'));
    await dataService.initialize();

    // 初始化通知服务
    notificationService = new NotificationService(configManager);
    await notificationService.initialize();

    // 初始化云同步服务
    cloudSyncService = new CloudSyncService(configManager, dataService);
    await cloudSyncService.initialize();

    // 初始化监控服务
    monitoringService = new MonitoringService(
      configManager,
      dataService,
      notificationService
    );
    await monitoringService.initialize();

    // 初始化菜单服务
    menuService = new MenuService(mainWindow, configManager);

    // 初始化托盘服务
    trayService = new TrayService(mainWindow, configManager);
    tray = await trayService.createTray();

    // 初始化IPC服务
    ipcService = new IPCService({
      configManager,
      monitoringService,
      notificationService,
      cloudSyncService,
      dataService,
      logService,
    });
    ipcService.registerHandlers();

    logService.info('All services initialized successfully');
    
  } catch (error) {
    logService.error('Failed to initialize services:', error);
    throw error;
  }
};

/**
 * 应用启动检查
 */
const performStartupChecks = async (): Promise<void> => {
  try {
    const config = await configManager.getConfig();
    
    // 检查系统要求
    const totalMem = os.totalmem() / 1024 / 1024; // MB
    if (totalMem < 1024) {
      logService.warn(`Low system memory: ${totalMem.toFixed(0)}MB`);
    }

    // 检查网络连接
    if (process.platform !== 'win32') {
      const { spawn } = require('child_process');
      const ping = spawn('ping', ['-c', '1', '8.8.8.8']);
      
      ping.on('close', (code: number) => {
        if (code !== 0) {
          logService.warn('Network connectivity check failed');
        }
      });
    }

    // 启动时自动同步
    if (config.cloud?.enabled && config.cloud?.syncOnStartup) {
      setTimeout(async () => {
        try {
          await cloudSyncService.syncFromCloud();
          logService.info('Startup cloud sync completed');
        } catch (error) {
          logService.error('Startup cloud sync failed:', error);
        }
      }, 5000); // 延迟5秒开始同步
    }

    // 启动监控服务
    if (config.monitoring?.enabled && config.monitoring?.autoStart) {
      setTimeout(async () => {
        try {
          await monitoringService.start();
          logService.info('Auto-started monitoring service');
        } catch (error) {
          logService.error('Failed to auto-start monitoring:', error);
        }
      }, 3000); // 延迟3秒开始监控
    }

    logService.info('Startup checks completed');
    
  } catch (error) {
    logService.error('Startup checks failed:', error);
  }
};

/**
 * 应用退出清理
 */
const performShutdownCleanup = async (): Promise<void> => {
  try {
    isQuitting = true;
    
    const config = await configManager.getConfig();
    
    // 停止监控服务
    if (monitoringService) {
      await monitoringService.stop();
      logService.info('Monitoring service stopped');
    }

    // 退出时自动同步
    if (config.cloud?.enabled && config.cloud?.syncOnExit) {
      try {
        await cloudSyncService.syncToCloud();
        logService.info('Shutdown cloud sync completed');
      } catch (error) {
        logService.error('Shutdown cloud sync failed:', error);
      }
    }

    // 清理临时文件
    await dataService.cleanup();

    // 保存配置
    await configManager.save();

    logService.info('Shutdown cleanup completed');
    
  } catch (error) {
    logService.error('Shutdown cleanup failed:', error);
  }
};

/**
 * 设置自动更新
 */
const setupAutoUpdater = (): void => {
  if (!isProduction) return;

  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    logService.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    logService.info('Update available:', info);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    logService.info('Update not available:', info);
  });

  autoUpdater.on('error', (err) => {
    logService.error('Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logService.info('Update downloaded:', info);
    
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
    
    // 提示用户重启应用
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: '更新下载完成',
      message: '新版本已下载完成，是否立即重启应用以完成更新？',
      buttons: ['立即重启', '稍后重启'],
      defaultId: 0,
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
};

/**
 * 应用事件处理
 */
const setupAppEventHandlers = (): void => {
  // 应用准备就绪
  app.whenReady().then(async () => {
    try {
      await initializeServices();
      await createWindow();
      await performStartupChecks();
      setupAutoUpdater();
      
      logService.info('Application ready and running');
    } catch (error) {
      logService.error('Application startup failed:', error);
      app.quit();
    }
  });

  // 所有窗口关闭
  app.on('window-all-closed', async () => {
    // macOS 上保持应用运行
    if (process.platform !== 'darwin') {
      await performShutdownCleanup();
      app.quit();
    }
  });

  // 应用激活（macOS）
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });

  // 应用退出前
  app.on('before-quit', async (event) => {
    if (!isQuitting) {
      event.preventDefault();
      await performShutdownCleanup();
      app.quit();
    }
  });

  // 系统挂起/恢复
  powerMonitor.on('suspend', () => {
    logService.info('System is going to sleep');
    monitoringService?.pause();
  });

  powerMonitor.on('resume', () => {
    logService.info('System resumed from sleep');
    monitoringService?.resume();
  });

  // 处理协议打开（深度链接）
  app.setAsDefaultProtocolClient('ai-stock-trading');
  
  app.on('open-url', (event, url) => {
    event.preventDefault();
    logService.info('App opened via protocol:', url);
    
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('protocol-open', url);
    }
  });

  // 第二个实例尝试启动
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      logService.info('Second instance attempted to start');
      
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }

  // 证书错误处理
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDevelopment) {
      // 开发环境跳过证书验证
      event.preventDefault();
      callback(true);
    } else {
      // 生产环境使用默认行为
      callback(false);
    }
  });
};

// 设置应用事件处理
setupAppEventHandlers();

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  if (logService) {
    logService.error('Uncaught Exception:', error);
  } else {
    console.error('Uncaught Exception:', error);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  if (logService) {
    logService.error('Unhandled Rejection at:', promise, 'reason:', reason);
  } else {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

// 导出主窗口引用（用于服务中访问）
export { mainWindow };