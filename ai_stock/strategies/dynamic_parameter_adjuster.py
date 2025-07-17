# -*- coding: utf-8 -*-
"""
动态参数调整模块
根据策略性能自动调整参数，实现策略的自适应优化
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List

# 参数范围定义
@dataclass
class ParameterRange:
    min: float
    max: float
    step: float
    type: str
    description: str

# 参数配置定义
@dataclass
class ParameterDefinition:
    params: Dict[str, ParameterRange] = field(default_factory=dict)

# 性能度量
@dataclass
class PerformanceMetrics:
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    average_trade: float
    trade_count: int
    volatility: float
    calmar_ratio: float
    sortino_ratio: float

# 优化历史记录
@dataclass
class OptimizationRecord:
    timestamp: float
    parameters: Dict[str, Any]
    performance: PerformanceMetrics
    optimization_type: str
    improvement: float
    confidence: float

# 参数优化算法接口
class OptimizationAlgorithm:
    name: str
    async def optimize(self, current_params: Dict[str, Any], param_ranges: ParameterDefinition, performance_history: List[OptimizationRecord]) -> Dict[str, Any]: ...

# 网格搜索优化器（简化）
class GridSearchOptimizer(OptimizationAlgorithm):
    def __init__(self):
        self.name = 'GridSearch'
    # ... 省略实现 ...

# 遗传算法优化器（简化）
class GeneticOptimizer(OptimizationAlgorithm):
    def __init__(self):
        self.name = 'Genetic'
    # ... 省略实现 ...

# 动态参数调整主类
class DynamicParameterAdjuster:
    def __init__(self, config: Any):
        self.config = config
        self.optimizers: Dict[str, OptimizationAlgorithm] = {}
        self.optimization_history: List[OptimizationRecord] = []
        self.parameter_definitions: ParameterDefinition = ParameterDefinition()
        self.last_optimization_time: float = 0
    # ... 省略实现 ... 