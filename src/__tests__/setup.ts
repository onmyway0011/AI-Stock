/**
 * Jest测试环境设置文件
 */
// 设置测试环境变量
process.env.NODE_ENV = 'testing';
process.env.LOG_LEVEL = 'error';

// 模拟环境变量
process.env.TUSHARE_API_KEY = 'test_tushare_key';
process.env.BINANCE_API_KEY = 'test_binance_key';
process.env.BINANCE_API_SECRET = 'test_binance_secret';

// 全局测试设置
beforeAll(() => {
  // 静默日志输出
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // 清理资源
});
