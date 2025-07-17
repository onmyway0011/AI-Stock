#!/usr/bin/env node
/**
 * 开发环境启动脚本
 * 同时启动前端开发服务器和Electron应用
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

// 配置
const CONFIG = {
  frontendDir: path.join(__dirname, '../../frontend'),
  electronDir: path.join(__dirname, '..'),
  frontendPort: 3000,
  electronPort: 3001,
  maxRetries: 30,
  retryInterval: 1000,
};

// 日志函数
const log = {
  info: (msg) => console.log(`\x1b[36m[DEV]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  frontend: (msg) => console.log(`\x1b[35m[FRONTEND]\x1b[0m ${msg}`),
  electron: (msg) => console.log(`\x1b[34m[ELECTRON]\x1b[0m ${msg}`),
};

// 检查端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true); // 端口可用
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // 端口被占用
    });
  });
}

// 等待端口就绪
function waitForPort(port, maxRetries = CONFIG.maxRetries) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    const check = () => {
      const socket = new net.Socket();
      
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        retry();
      });
      
      socket.once('error', () => {
        retry();
      });
      
      socket.connect(port, 'localhost');
    };
    
    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        reject(new Error(`端口 ${port} 在 ${maxRetries} 次重试后仍未就绪`));
        return;
      }
      log.info(`等待端口 ${port} 就绪... (${retries}/${maxRetries})`);
      setTimeout(check, CONFIG.retryInterval);
    };
    
    check();
  });
}

// 检查依赖
function checkDependencies() {
  log.info('检查项目依赖...');
  
  // 检查前端依赖
  const frontendNodeModules = path.join(CONFIG.frontendDir, 'node_modules');
  if (!fs.existsSync(frontendNodeModules)) {
    log.warn('前端依赖未安装，请先运行: cd frontend && npm install');
    return false;
  }
  
  // 检查Electron依赖
  const electronNodeModules = path.join(CONFIG.electronDir, 'node_modules');
  if (!fs.existsSync(electronNodeModules)) {
    log.warn('Electron依赖未安装，请先运行: cd electron && npm install');
    return false;
  }
  
  log.success('依赖检查通过');
  return true;
}
// 启动前端开发服务器
function startFrontend() {
  return new Promise((resolve, reject) => {
    log.info('启动前端开发服务器...');
    
    const frontend = spawn('npm', ['start'], {
      cwd: CONFIG.frontendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: CONFIG.frontendPort.toString(),
        BROWSER: 'none', // 不自动打开浏览器
        FORCE_COLOR: 'true',
      },
    });
    
    let started = false;
    
    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      log.frontend(output.trim());
      
      // 检查是否启动成功
      if (!started && (
        output.includes('webpack compiled') ||
        output.includes('Local:') ||
        output.includes('compiled successfully')
      )) {
        started = true;
        log.success('前端开发服务器启动成功');
        resolve(frontend);
      }
    });
    
    frontend.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('DeprecationWarning')) {
        log.frontend(`错误: ${output.trim()}`);
      }
    });
    
    frontend.on('error', (err) => {
      log.error(`前端服务器启动失败: ${err.message}`);
      reject(err);
    });
    
    frontend.on('exit', (code) => {
      if (code !== 0 && !started) {
        reject(new Error(`前端服务器退出，代码: ${code}`));
      }
    });
    
    // 超时检查
    setTimeout(() => {
      if (!started) {
        frontend.kill();
        reject(new Error('前端服务器启动超时'));
      }
    }, 60000); // 60秒超时
  });
}

// 启动Electron应用
function startElectron() {
  return new Promise((resolve, reject) => {
    log.info('启动Electron应用...');
    
    const electron = spawn('npm', ['run', 'dev:electron'], {
      cwd: CONFIG.electronDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ELECTRON_DEV: 'true',
        FORCE_COLOR: 'true',
      },
    });
    
    let started = false;
    electron.stdout.on('data', (data) => {
      const output = data.toString();
      log.electron(output.trim());
      
      // 检查是否启动成功
      if (!started && (
        output.includes('ready') ||
        output.includes('Application ready')
      )) {
        started = true;
        log.success('Electron应用启动成功');
        resolve(electron);
      }
    });
    
    electron.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('DeprecationWarning') && !output.includes('[nodemon]')) {
        log.electron(`错误: ${output.trim()}`);
      }
    });
    
    electron.on('error', (err) => {
      log.error(`Electron应用启动失败: ${err.message}`);
      reject(err);
    });
    
    electron.on('exit', (code) => {
      log.info(`Electron应用退出，代码: ${code}`);
      if (code !== 0 && !started) {
        reject(new Error(`Electron应用退出，代码: ${code}`));
      }
    });
    
    // 超时检查
    setTimeout(() => {
      if (!started) {
        started = true; // 防止重复reject
        resolve(electron); // Electron可能已经启动但没有输出特定消息
      }
    }, 30000); // 30秒后强制认为启动成功
  });
}

// 清理进程
function cleanup(processes) {
  log.info('正在清理进程...');
  
  processes.forEach((process) => {
    if (process && !process.killed) {
      process.kill();
    }
  });
  
  process.exit(0);
}

// 显示帮助信息
function showHelp() {
  console.log(`
AI股票交易系统 - 开发环境启动脚本

用法:
  node dev.js [选项]

选项:
  --help, -h          显示此帮助信息
  --frontend-only     仅启动前端开发服务器
  --electron-only     仅启动Electron应用
  --port <端口>       指定前端服务器端口 (默认: 3000)
  --no-reload        禁用热重载

示例:
  node dev.js                    # 启动完整开发环境
  node dev.js --frontend-only    # 仅启动前端
  node dev.js --port 3001        # 使用端口3001
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // 检查端口参数
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    CONFIG.frontendPort = parseInt(args[portIndex + 1]);
  }
  
  const frontendOnly = args.includes('--frontend-only');
  const electronOnly = args.includes('--electron-only');
  
  // 检查依赖
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  const processes = [];
  
  try {
    // 仅启动前端
    if (frontendOnly) {
      const frontend = await startFrontend();
      processes.push(frontend);
      log.success('前端开发服务器运行中...');
    }
    // 仅启动Electron
    else if (electronOnly) {
      const electron = await startElectron();
      processes.push(electron);
      log.success('Electron应用运行中...');
    }
    // 启动完整开发环境
    else {
      // 检查前端端口
      const portAvailable = await checkPort(CONFIG.frontendPort);
      if (!portAvailable) {
        log.error(`端口 ${CONFIG.frontendPort} 被占用，请使用 --port 指定其他端口`);
        process.exit(1);
      }
      
      // 启动前端
      const frontend = await startFrontend();
      processes.push(frontend);
      
      // 等待前端服务器就绪
      await waitForPort(CONFIG.frontendPort);
      log.success(`前端服务器就绪: http://localhost:${CONFIG.frontendPort}`);
      
      // 启动Electron
      const electron = await startElectron();
      processes.push(electron);
      
      log.success('开发环境启动完成！');
      log.info('按 Ctrl+C 停止所有服务');
    }
    
    // 监听退出信号
    process.on('SIGINT', () => cleanup(processes));
    process.on('SIGTERM', () => cleanup(processes));
    process.on('exit', () => cleanup(processes));
    
  } catch (error) {
    log.error(`启动失败: ${error.message}`);
    cleanup(processes);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch((error) => {
    log.error(`未捕获的错误: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  startFrontend,
  startElectron,
  waitForPort,
  checkPort,
  log,
};
