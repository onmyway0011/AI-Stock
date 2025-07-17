#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 核心类型定义

定义系统中使用的所有数据类型和枚举。
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass, field
from pydantic import BaseModel, Field, validator


class OrderSide(str, Enum):
    """订单方向枚举"""
    BUY = "BUY"
    SELL = "SELL"


class SignalStrength(str, Enum):
    """信号强度枚举"""
    STRONG = "STRONG"
    MODERATE = "MODERATE"  
    WEAK = "WEAK"


class StrategyStatus(str, Enum):
    """策略状态枚举"""
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    PAUSED = "PAUSED"
    ERROR = "ERROR"


class MarketStatus(str, Enum):
    """市场状态枚举"""
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    PRE_MARKET = "PRE_MARKET"
    AFTER_MARKET = "AFTER_MARKET"


@dataclass
class Kline:
    """K线数据结构"""
    open_time: int  # 开盘时间戳(毫秒)
    open: float  # 开盘价
    high: float  # 最高价
    low: float  # 最低价
    close: float  # 收盘价
    volume: float  # 成交量
    close_time: int  # 收盘时间戳(毫秒)
    symbol: str  # 交易对符号
    quote_volume: Optional[float] = None  # 成交额
    taker_buy_base_volume: Optional[float] = None  # 主动买入成交量
    taker_buy_quote_volume: Optional[float] = None  # 主动买入成交额
    ignore: bool = False  # 忽略标志

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "open_time": self.open_time,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
            "close_time": self.close_time,
            "symbol": self.symbol,
            "quote_volume": self.quote_volume,
            "taker_buy_base_volume": self.taker_buy_base_volume,
            "taker_buy_quote_volume": self.taker_buy_quote_volume,
            "ignore": self.ignore,
        }


@dataclass
class MarketData:
    """市场数据结构"""
    klines: List[Kline]
    symbol: str
    timestamp: Optional[int] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = int(datetime.now().timestamp() * 1000)


@dataclass  
class Signal:
    """交易信号结构"""
    id: str
    symbol: str
    side: OrderSide
    price: float
    confidence: float  # 置信度 0-1
    reason: str
    strength: SignalStrength
    timestamp: Optional[int] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    volume: Optional[float] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = int(datetime.now().timestamp() * 1000)


@dataclass
class Trade:
    """交易记录结构"""
    id: str
    symbol: str
    entry_time: int
    exit_time: int
    entry_price: float
    exit_price: float
    volume: float
    pnl: float  # 盈亏
    pnl_percent: Optional[float] = None  # 盈亏百分比
    quantity: Optional[float] = None
    commission: Optional[float] = None
    side: Optional[OrderSide] = None
    price: Optional[float] = None
    timestamp: Optional[int] = None
    reason: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = int(datetime.now().timestamp() * 1000)
        if self.pnl_percent is None and self.entry_price != 0:
            self.pnl_percent = self.pnl / self.entry_price


@dataclass
class EquityPoint:
    """权益曲线点"""
    time: int
    equity: float
    timestamp: int
    drawdown: Optional[float] = None


class StrategyConfig(BaseModel):
    """策略配置"""
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    risk_management: Optional[Dict[str, Any]] = None
    trading_config: Optional[Dict[str, Any]] = None
    
    class Config:
        arbitrary_types_allowed = True


class BacktestConfig(BaseModel):
    """回测配置"""
    start_date: str
    end_date: str  
    initial_capital: float
    commission: float
    symbols: List[str]
    strategy_config: Optional[StrategyConfig] = None
    
    class Config:
        arbitrary_types_allowed = True


@dataclass
class BacktestSummary:
    """回测摘要"""
    strategy: str
    symbol: str
    start_time: int
    end_time: int
    initial_capital: float
    final_equity: float


@dataclass
class BacktestReturns:
    """回测收益指标"""
    total_return: float
    annualized_return: float
    alpha: float = 0.0
    beta: float = 0.0


@dataclass
class BacktestRisk:
    """回测风险指标"""
    volatility: float
    max_drawdown: float
    downside_deviation: float = 0.0
    var95: float = 0.0


@dataclass
class BacktestRiskAdjusted:
    """回测风险调整指标"""
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    calmar_ratio: Optional[float] = None


@dataclass
class BacktestTrading:
    """回测交易指标"""
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    profit_factor: Optional[float] = None
    average_trade: Optional[float] = None


@dataclass
class BacktestResult:
    """回测结果"""
    summary: BacktestSummary
    returns: BacktestReturns
    risk: BacktestRisk
    risk_adjusted: BacktestRiskAdjusted
    trading: BacktestTrading
    trades: List[Trade]
    equity_curve: List[EquityPoint]
    monthly_returns: Optional[Dict[str, float]] = None
    total_return: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


@dataclass
class TickerData:
    """行情数据"""
    symbol: str
    price: float
    change_percent_24h: float
    last_price: float
    last_quantity: float
    bid_price: float
    bid_quantity: float
    ask_price: float
    ask_quantity: float
    open_price: float
    high_price: float
    low_price: float
    volume: float
    quote_volume: float
    open_time: int
    close_time: int
    first_id: int
    last_id: int
    count: int


@dataclass
class DepthData:
    """市场深度数据"""
    symbol: str
    bids: List[List[float]]  # [[价格, 数量], ...]
    asks: List[List[float]]  # [[价格, 数量], ...]
    timestamp: Optional[int] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = int(datetime.now().timestamp() * 1000)


class NotificationConfig(BaseModel):
    """通知配置"""
    enabled: bool = True
    channels: List[str] = Field(default_factory=list)
    webhook_url: Optional[str] = None
    email_config: Optional[Dict[str, str]] = None
    wechat_config: Optional[Dict[str, str]] = None


class SystemConfig(BaseModel):
    """系统配置"""
    debug: bool = False
    log_level: str = "INFO"
    data_source: str = "binance"
    notification: NotificationConfig = Field(default_factory=NotificationConfig)
    database_url: Optional[str] = None
    redis_url: Optional[str] = None


# 类型别名
Price = Union[int, float, Decimal]
Volume = Union[int, float, Decimal]
Timestamp = int
Symbol = str

# 常用常量
DEFAULT_KLINE_LIMIT = 1000
DEFAULT_DEPTH_LIMIT = 100
DEFAULT_COMMISSION_RATE = 0.001
DEFAULT_INITIAL_CAPITAL = 100000.0

# 导出所有类型
__all__ = [
    # 枚举类型
    "OrderSide",
    "SignalStrength", 
    "StrategyStatus",
    "MarketStatus",
    
    # 数据结构
    "Kline",
    "MarketData",
    "Signal",
    "Trade",
    "EquityPoint",
    "TickerData",
    "DepthData",
    
    # 配置类
    "StrategyConfig",
    "BacktestConfig",
    "NotificationConfig",
    "SystemConfig",
    
    # 回测相关
    "BacktestSummary",
    "BacktestReturns",
    "BacktestRisk",
    "BacktestRiskAdjusted",
    "BacktestTrading", 
    "BacktestResult",
    
    # 类型别名
    "Price",
    "Volume",
    "Timestamp",
    "Symbol",
    
    # 常量
    "DEFAULT_KLINE_LIMIT",
    "DEFAULT_DEPTH_LIMIT",
    "DEFAULT_COMMISSION_RATE",
    "DEFAULT_INITIAL_CAPITAL",
]