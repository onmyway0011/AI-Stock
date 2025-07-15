/**
 * 历史回测运行器
 * 获取历史数据并运行完整的回测流程，包括参数优化和报告生成
 */

import { BacktestEngine, BacktestConfig, BacktestResult, OptimizationResult } from '../engine/BacktestEngine';
import { BacktestReportGenerator, ReportConfig } from '../reports/BacktestReportGenerator';
import { BaseStrategy } from '../../strategies/base/BaseStrategy';
import { BinanceCollector } from '../../data/collectors/BinanceCollector';
import { DataStorage } from '../../data/storage/DataStorage';
import { createLogger } from '../../utils/logger';
import { DateUtils } from '../../utils';
import { Kline } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLogger('HISTORICAL_BACKTEST');

/**
 * 历史回测配置
 */
export interface HistoricalBacktestConfig {
  /** 策略配置 */
  strategy: {
    name: string;
    class: new (...args: any[]) => BaseStrategy;
    config: any;
  };
  
  /** 交易品种 */
  symbol: string;
  
  /** K线间隔 */
  interval: string;
  
  /** 回测时间范围 */
  timeRange: {
    /** 开始时间 (可选，默认2年前) */
    startTime?: number;
    /** 结束时间 (可选，默认现在) */
    endTime?: number;
    /** 回测年数 (如果未指定具体时间) */
    years?: number;
  };
  
  /** 回测引擎配置 */
  backtest: BacktestConfig;
  
  /** 参数优化配置 */
  optimization?: {
    /** 是否启用参数优化 */
    enabled: boolean;
    /** 参数范围 */
    parameterRanges: Record<string, { min: number; max: number; step: number }>;
    /** 优化目标指标 */
    metric: string;
    /** 最大优化时间(秒) */
    maxOptimizationTime?: number;
  };
  
  /** 报告配置 */
  report: ReportConfig;
  
  /** 数据缓存配置 */
  dataCache?: {
    /** 是否启用缓存 */
    enabled: boolean;
    /** 缓存目录 */
    cacheDir: string;
    /** 缓存过期时间(小时) */
    expireHours: number;
  };
}

/**
 * 回测任务结果
 */
export interface BacktestTaskResult {
  /** 基础回测结果 */
  backtest: BacktestResult;
  
  /** 参数优化结果 */
  optimization?: OptimizationResult;
  
  /** 报告文件路径 */
  reportPath: string;
  
  /** 执行统计 */
  execution: {
    totalDuration: number;
    dataCollectionTime: number;
    backtestTime: number;
    optimizationTime?: number;
    reportGenerationTime: number;
  };
}

/**
 * 历史回测运行器
 */
export class HistoricalBacktestRunner {
  private dataCollector: BinanceCollector;
  private dataStorage: DataStorage;

  constructor() {
    this.dataCollector = new BinanceCollector();
    this.dataStorage = new DataStorage({
      type: 'file',
      connectionString: './data/backtest'
    });
  }

  /**
   * 运行历史回测
   */
  async runHistoricalBacktest(config: HistoricalBacktestConfig): Promise<BacktestTaskResult> {
    const startTime = Date.now();
    logger.info(`开始历史回测任务: ${config.strategy.name} - ${config.symbol}`);

    try {
      // 1. 计算时间范围
      const timeRange = this.calculateTimeRange(config.timeRange);
      logger.info(`回测时间范围: ${DateUtils.formatTimestamp(timeRange.startTime)} - ${DateUtils.formatTimestamp(timeRange.endTime)}`);

      // 2. 获取历史数据
      const dataCollectionStart = Date.now();
      const historicalData = await this.getHistoricalData(
        config.symbol,
        config.interval,
        timeRange.startTime,
        timeRange.endTime,
        config.dataCache
      );
      const dataCollectionTime = Date.now() - dataCollectionStart;
      
      logger.info(`获取历史数据完成: ${historicalData.length}根K线`);

      // 3. 创建策略实例
      const strategy = new config.strategy.class(config.strategy.config);
      await strategy.initialize();

      let optimizationResult: OptimizationResult | undefined;
      let optimizationTime = 0;

      // 4. 参数优化 (如果启用)
      if (config.optimization?.enabled) {
        logger.info('开始参数优化');
        const optimizationStart = Date.now();
        
        const optimizedBacktest = new BacktestEngine({
          ...config.backtest,
          startTime: timeRange.startTime,
          endTime: timeRange.endTime
        });

        optimizationResult = await optimizedBacktest.optimizeParameters(
          strategy,
          historicalData,
          config.symbol,
          config.optimization.parameterRanges,
          config.optimization.metric
        );

        optimizationTime = Date.now() - optimizationStart;
        logger.info(`参数优化完成，耗时 ${(optimizationTime / 1000).toFixed(2)}秒`);

        // 应用最优参数
        strategy.updateConfig({ parameters: optimizationResult.bestParameters });
        logger.info('应用最优参数:', optimizationResult.bestParameters);
      }
      // 5. 运行回测
      const backtestStart = Date.now();
      const backtestEngine = new BacktestEngine({
        ...config.backtest,
        startTime: timeRange.startTime,
        endTime: timeRange.endTime
      });

      const backtestResult = await backtestEngine.runBacktest(
        strategy,
        historicalData,
        config.symbol
      );
      const backtestTime = Date.now() - backtestStart;

      logger.info(`回测完成，耗时 ${(backtestTime / 1000).toFixed(2)}秒`);

      // 6. 生成报告
      const reportStart = Date.now();
      const reportGenerator = new BacktestReportGenerator(config.report);
      const reportContent = await reportGenerator.generateReport(backtestResult);
      
      // 保存报告
      const reportPath = await this.saveReport(reportContent, config.report);
      const reportGenerationTime = Date.now() - reportStart;

      logger.info(`报告生成完成: ${reportPath}`);

      // 7. 返回结果
      const totalDuration = Date.now() - startTime;
      
      const result: BacktestTaskResult = {
        backtest: backtestResult,
        optimization: optimizationResult,
        reportPath,
        execution: {
          totalDuration,
          dataCollectionTime,
          backtestTime,
          optimizationTime: optimizationTime > 0 ? optimizationTime : undefined,
          reportGenerationTime
        }
      };
      logger.info(`历史回测任务完成，总耗时 ${(totalDuration / 1000).toFixed(2)}秒`);
      this.logSummary(result);

      return result;

    } catch (error) {
      logger.error('历史回测任务失败', error);
      throw error;
    }
  }

  /**
   * 批量回测 (多个策略或参数组合)
   */
  async runBatchBacktest(
    configs: HistoricalBacktestConfig[],
    options?: {
      maxConcurrency?: number;
      failFast?: boolean;
    }
  ): Promise<BacktestTaskResult[]> {
    const maxConcurrency = options?.maxConcurrency || 3;
    const failFast = options?.failFast || false;

    logger.info(`开始批量回测: ${configs.length}个任务, 最大并发数: ${maxConcurrency}`);

    const results: BacktestTaskResult[] = [];
    const errors: Error[] = [];

    // 分批执行
    for (let i = 0; i < configs.length; i += maxConcurrency) {
      const batch = configs.slice(i, i + maxConcurrency);
      
      logger.info(`执行批次 ${Math.floor(i / maxConcurrency) + 1}/${Math.ceil(configs.length / maxConcurrency)}`);

      const batchPromises = batch.map(async (config, index) => {
        try {
          const result = await this.runHistoricalBacktest(config);
          return { index: i + index, result, error: null };
        } catch (error) {
          return { index: i + index, result: null, error: error as Error };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const { index, result, error } of batchResults) {
        if (error) {
          errors.push(error);
          logger.error(`任务 ${index + 1} 失败: ${error.message}`);
          
          if (failFast) {
            throw error;
          }
        } else if (result) {
          results.push(result);
          logger.info(`任务 ${index + 1} 完成`);
        }
      }
    }

    logger.info(`批量回测完成: 成功 ${results.length}, 失败 ${errors.length}`);

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`所有回测任务都失败了，首个错误: ${errors[0].message}`);
    }

    return results;
  }

  /**
   * 获取历史数据
   */
  private async getHistoricalData(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    cacheConfig?: HistoricalBacktestConfig['dataCache']
  ): Promise<Kline[]> {
    // 生成缓存键
    const cacheKey = `${symbol}_${interval}_${startTime}_${endTime}`;
    
    // 检查缓存
    if (cacheConfig?.enabled) {
      const cachedData = await this.loadCachedData(cacheKey, cacheConfig);
      if (cachedData) {
        logger.info('使用缓存的历史数据');
        return cachedData;
      }
    }

    logger.info('从交易所获取历史数据...');

    // 从交易所获取数据
    const klines = await this.dataCollector.collectKlines({
      symbol,
      interval,
      startTime,
      endTime,
      limit: 1000
    });

    // 保存到缓存
    if (cacheConfig?.enabled) {
      await this.saveCachedData(cacheKey, klines, cacheConfig);
    }

    return klines;
  }

  /**
   * 加载缓存数据
   */
  private async loadCachedData(
    cacheKey: string,
    cacheConfig: NonNullable<HistoricalBacktestConfig['dataCache']>
  ): Promise<Kline[] | null> {
    try {
      const cacheFile = path.join(cacheConfig.cacheDir, `${cacheKey}.json`);
      
      // 检查文件是否存在
      try {
        await fs.access(cacheFile);
      } catch {
        return null; // 文件不存在
      }

      // 检查文件是否过期
      const stats = await fs.stat(cacheFile);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > cacheConfig.expireHours) {
        logger.info(`缓存文件已过期 (${ageHours.toFixed(1)}小时)`);
        return null;
      }

      // 读取缓存数据
      const content = await fs.readFile(cacheFile, 'utf-8');
      const data = JSON.parse(content);
      
      logger.info(`从缓存加载数据: ${data.length}根K线`);
      return data;

    } catch (error) {
      logger.warn('加载缓存数据失败', error);
      return null;
    }
  }

  /**
   * 保存缓存数据
   */
  private async saveCachedData(
    cacheKey: string,
    data: Kline[],
    cacheConfig: NonNullable<HistoricalBacktestConfig['dataCache']>
  ): Promise<void> {
    try {
      // 确保缓存目录存在
      await fs.mkdir(cacheConfig.cacheDir, { recursive: true });
      const cacheFile = path.join(cacheConfig.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFile, JSON.stringify(data, null, 2));
      
      logger.info(`保存数据到缓存: ${data.length}根K线`);
    } catch (error) {
      logger.warn('保存缓存数据失败', error);
    }
  }

  /**
   * 计算时间范围
   */
  private calculateTimeRange(timeRange: HistoricalBacktestConfig['timeRange']): {
    startTime: number;
    endTime: number;
  } {
    const now = Date.now();
    
    let endTime = timeRange.endTime || now;
    let startTime = timeRange.startTime;
    
    if (!startTime) {
      const years = timeRange.years || 2;
      startTime = now - (years * 365.25 * 24 * 60 * 60 * 1000);
    }

    return { startTime, endTime };
  }

  /**
   * 保存报告
   */
  private async saveReport(content: string, config: ReportConfig): Promise<string> {
    // 确保输出目录存在
    const outputDir = path.dirname(config.outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // 生成带时间戳的文件名
    const timestamp = DateUtils.formatTimestamp(Date.now(), 'YYYYMMDD_HHmmss');
    const ext = path.extname(config.outputPath);
    const baseName = path.basename(config.outputPath, ext);
    const finalPath = path.join(outputDir, `${baseName}_${timestamp}${ext}`);

    // 保存文件
    await fs.writeFile(finalPath, content, 'utf-8');
    
    return finalPath;
  }

  /**
   * 输出回测总结
   */
  private logSummary(result: BacktestTaskResult): void {
    const { backtest, execution } = result;
    
    logger.info('回测结果总结:');
    logger.info(`📊 总收益率: ${(backtest.returns.totalReturn * 100).toFixed(2)}%`);
    logger.info(`📈 年化收益率: ${(backtest.returns.annualizedReturn * 100).toFixed(2)}%`);
    logger.info(`📉 最大回撤: ${(backtest.risk.maxDrawdown * 100).toFixed(2)}%`);
    logger.info(`⚡ 夏普比率: ${backtest.riskAdjusted.sharpeRatio.toFixed(2)}`);
    logger.info(`🎯 胜率: ${(backtest.trading.winRate * 100).toFixed(1)}%`);
    logger.info(`💼 交易次数: ${backtest.trading.totalTrades}`);
    
    logger.info('执行统计:');
    logger.info(`⏱️  总耗时: ${(execution.totalDuration / 1000).toFixed(2)}秒`);
    logger.info(`📡 数据获取: ${(execution.dataCollectionTime / 1000).toFixed(2)}秒`);
    logger.info(`🔄 回测计算: ${(execution.backtestTime / 1000).toFixed(2)}秒`);
    
    if (execution.optimizationTime) {
      logger.info(`🎛️  参数优化: ${(execution.optimizationTime / 1000).toFixed(2)}秒`);
    }
    
    logger.info(`📋 报告生成: ${(execution.reportGenerationTime / 1000).toFixed(2)}秒`);
  }

  /**
   * 清理缓存
   */
  async clearCache(cacheDir: string, olderThanHours?: number): Promise<void> {
    try {
      const files = await fs.readdir(cacheDir);
      let deletedCount = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(cacheDir, file);
        
        if (olderThanHours !== undefined) {
          const stats = await fs.stat(filePath);
          const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          
          if (ageHours <= olderThanHours) {
            continue; // 跳过较新的文件
          }
        }

        await fs.unlink(filePath);
        deletedCount++;
      }

      logger.info(`清理缓存完成: 删除 ${deletedCount} 个文件`);
    } catch (error) {
      logger.error('清理缓存失败', error);
    }
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(cacheDir: string): Promise<{
    fileCount: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
  }> {
    try {
      const files = await fs.readdir(cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      let totalSize = 0;
      let oldestTime = Infinity;
      let newestTime = 0;
      let oldestFile: string | null = null;
      let newestFile: string | null = null;

      for (const file of jsonFiles) {
        const filePath = path.join(cacheDir, file);
        const stats = await fs.stat(filePath);
        
        totalSize += stats.size;
        
        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
          oldestFile = file;
        }
        
        if (stats.mtime.getTime() > newestTime) {
          newestTime = stats.mtime.getTime();
          newestFile = file;
        }
      }

      return {
        fileCount: jsonFiles.length,
        totalSize,
        oldestFile,
        newestFile
      };
    } catch (error) {
      logger.error('获取缓存统计失败', error);
      return {
        fileCount: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null
      };
    }
  }
}