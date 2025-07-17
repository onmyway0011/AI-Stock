#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 接口定义模块

定义系统中使用的所有抽象基类和协议接口。
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Protocol, AsyncContextManager
from ai_stock.core.types import (
    Kline, MarketData, Signal, Trade, EquityPoint, BacktestResult,
    BacktestConfig, StrategyConfig, TickerData, DepthData
)


class IDataCollector(Protocol):
    """数据采集器接口"""
    
    async def get_klines(
        self, 
        symbol: str, 
        interval: str, 
        limit: int = 1000
    ) -> List[Kline]:
        """获取K线数据"""
        ...
    
    async def get_ticker(self, symbol: str) -> TickerData:
        """获取实时价格数据"""
        ...
    
    async def get_depth(self, symbol: str, limit: int = 100) -> DepthData:
        """获取市场深度数据"""
        ...
    
    async def start(self) -> None:
        """启动数据采集器"""
        ...
    
    async def stop(self) -> None:
        """停止数据采集器"""
        ...


class IStrategy(Protocol):
    """交易策略接口"""
    
    async def initialize(self, config: StrategyConfig) -> None:
        """初始化策略"""
        ...
    
    async def process_market_data(self, market_data: MarketData) -> Optional[Signal]:
        """处理市场数据并生成信号"""
        ...
    
    def get_status(self) -> Dict[str, Any]:
        """获取策略状态"""
        ...
    
    async def stop(self) -> None:
        """停止策略"""
        ...


class ISignalGenerator(Protocol):
    """信号生成器接口"""
    
    def generate_signals(self, market_data: MarketData) -> List[Signal]:
        """生成交易信号"""
        ...
    
    def filter_signals(self, signals: List[Signal]) -> List[Signal]:
        """过滤信号"""
        ...
    
    def get_status(self) -> Dict[str, Any]:
        """获取生成器状态"""
        ...


class IBacktestEngine(Protocol):
    """回测引擎接口"""
    
    async def run(
        self, 
        config: BacktestConfig,
        on_progress: Optional[callable] = None
    ) -> BacktestResult:
        """运行回测"""
        ...
    
    async def stop(self) -> None:
        """停止回测"""
        ...


class INotificationChannel(Protocol):
    """通知渠道接口"""
    
    async def send_message(self, message: str, **kwargs) -> bool:
        """发送消息"""
        ...
    
    async def send_signal_notification(self, signal: Signal) -> bool:
        """发送信号通知"""
        ...
    
    def is_enabled(self) -> bool:
        """检查是否启用"""
        ...


class IRiskManager(Protocol):
    """风险管理器接口"""
    
    def check_position_size(self, signal: Signal, current_equity: float) -> bool:
        """检查仓位大小"""
        ...
    
    def check_max_drawdown(self, current_drawdown: float) -> bool:
        """检查最大回撤"""
        ...
    
    def calculate_stop_loss(self, signal: Signal) -> Optional[float]:
        """计算止损价位"""
        ...
    
    def calculate_take_profit(self, signal: Signal) -> Optional[float]:
        """计算止盈价位"""
        ...


# 抽象基类实现

class BaseDataCollector(ABC):
    """数据采集器抽象基类"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self._is_running = False
    
    @abstractmethod
    async def get_klines(
        self, 
        symbol: str, 
        interval: str, 
        limit: int = 1000
    ) -> List[Kline]:
        """获取K线数据"""
        pass
    
    @abstractmethod
    async def get_ticker(self, symbol: str) -> TickerData:
        """获取实时价格数据"""
        pass
    
    @abstractmethod
    async def get_depth(self, symbol: str, limit: int = 100) -> DepthData:
        """获取市场深度数据"""
        pass
    
    async def start(self) -> None:
        """启动数据采集器"""
        self._is_running = True
    
    async def stop(self) -> None:
        """停止数据采集器"""
        self._is_running = False
    
    @property
    def is_running(self) -> bool:
        """检查是否运行中"""
        return self._is_running


class BaseStrategy(ABC):
    """交易策略抽象基类"""
    
    def __init__(self, name: str = "BaseStrategy"):
        self.name = name
        self.config: Optional[StrategyConfig] = None
        self._is_running = False
        self._performance_stats = {
            "total_signals": 0,
            "successful_signals": 0,
            "accuracy": 0.0,
            "last_update": 0,
        }
    
    @abstractmethod
    async def initialize(self, config: StrategyConfig) -> None:
        """初始化策略"""
        self.config = config
    
    @abstractmethod
    async def process_market_data(self, market_data: MarketData) -> Optional[Signal]:
        """处理市场数据并生成信号"""
        pass
    
    def get_status(self) -> Dict[str, Any]:
        """获取策略状态"""
        return {
            "name": self.name,
            "is_running": self._is_running,
            "performance": self._performance_stats.copy(),
        }
    
    async def stop(self) -> None:
        """停止策略"""
        self._is_running = False
    
    def _update_performance(self, success: bool = True) -> None:
        """更新性能统计"""
        self._performance_stats["total_signals"] += 1
        if success:
            self._performance_stats["successful_signals"] += 1
        
        total = self._performance_stats["total_signals"]
        successful = self._performance_stats["successful_signals"]
        self._performance_stats["accuracy"] = successful / total if total > 0 else 0.0


class BaseSignalGenerator(ABC):
    """信号生成器抽象基类"""
    
    def __init__(self, name: str = "BaseSignalGenerator"):
        self.name = name
        self._is_enabled = True
        self._stats = {
            "active_signals": 0,
            "total_signals_generated": 0,
            "success_rate": 0.0,
            "avg_confidence": 0.0,
        }
    
    @abstractmethod
    def generate_signals(self, market_data: MarketData) -> List[Signal]:
        """生成交易信号"""
        pass
    
    def filter_signals(self, signals: List[Signal]) -> List[Signal]:
        """过滤信号（默认实现）"""
        return [s for s in signals if s.confidence > 0.5]
    
    def get_status(self) -> Dict[str, Any]:
        """获取生成器状态"""
        return {
            "name": self.name,
            "is_enabled": self._is_enabled,
            "stats": self._stats.copy(),
        }
    
    def enable(self) -> None:
        """启用信号生成器"""
        self._is_enabled = True
    
    def disable(self) -> None:
        """禁用信号生成器"""
        self._is_enabled = False


class BaseBacktestEngine(ABC):
    """回测引擎抽象基类"""
    
    def __init__(self):
        self._is_running = False
        self._current_progress = 0.0
    
    @abstractmethod
    async def run(
        self, 
        config: BacktestConfig,
        on_progress: Optional[callable] = None
    ) -> BacktestResult:
        """运行回测"""
        pass
    
    async def stop(self) -> None:
        """停止回测"""
        self._is_running = False
    
    @property
    def is_running(self) -> bool:
        """检查是否运行中"""
        return self._is_running
    @property
    def progress(self) -> float:
        """获取当前进度"""
        return self._current_progress


class BaseNotificationChannel(ABC):
    """通知渠道抽象基类"""
    
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        self.name = name
        self.config = config or {}
        self._enabled = True
    
    @abstractmethod
    async def send_message(self, message: str, **kwargs) -> bool:
        """发送消息"""
        pass
    
    async def send_signal_notification(self, signal: Signal) -> bool:
        """发送信号通知"""
        message = self._format_signal_message(signal)
        return await self.send_message(message)
    
    def _format_signal_message(self, signal: Signal) -> str:
        """格式化信号消息"""
        return (
            f"🚨 交易信号通知\n"
            f"交易对: {signal.symbol}\n"
            f"方向: {signal.side.value}\n"
            f"价格: {signal.price:.4f}\n"
            f"置信度: {signal.confidence:.2%}\n"
            f"强度: {signal.strength.value}\n"
            f"原因: {signal.reason}"
        )
    
    def is_enabled(self) -> bool:
        """检查是否启用"""
        return self._enabled
    
    def enable(self) -> None:
        """启用通知渠道"""
        self._enabled = True
    
    def disable(self) -> None:
        """禁用通知渠道"""
        self._enabled = False


class BaseRiskManager(ABC):
    """风险管理器抽象基类"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.max_position_size = self.config.get("max_position_size", 0.1)
        self.max_drawdown = self.config.get("max_drawdown", 0.2)
        self.stop_loss_pct = self.config.get("stop_loss_pct", 0.02)
        self.take_profit_pct = self.config.get("take_profit_pct", 0.04)
    
    def check_position_size(self, signal: Signal, current_equity: float) -> bool:
        """检查仓位大小"""
        if signal.volume is None:
            return True
        
        position_value = signal.price * signal.volume
        position_ratio = position_value / current_equity
        return position_ratio <= self.max_position_size
    
    def check_max_drawdown(self, current_drawdown: float) -> bool:
        """检查最大回撤"""
        return abs(current_drawdown) <= self.max_drawdown
    
    def calculate_stop_loss(self, signal: Signal) -> Optional[float]:
        """计算止损价位"""
        if signal.side == "BUY":
            return signal.price * (1 - self.stop_loss_pct)
        else:
            return signal.price * (1 + self.stop_loss_pct)
    
    def calculate_take_profit(self, signal: Signal) -> Optional[float]:
        """计算止盈价位"""
        if signal.side == "BUY":
            return signal.price * (1 + self.take_profit_pct)
        else:
            return signal.price * (1 - self.take_profit_pct)


# 上下文管理器接口
class IDataSource(AsyncContextManager):
    """数据源上下文管理器接口"""
    
    @abstractmethod
    async def __aenter__(self):
        """进入上下文"""
        pass
    
    @abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """退出上下文"""
        pass


# 导出所有接口
__all__ = [
    # 协议接口
    "IDataCollector",
    "IStrategy",
    "ISignalGenerator", 
    "IBacktestEngine",
    "INotificationChannel",
    "IRiskManager",
    "IDataSource",
    # 抽象基类
    "BaseDataCollector",
    "BaseStrategy",
    "BaseSignalGenerator",
    "BaseBacktestEngine", 
    "BaseNotificationChannel",
    "BaseRiskManager",
]