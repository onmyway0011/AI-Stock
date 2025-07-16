// 常用工具类

export class DateUtils {
  static formatTimestamp(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  }
}

export class FormatUtils {
  static formatPrice(price: number): string {
    return price.toFixed(2);
  }
  static formatCurrency(amount: number): string {
    return '¥' + amount.toFixed(2);
  }
  static formatPercentage(value: number): string {
    return (value * 100).toFixed(2) + '%';
  }
  static formatVolume(volume: number): string {
    if (volume >= 1e8) return (volume / 1e8).toFixed(2) + '亿';
    if (volume >= 1e4) return (volume / 1e4).toFixed(2) + '万';
    return volume.toFixed(2);
  }
}

export class MathUtils {
  /**
   * 计算简单移动平均线（SMA）
   * @param values 数值数组
   * @param period 周期
   * @returns SMA 数组
   */
  static sma(values: number[], period: number): number[] {
    if (values.length < period) return [];
    const result: number[] = [];
    for (let i = 0; i <= values.length - period; i++) {
      const sum = values.slice(i, i + period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  /**
   * 计算指数移动平均线（EMA）
   * @param values 数值数组
   * @param period 周期
   * @returns EMA 数组
   */
  static ema(values: number[], period: number): number[] {
    if (values.length < period) return [];
    const k = 2 / (period + 1);
    const ema: number[] = [];
    let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(prev);
    for (let i = period; i < values.length; i++) {
      prev = values[i] * k + prev * (1 - k);
      ema.push(prev);
    }
    return ema;
  }

  /**
   * 计算标准差
   * @param values 数值数组
   * @returns 标准差
   */
  static standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * 计算最大回撤
   * @param values 权益数组
   * @returns 最大回撤百分比
   */
  static maxDrawdown(values: number[]): number {
    let max = values[0];
    let maxDrawdown = 0;
    for (const v of values) {
      if (v > max) max = v;
      const drawdown = (max - v) / max;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown;
  }

  /**
   * 计算夏普比率
   * @param returns 收益率数组
   * @param riskFreeRate 无风险利率，默认为0
   * @returns 夏普比率
   */
  static sharpeRatio(returns: number[], riskFreeRate = 0): number {
    if (returns.length === 0) return 0;
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = this.standardDeviation(returns);
    if (std === 0) return 0;
    return (avg - riskFreeRate) / std;
  }

  /**
   * 计算 RSI 指标
   * @param values 收盘价数组
   * @param period 周期
   * @returns RSI 数值
   */
  static rsi(values: number[], period: number = 14): number {
    if (values.length < period + 1) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = values.length - period; i < values.length; i++) {
      const change = values[i] - values[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * 计算两个数组的逐项差值
   * @param a 数组A
   * @param b 数组B
   * @returns 差值数组
   */
  static subtract(a: number[] | number, b: number[] | number): number[] {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((v, i) => v - (b[i] ?? 0));
    } else if (Array.isArray(a) && typeof b === 'number') {
      return a.map(v => v - b);
    } else if (typeof a === 'number' && Array.isArray(b)) {
      return b.map(v => a - v);
    } else if (typeof a === 'number' && typeof b === 'number') {
      return [a - b];
    }
    return [];
  }

  /**
   * 计算平均值
   * @param values 数值数组
   * @returns 平均值
   */
  static average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * 计算分位数
   * @param values 数值数组
   * @param percentile 百分位（如25表示25%）
   * @returns 分位数值
   */
  static percentile(values: number[], percentile: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor((percentile / 100) * sorted.length);
    return sorted[idx];
  }
}

export class ValidationUtils {
  /**
   * 校验K线数据格式
   * @param klines K线数组
   * @returns 是否有效
   */
  static validateKlines(klines: any[]): boolean {
    if (!Array.isArray(klines) || klines.length === 0) return false;
    return klines.every(k =>
      typeof k.openTime === 'number' &&
      typeof k.open === 'number' &&
      typeof k.high === 'number' &&
      typeof k.low === 'number' &&
      typeof k.close === 'number' &&
      typeof k.volume === 'number' &&
      typeof k.closeTime === 'number' &&
      typeof k.symbol === 'string'
    );
  }

  /**
   * 校验价格有效性
   * @param price 价格
   * @returns 是否有效
   */
  static isValidPrice(price: number): boolean {
    return typeof price === 'number' && isFinite(price) && price > 0;
  }

  /**
   * 校验交易对符号
   * @param symbol 交易对
   * @returns 是否有效
   */
  static isValidSymbol(symbol: string): boolean {
    return typeof symbol === 'string' && /^[A-Z0-9\-_/]+$/.test(symbol) && symbol.length >= 6;
  }
} 