/**
 * AI量化交易系统工具函数模块
 * 包含数学计算、日期处理、数据验证、格式化等工具函数
 */

import { Kline, Price, Volume } from '../types';

// ============= 数学计算工具 =============

/**
 * 数学计算工具类
 */
export class MathUtils {
  /**
   * 计算简单移动平均线
   * @param values 数值数组
   * @param period 周期
   * @returns 移动平均线数组
   */
  static sma(values: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = period - 1; i < values.length; i++) {
      const slice = values.slice(i - period + 1, i + 1);
      const average = slice.reduce((sum, val) => sum + val, 0) / period;
      result.push(average);
    }
    
    return result;
  }

  /**
   * 计算指数移动平均线
   * @param values 数值数组
   * @param period 周期
   * @returns 指数移动平均线数组
   */
  static ema(values: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // 第一个值使用SMA
    result[0] = values[0];
    
    for (let i = 1; i < values.length; i++) {
      const ema = (values[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
    
    return result;
  }

  /**
   * 计算标准差
   * @param values 数值数组
   * @returns 标准差
   */
  static standardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * 计算最大回撤
   * @param equityValues 资金曲线
   * @returns 最大回撤百分比
   */
  static maxDrawdown(equityValues: number[]): number {
    let maxDrawdown = 0;
    let peak = equityValues[0];

    for (const value of equityValues) {
      if (value > peak) {
        peak = value;
      }
      
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * 计算夏普比率
   * @param returns 收益率数组
   * @param riskFreeRate 无风险利率
   * @returns 夏普比率
   */
  static sharpeRatio(returns: number[], riskFreeRate: number = 0): number {
    const excessReturns = returns.map(r => r - riskFreeRate);
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const stdDev = this.standardDeviation(excessReturns);
    
    return stdDev === 0 ? 0 : meanExcessReturn / stdDev;
  }

  /**
   * 计算RSI
   */
  static rsi(data: number[], period: number = 14): number[] {
    if (data.length < period + 1) return [];
    
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // 计算价格变化
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // 计算RSI
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = this.average(gains.slice(i - period + 1, i + 1));
      const avgLoss = this.average(losses.slice(i - period + 1, i + 1));
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
    
    return result;
  }

  /**
   * 计算平均值
   */
  static average(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, value) => sum + value, 0) / data.length;
  }

  /**
   * 数组减法
   */
  static subtract(a: number[], b: number[]): number[] {
    const length = Math.min(a.length, b.length);
    const result: number[] = [];
    
    for (let i = 0; i < length; i++) {
      result.push(a[i] - b[i]);
    }
    
    return result;
  }

  /**
   * 计算百分位数
   */
  static percentile(data: number[], percentile: number): number {
    if (data.length === 0) return 0;
    
    const sorted = [...data].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Math.floor(index) === index) {
      return sorted[index];
    }
    
    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    const weight = index - Math.floor(index);
    
    return lower * (1 - weight) + upper * weight;
  }

  /**
   * 计算相关系数
   */
  static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 计算最大值
   */
  static max(data: number[]): number {
    return data.length === 0 ? 0 : Math.max(...data);
  }

  /**
   * 计算最小值
   */
  static min(data: number[]): number {
    return data.length === 0 ? 0 : Math.min(...data);
  }

  /**
   * 数组求和
   */
  static sum(data: number[]): number {
    return data.reduce((sum, value) => sum + value, 0);
  }

  /**
   * 计算变化率
   */
  static changeRate(current: number, previous: number): number {
    if (previous === 0) return 0;
    return (current - previous) / previous;
  }

  /**
   * 计算波动率
   */
  static volatility(data: number[], period: number = 20): number {
    if (data.length < period) return 0;
    
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push(this.changeRate(data[i], data[i - 1]));
    }
    
    const recentReturns = returns.slice(-period);
    return this.standardDeviation(recentReturns);
  }
}
// ============= 日期时间工具 =============

/**
 * 日期时间工具类
 */
export class DateUtils {
  /**
   * 格式化时间戳为日期字符串
   * @param timestamp 时间戳
   * @param format 格式字符串
   * @returns 格式化后的日期字符串
   */
  static formatTimestamp(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const date = new Date(timestamp);
    
    const formatMap: Record<string, string> = {
      'YYYY': date.getFullYear().toString(),
      'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
      'DD': date.getDate().toString().padStart(2, '0'),
      'HH': date.getHours().toString().padStart(2, '0'),
      'mm': date.getMinutes().toString().padStart(2, '0'),
      'ss': date.getSeconds().toString().padStart(2, '0')
    };
    
    let result = format;
    Object.entries(formatMap).forEach(([key, value]) => {
      result = result.replace(key, value);
    });
    
    return result;
  }

  /**
   * 获取交易日判断
   * @param date 日期
   * @returns 是否为交易日
   */
  static isTradingDay(date: Date): boolean {
    const day = date.getDay();
    // 周一到周五为交易日
    return day >= 1 && day <= 5;
  }

  /**
   * 获取时间间隔的毫秒数
   * @param interval 时间间隔字符串 (如: '1m', '5m', '1h', '1d')
   * @returns 毫秒数
   */
  static getIntervalMs(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    
    const multipliers: Record<string, number> = {
      's': 1000,           // 秒
      'm': 60 * 1000,      // 分钟
      'h': 60 * 60 * 1000, // 小时
      'd': 24 * 60 * 60 * 1000, // 天
      'w': 7 * 24 * 60 * 60 * 1000, // 周
    };
    
    return value * (multipliers[unit] || 1000);
  }

  /**
   * 获取今天开始时间
   */
  static getTodayStart(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }

  /**
   * 获取今天结束时间
   */
  static getTodayEnd(): number {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today.getTime();
  }

  /**
   * 获取N天前的时间
   */
  static getDaysAgo(days: number): number {
    return Date.now() - (days * 24 * 60 * 60 * 1000);
  }

  /**
   * 获取N小时前的时间
   */
  static getHoursAgo(hours: number): number {
    return Date.now() - (hours * 60 * 60 * 1000);
  }

  /**
   * 检查是否在时间范围内
   */
  static isInTimeRange(timestamp: number, startTime: string, endTime: string): boolean {
    const date = new Date(timestamp);
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    if (startTime <= endTime) {
      return timeStr >= startTime && timeStr <= endTime;
    } else {
      // 跨日情况
      return timeStr >= startTime || timeStr <= endTime;
    }
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 获取时间戳的可读格式
   */
  static getReadableTime(timestamp: number): string {
    return this.formatTimestamp(timestamp, 'MM-DD HH:mm');
  }
}
// ============= 数据验证工具 =============

/**
 * 数据验证工具类
 */
export class ValidationUtils {
  /**
   * 验证K线数据的完整性
   * @param klines K线数组
   * @returns 验证结果
   */
  static validateKlines(klines: Kline[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(klines) || klines.length === 0) {
      errors.push('K线数据为空或格式错误');
      return { isValid: false, errors, warnings };
    }

    klines.forEach((kline, index) => {
      // 检查必要字段
      if (!kline.symbol) errors.push(`第${index + 1}条K线缺少symbol字段`);
      if (!kline.openTime) errors.push(`第${index + 1}条K线缺少openTime字段`);
      if (typeof kline.open !== 'number') errors.push(`第${index + 1}条K线open字段类型错误`);
      if (typeof kline.high !== 'number') errors.push(`第${index + 1}条K线high字段类型错误`);
      if (typeof kline.low !== 'number') errors.push(`第${index + 1}条K线low字段类型错误`);
      if (typeof kline.close !== 'number') errors.push(`第${index + 1}条K线close字段类型错误`);
      if (typeof kline.volume !== 'number') errors.push(`第${index + 1}条K线volume字段类型错误`);

      // 检查价格逻辑
      if (kline.high < kline.low) {
        errors.push(`第${index + 1}条K线最高价小于最低价`);
      }
      
      // 检查成交量
      if (kline.volume < 0) {
        errors.push(`第${index + 1}条K线成交量为负数`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证价格范围
   * @param price 价格
   * @param min 最小值
   * @param max 最大值
   * @returns 是否有效
   */
  static isValidPrice(price: Price, min: number = 0, max: number = Infinity): boolean {
    return typeof price === 'number' && 
           !isNaN(price) && 
           isFinite(price) && 
           price >= min && 
           price <= max;
  }

  /**
   * 验证交易对符号格式
   * @param symbol 交易对符号
   * @returns 是否有效
   */
  static isValidSymbol(symbol: string): boolean {
    const symbolRegex = /^[A-Z0-9]+[\/\-_]?[A-Z0-9]*$/i;
    return typeof symbol === 'string' && 
           symbol.length >= 2 && 
           symbolRegex.test(symbol);
  }

  /**
   * 验证价格数据
   */
  static validatePrice(price: number): boolean {
    return typeof price === 'number' && price > 0 && isFinite(price);
  }

  /**
   * 验证数组数据
   */
  static validateArray(data: any[], minLength: number = 1): boolean {
    return Array.isArray(data) && data.length >= minLength;
  }

  /**
   * 验证百分比
   */
  static validatePercentage(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 1;
  }

  /**
   * 验证交易品种
   */
  static validateSymbol(symbol: string): boolean {
    return typeof symbol === 'string' && symbol.length > 0 && /^[A-Z0-9]+$/.test(symbol);
  }

  /**
   * 验证时间戳
   */
  static validateTimestamp(timestamp: number): boolean {
    return typeof timestamp === 'number' && timestamp > 0 && timestamp <= Date.now() + 86400000; // 不能超过未来24小时
  }
}
// ============= 格式化工具 =============

/**
 * 格式化工具类
 */
export class FormatUtils {
  /**
   * 格式化价格
   * @param price 价格
   * @param precision 精度
   * @returns 格式化后的价格字符串
   */
  static formatPrice(price: Price, precision: number = 2): string {
    if (typeof price !== 'number' || isNaN(price)) {
      return '0.00';
    }
    return price.toFixed(precision);
  }

  /**
   * 格式化成交量
   * @param volume 成交量
   * @returns 格式化后的成交量字符串
   */
  static formatVolume(volume: Volume): string {
    if (typeof volume !== 'number' || isNaN(volume)) {
      return '0';
    }
    
    if (volume >= 1e9) {
      return (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
      return (volume / 1e6).toFixed(2) + 'M';
    } else if (volume >= 1e3) {
      return (volume / 1e3).toFixed(2) + 'K';
    }
    
    return volume.toFixed(0);
  }

  /**
   * 格式化百分比
   * @param value 数值
   * @param precision 精度
   * @returns 格式化后的百分比字符串
   */
  static formatPercentage(value: number, precision: number = 2): string {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0.00%';
    }
    return (value * 100).toFixed(precision) + '%';
  }
}

// ============= 错误处理工具 =============

/**
 * 错误处理工具类
 */
export class ErrorUtils {
  /**
   * 安全执行异步函数
   * @param fn 异步函数
   * @param defaultValue 默认返回值
   * @returns 执行结果或默认值
   */
  static async safeExecute<T>(
    fn: () => Promise<T>, 
    defaultValue: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      console.error('函数执行失败:', error);
      return defaultValue;
    }
  }

  /**
   * 重试执行函数
   * @param fn 要执行的函数
   * @param maxRetries 最大重试次数
   * @param delay 重试延迟
   * @returns 执行结果
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // 指数退避
        }
      }
    }
    
    throw lastError!;
  }
}

// ============= 缓存工具 =============

/**
 * 简单的内存缓存类
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) { // 默认1分钟
    this.defaultTTL = defaultTTL;
  }

  /**
   * 设置缓存
   * @param key 键
   * @param value 值
   * @param ttl 生存时间（毫秒）
   */
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * 获取缓存
   * @param key 键
   * @returns 缓存值或undefined
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

// 导出所有工具类
export {
  MathUtils,
  DateUtils,
  ValidationUtils,
  FormatUtils,
  ErrorUtils,
  SimpleCache
};