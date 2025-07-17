# AI股票交易信号系统 - 桌面应用

基于 Electron + React + TypeScript 构建的智能股票交易信号分析桌面应用。

## 🌟 特性

### 核心功能
- **实时股票监控** - 多数据源股票价格实时监控
- **智能信号生成** - 基于AI的交易信号分析
- **多渠道通知** - 微信、邮件、桌面通知
- **数据可视化** - 丰富的图表和分析工具
- **云端同步** - 配置和数据云端备份
- **历史回测** - 策略历史表现分析

### 技术特性
- **跨平台支持** - Windows, macOS, Linux
- **现代化界面** - Material-UI 设计系统
- **实时数据更新** - WebSocket 实时推送
- **本地数据存储** - SQLite 本地数据库
- **安全通信** - 加密存储和传输
- **自动更新** - 应用自动更新机制

## 📦 安装

### 下载安装包

访问 [Releases](https://github.com/your-repo/ai-stock-trading/releases) 页面下载最新版本：

- **Windows**: `AI股票交易系统-1.0.0-win.exe`
- **macOS**: `AI股票交易系统-1.0.0-mac.dmg`
- **Linux**: `AI股票交易系统-1.0.0-linux.AppImage`

### 系统要求

- **Windows**: Windows 10 或更高版本
- **macOS**: macOS 10.14 或更高版本
- **Linux**: Ubuntu 18.04 或等效发行版

## 🚀 开发

### 环境准备

```bash
# Node.js 版本要求
node --version  # >= 16.0.0
npm --version   # >= 8.0.0

# 克隆项目
git clone https://github.com/your-repo/ai-stock-trading.git
cd ai-stock-trading
```

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend
npm install

# 安装Electron依赖
cd ../electron
npm install
```

### 开发模式

```bash
# 启动完整开发环境（前端 + Electron）
npm run dev

# 仅启动前端开发服务器
npm run dev:frontend

# 仅启动Electron应用
npm run dev:electron
```

开发模式下，前端运行在 `http://localhost:3000`，Electron 会自动连接到开发服务器。

### 构建应用

```bash
# 构建前端和Electron
npm run build

# 仅构建前端
npm run build:frontend
# 仅构建Electron
npm run build:electron
```

### 打包发布

```bash
# 打包当前平台
npm run dist

# 打包指定平台
npm run dist:win     # Windows
npm run dist:mac     # macOS
npm run dist:linux   # Linux

# 打包所有平台
npm run dist:all
```

打包后的文件位于 `electron/build/` 目录。

## 📁 项目结构

```
electron/
├── src/                    # TypeScript 源码
│   ├── main.ts            # 主进程入口
│   ├── preload.ts         # 预加载脚本
│   └── services/          # 业务服务
│       ├── ConfigManager.ts
│       ├── MonitoringService.ts
│       ├── NotificationService.ts
│       ├── CloudSyncService.ts
│       ├── DataService.ts
│       ├── LogService.ts
│       ├── MenuService.ts
│       ├── TrayService.ts
│       └── IPCService.ts
├── scripts/               # 构建脚本
│   ├── build.js          # 构建脚本
│   ├── dev.js            # 开发启动脚本
│   └── notarize.js       # macOS 公证脚本
├── assets/               # 资源文件
│   ├── icons/           # 应用图标
│   ├── tray/            # 托盘图标
│   └── installer/       # 安装程序资源
├── dist/                # 编译输出
├── build/               # 打包输出
├── package.json         # 依赖配置
├── tsconfig.json        # TypeScript 配置
└── README.md           # 项目文档
```

## ⚙️ 配置

### 应用配置

应用配置文件位于用户数据目录：

- **Windows**: `%APPDATA%/ai-stock-trading-desktop/config.json`
- **macOS**: `~/Library/Application Support/ai-stock-trading-desktop/config.json`
- **Linux**: `~/.config/ai-stock-trading-desktop/config.json`

### 环境变量

开发时可以设置以下环境变量：

```bash
# 开发模式
NODE_ENV=development

# 前端服务器端口
PORT=3000

# 启用开发者工具
OPEN_DEVTOOLS=true

# API 配置
API_BASE_URL=http://localhost:8080
```

## 🔧 脚本说明

### 开发脚本

```bash
# 启动开发环境
node scripts/dev.js

# 可用选项:
node scripts/dev.js --frontend-only    # 仅启动前端
node scripts/dev.js --electron-only    # 仅启动Electron
node scripts/dev.js --port 3001        # 指定端口
```

### 构建脚本

```bash
# 完整构建
node scripts/build.js

# 可用选项:
node scripts/build.js --frontend-only       # 仅构建前端
node scripts/build.js --electron-only       # 仅构建Electron
node scripts/build.js --package win         # 构建并打包
node scripts/build.js --clean              # 清理构建文件
```

## 📱 功能说明

### 仪表板
- 系统状态概览
- 实时股价显示
- 信号统计图表
- 监控控制面板

### 股票监控
- 实时价格监控
- 自定义股票列表
- 价格变化提醒
- 技术指标计算

### 数据分析
- 技术分析图表
- 基本面分析
- 风险评估指标
- 历史数据回测

### 通知系统
- 微信群机器人
- 微信公众号推送
- 邮件通知
- 桌面通知

### 云端同步
- 配置云端备份
- 多设备数据同步
- 腾讯云COS集成

## 🔐 安全特性

- **进程隔离**: 主进程和渲染进程安全隔离
- **Context Bridge**: 安全的API暴露机制
- **数据加密**: 敏感信息本地加密存储
- **通信加密**: 网络传输HTTPS加密
- **权限控制**: 最小权限原则

## 🛠️ 故障排除

### 常见问题

1. **应用无法启动**
   ```bash
   # 检查依赖
   npm install
   
   # 清理缓存
   npm run clean
   npm run build
   ```

2. **前端开发服务器无法访问**
   ```bash
   # 检查端口占用
   lsof -i :3000
   
   # 使用其他端口
   npm run dev -- --port 3001
   ```

3. **Electron 应用白屏**
   ```bash
   # 检查前端构建
   cd frontend && npm run build
   
   # 检查开发者工具
   # 菜单 -> View -> Toggle Developer Tools
   ```

4. **打包失败**
   ```bash
   # 检查平台依赖
   npm run postinstall
   
   # 清理并重新构建
   npm run clean
   npm run build
   npm run dist
   ```

### 日志文件

应用日志位于：

- **Windows**: `%APPDATA%/ai-stock-trading-desktop/logs/`
- **macOS**: `~/Library/Logs/ai-stock-trading-desktop/`
- **Linux**: `~/.local/share/ai-stock-trading-desktop/logs/`

### 性能优化

1. **内存使用优化**
   - 调整配置中的内存限制
   - 定期清理历史数据
   - 减少监控股票数量

2. **网络优化**
   - 增加请求超时时间
   - 减少数据更新频率
   - 使用本地缓存

## 🤝 贡献

欢迎提交问题和功能请求！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

- 📧 邮箱: support@aistock.com
- 📱 QQ群: 123456789
- 🌐 官网: https://aistock.com
- 📖 文档: https://docs.aistock.com

---

**注意**: 本软件仅供学习和研究使用，投资有风险，请谨慎决策.