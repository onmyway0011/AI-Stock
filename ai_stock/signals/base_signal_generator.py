# 信号生成器基类（Python版）
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from ai_stock.types import MarketData, SignalStrength, OrderSide, Signal
import logging

logger = logging.getLogger('BASE_SIGNAL_GENERATOR')

class GeneratorStatus:
    IDLE = 'IDLE'
    PROCESSING = 'PROCESSING'
    ERROR = 'ERROR'
    DISABLED = 'DISABLED'

class SignalGeneratorConfig:
    def __init__(self, name: str, enabled: bool, min_confidence: float, signal_ttl: int, cooldown_period: int, max_concurrent_signals: int, parameters: Dict[str, Any]):
        self.name = name
        self.enabled = enabled
        self.min_confidence = min_confidence
        self.signal_ttl = signal_ttl
        self.cooldown_period = cooldown_period
        self.max_concurrent_signals = max_concurrent_signals
        self.parameters = parameters

class BaseSignalGenerator(ABC):
    def __init__(self, config: SignalGeneratorConfig):
        self.config = config
        self.signal_history: List[Signal] = []
        self.last_signal_time: int = 0
        self.is_enabled: bool = config.enabled

    @abstractmethod
    def generate_signal(self, market_data: MarketData) -> Optional[Signal]:
        pass

    def get_signal_history(self) -> List[Signal]:
        return list(self.signal_history)

    def is_in_cooldown(self, symbol: str) -> bool:
        # 默认冷却期 0，始终返回 False
        return False

    def generate_signal_id(self) -> str:
        import time, random
        return f"signal_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"

    def update_config(self, new_config: Dict[str, Any]) -> None:
        for k, v in new_config.items():
            setattr(self.config, k, v)
        self.is_enabled = self.config.enabled

    def clean_expired_signals(self) -> None:
        # 无 expiresAt 字段，直接保留全部历史
        self.signal_history = list(self.signal_history) 