# -*- coding: utf-8 -*-
"""
策略基类
定义所有交易策略的通用接口和基础功能
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Optional, Any
import time

# 策略状态枚举
class StrategyState(Enum):
    INITIALIZING = 'INITIALIZING'
    RUNNING = 'RUNNING'
    PAUSED = 'PAUSED'
    STOPPED = 'STOPPED'
    ERROR = 'ERROR'

# 策略执行上下文
@dataclass
class StrategyContext:
    current_capital: float = 0.0  # 当前资金
    current_position: float = 0.0  # 当前仓位
    signal_history: List[Any] = field(default_factory=list)  # 历史信号
    market_state: str = 'UNKNOWN'  # 市场状态
    last_update_time: float = field(default_factory=lambda: time.time())  # 最后更新时间

# 策略性能指标
@dataclass
class StrategyPerformance:
    total_signals: int = 0  # 总信号数
    successful_signals: int = 0  # 成功信号数
    accuracy: float = 0.0  # 准确率
    avg_confidence: float = 0.0  # 平均信号置信度
    signals_30d: int = 0  # 最后30天信号数
    win_rate: float = 0.0  # 信号胜率

class BaseStrategy(ABC):
    """
    策略基类
    提供通用的策略功能和生命周期管理
    """
    name: str
    config: Any
    state: StrategyState
    context: StrategyContext
    performance: StrategyPerformance
    indicators: Dict[str, List[float]]
    last_signal_time: float
    _init_promise: Optional[bool]

    def __init__(self, name: str, config: Any):
        self.name = name
        self.config = config
        self.state = StrategyState.INITIALIZING
        self.context = StrategyContext()
        self.performance = StrategyPerformance()
        self.indicators = {}
        self.last_signal_time = 0
        self._init_promise = None

    async def initialize(self):
        if self._init_promise:
            return
        self._init_promise = True
        await self.do_initialize()

    async def do_initialize(self):
        try:
            self.state = StrategyState.INITIALIZING
            self.validate_config()
            await self.on_initialize()
            self.state = StrategyState.RUNNING
            print(f"策略 {self.name} 初始化完成")
        except Exception as e:
            self.state = StrategyState.ERROR
            raise RuntimeError(f"策略初始化失败: {e}")

    async def on_initialize(self):
        # 子类可重写
        pass

    @abstractmethod
    async def generate_signal(self, data: Any) -> Optional[Any]:
        """
        生成交易信号，子类必须实现
        :param data: 市场数据
        :return: 交易信号或 None
        """
        pass

    def update_parameters(self, parameters: Dict[str, Any]):
        try:
            self.config['parameters'].update(parameters)
            self.validate_config()
            self.on_parameters_updated(parameters)
            print(f"策略 {self.name} 参数已更新")
        except Exception as e:
            raise RuntimeError(f"更新策略参数失败: {e}")

    def on_parameters_updated(self, parameters: Dict[str, Any]):
        # 子类可重写
        pass

    def get_status(self):
        return {
            'is_running': self.state == StrategyState.RUNNING,
            'last_update': self.context.last_update_time,
            'performance': self.performance
        }

    def pause(self):
        if self.state == StrategyState.RUNNING:
            self.state = StrategyState.PAUSED
            print(f"策略 {self.name} 已暂停")

    def resume(self):
        if self.state == StrategyState.PAUSED:
            self.state = StrategyState.RUNNING
            print(f"策略 {self.name} 已恢复")

    def stop(self):
        self.state = StrategyState.STOPPED
        self.on_stop()
        print(f"策略 {self.name} 已停止")

    def on_stop(self):
        # 子类可重写
        pass

    async def process_market_data(self, data: Any) -> Optional[Any]:
        try:
            if self.state != StrategyState.RUNNING:
                return None
            if not self.validate_market_data(data):
                return None
            # ... 省略后续实现 ...
        except Exception as e:
            print(f"处理市场数据异常: {e}")
            return None

    def validate_market_data(self, data: Any) -> bool:
        # 子类可重写
        return True

    def validate_config(self):
        # 子类可重写
        pass 