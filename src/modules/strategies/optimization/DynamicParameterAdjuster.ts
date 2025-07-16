/**
 * 动态参数调整模块
 * 根据策略性能自动调整参数，实现策略的自适应优化
 */

import { DynamicParameterConfig, StrategyOptimizationResult } from '../base/AdvancedStrategyInterface';

/**
 * 参数范围定义
 */
interface ParameterRange {
  min: number;
  max: number;
  step: number;
  type: 'float' | 'integer' | 'percentage';
  description: string;
}

/**
 * 参数配置定义
 */
interface ParameterDefinition {
  [key: string]: ParameterRange;
}

/**
 * 性能度量
 */
interface PerformanceMetrics {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageTrade: number;
  tradeCount: number;
  volatility: number;
  calmarRatio: number;
  sortinoRatio: number;
}

/**
 * 优化历史记录
 */
interface OptimizationRecord {
  timestamp: number;
  parameters: Record<string, any>;
  performance: PerformanceMetrics;
  optimizationType: string;
  improvement: number;
  confidence: number;
}

/**
 * 参数优化算法接口
 */
interface OptimizationAlgorithm {
  name: string;
  optimize(
    currentParams: Record<string, any>,
    paramRanges: ParameterDefinition,
    performanceHistory: OptimizationRecord[]
  ): Promise<{
    newParams: Record<string, any>;
    expectedImprovement: number;
    confidence: number;
  }>;
}

/**
 * 网格搜索优化算法
 */
class GridSearchOptimizer implements OptimizationAlgorithm {
  name = 'GridSearch';

  async optimize(
    currentParams: Record<string, any>,
    paramRanges: ParameterDefinition,
    performanceHistory: OptimizationRecord[]
  ): Promise<{
    newParams: Record<string, any>;
    expectedImprovement: number;
    confidence: number;
  }> {
    const paramNames = Object.keys(paramRanges);
    const bestParams = { ...currentParams };
    let bestScore = this.calculateOverallScore(performanceHistory[performanceHistory.length - 1]?.performance);
    
    for (const paramName of paramNames) {
      const range = paramRanges[paramName];
      const currentValue = currentParams[paramName] || 0;
      
      const candidates = this.generateCandidates(currentValue, range, 5);
      for (const candidate of candidates) {
        const testParams = { ...currentParams, [paramName]: candidate };
        const estimatedPerformance = this.estimatePerformance(testParams, performanceHistory);
        const score = this.calculateOverallScore(estimatedPerformance);
        
        if (score > bestScore) {
          bestScore = score;
          bestParams[paramName] = candidate;
        }
      }
    }

    const currentScore = this.calculateOverallScore(performanceHistory[performanceHistory.length - 1]?.performance);
    const improvement = currentScore > 0 ? (bestScore - currentScore) / currentScore : 0;
    
    return {
      newParams: bestParams,
      expectedImprovement: improvement,
      confidence: 0.7
    };
  }

  private generateCandidates(current: number, range: ParameterRange, count: number): number[] {
    const candidates: number[] = [];
    const step = range.step;
    const halfRange = step * Math.floor(count / 2);
    
    for (let i = -halfRange; i <= halfRange; i += step) {
      const candidate = current + i;
      if (candidate >= range.min && candidate <= range.max) {
        if (range.type === 'integer') {
          candidates.push(Math.round(candidate));
        } else {
          candidates.push(Number(candidate.toFixed(4)));
        }
      }
    }
    
    return candidates;
  }
  private estimatePerformance(params: Record<string, any>, history: OptimizationRecord[]): PerformanceMetrics {
    if (history.length === 0) {
      return this.getDefaultPerformance();
    }

    const recent = history.slice(-5);
    const avgPerformance = this.averagePerformance(recent.map(r => r.performance));
    
    const adjustmentFactor = this.calculateParameterImpact(params, recent);
    
    return {
      totalReturn: avgPerformance.totalReturn * adjustmentFactor,
      sharpeRatio: avgPerformance.sharpeRatio * adjustmentFactor,
      maxDrawdown: avgPerformance.maxDrawdown / adjustmentFactor,
      winRate: Math.min(0.95, avgPerformance.winRate * adjustmentFactor),
      profitFactor: avgPerformance.profitFactor * adjustmentFactor,
      averageTrade: avgPerformance.averageTrade * adjustmentFactor,
      tradeCount: avgPerformance.tradeCount,
      volatility: avgPerformance.volatility,
      calmarRatio: avgPerformance.calmarRatio * adjustmentFactor,
      sortinoRatio: avgPerformance.sortinoRatio * adjustmentFactor
    };
  }
  private calculateOverallScore(performance: PerformanceMetrics): number {
    if (!performance) return 0;
    
    const returnWeight = 0.3;
    const sharpeWeight = 0.25;
    const drawdownWeight = 0.2;
    const winRateWeight = 0.15;
    const stabilityWeight = 0.1;
    
    const returnScore = Math.max(0, performance.totalReturn * 10);
    const sharpeScore = Math.max(0, performance.sharpeRatio * 20);
    const drawdownScore = Math.max(0, (0.5 - performance.maxDrawdown) * 20);
    const winRateScore = performance.winRate * 100;
    const stabilityScore = Math.max(0, (2 - performance.volatility) * 50);
    
    return (
      returnScore * returnWeight +
      sharpeScore * sharpeWeight +
      drawdownScore * drawdownWeight +
      winRateScore * winRateWeight +
      stabilityScore * stabilityWeight
    );
  }

  private getDefaultPerformance(): PerformanceMetrics {
    return {
      totalReturn: 0.1,
      sharpeRatio: 1.0,
      maxDrawdown: 0.1,
      winRate: 0.6,
      profitFactor: 1.5,
      averageTrade: 0.02,
      tradeCount: 100,
      volatility: 0.2,
      calmarRatio: 1.0,
      sortinoRatio: 1.2
    };
  }

  private averagePerformance(performances: PerformanceMetrics[]): PerformanceMetrics {
    const count = performances.length;
    if (count === 0) return this.getDefaultPerformance();
    
    return {
      totalReturn: performances.reduce((sum, p) => sum + p.totalReturn, 0) / count,
      sharpeRatio: performances.reduce((sum, p) => sum + p.sharpeRatio, 0) / count,
      maxDrawdown: performances.reduce((sum, p) => sum + p.maxDrawdown, 0) / count,
      winRate: performances.reduce((sum, p) => sum + p.winRate, 0) / count,
      profitFactor: performances.reduce((sum, p) => sum + p.profitFactor, 0) / count,
      averageTrade: performances.reduce((sum, p) => sum + p.averageTrade, 0) / count,
      tradeCount: performances.reduce((sum, p) => sum + p.tradeCount, 0) / count,
      volatility: performances.reduce((sum, p) => sum + p.volatility, 0) / count,
      calmarRatio: performances.reduce((sum, p) => sum + p.calmarRatio, 0) / count,
      sortinoRatio: performances.reduce((sum, p) => sum + p.sortinoRatio, 0) / count
    };
  }

  private calculateParameterImpact(params: Record<string, any>, history: OptimizationRecord[]): number {
    // 简化的参数影响计算
    let impactScore = 1.0;
    
    // 基于历史优化记录评估参数影响
    for (const record of history.slice(-3)) {
      const similarity = this.calculateParameterSimilarity(params, record.parameters);
      const performanceImpact = record.improvement;
      impactScore += similarity * performanceImpact * 0.1;
    }
    
    return Math.max(0.5, Math.min(1.5, impactScore));
  }

  private calculateParameterSimilarity(params1: Record<string, any>, params2: Record<string, any>): number {
    const keys = new Set([...Object.keys(params1), ...Object.keys(params2)]);
    let similarity = 0;
    for (const key of keys) {
      const val1 = params1[key] || 0;
      const val2 = params2[key] || 0;
      const diff = Math.abs(val1 - val2) / Math.max(Math.abs(val1), Math.abs(val2), 1);
      similarity += (1 - diff);
    }
    
    return similarity / keys.size;
  }
}

/**
 * 遗传算法优化器
 */
class GeneticOptimizer implements OptimizationAlgorithm {
  name = 'Genetic';
  private populationSize = 20;
  private generations = 10;
  private mutationRate = 0.1;
  private crossoverRate = 0.8;

  async optimize(
    currentParams: Record<string, any>,
    paramRanges: ParameterDefinition,
    performanceHistory: OptimizationRecord[]
  ): Promise<{
    newParams: Record<string, any>;
    expectedImprovement: number;
    confidence: number;
  }> {
    const paramNames = Object.keys(paramRanges);
    
    // 初始化种群
    let population = this.initializePopulation(currentParams, paramRanges, paramNames);
    
    // 进化过程
    for (let gen = 0; gen < this.generations; gen++) {
      // 评估适应度
      const fitness = population.map(individual => 
        this.evaluateFitness(individual, performanceHistory)
      );
      
      // 选择
      const parents = this.selection(population, fitness);
      
      // 交叉
      const offspring = this.crossover(parents, paramRanges, paramNames);
      
      // 变异
      this.mutation(offspring, paramRanges, paramNames);
      
      // 替换
      population = this.replacement(population, offspring, fitness);
    }

    // 返回最优个体
    const finalFitness = population.map(individual => 
      this.evaluateFitness(individual, performanceHistory)
    );
    const bestIndex = finalFitness.indexOf(Math.max(...finalFitness));
    const bestParams = population[bestIndex];

    return {
      newParams: bestParams,
      expectedImprovement: 0.12,
      confidence: 0.75
    };
  }

  private initializePopulation(
    currentParams: Record<string, any>,
    paramRanges: ParameterDefinition,
    paramNames: string[]
  ): Record<string, any>[] {
    const population: Record<string, any>[] = [];
    
    // 添加当前参数作为种群中的一个个体
    population.push({ ...currentParams });
    
    // 随机生成其他个体
    for (let i = 1; i < this.populationSize; i++) {
      const individual: Record<string, any> = {};
      
      for (const paramName of paramNames) {
        const range = paramRanges[paramName];
        const randomValue = range.min + Math.random() * (range.max - range.min);
        
        if (range.type === 'integer') {
          individual[paramName] = Math.round(randomValue);
        } else {
          individual[paramName] = Number(randomValue.toFixed(4));
        }
      }
      
      population.push(individual);
    }
    
    return population;
  }

  private evaluateFitness(individual: Record<string, any>, history: OptimizationRecord[]): number {
    // 基于历史数据估计个体的适应度
    if (history.length === 0) return Math.random() * 50 + 25;
    
    let fitness = 0;
    let weightSum = 0;
    
    for (let i = 0; i < history.length; i++) {
      const record = history[i];
      const similarity = this.calculateParameterSimilarity(individual, record.parameters);
      const weight = Math.exp(-((history.length - i) / history.length) * 2); // 更重视近期数据
      fitness += similarity * this.calculateScore(record.performance) * weight;
      weightSum += weight;
    }
    
    return weightSum > 0 ? fitness / weightSum : 25;
  }

  private selection(population: Record<string, any>[], fitness: number[]): Record<string, any>[] {
    // 锦标赛选择
    const parents: Record<string, any>[] = [];
    const tournamentSize = 3;
    
    for (let i = 0; i < population.length; i++) {
      const tournament: { individual: Record<string, any>; fitness: number }[] = [];
      
      for (let j = 0; j < tournamentSize; j++) {
        const randomIndex = Math.floor(Math.random() * population.length);
        tournament.push({
          individual: population[randomIndex],
          fitness: fitness[randomIndex]
        });
      }
      
      tournament.sort((a, b) => b.fitness - a.fitness);
      parents.push({ ...tournament[0].individual });
    }
    
    return parents;
  }

  private crossover(
    parents: Record<string, any>[],
    paramRanges: ParameterDefinition,
    paramNames: string[]
  ): Record<string, any>[] {
    const offspring: Record<string, any>[] = [];
    
    for (let i = 0; i < parents.length; i += 2) {
      const parent1 = parents[i];
      const parent2 = parents[i + 1] || parents[0];
      
      if (Math.random() < this.crossoverRate) {
        const child1: Record<string, any> = {};
        const child2: Record<string, any> = {};
        
        for (const paramName of paramNames) {
          if (Math.random() < 0.5) {
            child1[paramName] = parent1[paramName];
            child2[paramName] = parent2[paramName];
          } else {
            child1[paramName] = parent2[paramName];
            child2[paramName] = parent1[paramName];
          }
        }
        
        offspring.push(child1);
        if (offspring.length < parents.length) {
          offspring.push(child2);
        }
      } else {
        offspring.push({ ...parent1 });
        if (offspring.length < parents.length) {
          offspring.push({ ...parent2 });
        }
      }
    }
    
    return offspring;
  }

  private mutation(
    offspring: Record<string, any>[],
    paramRanges: ParameterDefinition,
    paramNames: string[]
  ): void {
    for (const individual of offspring) {
      for (const paramName of paramNames) {
        if (Math.random() < this.mutationRate) {
          const range = paramRanges[paramName];
          const currentValue = individual[paramName];
          const mutationStrength = (range.max - range.min) * 0.1;
          const mutation = (Math.random() - 0.5) * mutationStrength;
          
          let newValue = currentValue + mutation;
          newValue = Math.max(range.min, Math.min(range.max, newValue));
          
          if (range.type === 'integer') {
            individual[paramName] = Math.round(newValue);
          } else {
            individual[paramName] = Number(newValue.toFixed(4));
          }
        }
      }
    }
  }

  private replacement(
    population: Record<string, any>[],
    offspring: Record<string, any>[],
    fitness: number[]
  ): Record<string, any>[] {
    // 精英保留策略
    const combined = [...population, ...offspring];
    const combinedFitness = [
      ...fitness,
      ...offspring.map(individual => this.evaluateFitness(individual, []))
    ];
    
    const indexed = combined.map((individual, index) => ({
      individual,
      fitness: combinedFitness[index]
    }));
    
    indexed.sort((a, b) => b.fitness - a.fitness);
    
    return indexed.slice(0, this.populationSize).map(item => item.individual);
  }

  private calculateParameterSimilarity(params1: Record<string, any>, params2: Record<string, any>): number {
    const keys = new Set([...Object.keys(params1), ...Object.keys(params2)]);
    let similarity = 0;
    
    for (const key of keys) {
      const val1 = params1[key] || 0;
      const val2 = params2[key] || 0;
      const maxVal = Math.max(Math.abs(val1), Math.abs(val2), 1);
      const diff = Math.abs(val1 - val2) / maxVal;
      similarity += (1 - diff);
    }
    
    return similarity / keys.size;
  }

  private calculateScore(performance: PerformanceMetrics): number {
    return performance.sharpeRatio * 20 + performance.totalReturn * 100 - performance.maxDrawdown * 50;
  }
}

/**
 * 动态参数调整器
 * 实现策略参数的自动优化与调整
 * @class DynamicParameterAdjuster
 */
export class DynamicParameterAdjuster {
  private config: DynamicParameterConfig;
  private optimizers = new Map<string, OptimizationAlgorithm>();
  private optimizationHistory: OptimizationRecord[] = [];
  private parameterDefinitions: ParameterDefinition = {};
  private lastOptimizationTime = 0;

  constructor(config: DynamicParameterConfig) {
    this.config = config;
    this.initializeOptimizers();
    this.setupDefaultParameterDefinitions();
  }

  /**
   * 初始化优化算法
   */
  private initializeOptimizers(): void {
    this.optimizers.set('grid', new GridSearchOptimizer());
    this.optimizers.set('genetic', new GeneticOptimizer());
  }

  /**
   * 设置默认参数定义
   */
  private setupDefaultParameterDefinitions(): void {
    this.parameterDefinitions = {
      stopLossPercent: {
        min: 0.01,
        max: 0.20,
        step: 0.005,
        type: 'percentage',
        description: '止损百分比'
      },
      takeProfitPercent: {
        min: 0.02,
        max: 0.50,
        step: 0.01,
        type: 'percentage',
        description: '止盈百分比'
      },
      maxPositionSize: {
        min: 0.05,
        max: 0.50,
        step: 0.05,
        type: 'percentage',
        description: '最大仓位比例'
      },
      rsiPeriod: {
        min: 5,
        max: 30,
        step: 1,
        type: 'integer',
        description: 'RSI周期'
      },
      maPeriodShort: {
        min: 5,
        max: 20,
        step: 1,
        type: 'integer',
        description: '短期移动平均周期'
      },
      maPeriodLong: {
        min: 20,
        max: 100,
        step: 5,
        type: 'integer',
        description: '长期移动平均周期'
      },
      volatilityThreshold: {
        min: 0.01,
        max: 0.10,
        step: 0.005,
        type: 'percentage',
        description: '波动率阈值'
      },
      confidenceThreshold: {
        min: 0.3,
        max: 0.9,
        step: 0.05,
        type: 'float',
        description: '信号置信度阈值'
      }
    };
  }

  /**
   * 执行参数优化
   * @param currentParams 当前参数
   * @param recentPerformance 近期性能指标
   * @param optimizationType 优化算法类型
   * @returns 优化结果
   */
  async optimizeParameters(
    currentParams: Record<string, any>,
    recentPerformance: PerformanceMetrics,
    optimizationType: 'grid' | 'genetic' = 'genetic'
  ): Promise<StrategyOptimizationResult> {
    if (!this.config.enabled) {
      throw new Error('动态参数调整已禁用');
    }

    const now = Date.now();
    const optimizationInterval = this.config.adjustmentFrequency * 60 * 60 * 1000;
    
    if (now - this.lastOptimizationTime < optimizationInterval) {
      return this.createNoChangeResult(currentParams, recentPerformance);
    }

    try {
      // 检查性能是否需要优化
      if (recentPerformance.sharpeRatio >= this.config.minPerformanceThreshold) {
        return this.createNoChangeResult(currentParams, recentPerformance);
      }

      // 选择优化算法
      const optimizer = this.optimizers.get(optimizationType);
      if (!optimizer) {
        throw new Error(`未知的优化算法: ${optimizationType}`);
      }

      // 过滤可调整的参数
      const adjustableParams = this.filterAdjustableParameters(currentParams);
      const adjustableParamDefs = this.getAdjustableParameterDefinitions();

      // 执行优化
      const optimizationResult = await optimizer.optimize(
        adjustableParams,
        adjustableParamDefs,
        this.optimizationHistory
      );

      // 评估优化结果
      const shouldApply = this.evaluateOptimizationResult(
        optimizationResult,
        recentPerformance
      );

      // 记录优化历史
      const record: OptimizationRecord = {
        timestamp: now,
        parameters: optimizationResult.newParams,
        performance: recentPerformance,
        optimizationType,
        improvement: optimizationResult.expectedImprovement,
        confidence: optimizationResult.confidence
      };
      
      this.optimizationHistory.push(record);
      this.lastOptimizationTime = now;
      // 限制历史记录大小
      if (this.optimizationHistory.length > 100) {
        this.optimizationHistory = this.optimizationHistory.slice(-80);
      }

      return {
        optimizationType: 'PARAMETER_TUNING',
        beforePerformance: {
          returns: recentPerformance.totalReturn,
          sharpeRatio: recentPerformance.sharpeRatio,
          maxDrawdown: recentPerformance.maxDrawdown
        },
        afterPerformance: {
          returns: recentPerformance.totalReturn * (1 + optimizationResult.expectedImprovement),
          sharpeRatio: recentPerformance.sharpeRatio * (1 + optimizationResult.expectedImprovement * 0.5),
          maxDrawdown: recentPerformance.maxDrawdown * (1 - optimizationResult.expectedImprovement * 0.3)
        },
        adjustedParameters: optimizationResult.newParams,
        optimizationTime: now,
        shouldApply,
        recommendations: this.generateRecommendations(optimizationResult, recentPerformance)
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * 过滤可调整的参数
   */
  private filterAdjustableParameters(params: Record<string, any>): Record<string, any> {
    const adjustable: Record<string, any> = {};
    for (const paramName of this.config.adjustableParameters) {
      if (Object.prototype.hasOwnProperty.call(params, paramName)) {
        adjustable[paramName] = params[paramName];
      }
    }
    
    return adjustable;
  }

  /**
   * 获取可调整参数的定义
   */
  private getAdjustableParameterDefinitions(): ParameterDefinition {
    const adjustable: ParameterDefinition = {};
    
    for (const paramName of this.config.adjustableParameters) {
      if (Object.prototype.hasOwnProperty.call(this.parameterDefinitions, paramName)) {
        adjustable[paramName] = this.parameterDefinitions[paramName];
      }
    }
    
    return adjustable;
  }

  /**
   * 评估优化结果
   */
  private evaluateOptimizationResult(
    result: { newParams: Record<string, any>; expectedImprovement: number; confidence: number },
    currentPerformance: PerformanceMetrics
  ): boolean {
    // 检查期望改进是否足够大
    if (result.expectedImprovement < 0.05) { // 5%最小改进阈值
      return false;
    }

    // 检查置信度是否足够高
    if (result.confidence < 0.6) {
      return false;
    }

    // 检查参数变化是否合理
    const paramChanges = this.calculateParameterChanges(result.newParams);
    if (paramChanges > this.config.adjustmentMagnitude) {
      return false;
    }

    return true;
  }

  /**
   * 计算参数变化幅度
   */
  private calculateParameterChanges(newParams: Record<string, any>): number {
    const lastRecord = this.optimizationHistory[this.optimizationHistory.length - 1];
    if (!lastRecord) return 0;

    let totalChange = 0;
    let paramCount = 0;

    for (const [key, newValue] of Object.entries(newParams)) {
      const oldValue = lastRecord.parameters[key];
      if (oldValue !== undefined) {
        const change = Math.abs(newValue - oldValue) / Math.abs(oldValue || 1);
        totalChange += change;
        paramCount++;
      }
    }

    return paramCount > 0 ? totalChange / paramCount : 0;
  }

  /**
   * 生成优化建议
   * @param result 优化结果
   * @param performance 当前性能
   * @returns 建议数组
   */
  private generateRecommendations(
    result: { newParams: Record<string, any>; expectedImprovement: number; confidence: number },
    performance: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (performance.sharpeRatio < 0.5) {
      recommendations.push('当前夏普比率偏低，建议降低风险或提高收益');
    }

    if (performance.maxDrawdown > 0.2) {
      recommendations.push('最大回撤过大，建议加强风险控制');
    }

    if (performance.winRate < 0.4) {
      recommendations.push('胜率偏低，建议优化入场条件');
    }
    if (result.expectedImprovement > 0.15) {
      recommendations.push('预期改进显著，建议采用新参数');
    } else if (result.expectedImprovement < 0.08) {
      recommendations.push('预期改进有限，建议谨慎使用新参数');
    }

    if (result.confidence < 0.7) {
      recommendations.push('优化置信度较低，建议收集更多数据后再次优化');
    }

    return recommendations;
  }

  /**
   * 创建无变化结果
   */
  private createNoChangeResult(
    currentParams: Record<string, any>,
    performance: PerformanceMetrics
  ): StrategyOptimizationResult {
    return {
      optimizationType: 'PARAMETER_TUNING',
      beforePerformance: {
        returns: performance.totalReturn,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown
      },
      afterPerformance: {
        returns: performance.totalReturn,
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown
      },
      adjustedParameters: currentParams,
      optimizationTime: Date.now(),
      shouldApply: false,
      recommendations: ['当前参数表现良好，暂无需调整']
    };
  }

  /**
   * 设置参数定义
   */
  setParameterDefinitions(definitions: ParameterDefinition): void {
    this.parameterDefinitions = { ...this.parameterDefinitions, ...definitions };
  }

  /**
   * 获取优化历史
   */
  getOptimizationHistory(): OptimizationRecord[] {
    return [...this.optimizationHistory];
  }

  /**
   * 获取参数定义
   */
  getParameterDefinitions(): ParameterDefinition {
    return { ...this.parameterDefinitions };
  }

  /**
   * 清除优化历史
   */
  clearHistory(): void {
    this.optimizationHistory = [];
    this.lastOptimizationTime = 0;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DynamicParameterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}