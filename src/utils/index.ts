/**
 * 工具函数模块
 * 统一导出所有工具类和函数
 */

// 日志工具
export { 
  Logger, 
  LogLevel, 
  logger, 
  createLogger,
  logPerformance,
  trackErrors 
} from './logger';

// 数学工具
export class MathUtils {
  /**
   * 计算移动平均
   */
  static movingAverage(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  /**
   * 计算标准差
   */
  static standardDeviation(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * 计算RSI
   */
  static calculateRSI(prices: number[], period: number = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi: number[] = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  }

  /**
   * 计算布林带
   */
  static calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2) {
    const sma = this.movingAverage(prices, period);
    const bands = [];
    
    for (let i = 0; i < sma.length; i++) {
      const slice = prices.slice(i, i + period);
      const std = this.standardDeviation(slice);
      
      bands.push({
        upper: sma[i] + (std * multiplier),
        middle: sma[i],
        lower: sma[i] - (std * multiplier)
      });
    }
    
    return bands;
  }
}

// 日期工具
export class DateUtils {
  /**
   * 格式化日期
   */
  static formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 获取时间戳
   */
  static getTimestamp(date?: Date): number {
    return (date || new Date()).getTime();
  }

  /**
   * 时间差计算
   */
  static timeDiff(start: Date, end: Date): number {
    return end.getTime() - start.getTime();
  }

  /**
   * 时间戳转日期
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * 获取交易日
   */
  static isTradeDay(date: Date): boolean {
    const day = date.getDay();
    return day >= 1 && day <= 5; // 周一到周五
  }

  /**
   * 检查是否为交易时间
   */
  static isTradingTime(date: Date = new Date()): boolean {
    const day = date.getDay();
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    // 周末不交易
    if (day === 0 || day === 6) return false;
    
    // A股交易时间: 9:30-11:30, 13:00-15:00
    const morningStart = 9 * 60 + 30; // 9:30
    const morningEnd = 11 * 60 + 30;  // 11:30
    const afternoonStart = 13 * 60;   // 13:00
    const afternoonEnd = 15 * 60;     // 15:00
    const currentMinutes = hour * 60 + minute;
    
    return (currentMinutes >= morningStart && currentMinutes <= morningEnd) ||
           (currentMinutes >= afternoonStart && currentMinutes <= afternoonEnd);
  }
}

// 验证工具
export class ValidationUtils {
  /**
   * 验证股票代码
   */
  static isValidStockCode(code: string): boolean {
    // A股代码格式验证
    const aSharePattern = /^(sh|sz)?\d{6}$/i;
    // 美股代码格式验证
    const usStockPattern = /^[A-Z]{1,5}$/;
    // 加密货币对格式验证
    const cryptoPattern = /^[A-Z]{3,10}USDT?$/;
    
    return aSharePattern.test(code) || usStockPattern.test(code) || cryptoPattern.test(code);
  }

  /**
   * 验证加密货币交易对
   */
  static isValidCryptoPair(pair: string): boolean {
    return /^[A-Z]{3,10}USDT?$/.test(pair);
  }

  /**
   * 验证价格
   */
  static isValidPrice(price: number): boolean {
    return typeof price === 'number' && price > 0 && isFinite(price);
  }

  /**
   * 验证数量
   */
  static isValidQuantity(quantity: number): boolean {
    return typeof quantity === 'number' && quantity > 0 && isFinite(quantity);
  }

  /**
   * 验证数字范围
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * 验证邮箱
   */
  static isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  /**
   * 验证URL
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// 字符串工具
export class StringUtils {
  /**
   * 首字母大写
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 驼峰转下划线
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 下划线转驼峰
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 格式化数字为货币
   */
  static formatCurrency(amount: number, currency: string = 'CNY'): string {
    const symbol = currency === 'CNY' ? '¥' : '$';
    return `${symbol}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * 截断字符串
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }
}

// 重新导出常用工具
export const Utils = {
  Math: MathUtils,
  Date: DateUtils,
  Validation: ValidationUtils,
  String: StringUtils
};

// 默认导出
export default {
  MathUtils,
  DateUtils,
  ValidationUtils,
  StringUtils,
  createLogger,
  logger
};