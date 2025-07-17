#!/usr/bin/env node

/**
 * 构建脚本
 * 自动化构建前端和Electron应用
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  frontendDir: path.join(__dirname, '../../frontend'),
  electronDir: path.join(__dirname, '..'),
  distDir: path.join(__dirname, '../dist'),
  buildDir: path.join(__dirname, '../build'),
};
// 日志函数
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

// 执行命令
function exec(command, cwd = process.cwd()) {
  try {
    log.info(`执行命令: ${command}`);
    execSync(command, { 
      stdio: 'inherit', 
      cwd,
      env: { ...process.env, FORCE_COLOR: 'true' }
    });
    return true;
  } catch (error) {
    log.error(`命令执行失败: ${command}`);
    log.error(error.message);
    return false;
  }
}

// 检查目录是否存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info(`创建目录: ${dir}`);
  }
}

// 清理目录
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    exec(`rimraf "${dir}"`);
    log.info(`清理目录: ${dir}`);
  }
}

// 检查依赖
function checkDependencies() {
  log.info('检查依赖...');
  
  const packageJsonPath = path.join(CONFIG.electronDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log.error('未找到 package.json 文件');
    return false;
  }

  const frontendPackageJsonPath = path.join(CONFIG.frontendDir, 'package.json');
  if (!fs.existsSync(frontendPackageJsonPath)) {
    log.error('未找到前端 package.json 文件');
    return false;
  }

  return true;
}

// 构建前端
function buildFrontend() {
  log.info('开始构建前端...');
  
  if (!fs.existsSync(CONFIG.frontendDir)) {
    log.error('前端目录不存在');
    return false;
  }

  // 检查前端依赖
  const nodeModulesPath = path.join(CONFIG.frontendDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log.info('安装前端依赖...');
    if (!exec('npm install', CONFIG.frontendDir)) {
      return false;
    }
  }

  // 构建前端
  if (!exec('npm run build', CONFIG.frontendDir)) {
    return false;
  }

  log.success('前端构建完成');
  return true;
}

// 构建Electron
function buildElectron() {
  log.info('开始构建Electron...');
  
  // 清理输出目录
  cleanDir(CONFIG.distDir);
  ensureDir(CONFIG.distDir);

  // 检查Electron依赖
  const nodeModulesPath = path.join(CONFIG.electronDir, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log.info('安装Electron依赖...');
    if (!exec('npm install', CONFIG.electronDir)) {
      return false;
    }
  }

  // 编译TypeScript
  if (!exec('npx tsc', CONFIG.electronDir)) {
    return false;
  }

  // 复制资源文件
  if (!exec('npm run copy-assets', CONFIG.electronDir)) {
    log.warn('复制资源文件失败，继续构建...');
  }

  log.success('Electron构建完成');
  return true;
}

// 打包应用
function packageApp(platform = 'current') {
  log.info(`开始打包应用 (${platform})...`);
  
  let command = 'npm run dist';
  
  switch (platform) {
    case 'win':
    case 'windows':
      command = 'npm run dist:win';
      break;
    case 'mac':
    case 'macos':
      command = 'npm run dist:mac';
      break;
    case 'linux':
      command = 'npm run dist:linux';
      break;
    case 'all':
      command = 'npm run dist:all';
      break;
  }

  if (!exec(command, CONFIG.electronDir)) {
    return false;
  }

  log.success('应用打包完成');
  return true;
}

// 显示帮助信息
function showHelp() {
  console.log(`
AI股票交易系统 - 构建脚本

用法:
  node build.js [选项]

选项:
  --help, -h          显示此帮助信息
  --frontend-only     仅构建前端
  --electron-only     仅构建Electron
  --package [平台]    构建并打包应用
  --clean            清理构建文件
  --dev              开发模式构建

平台选项 (用于 --package):
  current            当前平台 (默认)
  win, windows       Windows
  mac, macos         macOS
  linux              Linux
  all                所有平台

示例:
  node build.js                     # 完整构建
  node build.js --frontend-only     # 仅构建前端
  node build.js --package win       # 构建并打包Windows版本
  node build.js --clean             # 清理构建文件
`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--clean')) {
    log.info('清理构建文件...');
    cleanDir(CONFIG.distDir);
    cleanDir(CONFIG.buildDir);
    cleanDir(path.join(CONFIG.frontendDir, 'build'));
    log.success('清理完成');
    return;
  }

  // 检查依赖
  if (!checkDependencies()) {
    process.exit(1);
  }

  let success = true;

  // 仅构建前端
  if (args.includes('--frontend-only')) {
    success = buildFrontend();
  }
  // 仅构建Electron
  else if (args.includes('--electron-only')) {
    success = buildElectron();
  }
  // 构建并打包
  else if (args.includes('--package')) {
    const platformIndex = args.indexOf('--package') + 1;
    const platform = args[platformIndex] || 'current';
    
    success = buildFrontend() && buildElectron() && packageApp(platform);
  }
  // 完整构建
  else {
    success = buildFrontend() && buildElectron();
  }

  if (success) {
    log.success('构建完成！');
    
    // 显示构建结果
    if (fs.existsSync(CONFIG.buildDir)) {
      const files = fs.readdirSync(CONFIG.buildDir);
      if (files.length > 0) {
        log.info('打包文件:');
        files.forEach(file => {
          const filePath = path.join(CONFIG.buildDir, file);
          const stats = fs.statSync(filePath);
          const size = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`  - ${file} (${size}MB)`);
        });
      }
    }
  } else {
    log.error('构建失败！');
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  buildFrontend,
  buildElectron,
  packageApp,
  cleanDir,
  ensureDir,
  exec,
  log,
};