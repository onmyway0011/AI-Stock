# -*- coding: utf-8 -*-
"""
移动平均线策略
基于双均线交叉的经典技术分析策略
"""
from dataclasses import dataclass
from typing import Any, Optional
from .base_strategy import BaseStrategy

@dataclass
class MovingAverageParams:
    short_period: int = 5
    long_period: int = 20
    ma_type: str = 'SMA'  # 'SMA' 或 'EMA'
    signal_threshold: float = 0.01
    use_volume_confirmation: bool = True
    volume_multiplier: float = 1.5

class MovingAverageStrategy(BaseStrategy):
    def __init__(self, config: Any):
        super().__init__('MovingAverageStrategy', config)
        self.params = MovingAverageParams(**config.get('parameters', {}))
        self.last_cross_direction = 'NONE'
        self.cross_confirmation_count = 0

    async def on_initialize(self):
        self.validate_parameters()
        print(f"移动平均线策略初始化: 短期={self.params.short_period}, 长期={self.params.long_period}, 类型={self.params.ma_type}")

    async def generate_signal(self, data: Any) -> Optional[Any]:
        # 省略具体实现，保留接口
        pass

    def on_parameters_updated(self, parameters: dict):
        for k, v in parameters.items():
            setattr(self.params, k, v)
        self.validate_parameters()
        self.last_cross_direction = 'NONE'
        self.cross_confirmation_count = 0

    def validate_parameters(self):
        # 参数校验逻辑，略
        pass 