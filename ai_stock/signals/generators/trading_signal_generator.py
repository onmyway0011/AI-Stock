#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 交易信号生成器

实现基于技术分析和机器学习的交易信号生成功能。
"""

import uuid
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime
import time
import asyncio

from ai_stock.core.interfaces import BaseSignalGenerator
from ai_stock.core.types import MarketData, Signal, OrderSide, SignalStrength, Kline
from ai_stock.core.exceptions import SignalGenerationError, ValidationError
from ai_stock.utils.math_utils import MathUtils
from ai_stock.utils.logging_utils import get_logger
from ai_stock.utils.validation_utils import ValidationUtils


class TradingSignalGenerator(BaseSignalGenerator):
    """交易信号生成器"""
    
    def __init__(
        self,
        name: str = "TradingSignalGenerator",
        config: Optional[Dict[str, Any]] = None
    ):
        super().__init__(name)
        self.config = config or {}
        self.logger = get_logger(f"signal_generator.{name}")
        
        # 技术指标参数
        self.sma_short_period = self.config.get("sma_short_period", 10)
        self.sma_long_period = self.config.get("sma_long_period", 20)
        self.rsi_period = self.config.get("rsi_period", 14)
        self.rsi_oversold = self.config.get("rsi_oversold", 30)
        self.rsi_overbought = self.config.get("rsi_overbought", 70)
        self.bb_period = self.config.get("bb_period", 20)
        self.bb_std_dev = self.config.get("bb_std_dev", 2.0)
        
        # 信号配置
        self.min_confidence = self.config.get("min_confidence", 0.5)
        self.signal_cooldown = self.config.get("signal_cooldown", 300)  # 5分钟冷却
        
        # 状态管理
        self._last_signal_time: Dict[str, float] = {}
        self._signal_history: List[Signal] = []
        self._market_data_cache: Dict[str, MarketData] = {}
        
        # 回调函数
        self.on_signal_generated: Optional[Callable] = None
        
        self.logger.info(f"交易信号生成器初始化完成: {name}")
    
    def generate_signals(self, market_data: MarketData) -> List[Signal]:
        """
        生成交易信号
        
        Args:
            market_data: 市场数据
            
        Returns:
            生成的信号列表
        """
        try:
            if not market_data or not market_data.klines:
                self.logger.warning("市场数据为空，无法生成信号")
                return []
            
            symbol = market_data.symbol
            
            # 检查冷却时间
            if self._is_in_cooldown(symbol):
                self.logger.debug(f"信号生成在冷却期内: {symbol}")
                return []
            
            # 缓存市场数据
            self._market_data_cache[symbol] = market_data
            
            # 提取价格数据
            prices = [kline.close for kline in market_data.klines]
            volumes = [kline.volume for kline in market_data.klines]
            
            if len(prices) < max(self.sma_long_period, self.rsi_period, self.bb_period):
                self.logger.warning(f"数据不足，无法计算技术指标: {symbol}")
                return []
            
            # 计算技术指标
            indicators = self._calculate_indicators(prices, volumes)
            
            # 生成信号
            signals = []
            
            # 移动平均线交叉信号
            ma_signal = self._generate_ma_crossover_signal(symbol, prices, indicators)
            if ma_signal:
                signals.append(ma_signal)
            
            # RSI信号
            rsi_signal = self._generate_rsi_signal(symbol, prices, indicators)
            if rsi_signal:
                signals.append(rsi_signal)
            
            # 布林线信号
            bb_signal = self._generate_bollinger_signal(symbol, prices, indicators)
            if bb_signal:
                signals.append(bb_signal)
            
            # 成交量信号
            volume_signal = self._generate_volume_signal(symbol, prices, volumes)
            if volume_signal:
                signals.append(volume_signal)
            
            # 过滤信号
            filtered_signals = self.filter_signals(signals)
            
            # 更新统计
            self._update_stats(filtered_signals)
            
            # 触发回调
            for signal in filtered_signals:
                if self.on_signal_generated:
                    asyncio.create_task(self._safe_callback(signal))
            
            self.logger.info(f"生成信号: {symbol}, 原始: {len(signals)}, 过滤后: {len(filtered_signals)}")
            return filtered_signals
        except Exception as e:
            self.logger.error(f"信号生成失败: {e}")
            raise SignalGenerationError(f"信号生成失败: {e}", symbol=market_data.symbol) from e
    
    def _calculate_indicators(
        self,
        prices: List[float],
        volumes: List[float]
    ) -> Dict[str, Any]:
        """计算技术指标"""
        indicators = {}
        
        try:
            # 移动平均线
            indicators["sma_short"] = MathUtils.calculate_sma(prices, self.sma_short_period)
            indicators["sma_long"] = MathUtils.calculate_sma(prices, self.sma_long_period)
            
            # RSI
            indicators["rsi"] = MathUtils.calculate_rsi(prices, self.rsi_period)
            
            # 布林线
            bb_upper, bb_middle, bb_lower = MathUtils.calculate_bollinger_bands(
                prices, self.bb_period, self.bb_std_dev
            )
            indicators["bb_upper"] = bb_upper
            indicators["bb_middle"] = bb_middle
            indicators["bb_lower"] = bb_lower
            
            # MACD
            macd_line, signal_line, histogram = MathUtils.calculate_macd(prices)
            indicators["macd_line"] = macd_line
            indicators["macd_signal"] = signal_line
            indicators["macd_histogram"] = histogram
            
            # 波动率
            indicators["volatility"] = MathUtils.calculate_volatility(prices)
            
            # 成交量移动平均
            indicators["volume_ma"] = MathUtils.calculate_sma(volumes, 20) if volumes else []
            
        except Exception as e:
            self.logger.error(f"技术指标计算失败: {e}")
            raise SignalGenerationError(f"技术指标计算失败: {e}") from e
        
        return indicators
    
    def _generate_ma_crossover_signal(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """生成移动平均线交叉信号"""
        sma_short = indicators.get("sma_short", [])
        sma_long = indicators.get("sma_long", [])
        
        if len(sma_short) < 2 or len(sma_long) < 2:
            return None
        
        # 检查交叉
        current_short = sma_short[-1]
        current_long = sma_long[-1]
        prev_short = sma_short[-2]
        prev_long = sma_long[-2]
        
        current_price = prices[-1]
        
        # 金叉：短期均线上穿长期均线
        if prev_short <= prev_long and current_short > current_long:
            confidence = self._calculate_ma_confidence(current_short, current_long, prices)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"移动平均线金叉: SMA{self.sma_short_period}({current_short:.4f}) > SMA{self.sma_long_period}({current_long:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        # 死叉：短期均线下穿长期均线
        elif prev_short >= prev_long and current_short < current_long:
            confidence = self._calculate_ma_confidence(current_long, current_short, prices)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"移动平均线死叉: SMA{self.sma_short_period}({current_short:.4f}) < SMA{self.sma_long_period}({current_long:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    
    def _generate_rsi_signal(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """生成RSI信号"""
        rsi_values = indicators.get("rsi", [])
        
        if not rsi_values:
            return None
        
        current_rsi = rsi_values[-1]
        current_price = prices[-1]
        
        # RSI超卖信号
        if current_rsi < self.rsi_oversold:
            confidence = self._calculate_rsi_confidence(current_rsi, True)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"RSI超卖信号: RSI({current_rsi:.2f}) < {self.rsi_oversold}",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        # RSI超买信号
        elif current_rsi > self.rsi_overbought:
            confidence = self._calculate_rsi_confidence(current_rsi, False)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"RSI超买信号: RSI({current_rsi:.2f}) > {self.rsi_overbought}",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    
    def _generate_bollinger_signal(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """生成布林线信号"""
        bb_upper = indicators.get("bb_upper", [])
        bb_lower = indicators.get("bb_lower", [])
        bb_middle = indicators.get("bb_middle", [])
        
        if not bb_upper or not bb_lower or not bb_middle:
            return None
        
        current_price = prices[-1]
        current_upper = bb_upper[-1]
        current_lower = bb_lower[-1]
        current_middle = bb_middle[-1]
        
        # 价格触及下轨 - 买入信号
        if current_price <= current_lower:
            confidence = self._calculate_bb_confidence(current_price, current_lower, current_middle, True)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"布林线下轨支撑: 价格({current_price:.4f}) <= 下轨({current_lower:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        # 价格触及上轨 - 卖出信号
        elif current_price >= current_upper:
            confidence = self._calculate_bb_confidence(current_price, current_upper, current_middle, False)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"布林线上轨阻力: 价格({current_price:.4f}) >= 上轨({current_upper:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    
    def _generate_volume_signal(
        self,
        symbol: str,
        prices: List[float],
        volumes: List[float]
    ) -> Optional[Signal]:
        """生成成交量信号"""
        if len(volumes) < 20:
            return None
        
        current_volume = volumes[-1]
        avg_volume = sum(volumes[-20:]) / 20
        current_price = prices[-1]
        prev_price = prices[-2] if len(prices) > 1 else current_price
        
        # 放量上涨
        if (current_volume > avg_volume * 2 and 
            current_price > prev_price * 1.02):  # 价格上涨超过2%
            
            confidence = min(0.8, (current_volume / avg_volume) * 0.2)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"放量上涨: 成交量({current_volume:.0f}) > 均量({avg_volume:.0f})的{current_volume/avg_volume:.1f}倍",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        # 放量下跌
        elif (current_volume > avg_volume * 2 and 
              current_price < prev_price * 0.98):  # 价格下跌超过2%
            
            confidence = min(0.8, (current_volume / avg_volume) * 0.2)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"放量下跌: 成交量({current_volume:.0f}) > 均量({avg_volume:.0f})的{current_volume/avg_volume:.1f}倍",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    
    def filter_signals(self, signals: List[Signal]) -> List[Signal]:
        """过滤信号"""
        filtered = []
        
        for signal in signals:
            # 基本验证
            errors = ValidationUtils.validate_signal(signal)
            if errors:
                self.logger.warning(f"信号验证失败: {errors}")
                continue
            
            # 置信度过滤
            if signal.confidence < self.min_confidence:
                self.logger.debug(f"信号置信度过低: {signal.confidence}")
                continue
            
            # 重复信号过滤
            if self._is_duplicate_signal(signal):
                self.logger.debug(f"重复信号已过滤: {signal.symbol}")
                continue
            
            filtered.append(signal)
        
        return filtered
    
    def _calculate_ma_confidence(
        self,
        fast_ma: float,
        slow_ma: float,
        prices: List[float]
    ) -> float:
        """计算移动平均线信号置信度"""
        # 基于均线差距和价格趋势计算置信度
        ma_diff = abs(fast_ma - slow_ma) / slow_ma
        
        # 检查价格趋势一致性
        recent_prices = prices[-5:] if len(prices) >= 5 else prices
        trend_consistency = self._calculate_trend_consistency(recent_prices)
        
        # 基础置信度
        base_confidence = min(0.8, ma_diff * 10)
        
        # 趋势一致性调整
        confidence = base_confidence * trend_consistency
        return max(0.3, min(0.9, confidence))
    
    def _calculate_rsi_confidence(self, rsi_value: float, is_oversold: bool) -> float:
        """计算RSI信号置信度"""
        if is_oversold:
            # RSI越低，置信度越高
            distance = self.rsi_oversold - rsi_value
            confidence = 0.5 + (distance / self.rsi_oversold) * 0.4
        else:
            # RSI越高，置信度越高
            distance = rsi_value - self.rsi_overbought
            confidence = 0.5 + (distance / (100 - self.rsi_overbought)) * 0.4
        
        return max(0.3, min(0.9, confidence))
    
    def _calculate_bb_confidence(
        self,
        price: float,
        band: float,
        middle: float,
        is_lower_band: bool
    ) -> float:
        """计算布林线信号置信度"""
        # 计算价格到中轨的距离
        distance_to_middle = abs(price - middle) / middle
        
        # 计算带宽
        band_width = abs(band - middle) / middle
        
        # 基于价格相对位置计算置信度
        relative_position = distance_to_middle / band_width if band_width > 0 else 0
        confidence = 0.4 + min(0.5, relative_position * 0.5)
        
        return max(0.3, min(0.8, confidence))
    
    def _calculate_trend_consistency(self, prices: List[float]) -> float:
        """计算价格趋势一致性"""
        if len(prices) < 3:
            return 0.5
        
        changes = []
        for i in range(1, len(prices)):
            change = (prices[i] - prices[i-1]) / prices[i-1]
            changes.append(change)
        
        # 计算变化方向的一致性
        positive_changes = sum(1 for c in changes if c > 0)
        negative_changes = sum(1 for c in changes if c < 0)
        
        consistency = max(positive_changes, negative_changes) / len(changes)
        
        return consistency
    def _determine_signal_strength(self, confidence: float) -> SignalStrength:
        """根据置信度确定信号强度"""
        if confidence >= 0.8:
            return SignalStrength.STRONG
        elif confidence >= 0.6:
            return SignalStrength.MODERATE
        else:
            return SignalStrength.WEAK
    
    def _is_in_cooldown(self, symbol: str) -> bool:
        """检查是否在冷却期内"""
        last_time = self._last_signal_time.get(symbol, 0)
        return time.time() - last_time < self.signal_cooldown
    
    def _is_duplicate_signal(self, signal: Signal) -> bool:
        """检查是否为重复信号"""
        current_time = time.time()
        
        for historical_signal in self._signal_history[-10:]:  # 检查最近10个信号
            # 检查时间窗口（5分钟内）
            if current_time - (historical_signal.timestamp / 1000) > 300:
                continue
            
            # 检查相同交易对和方向
            if (historical_signal.symbol == signal.symbol and 
                historical_signal.side == signal.side):
                return True
        
        return False
    
    def _update_stats(self, signals: List[Signal]) -> None:
        """更新统计信息"""
        for signal in signals:
            self._last_signal_time[signal.symbol] = time.time()
            self._signal_history.append(signal)
            
            # 限制历史记录大小
            if len(self._signal_history) > 1000:
                self._signal_history = self._signal_history[-500:]
        
        # 更新内部统计
        self._stats["active_signals"] = len([
            s for s in self._signal_history 
            if time.time() - (s.timestamp / 1000) < 3600  # 1小时内的信号
        ])
        self._stats["total_signals_generated"] += len(signals)
        
        if self._stats["total_signals_generated"] > 0:
            confidence_sum = sum(s.confidence for s in signals)
            self._stats["avg_confidence"] = confidence_sum / len(signals)
    
    async def _safe_callback(self, signal: Signal) -> None:
        """安全执行回调"""
        try:
            if asyncio.iscoroutinefunction(self.on_signal_generated):
                await self.on_signal_generated(signal)
            else:
                self.on_signal_generated(signal)
        except Exception as e:
            self.logger.error(f"信号回调执行失败: {e}")
    
    def get_signal_history(self, symbol: Optional[str] = None, limit: int = 100) -> List[Signal]:
        """获取信号历史"""
        history = self._signal_history
        
        if symbol:
            history = [s for s in history if s.symbol == symbol]
        
        return history[-limit:] if limit else history
    def clear_history(self) -> None:
        """清理历史记录"""
        self._signal_history.clear()
        self._last_signal_time.clear()
        self._market_data_cache.clear()
        self.logger.info("信号历史已清理")


# 导出
__all__ = ["TradingSignalGenerator"]