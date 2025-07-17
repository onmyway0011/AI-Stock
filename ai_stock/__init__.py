#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System

一个基于AI的股票交易系统，具有智能信号生成和自动化监控功能。

主要功能：
- 数据采集和处理
- 智能交易信号生成
- 策略回测和优化
- 风险管理
- 实时监控和通知

作者: AI Stock Trading Team
版本: 2.0.0
许可证: MIT
"""

__version__ = "2.0.0"
__author__ = "AI Stock Trading Team"
__email__ = "ai-stock@example.com"
__license__ = "MIT"
__description__ = "AI-powered stock trading system with intelligent signal generation and automated monitoring"

# 核心模块导入
from ai_stock.core.types import (
    Kline,
    MarketData,
    Signal,
    OrderSide,
    SignalStrength,
    StrategyConfig,
    BacktestConfig,
    Trade,
    EquityPoint,
    BacktestResult,
)

from ai_stock.core.exceptions import (
    AIStockError,
    DataCollectionError,
    StrategyError,
    BacktestError,
    SignalGenerationError,
)

# 主要服务类 - 只导入已经创建的
from ai_stock.data.collectors.base_collector import BaseDataCollector
from ai_stock.signals.generators.trading_signal_generator import TradingSignalGenerator
# TODO: 后续创建这些模块时取消注释
# from ai_stock.strategies.base_strategy import BaseStrategy
# from ai_stock.backtest.engine.backtest_engine import BacktestEngine
# from ai_stock.notifications.notification_manager import NotificationManager

# 工具函数
from ai_stock.utils.format_utils import FormatUtils
from ai_stock.utils.date_utils import DateUtils
from ai_stock.utils.math_utils import MathUtils

# 版本信息
VERSION_INFO = {
    "version": __version__,
    "build_time": "2024-01-01T00:00:00Z",
    "architecture_version": "python-v2.0",
    "python_version": ">=3.8",
}

# 架构信息
ARCHITECTURE_INFO = {
    "version": "python-v2.0",
    "layers": {
        "core": "🔧 核心系统层 - 类型定义、异常处理、基础接口",
        "data": "📊 数据层 - 数据采集、存储、处理",
        "signals": "📡 信号层 - 交易信号生成和过滤",
        "strategies": "🎯 策略层 - 交易策略实现和优化",
        "backtest": "📈 回测层 - 历史数据回测和性能分析",
        "notifications": "📢 通知层 - 消息通知和报警",
        "utils": "🛠️ 工具层 - 通用工具函数",
        "cli": "💻 命令行层 - CLI工具和脚本",
    },
    "migration": {
        "from": "TypeScript",
        "to": "Python",
        "status": "完全重构",
        "description": "从TypeScript完全重构为Python，采用现代Python最佳实践",
    },
}

# 导出所有公共接口
__all__ = [
    # 版本信息
    "__version__",
    "__author__",
    "__email__",
    "__license__",
    "__description__",
    "VERSION_INFO",
    "ARCHITECTURE_INFO",
    
    # 核心类型
    "Kline",
    "MarketData",
    "Signal",
    "OrderSide",
    "SignalStrength",
    "StrategyConfig",
    "BacktestConfig",
    "Trade",
    "EquityPoint",
    "BacktestResult",
    
    # 异常类
    "AIStockError",
    "DataCollectionError",
    "StrategyError",
    "BacktestError",
    "SignalGenerationError",
    
    # 主要服务类
    "BaseDataCollector",
    "TradingSignalGenerator",
    # TODO: 后续添加
    # "BaseStrategy",
    # "BacktestEngine",
    # "NotificationManager",
    
    # 工具函数
    "FormatUtils",
    "DateUtils",
    "MathUtils",
]


def get_version() -> str:
    """获取当前版本号"""
    return __version__


def get_architecture_info() -> dict:
    """获取架构信息"""
    return ARCHITECTURE_INFO


def get_version_info() -> dict:
    """获取完整版本信息"""
    return VERSION_INFO


# 模块级别的配置
import logging
import os
from pathlib import Path

# 设置日志配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("ai_stock.log", encoding="utf-8"),
    ],
)

# 创建主日志器
logger = logging.getLogger("ai_stock")

# 设置数据目录
DATA_DIR = Path.home() / ".ai_stock" / "data"
CONFIG_DIR = Path.home() / ".ai_stock" / "config"
LOGS_DIR = Path.home() / ".ai_stock" / "logs"

# 确保目录存在
for directory in [DATA_DIR, CONFIG_DIR, LOGS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

logger.info(f"AI Stock Trading System v{__version__} 初始化完成")
logger.info(f"数据目录: {DATA_DIR}")
logger.info(f"配置目录: {CONFIG_DIR}")
logger.info(f"日志目录: {LOGS_DIR}")