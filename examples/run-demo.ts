#!/usr/bin/env ts-node

/**
 * 回测系统完整演示脚本
 * 展示2年历史数据回测的完整流程
 */

import { demoBasicBacktest, demoOptimizationBacktest, demoBatchBacktest, demoCacheManagement } from './historical-backtest-demo';
import { createLogger } from '../src/utils/logger';
import { DateUtils } from '../src/utils';
import * as readline from 'readline';

const logger = createLogger('DEMO_RUNNER');

/**
 * 创建交互式命令行界面
 */
function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 显示主菜单
 */
function showMainMenu(): void {
  console.clear();
  console.log('🎯 AI股票交易系统 - 回测演示');
  console.log('='.repeat(60));
  console.log('');
  console.log('请选择要运行的演示:');
  console.log('');
  console.log('1. 📊 基础回测演示 (推荐新手)');
  console.log('   - 使用移动平均策略');
  console.log('   - 2年BTCUSDT历史数据');
  console.log('   - 生成HTML报告');
  console.log('   - 预计耗时: 2-5分钟');
  console.log('');
  console.log('2. 🎛️  参数优化演示 (高级功能)');
  console.log('   - 使用左侧建仓策略');
  console.log('   - 1.5年ETHUSDT历史数据');
  console.log('   - 自动寻找最优参数');
  console.log('   - 预计耗时: 15-30分钟');
  console.log('');
  console.log('3. 📈 策略对比演示 (批量回测)');
  console.log('   - 对比多个策略表现');
  console.log('   - 1年BTCUSDT历史数据');
  console.log('   - 生成对比报告');
  console.log('   - 预计耗时: 5-10分钟');
  console.log('');
  console.log('4. 🗄️  缓存管理演示');
  console.log('   - 查看缓存统计');
  console.log('   - 清理过期缓存');
  console.log('   - 预计耗时: <1分钟');
  console.log('');
  console.log('5. 🚀 运行所有演示 (完整体验)');
  console.log('   - 依次运行上述所有演示');
  console.log('   - 预计耗时: 20-45分钟');
  console.log('');
  console.log('0. ❌ 退出');
  console.log('');
  console.log('='.repeat(60));
}

/**
 * 等待用户输入
 */
function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * 显示演示前的准备信息
 */
function showPreparationInfo(): void {
  console.log('📋 演示准备:');
  console.log('');
  console.log('✅ 确保网络连接正常 (需要获取历史数据)');
  console.log('✅ 确保有足够的磁盘空间 (约100MB用于缓存)');
  console.log('✅ 演示过程中会创建以下目录:');
  console.log('   - ./reports/ (存放回测报告)');
  console.log('   - ./cache/backtest/ (存放数据缓存)');
  console.log('   - ./logs/ (存放日志文件)');
  console.log('');
  console.log('⚠️  注意事项:');
  console.log('   - 首次运行需要下载历史数据，会比较慢');
  console.log('   - 参数优化演示耗时较长，建议在空闲时运行');
  console.log('   - 所有演示仅用于学习，不构成投资建议');
  console.log('');
}

/**
 * 运行基础回测演示
 */
async function runBasicDemo(): Promise<void> {
  console.clear();
  console.log('🚀 开始基础回测演示');
  console.log('='.repeat(50));
  console.log('');
  console.log('📊 演示内容:');
  console.log('- 策略: 移动平均策略');
  console.log('- 品种: BTCUSDT');
  console.log('- 时间范围: 最近2年');
  console.log('- K线周期: 1小时');
  console.log('- 初始资金: $100,000');
  console.log('');

  try {
    await demoBasicBacktest();
    console.log('\n✅ 基础回测演示完成!');
    console.log('📁 查看 ./reports/ 目录获取生成的HTML报告');
  } catch (error) {
    console.error('❌ 基础回测演示失败:', error.message);
  }
}

/**
 * 运行参数优化演示
 */
async function runOptimizationDemo(): Promise<void> {
  console.clear();
  console.log('🎛️  开始参数优化演示');
  console.log('='.repeat(50));
  console.log('');
  console.log('⚠️  重要提醒:');
  console.log('参数优化需要测试多种参数组合，耗时较长 (15-30分钟)');
  console.log('建议在网络稳定且空闲时运行');
  console.log('');

  const rl = createInterface();
  const answer = await askQuestion(rl, '确认继续参数优化演示? (y/N): ');
  rl.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('⏭️  跳过参数优化演示');
    return;
  }

  console.log('');
  console.log('🔧 演示内容:');
  console.log('- 策略: 左侧建仓策略');
  console.log('- 品种: ETHUSDT');
  console.log('- 时间范围: 最近1.5年');
  console.log('- K线周期: 4小时');
  console.log('- 优化目标: 夏普比率');
  console.log('');

  try {
    await demoOptimizationBacktest();
    console.log('\n✅ 参数优化演示完成!');
    console.log('📁 查看 ./reports/ 目录获取优化报告');
  } catch (error) {
    console.error('❌ 参数优化演示失败:', error.message);
  }
}

/**
 * 运行批量回测演示
 */
async function runBatchDemo(): Promise<void> {
  console.clear();
  console.log('📈 开始策略对比演示');
  console.log('='.repeat(50));
  console.log('');
  console.log('📊 演示内容:');
  console.log('- 对比策略: 移动平均(保守), 移动平均(激进), 左侧建仓');
  console.log('- 品种: BTCUSDT');
  console.log('- 时间范围: 最近1年');
  console.log('- K线周期: 1小时');
  console.log('');

  try {
    await demoBatchBacktest();
    console.log('\n✅ 策略对比演示完成!');
    console.log('📁 查看 ./reports/ 目录获取对比报告');
  } catch (error) {
    console.error('❌ 策略对比演示失败:', error.message);
  }
}

/**
 * 运行缓存管理演示
 */
async function runCacheDemo(): Promise<void> {
  console.clear();
  console.log('🗄️  开始缓存管理演示');
  console.log('='.repeat(50));
  console.log('');

  try {
    await demoCacheManagement();
    console.log('\n✅ 缓存管理演示完成!');
  } catch (error) {
    console.error('❌ 缓存管理演示失败:', error.message);
  }
}

/**
 * 运行所有演示
 */
async function runAllDemos(): Promise<void> {
  console.clear();
  console.log('🚀 开始完整演示流程');
  console.log('='.repeat(50));
  console.log('');
  console.log('⏰ 预计总耗时: 20-45分钟');
  console.log('包含以下演示:');
  console.log('1. 基础回测演示');
  console.log('2. 批量策略对比演示');
  console.log('3. 缓存管理演示');
  console.log('(跳过参数优化演示以节省时间)');
  console.log('');

  const rl = createInterface();
  const answer = await askQuestion(rl, '确认运行完整演示? (y/N): ');
  rl.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('⏭️  取消完整演示');
    return;
  }

  const startTime = Date.now();

  try {
    // 1. 基础回测演示
    console.log('\n' + '='.repeat(60));
    console.log('🔄 第1步: 基础回测演示');
    console.log('='.repeat(60));
    await runBasicDemo();
    await sleep(2000);

    // 2. 批量回测演示
    console.log('\n' + '='.repeat(60));
    console.log('🔄 第2步: 策略对比演示');
    console.log('='.repeat(60));
    await runBatchDemo();
    await sleep(2000);

    // 3. 缓存管理演示
    console.log('\n' + '='.repeat(60));
    console.log('🔄 第3步: 缓存管理演示');
    console.log('='.repeat(60));
    await runCacheDemo();

    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 完整演示流程完成!');
    console.log('='.repeat(60));
    console.log(`⏱️  总耗时: ${totalTime.toFixed(1)}秒 (${(totalTime / 60).toFixed(1)}分钟)`);
    console.log('📁 所有报告已保存到 ./reports/ 目录');
    console.log('📄 详细使用说明请查看 ./docs/backtest-guide.md');

  } catch (error) {
    console.error('❌ 完整演示过程中发生错误:', error.message);
  }
}

/**
 * 显示演示结果总结
 */
async function showDemoSummary(): Promise<void> {
  console.log('\n📋 演示总结');
  console.log('='.repeat(50));
  console.log('');
  console.log('🎯 您已体验了AI股票交易系统的回测功能，包括:');
  console.log('');
  console.log('✅ 历史数据回测 - 使用2年真实市场数据验证策略');
  console.log('✅ 性能指标计算 - 全面的风险收益分析');
  console.log('✅ 参数优化功能 - 自动寻找最优策略参数');
  console.log('✅ 多格式报告 - HTML/Markdown/JSON格式输出');
  console.log('✅ 策略对比分析 - 批量测试多个策略');
  console.log('✅ 数据缓存管理 - 高效的数据存储机制');
  console.log('');
  console.log('🚀 下一步建议:');
  console.log('');
  console.log('1. 📖 阅读详细文档: ./docs/backtest-guide.md');
  console.log('2. 🔧 自定义策略参数，尝试不同配置');
  console.log('3. 📊 分析生成的报告，理解策略表现');
  console.log('4. 🎛️  尝试参数优化，寻找更好的参数组合');
  console.log('5. 💡 开发自己的交易策略');
  console.log('');
  console.log('⚠️  重要提醒:');
  console.log('- 历史回测结果仅供参考，不代表未来收益');
  console.log('- 实盘交易前请充分验证和风险评估');
  console.log('- 投资有风险，决策需谨慎');
  console.log('');
  console.log('📞 技术支持:');
  console.log('- 查看 README.md 了解更多功能');
  console.log('- 遇到问题请查看日志文件 ./logs/');
  console.log('- 欢迎提交Issue或反馈建议');
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主程序入口
 */
async function main(): Promise<void> {
  console.log(`⏰ 演示开始时间: ${DateUtils.formatTimestamp(Date.now())}\n`);
  
  showPreparationInfo();

  const rl = createInterface();

  try {
    while (true) {
      showMainMenu();
      const choice = await askQuestion(rl, '请输入选项 (0-5): ');

      switch (choice) {
        case '1':
          await runBasicDemo();
          break;

        case '2':
          await runOptimizationDemo();
          break;

        case '3':
          await runBatchDemo();
          break;

        case '4':
          await runCacheDemo();
          break;

        case '5':
          await runAllDemos();
          break;

        case '0':
          console.log('\n👋 感谢使用AI股票交易系统回测演示!');
          await showDemoSummary();
          rl.close();
          return;

        default:
          console.log('\n❌ 无效选项，请重新选择');
          await sleep(1500);
          continue;
      }

      // 演示完成后暂停
      console.log('\n' + '='.repeat(60));
      await askQuestion(rl, '按回车键返回主菜单...');
    }

  } catch (error) {
    console.error('\n❌ 演示过程中发生错误:', error.message);
    logger.error('Demo execution error', error);
  } finally {
    rl.close();
  }
}

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n\n👋 演示已中断，感谢使用!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 演示已终止，感谢使用!');
  process.exit(0);
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('\n❌ 程序异常:', error.message);
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的Promise拒绝:', reason);
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序启动失败:', error.message);
    logger.error('Main execution error', error);
    process.exit(1);
  });
}

export { main };