"""AI Stock Trading System - Core Types"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid

class OrderSide(str, Enum):
    BUY = 'BUY'
    SELL = 'SELL'

class SignalStrength(str, Enum):
    STRONG = 'STRONG'
    MODERATE = 'MODERATE'
    WEAK = 'WEAK'

@dataclass
class Kline:
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    close_time: int
    symbol: str

@dataclass
class MarketData:
    symbol: str
    klines: List[Kline]
    source: str = 'unknown'

@dataclass
class Signal:
    id: str
    symbol: str
    side: OrderSide
    price: float
    confidence: float
    reason: str
    strength: SignalStrength
    timestamp: int = field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None

@dataclass 
class Trade:
    id: str
    symbol: str
    side: OrderSide
    entry_time: int
    exit_time: int
    entry_price: float
    exit_price: float
    quantity: float
    volume: float
    pnl: float
    pnl_percent: float

@dataclass 
class StrategyConfig:
    name: str
    description: str = ''
    parameters: Dict[str, Any] = field(default_factory=dict)