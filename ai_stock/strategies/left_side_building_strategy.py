# -*- coding: utf-8 -*-
"""
左侧建仓策略
在价格下跌过程中分批建仓，采用金字塔式加仓方式
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from .base_strategy import BaseStrategy

@dataclass
class LeftSideBuildingParams:
    min_drop_percent: float = 0.05
    add_position_drop_interval: float = 0.03
    max_building_times: int = 5
    base_position_size: float = 1000
    position_multiplier: float = 1.5
    price_confirmation_periods: int = 3
    stop_loss_from_high: float = 0.25
    profit_taking_thresholds: List[float] = field(default_factory=lambda: [0.10, 0.20, 0.35])
    reduction_ratios: List[float] = field(default_factory=lambda: [0.3, 0.5, 1.0])

class LeftSideBuildingStrategy(BaseStrategy):
    def __init__(self, config: Any):
        super().__init__('LeftSideBuildingStrategy', config)
        self.params = LeftSideBuildingParams(**config.get('parameters', {}))
        self.building_records: Dict[str, List[dict]] = {}
        self.high_prices: Dict[str, float] = {}
        self.last_build_time: Dict[str, float] = {}
        self.reduction_flags: Dict[str, set] = {}

    async def generate_signal(self, data: Any) -> Optional[Any]:
        # 省略具体实现，保留接口
        pass

    def on_parameters_updated(self, parameters: dict):
        for k, v in parameters.items():
            setattr(self.params, k, v)

    # 省略其余辅助方法和属性 