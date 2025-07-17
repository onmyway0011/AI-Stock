# 回测引擎（Python版）
from typing import List, Dict, Optional, Callable, Any
from ai_stock.types import BacktestConfig, Signal, MarketData, Kline, BacktestResult, EquityPoint, Trade
from ai_stock.utils import MathUtils
import time

class OrderSide:
    BUY = 'BUY'
    SELL = 'SELL'

class OrderType:
    MARKET = 'MARKET'
    LIMIT = 'LIMIT'

class OrderStatus:
    PENDING = 'PENDING'
    FILLED = 'FILLED'
    CANCELLED = 'CANCELLED'

class Order:
    def __init__(self, id: str, symbol: str, side: str, type: str, quantity: float, price: Optional[float], status: str, created_at: int, updated_at: int):
        self.id = id
        self.symbol = symbol
        self.side = side
        self.type = type
        self.quantity = quantity
        self.price = price
        self.status = status
        self.created_at = created_at
        self.updated_at = updated_at
        self.filled_quantity: Optional[float] = None
        self.avg_price: Optional[float] = None

class BacktestError(Exception):
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        super().__init__(message)
        self.original_error = original_error

class BacktestState:
    IDLE = 'IDLE'
    RUNNING = 'RUNNING'
    PAUSED = 'PAUSED'
    COMPLETED = 'COMPLETED'
    ERROR = 'ERROR'

class BacktestEngine:
    def __init__(self):
        self.state = BacktestState.IDLE
        self.config: Optional[BacktestConfig] = None
        self.strategy = None
        self.account = None
        self.trades: List[Trade] = []
        self.orders: List[Order] = []
        self.equity_curve: List[EquityPoint] = []
        self.current_bar = 0
        self.start_time = 0
        self.on_progress_callback: Optional[Callable[[Any], None]] = None
        self.reset_state()

    def reset_state(self):
        self.trades = []
        self.orders = []
        self.equity_curve = []
        self.current_bar = 0
        self.account = None
        self.strategy = None

    # 其余方法（run、pause、resume、stop、validate_config、initialize_strategy、initialize_account、load_historical_data、execute_backtest、calculate_results、等）
    # 可按 TypeScript 逻辑逐步迁移为 Python 方法，类型安全、中文注释 