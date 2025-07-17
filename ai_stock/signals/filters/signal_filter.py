#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 信号过滤器

实现交易信号的过滤、验证和质量评估功能。
"""

from typing import List, Dict, Any, Optional, Set, Callable
from datetime import datetime, timedelta
import time
from dataclasses import dataclass
from collections import defaultdict

from ai_stock.core.types import Signal, OrderSide, SignalStrength, MarketData
from ai_stock.core.exceptions import SignalFilterError
from ai_stock.utils.logging_utils import get_logger
from ai_stock.utils.validation_utils import ValidationUtils
from ai_stock.utils.math_utils import MathUtils


@dataclass
class FilterRule:
    """过滤规则"""
    name: str
    enabled: bool
    priority: int
    filter_func: Callable[[Signal, Dict[str, Any]], bool]
    description: str


class SignalFilter:
    """信号过滤器"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.logger = get_logger("signal_filter")
        
        # 过滤配置
        self.min_confidence = self.config.get("min_confidence", 0.5)
        self.max_signals_per_symbol = self.config.get("max_signals_per_symbol", 3)
        self.signal_cooldown = self.config.get("signal_cooldown", 300)  # 5分钟冷却
        self.min_price_change = self.config.get("min_price_change", 0.005)  # 最小价格变化0.5%
        self.max_correlation = self.config.get("max_correlation", 0.8)  # 最大相关性
        
        # 市场过滤配置
        self.market_filters = {
            "min_volume": self.config.get("min_volume", 1000),
            "min_price": self.config.get("min_price", 0.01),
            "max_spread": self.config.get("max_spread", 0.05),  # 最大买卖价差5%
            "volatility_threshold": self.config.get("volatility_threshold", 0.1),  # 波动率阈值10%
        }
        
        # 风险过滤配置
        self.risk_filters = {
            "max_position_size": self.config.get("max_position_size", 0.1),  # 最大仓位10%
            "max_daily_signals": self.config.get("max_daily_signals", 20),
            "blacklist_symbols": set(self.config.get("blacklist_symbols", [])),
        }
        
        # 状态管理
        self._signal_history: List[Signal] = []
        self._symbol_last_signal: Dict[str, float] = {}
        self._daily_signal_count = 0
        self._last_reset_date = datetime.now().date()
        
        # 过滤规则
        self._filter_rules = self._initialize_filter_rules()
        
        # 统计信息
        self._stats = {
            "total_processed": 0,
            "total_filtered": 0,
            "filter_reasons": defaultdict(int),
            "accepted_signals": 0,
        }
        
        self.logger.info("信号过滤器初始化完成")
    
    def filter_signals(
        self,
        signals: List[Signal],
        market_data: Optional[Dict[str, MarketData]] = None
    ) -> List[Signal]:
        """
        过滤信号列表
        
        Args:
            signals: 待过滤的信号列表
            market_data: 市场数据字典
            
        Returns:
            过滤后的信号列表
        """
        if not signals:
            return []
        
        self._reset_daily_count_if_needed()
        
        filtered_signals = []
        context = {
            "market_data": market_data or {},
            "signal_history": self._signal_history,
            "current_time": time.time(),
        }
        
        for signal in signals:
            self._stats["total_processed"] += 1
            
            try:
                # 基础验证
                if not self._validate_signal_basic(signal):
                    continue
                
                # 应用过滤规则
                if self._apply_filter_rules(signal, context):
                    filtered_signals.append(signal)
                    self._stats["accepted_signals"] += 1
                    
                    # 更新状态
                    self._update_signal_state(signal)
                else:
                    self._stats["total_filtered"] += 1
                    
            except Exception as e:
                self.logger.error(f"信号过滤失败: {e}, 信号: {signal.id}")
                self._stats["total_filtered"] += 1
                continue
        
        # 后处理：去重、排序、限制数量
        final_signals = self._post_process_signals(filtered_signals)
        
        self.logger.debug(
            f"信号过滤完成: 输入{len(signals)}, 输出{len(final_signals)}, "
            f"过滤率{(len(signals) - len(final_signals)) / len(signals) * 100:.1f}%"
        )
        
        return final_signals
    
    def _initialize_filter_rules(self) -> List[FilterRule]:
        """初始化过滤规则"""
        rules = [
            FilterRule(
                name="confidence_filter",
                enabled=True,
                priority=1,
                filter_func=self._filter_by_confidence,
                description="按置信度过滤"
            ),
            FilterRule(
                name="cooldown_filter",
                enabled=True,
                priority=2,
                filter_func=self._filter_by_cooldown,
                description="按冷却时间过滤"
            ),
            FilterRule(
                name="volume_filter",
                enabled=True,
                priority=3,
                filter_func=self._filter_by_volume,
                description="按成交量过滤"
            ),
            FilterRule(
                name="price_filter",
                enabled=True,
                priority=4,
                filter_func=self._filter_by_price,
                description="按价格过滤"
            ),
            FilterRule(
                name="volatility_filter",
                enabled=self.config.get("volatility_filter_enabled", True),
                priority=5,
                filter_func=self._filter_by_volatility,
                description="按波动率过滤"
            ),
            FilterRule(
                name="blacklist_filter",
                enabled=True,
                priority=6,
                filter_func=self._filter_by_blacklist,
                description="黑名单过滤"
            ),
            FilterRule(
                name="duplicate_filter",
                enabled=True,
                priority=7,
                filter_func=self._filter_duplicates,
                description="重复信号过滤"
            ),
            FilterRule(
                name="daily_limit_filter",
                enabled=self.config.get("daily_limit_enabled", True),
                priority=8,
                filter_func=self._filter_by_daily_limit,
                description="每日信号数量限制"
            ),
        ]
        # 按优先级排序
        return sorted([r for r in rules if r.enabled], key=lambda x: x.priority)
    
    def _validate_signal_basic(self, signal: Signal) -> bool:
        """基础信号验证"""
        try:
            errors = ValidationUtils.validate_signal(signal)
            if errors:
                self._log_filter_reason(signal, "validation_failed", f"验证失败: {'; '.join(errors)}")
                return False
            return True
        except Exception as e:
            self._log_filter_reason(signal, "validation_error", f"验证异常: {e}")
            return False
    
    def _apply_filter_rules(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """应用所有过滤规则"""
        for rule in self._filter_rules:
            try:
                if not rule.filter_func(signal, context):
                    return False
            except Exception as e:
                self.logger.error(f"过滤规则 {rule.name} 执行失败: {e}")
                return False
        
        return True
    
    def _filter_by_confidence(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """按置信度过滤"""
        if signal.confidence < self.min_confidence:
            self._log_filter_reason(
                signal, "low_confidence", 
                f"置信度({signal.confidence:.3f}) < 最小要求({self.min_confidence})"
            )
            return False
        return True
    def _filter_by_cooldown(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """按冷却时间过滤"""
        symbol = signal.symbol
        current_time = context["current_time"]
        
        last_signal_time = self._symbol_last_signal.get(symbol, 0)
        if current_time - last_signal_time < self.signal_cooldown:
            self._log_filter_reason(
                signal, "cooldown", 
                f"冷却时间未到: {current_time - last_signal_time:.1f}s < {self.signal_cooldown}s"
            )
            return False
        
        return True
    
    def _filter_by_volume(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """按成交量过滤"""
        market_data = context["market_data"].get(signal.symbol)
        if not market_data or not market_data.klines:
            return True  # 无数据时不过滤
        
        latest_kline = market_data.klines[-1]
        if latest_kline.volume < self.market_filters["min_volume"]:
            self._log_filter_reason(
                signal, "low_volume",
                f"成交量({latest_kline.volume:.0f}) < 最小要求({self.market_filters['min_volume']})"
            )
            return False
        
        return True
    
    def _filter_by_price(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """按价格过滤"""
        if signal.price < self.market_filters["min_price"]:
            self._log_filter_reason(
                signal, "low_price",
                f"价格({signal.price:.6f}) < 最小要求({self.market_filters['min_price']})"
            )
            return False
        
        return True
    
    def _filter_by_volatility(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """按波动率过滤"""
        market_data = context["market_data"].get(signal.symbol)
        if not market_data or not market_data.klines:
            return True  # 无数据时不过滤
        
        # 计算近期波动率
        prices = [k.close for k in market_data.klines[-20:]]  # 最近20个周期
        if len(prices) < 10:
            return True
        
        volatility = MathUtils.calculate_volatility(prices, len(prices))
        if not volatility:
            return True
        
        current_vol = volatility[-1] if volatility else 0
        threshold = self.market_filters["volatility_threshold"]
        if current_vol > threshold:
            self._log_filter_reason(
                signal, "high_volatility",
                f"波动率({current_vol:.4f}) > 阈值({threshold})"
            )
            return False
        
        return True
    
    def _filter_by_blacklist(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """黑名单过滤"""
        if signal.symbol in self.risk_filters["blacklist_symbols"]:
            self._log_filter_reason(signal, "blacklisted", f"交易对在黑名单中: {signal.symbol}")
            return False
        
        return True
    
    def _filter_duplicates(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """重复信号过滤"""
        signal_history = context["signal_history"]
        current_time = context["current_time"]
        
        for historical_signal in signal_history[-50:]:  # 检查最近50个信号
            # 时间窗口检查（10分钟内）
            if current_time - (historical_signal.timestamp / 1000) > 600:
                continue
            
            # 检查是否为相似信号
            if self._are_signals_similar(signal, historical_signal):
                self._log_filter_reason(
                    signal, "duplicate",
                    f"与历史信号相似: {historical_signal.id}"
                )
                return False
        
        return True
    
    def _filter_by_daily_limit(self, signal: Signal, context: Dict[str, Any]) -> bool:
        """每日信号数量限制"""
        if self._daily_signal_count >= self.risk_filters["max_daily_signals"]:
            self._log_filter_reason(
                signal, "daily_limit",
                f"已达每日信号上限: {self._daily_signal_count}/{self.risk_filters['max_daily_signals']}"
            )
            return False
        
        return True
    
    def _are_signals_similar(self, signal1: Signal, signal2: Signal) -> bool:
        """判断两个信号是否相似"""
        # 相同交易对和方向
        if signal1.symbol != signal2.symbol or signal1.side != signal2.side:
            return False
        
        # 价格相近（1%以内）
        price_diff = abs(signal1.price - signal2.price) / signal2.price
        if price_diff > 0.01:
            return False
        
        # 置信度相近
        confidence_diff = abs(signal1.confidence - signal2.confidence)
        if confidence_diff > 0.1:
            return False
        
        return True
    
    def _post_process_signals(self, signals: List[Signal]) -> List[Signal]:
        """后处理信号：去重、排序、限制数量"""
        if not signals:
            return []
        
        # 按置信度降序排序
        signals.sort(key=lambda s: s.confidence, reverse=True)
        
        # 按交易对分组并限制每个交易对的信号数量
        symbol_groups = defaultdict(list)
        for signal in signals:
            symbol_groups[signal.symbol].append(signal)
        
        final_signals = []
        for symbol, symbol_signals in symbol_groups.items():
            # 每个交易对最多保留指定数量的信号
            limited_signals = symbol_signals[:self.max_signals_per_symbol]
            final_signals.extend(limited_signals)
        
        # 最终排序
        final_signals.sort(key=lambda s: s.confidence, reverse=True)
        
        return final_signals
    
    def _update_signal_state(self, signal: Signal) -> None:
        """更新信号状态"""
        current_time = time.time()
        
        # 更新交易对最后信号时间
        self._symbol_last_signal[signal.symbol] = current_time
        
        # 添加到历史记录
        self._signal_history.append(signal)
        
        # 限制历史记录大小
        if len(self._signal_history) > 1000:
            self._signal_history = self._signal_history[-500:]
        
        # 更新每日计数
        self._daily_signal_count += 1
    
    def _reset_daily_count_if_needed(self) -> None:
        """检查并重置每日计数"""
        current_date = datetime.now().date()
        if current_date != self._last_reset_date:
            self._daily_signal_count = 0
            self._last_reset_date = current_date
            self.logger.info(f"每日信号计数已重置: {current_date}")
    
    def _log_filter_reason(self, signal: Signal, reason: str, details: str) -> None:
        """记录过滤原因"""
        self._stats["filter_reasons"][reason] += 1
        self.logger.debug(f"信号被过滤: {signal.symbol} - {reason}: {details}")
    
    def add_blacklist_symbol(self, symbol: str) -> None:
        """添加黑名单交易对"""
        self.risk_filters["blacklist_symbols"].add(symbol.upper())
        self.logger.info(f"已添加黑名单交易对: {symbol}")
    
    def remove_blacklist_symbol(self, symbol: str) -> None:
        """移除黑名单交易对"""
        self.risk_filters["blacklist_symbols"].discard(symbol.upper())
        self.logger.info(f"已移除黑名单交易对: {symbol}")
    
    def update_config(self, config: Dict[str, Any]) -> None:
        """更新配置"""
        self.config.update(config)
        
        # 更新相关配置
        self.min_confidence = config.get("min_confidence", self.min_confidence)
        self.max_signals_per_symbol = config.get("max_signals_per_symbol", self.max_signals_per_symbol)
        self.signal_cooldown = config.get("signal_cooldown", self.signal_cooldown)
        
        # 重新初始化过滤规则
        self._filter_rules = self._initialize_filter_rules()
        
        self.logger.info("信号过滤器配置已更新")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        total_processed = self._stats["total_processed"]
        filter_rate = (self._stats["total_filtered"] / total_processed * 100) if total_processed > 0 else 0
        
        return {
            "total_processed": total_processed,
            "total_filtered": self._stats["total_filtered"],
            "accepted_signals": self._stats["accepted_signals"],
            "filter_rate": f"{filter_rate:.1f}%",
            "daily_signal_count": self._daily_signal_count,
            "daily_limit": self.risk_filters["max_daily_signals"],
            "filter_reasons": dict(self._stats["filter_reasons"]),
            "blacklist_count": len(self.risk_filters["blacklist_symbols"]),
            "active_rules": len([r for r in self._filter_rules if r.enabled]),
        }
    
    def reset_stats(self) -> None:
        """重置统计信息"""
        self._stats = {
            "total_processed": 0,
            "total_filtered": 0,
            "filter_reasons": defaultdict(int),
            "accepted_signals": 0,
        }
        self.logger.info("统计信息已重置")
    
    def get_blacklist(self) -> Set[str]:
        """获取黑名单列表"""
        return self.risk_filters["blacklist_symbols"].copy()
    def clear_history(self) -> None:
        """清理历史记录"""
        self._signal_history.clear()
        self._symbol_last_signal.clear()
        self.logger.info("信号历史记录已清理")


# 导出
__all__ = ["SignalFilter", "FilterRule"]