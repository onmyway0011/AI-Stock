/**
 * 菜单服务
 * 管理应用菜单和上下文菜单
 */

import { Menu, MenuItem, BrowserWindow, shell, app, dialog } from 'electron';
import { ConfigManager } from './ConfigManager';

/**
 * 菜单服务类
 */
export class MenuService {
  private mainWindow: BrowserWindow | null;
  private configManager: ConfigManager;

  constructor(mainWindow: BrowserWindow | null, configManager: ConfigManager) {
    this.mainWindow = mainWindow;
    this.configManager = configManager;
  }

  /**
   * 创建应用菜单
   */
  createApplicationMenu(): void {
    const template = this.getMenuTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  /**
   * 获取菜单模板
   */
  private getMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';

    const template: Electron.MenuItemConstructorOptions[] = [
      // macOS应用菜单
      ...(isMac ? [{
        label: app.getName(),
        submenu: [
          { role: 'about' as const },
          { type: 'separator' as const },
          {
            label: '偏好设置...',
            accelerator: 'Cmd+,',
            click: () => {
              this.navigateToSettings();
            }
          },
          { type: 'separator' as const },
          { role: 'services' as const },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideothers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ]
      }] : []),

      // 文件菜单
      {
        label: '文件',
        submenu: [
          {
            label: '新建配置',
            accelerator: 'CmdOrCtrl+N',
            click: async () => {
              await this.createNewConfig();
            }
          },
          {
            label: '导入配置',
            accelerator: 'CmdOrCtrl+O',
            click: async () => {
              await this.importConfig();
            }
          },
          {
            label: '导出配置',
            accelerator: 'CmdOrCtrl+S',
            click: async () => {
              await this.exportConfig();
            }
          },
          { type: 'separator' },
          {
            label: '导出数据',
            submenu: [
              {
                label: '导出交易信号',
                click: () => this.exportData('signals')
              },
              {
                label: '导出通知历史',
                click: () => this.exportData('notifications')
              },
              {
                label: '导出系统日志',
                click: () => this.exportData('logs')
              }
            ]
          },
          { type: 'separator' },
          ...(!isMac ? [
            {
              label: '设置',
              accelerator: 'Ctrl+,',
              click: () => {
                this.navigateToSettings();
              }
            },
            { type: 'separator' },
            { role: 'quit' as const }
          ] : [])
        ]
      },

      // 编辑菜单
      {
        label: '编辑',
        submenu: [
          { role: 'undo' as const },
          { role: 'redo' as const },
          { type: 'separator' },
          { role: 'cut' as const },
          { role: 'copy' as const },
          { role: 'paste' as const },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' as const },
            { role: 'delete' as const },
            { role: 'selectAll' as const },
            { type: 'separator' as const },
            {
              label: '语音',
              submenu: [
                { role: 'startSpeaking' as const },
                { role: 'stopSpeaking' as const }
              ]
            }
          ] : [
            { role: 'delete' as const },
            { type: 'separator' as const },
            { role: 'selectAll' as const }
          ])
        ]
      },

      // 监控菜单
      {
        label: '监控',
        submenu: [
          {
            label: '开始监控',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
              this.sendToRenderer('menu:start-monitoring');
            }
          },
          {
            label: '停止监控',
            accelerator: 'CmdOrCtrl+T',
            click: () => {
              this.sendToRenderer('menu:stop-monitoring');
            }
          },
          { type: 'separator' },
          {
            label: '刷新数据',
            accelerator: 'F5',
            click: () => {
              this.sendToRenderer('menu:refresh-data');
            }
          },
          {
            label: '清除缓存',
            click: () => {
              this.sendToRenderer('menu:clear-cache');
            }
          }
        ]
      },

      // 视图菜单
      {
        label: '视图',
        submenu: [
          {
            label: '仪表板',
            accelerator: 'CmdOrCtrl+1',
            click: () => {
              this.navigateToPage('/dashboard');
            }
          },
          {
            label: '股票监控',
            accelerator: 'CmdOrCtrl+2',
            click: () => {
              this.navigateToPage('/monitoring');
            }
          },
          {
            label: '数据分析',
            accelerator: 'CmdOrCtrl+3',
            click: () => {
              this.navigateToPage('/analysis');
            }
          },
          {
            label: '历史记录',
            accelerator: 'CmdOrCtrl+4',
            click: () => {
              this.navigateToPage('/history');
            }
          },
          {
            label: '设置',
            accelerator: 'CmdOrCtrl+5',
            click: () => {
              this.navigateToPage('/settings');
            }
          },
          { type: 'separator' },
          { role: 'reload' as const },
          { role: 'forceReload' as const },
          { role: 'toggleDevTools' as const },
          { type: 'separator' },
          { role: 'resetZoom' as const },
          { role: 'zoomIn' as const },
          { role: 'zoomOut' as const },
          { type: 'separator' },
          { role: 'togglefullscreen' as const }
        ]
      },

      // 窗口菜单
      {
        label: '窗口',
        submenu: [
          { role: 'minimize' as const },
          { role: 'close' as const },
          ...(isMac ? [
            { type: 'separator' as const },
            { role: 'front' as const },
            { type: 'separator' as const },
            { role: 'window' as const }
          ] : [])
        ]
      },

      // 帮助菜单
      {
        role: 'help',
        submenu: [
          {
            label: '用户手册',
            click: () => {
              shell.openExternal('https://github.com/your-repo/ai-stock-trading/docs');
            }
          },
          {
            label: 'API文档',
            click: () => {
              shell.openExternal('https://github.com/your-repo/ai-stock-trading/api-docs');
            }
          },
          { type: 'separator' },
          {
            label: '键盘快捷键',
            click: () => {
              this.showKeyboardShortcuts();
            }
          },
          {
            label: '检查更新',
            click: () => {
              this.checkForUpdates();
            }
          },
          { type: 'separator' },
          {
            label: '报告问题',
            click: () => {
              shell.openExternal('https://github.com/your-repo/ai-stock-trading/issues');
            }
          },
          {
            label: '反馈建议',
            click: () => {
              shell.openExternal('mailto:feedback@yourdomain.com');
            }
          },
          { type: 'separator' },
          ...(!isMac ? [{
            label: '关于',
            click: () => {
              this.showAboutDialog();
            }
          }] : [])
        ]
      }
    ];

    return template;
  }

  /**
   * 创建上下文菜单
   */
  createContextMenu(): Menu {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '复制',
        role: 'copy'
      },
      {
        label: '粘贴',
        role: 'paste'
      },
      { type: 'separator' },
      {
        label: '全选',
        role: 'selectAll'
      },
      { type: 'separator' },
      {
        label: '检查元素',
        click: () => {
          this.mainWindow?.webContents.inspectElement(0, 0);
        }
      }
    ]);

    return contextMenu;
  }

  /**
   * 导航到指定页面
   */
  private navigateToPage(path: string): void {
    this.sendToRenderer('menu:navigate', path);
  }

  /**
   * 导航到设置页面
   */
  private navigateToSettings(): void {
    this.navigateToPage('/settings');
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
   * 创建新配置
   */
  private async createNewConfig(): Promise<void> {
    try {
      const result = await dialog.showMessageBox(this.mainWindow!, {
        type: 'question',
        buttons: ['确定', '取消'],
        defaultId: 0,
        message: '创建新配置',
        detail: '这将重置所有设置为默认值。确定要继续吗？'
      });

      if (result.response === 0) {
        await this.configManager.resetToDefaults();
        this.sendToRenderer('config:reset');
      }
    } catch (error) {
      console.error('Failed to create new config:', error);
    }
  }

  /**
   * 导入配置
   */
  private async importConfig(): Promise<void> {
    try {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        title: '导入配置文件',
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        await this.configManager.importConfig(filePath);
        this.sendToRenderer('config:imported');
      }
    } catch (error) {
      console.error('Failed to import config:', error);
      dialog.showErrorBox('导入失败', '配置文件导入失败，请检查文件格式。');
    }
  }

  /**
   * 导出配置
   */
  private async exportConfig(): Promise<void> {
    try {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        title: '导出配置文件',
        defaultPath: `ai-stock-config-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        await this.configManager.exportConfig(result.filePath);
        dialog.showMessageBox(this.mainWindow!, {
          type: 'info',
          message: '导出成功',
          detail: `配置已导出到：${result.filePath}`
        });
      }
    } catch (error) {
      console.error('Failed to export config:', error);
      dialog.showErrorBox('导出失败', '配置文件导出失败。');
    }
  }

  /**
   * 导出数据
   */
  private exportData(type: string): void {
    this.sendToRenderer('menu:export-data', type);
  }

  /**
   * 显示键盘快捷键
   */
  private showKeyboardShortcuts(): void {
    const shortcuts = [
      'Ctrl/Cmd + N: 新建配置',
      'Ctrl/Cmd + O: 导入配置',
      'Ctrl/Cmd + S: 导出配置',
      'Ctrl/Cmd + R: 开始监控',
      'Ctrl/Cmd + T: 停止监控',
      'F5: 刷新数据',
      'Ctrl/Cmd + 1-5: 切换页面',
      'Ctrl/Cmd + ,: 打开设置',
      'F11: 全屏切换',
      'F12: 开发者工具'
    ];

    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: '键盘快捷键',
      message: '快捷键列表',
      detail: shortcuts.join('\n')
    });
  }
  /**
   * 检查更新
   */
  private checkForUpdates(): void {
    this.sendToRenderer('menu:check-updates');
  }

  /**
   * 显示关于对话框
   */
  private showAboutDialog(): void {
    const aboutText = [
      `${app.getName()} v${app.getVersion()}`,
      '',
      'AI股票交易信号系统',
      '智能监控、分析和通知',
      '',
      `Electron: ${process.versions.electron}`,
      `Node.js: ${process.versions.node}`,
      `Chrome: ${process.versions.chrome}`,
      '',
      'Copyright © 2024 AI Stock Trading Team',
    ].join('\n');

    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: '关于',
      message: app.getName(),
      detail: aboutText,
      buttons: ['确定']
    });
  }

  /**
   * 更新菜单状态
   */
  updateMenuState(state: any): void {
    // 根据应用状态更新菜单项的启用/禁用状态
    const menu = Menu.getApplicationMenu();
    if (!menu) return;

    // 例如：根据监控状态启用/禁用相关菜单项
    const monitoringMenu = menu.getMenuItemById('monitoring');
    if (monitoringMenu && monitoringMenu.submenu) {
      const startItem = monitoringMenu.submenu.getMenuItemById('start-monitoring');
      const stopItem = monitoringMenu.submenu.getMenuItemById('stop-monitoring');
      
      if (startItem && stopItem) {
        startItem.enabled = !state.monitoring?.isRunning;
        stopItem.enabled = state.monitoring?.isRunning;
      }
    }
  }
}