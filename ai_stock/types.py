# 量化交易系统核心类型声明（Python版）
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum

class OrderSide(str, Enum):
    BUY = 'BUY'
    SELL = 'SELL'

class SignalStrength(str, Enum):
    STRONG = 'STRONG'
    MODERATE = 'MODERATE'
    WEAK = 'WEAK'

@dataclass
class Kline:
    openTime: int
    open: float
    high: float
    low: float
    close: float
    volume: float
    closeTime: int
    symbol: str
    quoteVolume: Optional[float] = None
    takerBuyBaseVolume: Optional[float] = None
    takerBuyQuoteVolume: Optional[float] = None
    ignore: Optional[bool] = None

@dataclass
class MarketData:
    klines: List[Kline]
    symbol: str

@dataclass
class Signal:
    id: str
    symbol: str
    side: OrderSide
    price: float
    confidence: float
    reason: str
    strength: SignalStrength
    stopLoss: Optional[float] = None
    takeProfit: Optional[float] = None

@dataclass
class StrategyConfig:
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    riskManagement: Optional[Any] = None
    tradingConfig: Optional[Any] = None

@dataclass
class BacktestConfig:
    startDate: str
    endDate: str
    initialCapital: float
    commission: float
    symbols: List[str]

@dataclass
class Trade:
    id: str
    symbol: str
    entryTime: int
    exitTime: int
    entryPrice: float
    exitPrice: float
    volume: float
    pnl: float
    pnlPercent: Optional[float] = None
    quantity: Optional[float] = None
    commission: Optional[float] = None
    side: Optional[str] = None
    price: Optional[float] = None
    timestamp: Optional[int] = None
    reason: Optional[str] = None

@dataclass
class EquityPoint:
    time: int
    equity: float
    timestamp: int

@dataclass
class BacktestResultSummary:
    strategy: str
    symbol: str
    startTime: int
    endTime: int
    initialCapital: float
    finalEquity: float

@dataclass
class BacktestResultReturns:
    totalReturn: float
    annualizedReturn: float
    alpha: float
    beta: float

@dataclass
class BacktestResultRisk:
    volatility: float
    maxDrawdown: float
    downsideDeviation: float
    var95: float

@dataclass
class BacktestResultRiskAdjusted:
    sharpeRatio: float
    sortinoRatio: Optional[float] = None
    calmarRatio: Optional[float] = None

@dataclass
class BacktestResultTrading:
    totalTrades: int
    winningTrades: int
    losingTrades: int
    winRate: float
    avgWin: Optional[float] = None
    avgLoss: Optional[float] = None
    profitFactor: Optional[float] = None
    averageTrade: Optional[float] = None

@dataclass
class BacktestResult:
    summary: BacktestResultSummary
    returns: BacktestResultReturns
    risk: BacktestResultRisk
    riskAdjusted: BacktestResultRiskAdjusted
    trading: BacktestResultTrading
    trades: List[Trade]
    equityCurve: List[EquityPoint]
    monthlyReturns: Optional[Dict[str, float]] = None
    totalReturn: Optional[float] = None
    details: Optional[Any] = None 