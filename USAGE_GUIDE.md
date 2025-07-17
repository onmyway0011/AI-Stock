# 使用指南

## ⚙️ 配置管理
### 环境配置

创建 `.env` 文件配置API密钥：

```bash
# Binance API配置（可选，用于实时数据）
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here

# 日志级别
LOG_LEVEL=INFO

# 缓存配置
CACHE_TTL=300
```

### 配置文件

系统支持JSON格式的配置文件：

```python
from ai_stock.utils.config_utils import ConfigUtils

# 创建默认配置
config = ConfigUtils.create_default_config()

# 保存配置
ConfigUtils.save_config(config, "my_config.json")

# 加载配置
loaded_config = ConfigUtils.load_config("my_config.json")

# 验证配置
is_valid, errors = ConfigUtils.validate_config(loaded_config)
```

## 🔧 工具函数

### 格式化工具

```python
from ai_stock.utils.format_utils import FormatUtils

# 价格格式化
price = FormatUtils.format_price(12345.6789, precision=2)  # "$12,345.68"

# 百分比格式化
percent = FormatUtils.format_percentage(0.1234)  # "12.34%"

# 成交量格式化
volume = FormatUtils.format_volume(1234567)  # "1.23M"

# 时间格式化
time_str = FormatUtils.format_timestamp(1640995200000)  # "2022-01-01 08:00:00"
```

### 数学工具

```python
from ai_stock.utils.math_utils import MathUtils

prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109]

# 简单移动平均
sma = MathUtils.calculate_sma(prices, period=5)

# RSI指标
rsi = MathUtils.calculate_rsi(prices, period=14)

# MACD指标
macd_line, signal_line, histogram = MathUtils.calculate_macd(
    prices, fast=12, slow=26, signal=9
)

# 布林带
upper, middle, lower = MathUtils.calculate_bollinger_bands(
    prices, period=20, std_multiplier=2.0
)
```

### 日期时间工具

```python
from ai_stock.utils.date_utils import DateUtils
from datetime import datetime

# 时间戳转换
timestamp = DateUtils.datetime_to_timestamp(datetime.now())
dt = DateUtils.timestamp_to_datetime(timestamp)

# 时区转换
utc_time = DateUtils.to_utc(datetime.now())
local_time = DateUtils.to_local_timezone(utc_time)

# 市场时间检查
is_open = DateUtils.is_market_hours(datetime.now(), "US")
```

## 📈 实际使用案例

### 案例1: 简单的价格监控

```python
import asyncio
from ai_stock.data.collectors.binance_collector import BinanceCollector
from ai_stock.utils.format_utils import FormatUtils

async def price_monitor():
    collector = BinanceCollector()
    await collector.start()
    
    try:
        while True:
            ticker = await collector.get_ticker("BTCUSDT")
            price = FormatUtils.format_price(ticker.price)
            change = FormatUtils.format_percentage(ticker.change_percent_24h)
            
            print(f"BTC/USDT: {price} ({change})")
            await asyncio.sleep(10)  # 每10秒更新一次
            
    except KeyboardInterrupt:
        print("监控停止")
    finally:
        await collector.stop()

# 运行监控
asyncio.run(price_monitor())
```

### 案例2: 技术分析信号

```python
import asyncio
from ai_stock.data.collectors.binance_collector import BinanceCollector
from ai_stock.signals.generators.technical_signal_generator import TechnicalSignalGenerator
from ai_stock.signals.filters.signal_filter import SignalFilter

async def technical_analysis():
    collector = BinanceCollector()
    generator = TechnicalSignalGenerator()
    signal_filter = SignalFilter({"min_confidence": 0.8})
    
    await collector.start()
    
    try:
        # 获取历史数据
        klines = await collector.get_klines("BTCUSDT", "1h", 100)
        
        # 生成信号
        signals = await generator.generate_signals("BTCUSDT", klines)
        
        # 过滤信号
        filtered_signals = await signal_filter.filter_signals(signals)
        
        # 输出结果
        if filtered_signals:
            print(f"发现 {len(filtered_signals)} 个高置信度信号:")
            for signal in filtered_signals:
                print(f"- {signal.side.value} @ ${signal.price:.2f}")
                print(f"  置信度: {signal.confidence:.2%}")
                print(f"  原因: {signal.reason}")
        else:
            print("当前无高置信度信号")
            
    finally:
        await collector.stop()

asyncio.run(technical_analysis())
```

### 案例3: 多交易对监控

```python
import asyncio
from ai_stock.data.collectors.binance_collector import BinanceCollector
from ai_stock.signals.generators.trading_signal_generator import TradingSignalGenerator

async def multi_symbol_analysis():
    collector = BinanceCollector()
    generator = TradingSignalGenerator()
    
    symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "DOTUSDT"]
    
    await collector.start()
    
    try:
        tasks = []
        for symbol in symbols:
            task = analyze_symbol(collector, generator, symbol)
            tasks.append(task)
        
        # 并发分析所有交易对
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 输出结果
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                print(f"{symbol}: 分析失败 - {result}")
            else:
                signals = result
                print(f"{symbol}: 发现 {len(signals)} 个信号")
                for signal in signals[:2]:  # 显示前2个信号
                    print(f"  - {signal.side.value} @ ${signal.price:.4f}")
                    
    finally:
        await collector.stop()

async def analyze_symbol(collector, generator, symbol):
    klines = await collector.get_klines(symbol, "1h", 50)
    return await generator.generate_signals(symbol, klines)

asyncio.run(multi_symbol_analysis())
```

## 🚨 注意事项

### API限制
- Binance API有频率限制，建议设置合理的请求间隔
- YFinance为免费服务，请勿过度请求
- 使用缓存机制减少API调用

### 数据质量
- 确保有足够的历史数据进行技术分析
- 注意市场休市时间对数据的影响
- 验证数据的完整性和准确性

### 风险管理
- 本系统仅供学习和研究用途
- 实际交易前请进行充分的回测
- 投资有风险，请谨慎决策

### 性能优化
- 合理设置缓存时间
- 使用异步编程提高并发性能
- 定期清理过期的缓存数据

## 🔍 故障排除

### 常见问题

1. **导入错误**
   ```bash
   python test_imports.py  # 检查所有模块导入
   ```

2. **API连接失败**
   - 检查网络连接
   - 验证API密钥配置
   - 查看API服务状态

3. **数据不足错误**
   - 增加历史数据的获取量
   - 检查交易对是否存在
   - 验证时间参数设置

4. **内存使用过高**
   - 减少数据获取量
   - 启用数据压缩
   - 定期清理缓存

### 日志调试

```python
from ai_stock.utils.logging_utils import LoggingUtils

# 设置详细日志
LoggingUtils.setup_logging(
    level="DEBUG",
    log_file="trading_system.log"
)
```

## 📚 进阶主题

### 自定义数据采集器

继承 `BaseDataCollector` 类创建自定义采集器：

```python
from ai_stock.data.collectors.base_collector import BaseDataCollector

class CustomCollector(BaseDataCollector):
    def __init__(self, config=None):
        super().__init__("custom", config)
    
    async def get_klines(self, symbol, interval, limit=1000, **kwargs):
        # 实现自定义逻辑
        pass
```

### 自定义信号生成器

继承 `ISignalGenerator` 接口：

```python
from ai_stock.core.interfaces import ISignalGenerator

class CustomSignalGenerator(ISignalGenerator):
    async def generate_signals(self, symbol, klines, context=None):
        # 实现自定义信号逻辑
        pass
```

### 扩展过滤器

添加自定义过滤逻辑：

```python
from ai_stock.signals.filters.signal_filter import SignalFilter

class CustomSignalFilter(SignalFilter):
    async def filter_signals(self, signals):
        # 先应用基础过滤
        filtered = await super().filter_signals(signals)
        
        # 添加自定义过滤逻辑
        return self._apply_custom_filters(filtered)
```

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

---

**免责声明**: 本软件仅供教育和研究目的。使用本软件进行实际交易的任何损失，开发者概不负责。投资有风险，请谨慎决策.