/**
 * 工具函数单元测试
 */
import { 
  MathUtils, 
  DateUtils, 
  ValidationUtils, 
  FormatUtils,
  ErrorUtils,
  SimpleCache 
} from '../utils';
import { Kline } from '../types';

describe('MathUtils', () => {
  describe('sma', () => {
    it('应该正确计算简单移动平均线', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = MathUtils.sma(values, 3);
      
      expect(result).toHaveLength(8);
      expect(result[0]).toBeCloseTo(2); // (1+2+3)/3
      expect(result[1]).toBeCloseTo(3); // (2+3+4)/3
      expect(result[7]).toBeCloseTo(9); // (8+9+10)/3
    });

    it('当数据不足时应该返回空数组', () => {
      const values = [1, 2];
      const result = MathUtils.sma(values, 5);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('ema', () => {
    it('应该正确计算指数移动平均线', () => {
      const values = [1, 2, 3, 4, 5];
      const result = MathUtils.ema(values, 3);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(1); // 第一个值
      expect(result[1]).toBeGreaterThan(1);
      expect(result[4]).toBeGreaterThan(result[3]);
    });
  });

  describe('standardDeviation', () => {
    it('应该正确计算标准差', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const result = MathUtils.standardDeviation(values);
      
      expect(result).toBeCloseTo(2, 0);
    });

    it('相同值的标准差应该为0', () => {
      const values = [5, 5, 5, 5, 5];
      const result = MathUtils.standardDeviation(values);
      
      expect(result).toBe(0);
    });
  });

  describe('maxDrawdown', () => {
    it('应该正确计算最大回撤', () => {
      const equity = [100, 110, 120, 90, 95, 130];
      const result = MathUtils.maxDrawdown(equity);
      
      expect(result).toBeCloseTo(0.25); // 从120到90的回撤25%
    });
    it('单调递增序列的最大回撤应该为0', () => {
      const equity = [100, 110, 120, 130, 140];
      const result = MathUtils.maxDrawdown(equity);
      
      expect(result).toBe(0);
    });
  });

  describe('sharpeRatio', () => {
    it('应该正确计算夏普比率', () => {
      const returns = [0.1, 0.05, -0.02, 0.08, 0.03];
      const result = MathUtils.sharpeRatio(returns, 0.02);
      
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });
});

describe('DateUtils', () => {
  describe('formatTimestamp', () => {
    it('应该正确格式化时间戳', () => {
      const timestamp = new Date('2024-01-15 14:30:45').getTime();
      const result = DateUtils.formatTimestamp(timestamp);
      
      expect(result).toMatch(/2024-01-15 14:30:45/);
    });

    it('应该支持自定义格式', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = DateUtils.formatTimestamp(timestamp, 'YYYY/MM/DD');
      
      expect(result).toBe('2024/01/15');
    });
  });

  describe('isTradingDay', () => {
    it('工作日应该返回true', () => {
      const monday = new Date('2024-01-15'); // 周一
      const friday = new Date('2024-01-19'); // 周五
      expect(DateUtils.isTradingDay(monday)).toBe(true);
      expect(DateUtils.isTradingDay(friday)).toBe(true);
    });

    it('周末应该返回false', () => {
      const saturday = new Date('2024-01-13'); // 周六
      const sunday = new Date('2024-01-14'); // 周日
      
      expect(DateUtils.isTradingDay(saturday)).toBe(false);
      expect(DateUtils.isTradingDay(sunday)).toBe(false);
    });
  });

  describe('getIntervalMs', () => {
    it('应该正确转换时间间隔', () => {
      expect(DateUtils.getIntervalMs('1s')).toBe(1000);
      expect(DateUtils.getIntervalMs('1m')).toBe(60 * 1000);
      expect(DateUtils.getIntervalMs('1h')).toBe(60 * 60 * 1000);
      expect(DateUtils.getIntervalMs('1d')).toBe(24 * 60 * 60 * 1000);
    });
  });
});

describe('ValidationUtils', () => {
  describe('validateKlines', () => {
    it('应该验证有效的K线数据', () => {
      const validKlines: Kline[] = [
        {
          symbol: 'BTCUSDT',
          openTime: 1640995200000,
          closeTime: 1640998799999,
          open: 47000,
          high: 47500,
          low: 46800,
          close: 47200,
          volume: 1000,
          interval: '1h'
        }
      ];

      const result = ValidationUtils.validateKlines(validKlines);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的K线数据', () => {
      const invalidKlines: Kline[] = [
        {
          symbol: '',
          openTime: 0,
          closeTime: 0,
          open: 47000,
          high: 46000, // 最高价小于开盘价
          low: 47500,  // 最低价大于开盘价
          close: 47200,
          volume: -100, // 负成交量
          interval: '1h'
        }
      ];

      const result = ValidationUtils.validateKlines(invalidKlines);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isValidPrice', () => {
    it('应该验证有效价格', () => {
      expect(ValidationUtils.isValidPrice(100)).toBe(true);
      expect(ValidationUtils.isValidPrice(0.001)).toBe(true);
    });

    it('应该拒绝无效价格', () => {
      expect(ValidationUtils.isValidPrice(-1)).toBe(false);
      expect(ValidationUtils.isValidPrice(NaN)).toBe(false);
      expect(ValidationUtils.isValidPrice(Infinity)).toBe(false);
    });
  });

  describe('isValidSymbol', () => {
    it('应该验证有效的交易对符号', () => {
      expect(ValidationUtils.isValidSymbol('BTCUSDT')).toBe(true);
      expect(ValidationUtils.isValidSymbol('BTC/USDT')).toBe(true);
      expect(ValidationUtils.isValidSymbol('BTC-USDT')).toBe(true);
    });

    it('应该拒绝无效的交易对符号', () => {
      expect(ValidationUtils.isValidSymbol('')).toBe(false);
      expect(ValidationUtils.isValidSymbol('B')).toBe(false);
      expect(ValidationUtils.isValidSymbol('BTC@USDT')).toBe(false);
    });
  });
});
describe('FormatUtils', () => {
  describe('formatPrice', () => {
    it('应该正确格式化价格', () => {
      expect(FormatUtils.formatPrice(47123.456)).toBe('47123.46');
      expect(FormatUtils.formatPrice(47123.456, 4)).toBe('47123.4560');
    });

    it('应该处理无效价格', () => {
      expect(FormatUtils.formatPrice(NaN)).toBe('0.00');
    });
  });

  describe('formatVolume', () => {
    it('应该正确格式化成交量', () => {
      expect(FormatUtils.formatVolume(1234567890)).toBe('1.23B');
      expect(FormatUtils.formatVolume(1234567)).toBe('1.23M');
      expect(FormatUtils.formatVolume(1234)).toBe('1.23K');
      expect(FormatUtils.formatVolume(123)).toBe('123');
    });
  });

  describe('formatPercentage', () => {
    it('应该正确格式化百分比', () => {
      expect(FormatUtils.formatPercentage(0.1234)).toBe('12.34%');
      expect(FormatUtils.formatPercentage(-0.05)).toBe('-5.00%');
    });
  });
});

describe('ErrorUtils', () => {
  describe('safeExecute', () => {
    it('应该安全执行成功的函数', async () => {
      const successFn = async () => 'success';
      const result = await ErrorUtils.safeExecute(successFn, 'default');
      
      expect(result).toBe('success');
    });

    it('应该在函数失败时返回默认值', async () => {
      const failFn = async () => { throw new Error('test error'); };
      const result = await ErrorUtils.safeExecute(failFn, 'default');
      
      expect(result).toBe('default');
    });
  });

  describe('retry', () => {
    it('应该在第一次尝试成功时返回结果', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await ErrorUtils.retry(successFn, 3, 100);
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('应该在失败时重试', async () => {
      const failThenSuccessFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await ErrorUtils.retry(failThenSuccessFn, 3, 10);
      
      expect(result).toBe('success');
      expect(failThenSuccessFn).toHaveBeenCalledTimes(2);
    });

    it('应该在所有重试都失败时抛出最后的错误', async () => {
      const alwaysFailFn = jest.fn().mockRejectedValue(new Error('always fail'));
      
      await expect(ErrorUtils.retry(alwaysFailFn, 2, 10))
        .rejects.toThrow('always fail');
      
      expect(alwaysFailFn).toHaveBeenCalledTimes(3); // 初始尝试 + 2次重试
    });
  });
});

describe('SimpleCache', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache<string>(1000); // 1秒TTL
  });

  afterEach(() => {
    cache.clear();
  });

  it('应该能够设置和获取缓存值', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('应该在TTL过期后返回undefined', async () => {
    cache.set('key1', 'value1', 100); // 100ms TTL
    
    expect(cache.get('key1')).toBe('value1');
    
    // 等待TTL过期
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(cache.get('key1')).toBeUndefined();
  });

  it('应该能够清空缓存', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    
    cache.clear();
    
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });
});