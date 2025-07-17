# -*- coding: utf-8 -*-
"""
高级策略接口
支持仓位管理、分批交易、机器学习优化等高级功能
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any, Literal

# 仓位信息
data class PositionBatch:
    id: str
    quantity: float
    price: float
    timestamp: float
    type: Literal['OPEN', 'ADD', 'REDUCE', 'CLOSE']
    signal_id: Optional[str] = None

data class Position:
    id: str
    symbol: str
    side: str
    total_quantity: float
    filled_quantity: float
    avg_price: float
    current_value: float
    unrealized_pnl: float
    open_time: float
    batches: List[PositionBatch] = field(default_factory=list)
    is_active: bool = True

# 分批交易配置
data class BatchTradingConfig:
    max_batches: int
    initial_position_ratio: float
    add_position_interval: float
    reduce_position_interval: float
    min_batch_size: float
    enable_batch_opening: bool
    enable_batch_closing: bool

# 左侧建仓配置
data class LeftSideTradingConfig:
    enabled: bool
    price_drop_threshold: float
    max_build_positions: int
    build_position_interval: float
    quantity_increase_ratio: float
    price_confirmation_period: float

# 机器学习配置
data class MLConfig:
    enabled: bool
    model_type: str
    feature_window_size: int
    prediction_window_size: int
    retrain_interval: float
    min_train_samples: int
    confidence_threshold: float
    features: List[str]

# 动态参数调整配置
data class DynamicParameterConfig:
    enabled: bool
    adjustment_frequency: float
    evaluation_period: float
    adjustment_magnitude: float
    min_performance_threshold: float
    adjustable_parameters: List[str]

# 高级信号类型
class AdvancedSignalType(Enum):
    OPEN_POSITION = 'OPEN_POSITION'
    ADD_POSITION = 'ADD_POSITION'
    REDUCE_POSITION = 'REDUCE_POSITION'
    CLOSE_POSITION = 'CLOSE_POSITION'
    LEFT_SIDE_BUILD = 'LEFT_SIDE_BUILD'
    BATCH_REDUCE = 'BATCH_REDUCE'
    ML_OPTIMIZED = 'ML_OPTIMIZED'

# 高级交易信号
data class AdvancedSignal:
    # 继承 Signal，实际实现时需补充
    signal_type: AdvancedSignalType
    target_position_ratio: Optional[float] = None
    batch_info: Optional[Dict[str, Any]] = None
    ml_prediction: Optional[Dict[str, Any]] = None
    position_management: Optional[Dict[str, Any]] = None

# 高级策略接口
class IAdvancedStrategy:
    name: str
    async def get_current_positions(self) -> List[Position]: ...
    async def get_position(self, symbol: str) -> Optional[Position]: ...
    async def create_position(self, signal: AdvancedSignal) -> Position: ...
    async def update_position(self, position_id: str, batch: PositionBatch) -> Position: ...
    async def close_position(self, position_id: str, reason: str) -> None: ...
    async def check_left_side_entry(self, data: Any) -> Optional[AdvancedSignal]: ...
    async def check_batch_exit(self, data: Any, position: Position) -> Optional[AdvancedSignal]: ...
    async def predict_with_ml(self, data: Any) -> Optional[Dict[str, Any]]: ...
    async def adjust_parameters_dynamically(self) -> None: ...
    async def generate_advanced_signal(self, data: Any) -> Optional[AdvancedSignal]: ...
    async def assess_risk(self, signal: AdvancedSignal) -> Dict[str, Any]: ...
    async def calculate_optimal_position_size(self, signal: AdvancedSignal, available_capital: float) -> float: ...
    async def get_performance_analysis(self) -> Dict[str, Any]: ...

# 市场状态分析结果
data class MarketStateAnalysis:
    trend: str
    trend_strength: float
    volatility: float
    support_levels: List[float]
    resistance_levels: List[float]
    liquidity_score: float

# 交易决策上下文
data class TradingDecisionContext:
    market_data: Any
    current_positions: List[Position]
    available_capital: float
    market_analysis: MarketStateAnalysis
    risk_assessment: Dict[str, float]
    ml_predictions: Optional[Dict[str, Any]] = None

# 策略优化结果
data class StrategyOptimizationResult:
    optimization_type: str
    before_performance: Dict[str, Any]
    after_performance: Dict[str, Any]
    adjusted_parameters: Dict[str, Any]
    optimization_time: float
    should_apply: bool
    recommendations: List[str] 