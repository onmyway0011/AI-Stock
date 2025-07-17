/**
 * 托盘服务
 * 管理系统托盘图标和菜单
 */

import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import * as path from 'path';
import { ConfigManager } from './ConfigManager';

/**
 * 托盘服务类
 */
export class TrayService {
  private mainWindow: BrowserWindow | null;
  private configManager: ConfigManager;
  private tray: Tray | null = null;
  constructor(mainWindow: BrowserWindow | null, configManager: ConfigManager) {
    this.mainWindow = mainWindow;
    this.configManager = configManager;
  }

  /**
   * 创建系统托盘
   */
  async createTray(): Promise<Tray | null> {
    try {
      const config = await this.configManager.getConfig();
      
      // 检查是否启用托盘
      if (!config.general?.minimizeToTray) {
        return null;
      }

      // 创建托盘图标
      const iconPath = this.getTrayIconPath();
      this.tray = new Tray(iconPath);

      // 设置工具提示
      this.tray.setToolTip('AI股票交易系统');

      // 创建托盘菜单
      this.createTrayMenu();

      // 设置托盘事件
      this.setupTrayEvents();

      return this.tray;
    } catch (error) {
      console.error('Failed to create tray:', error);
      return null;
    }
  }

  /**
   * 获取托盘图标路径
   */
  private getTrayIconPath(): string {
    const platform = process.platform;
    let iconName = 'tray';

    // 根据平台选择合适的图标
    if (platform === 'win32') {
      iconName = 'tray.ico';
    } else if (platform === 'darwin') {
      iconName = 'trayTemplate.png'; // macOS使用Template图标
    } else {
      iconName = 'tray.png';
    }

    const iconPath = path.join(__dirname, '../../assets/tray', iconName);
    
    // 如果找不到图标文件，使用默认图标
    try {
      return iconPath;
    } catch {
      // 使用默认图标
      const defaultIcon = nativeImage.createFromNamedImage('NSStatusAvailable');
      return defaultIcon.toDataURL();
    }
  }

  /**
   * 创建托盘菜单
   */
  private createTrayMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => {
          this.showMainWindow();
        }
      },
      { type: 'separator' },
      {
        label: '仪表板',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('tray:navigate', '/dashboard');
        }
      },
      {
        label: '股票监控',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('tray:navigate', '/monitoring');
        }
      },
      {
        label: '数据分析',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('tray:navigate', '/analysis');
        }
      },
      {
        label: '历史记录',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('tray:navigate', '/history');
        }
      },
      {
        label: '设置',
        click: () => {
          this.showMainWindow();
          this.sendToRenderer('tray:navigate', '/settings');
        }
      },
      { type: 'separator' },
      {
        label: '监控状态',
        submenu: [
          {
            id: 'monitoring-status',
            label: '状态: 未知',
            enabled: false
          },
          { type: 'separator' },
          {
            id: 'start-monitoring',
            label: '开始监控',
            click: () => {
              this.sendToRenderer('tray:start-monitoring');
            }
          },
          {
            id: 'stop-monitoring',
            label: '停止监控',
            click: () => {
              this.sendToRenderer('tray:stop-monitoring');
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: '系统信息',
        submenu: [
          {
            label: `版本: ${app.getVersion()}`,
            enabled: false
          },
          {
            label: `平台: ${process.platform}`,
            enabled: false
          },
          { type: 'separator' },
          {
            label: '打开日志文件夹',
            click: () => {
              this.sendToRenderer('tray:open-logs');
            }
          },
          {
            label: '检查更新',
            click: () => {
              this.sendToRenderer('tray:check-updates');
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: '退出',
        role: 'quit'
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * 设置托盘事件
   */
  private setupTrayEvents(): void {
    if (!this.tray) return;

    // 双击托盘图标显示主窗口
    this.tray.on('double-click', () => {
      this.showMainWindow();
    });

    // Windows/Linux 单击行为
    if (process.platform !== 'darwin') {
      this.tray.on('click', () => {
        this.showMainWindow();
      });
    }

    // 鼠标悬停显示状态
    this.tray.on('mouse-enter', () => {
      this.updateTooltip();
    });
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show();
      }
      
      this.mainWindow.focus();
    }
  }

  /**
   * 发送消息到渲染进程
   */
  private sendToRenderer(channel: string, ...args: any[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  /**
   * 更新托盘状态
   */
  async updateTrayStatus(status: any): Promise<void> {
    if (!this.tray) return;

    try {
      // 更新图标
      this.updateTrayIcon(status);
      
      // 更新菜单
      this.updateTrayMenu(status);
      
      // 更新工具提示
      this.updateTooltip(status);
      
    } catch (error) {
      console.error('Failed to update tray status:', error);
    }
  }

  /**
   * 更新托盘图标
   */
  private updateTrayIcon(status?: any): void {
    if (!this.tray) return;

    let iconSuffix = '';
    
    // 根据监控状态选择图标
    if (status?.monitoring?.isRunning) {
      iconSuffix = '-active';
    } else if (status?.hasErrors) {
      iconSuffix = '-error';
    }

    const iconPath = this.getTrayIconPath() + iconSuffix;
    
    try {
      this.tray.setImage(iconPath);
    } catch (error) {
      // 如果状态图标不存在，使用默认图标
      this.tray.setImage(this.getTrayIconPath());
    }
  }

  /**
   * 更新托盘菜单
   */
  private updateTrayMenu(status?: any): void {
    if (!this.tray) return;

    const menu = this.tray.getContextMenu();
    if (!menu) return;

    // 更新监控状态菜单项
    const monitoringItem = menu.getMenuItemById('monitoring-status');
    const startItem = menu.getMenuItemById('start-monitoring');
    const stopItem = menu.getMenuItemById('stop-monitoring');
    if (monitoringItem && startItem && stopItem) {
      const isRunning = status?.monitoring?.isRunning || false;
      
      monitoringItem.label = `状态: ${isRunning ? '运行中' : '已停止'}`;
      startItem.enabled = !isRunning;
      stopItem.enabled = isRunning;
    }
  }

  /**
   * 更新工具提示
   */
  private updateTooltip(status?: any): void {
    if (!this.tray) return;

    let tooltip = 'AI股票交易系统';
    
    if (status) {
      const monitoringStatus = status.monitoring?.isRunning ? '运行中' : '已停止';
      const stockCount = status.monitoring?.symbolCount || 0;
      const lastUpdate = status.monitoring?.lastUpdate 
        ? new Date(status.monitoring.lastUpdate).toLocaleTimeString()
        : '从未';
      
      tooltip = [
        'AI股票交易系统',
        `监控状态: ${monitoringStatus}`,
        `监控股票: ${stockCount}只`,
        `最后更新: ${lastUpdate}`,
      ].join('\n');
    }

    this.tray.setToolTip(tooltip);
  }

  /**
   * 显示托盘通知
   */
  showTrayNotification(title: string, content: string): void {
    if (!this.tray) return;

    this.tray.displayBalloon({
      title,
      content,
      iconType: 'info'
    });
  }

  /**
   * 设置托盘标记 (macOS)
   */
  setBadge(text: string): void {
    if (process.platform === 'darwin') {
      app.dock.setBadge(text);
    }
  }

  /**
   * 清除托盘标记 (macOS)
   */
  clearBadge(): void {
    if (process.platform === 'darwin') {
      app.dock.setBadge('');
    }
  }

  /**
   * 闪烁托盘图标 (Windows)
   */
  flashFrame(flag: boolean = true): void {
    if (this.mainWindow && process.platform === 'win32') {
      this.mainWindow.flashFrame(flag);
    }
  }

  /**
   * 销毁托盘
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /**
   * 检查托盘是否可用
   */
  static isSupported(): boolean {
    return Tray.isSupported();
  }

  /**
   * 获取托盘实例
   */
  getTray(): Tray | null {
    return this.tray;
  }
}