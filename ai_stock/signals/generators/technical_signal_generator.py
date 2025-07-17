#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 技术分析信号生成器

实现基于技术分析指标的交易信号生成功能。
"""

import uuid
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import time
import numpy as np

from ai_stock.core.interfaces import BaseSignalGenerator
from ai_stock.core.types import MarketData, Signal, OrderSide, SignalStrength, Kline
from ai_stock.core.exceptions import SignalGenerationError
from ai_stock.utils.math_utils import MathUtils
from ai_stock.utils.logging_utils import get_logger


class TechnicalSignalGenerator(BaseSignalGenerator):
    """技术分析信号生成器"""
    
    def __init__(
        self,
        name: str = "TechnicalSignalGenerator",
        config: Optional[Dict[str, Any]] = None
    ):
        super().__init__(name)
        self.config = config or {}
        self.logger = get_logger(f"technical_signal.{name}")
        
        # 技术指标配置
        self.indicators_config = {
            "sma": {
                "enabled": self.config.get("sma_enabled", True),
                "fast_period": self.config.get("sma_fast_period", 5),
                "slow_period": self.config.get("sma_slow_period", 20),
                "weight": self.config.get("sma_weight", 0.3)
            },
            "ema": {
                "enabled": self.config.get("ema_enabled", True),
                "fast_period": self.config.get("ema_fast_period", 12),
                "slow_period": self.config.get("ema_slow_period", 26),
                "weight": self.config.get("ema_weight", 0.25)
            },
            "rsi": {
                "enabled": self.config.get("rsi_enabled", True),
                "period": self.config.get("rsi_period", 14),
                "oversold": self.config.get("rsi_oversold", 30),
                "overbought": self.config.get("rsi_overbought", 70),
                "weight": self.config.get("rsi_weight", 0.2)
            },
            "macd": {
                "enabled": self.config.get("macd_enabled", True),
                "fast_period": self.config.get("macd_fast_period", 12),
                "slow_period": self.config.get("macd_slow_period", 26),
                "signal_period": self.config.get("macd_signal_period", 9),
                "weight": self.config.get("macd_weight", 0.25)
            },
            "bollinger": {
                "enabled": self.config.get("bb_enabled", True),
                "period": self.config.get("bb_period", 20),
                "std_dev": self.config.get("bb_std_dev", 2.0),
                "weight": self.config.get("bb_weight", 0.15)
            },
            "volume": {
                "enabled": self.config.get("volume_enabled", True),
                "period": self.config.get("volume_period", 20),
                "threshold": self.config.get("volume_threshold", 1.5),
                "weight": self.config.get("volume_weight", 0.1)
            }
        }
        
        # 信号合成配置
        self.signal_threshold = self.config.get("signal_threshold", 0.6)
        self.max_signals_per_symbol = self.config.get("max_signals_per_symbol", 3)
        
        self.logger.info(f"技术分析信号生成器初始化完成: {name}")
    
    def generate_signals(self, market_data: MarketData) -> List[Signal]:
        """
        生成技术分析信号
        
        Args:
            market_data: 市场数据
            
        Returns:
            生成的信号列表
        """
        try:
            if not market_data or not market_data.klines:
                return []
            
            symbol = market_data.symbol
            klines = market_data.klines
            
            # 提取价格和成交量数据
            prices = [k.close for k in klines]
            highs = [k.high for k in klines]
            lows = [k.low for k in klines]
            volumes = [k.volume for k in klines]
            
            # 检查数据充足性
            min_data_points = max(
                self.indicators_config["sma"]["slow_period"],
                self.indicators_config["ema"]["slow_period"],
                self.indicators_config["rsi"]["period"],
                self.indicators_config["bollinger"]["period"]
            )
            
            if len(prices) < min_data_points:
                self.logger.debug(f"数据不足，需要至少 {min_data_points} 个数据点: {symbol}")
                return []
            
            # 计算所有技术指标
            indicators = self._calculate_all_indicators(prices, highs, lows, volumes)
            
            # 生成各类技术信号
            signals = self._generate_technical_signals(symbol, klines, indicators)
            
            # 过滤和排序
            filtered_signals = self.filter_signals(signals)
            
            self.logger.debug(f"技术分析信号生成: {symbol}, 原始: {len(signals)}, 过滤后: {len(filtered_signals)}")
            return filtered_signals
            
        except Exception as e:
            self.logger.error(f"技术分析信号生成失败: {e}")
            raise SignalGenerationError(f"技术分析信号生成失败: {e}", symbol=market_data.symbol) from e
    
    def _calculate_all_indicators(
        self,
        prices: List[float],
        highs: List[float],
        lows: List[float],
        volumes: List[float]
    ) -> Dict[str, Any]:
        """计算所有技术指标"""
        indicators = {}
        
        try:
            # 移动平均线
            if self.indicators_config["sma"]["enabled"]:
                sma_fast = MathUtils.calculate_sma(prices, self.indicators_config["sma"]["fast_period"])
                sma_slow = MathUtils.calculate_sma(prices, self.indicators_config["sma"]["slow_period"])
                indicators["sma_fast"] = sma_fast
                indicators["sma_slow"] = sma_slow
            
            # 指数移动平均线
            if self.indicators_config["ema"]["enabled"]:
                ema_fast = MathUtils.calculate_ema(prices, self.indicators_config["ema"]["fast_period"])
                ema_slow = MathUtils.calculate_ema(prices, self.indicators_config["ema"]["slow_period"])
                indicators["ema_fast"] = ema_fast
                indicators["ema_slow"] = ema_slow
            
            # RSI
            if self.indicators_config["rsi"]["enabled"]:
                rsi = self._calculate_rsi(pd.Series(prices), self.indicators_config["rsi"]["period"])
                indicators["rsi"] = rsi
            
            # MACD
            if self.indicators_config["macd"]["enabled"]:
                macd_line, signal_line, histogram = self._calculate_macd(
                    pd.Series(prices),
                    self.indicators_config["macd"]["fast_period"],
                    self.indicators_config["macd"]["slow_period"],
                    self.indicators_config["macd"]["signal_period"]
                )
                indicators["macd"] = {
                    'macd_line': macd_line,
                    'signal_line': signal_line,
                    'histogram': histogram
                }
            
            # 布林线
            if self.indicators_config["bollinger"]["enabled"]:
                bb_upper, bb_middle, bb_lower = self._calculate_bollinger_bands(
                    pd.Series(prices),
                    self.indicators_config["bollinger"]["period"],
                    self.indicators_config["bollinger"]["std_dev"]
                )
                indicators["bollinger"] = {
                    'upper': bb_upper,
                    'middle': bb_middle,
                    'lower': bb_lower
                }
            # 成交量指标
            if self.indicators_config["volume"]["enabled"]:
                volume_ma = MathUtils.calculate_sma(volumes, self.indicators_config["volume"]["period"])
                indicators["volume_ma"] = volume_ma
                indicators["volume_ratio"] = self._calculate_volume_ratio(volumes, volume_ma)
            
            # 波动率
            volatility = MathUtils.calculate_volatility(prices, 20)
            indicators["volatility"] = volatility
            
            # 价格变化率
            indicators["price_change"] = self._calculate_price_changes(prices)
            
            # 支撑阻力位
            supports, resistances = MathUtils.calculate_support_resistance(prices)
            indicators["supports"] = supports
            indicators["resistances"] = resistances
            
        except Exception as e:
            self.logger.error(f"技术指标计算失败: {e}")
            raise
        
        return indicators
    def _generate_technical_signals(
        self,
        symbol: str,
        df: List[Kline],
        indicators: Dict[str, Any]
    ) -> List[Signal]:
        """基于技术指标生成信号"""
        signals = []
        current_price = df[-1].close
        current_time = df[-1].timestamp
        
        # 获取最新指标值
        latest_rsi = indicators['rsi'][-1] if indicators['rsi'] else 50.0
        latest_macd = indicators['macd']['macd_line'][-1] if indicators['macd']['macd_line'] else 0.0
        latest_signal = indicators['macd']['signal_line'][-1] if indicators['macd']['signal_line'] else 0.0
        latest_bb_upper = indicators['bollinger']['upper'][-1] if indicators['bollinger']['upper'] else current_price
        latest_bb_lower = indicators['bollinger']['lower'][-1] if indicators['bollinger']['lower'] else current_price
        latest_ma_short = indicators['sma_fast'][-1] if indicators['sma_fast'] else current_price
        latest_ma_long = indicators['sma_slow'][-1] if indicators['sma_slow'] else current_price
        latest_k = indicators['kdj']['k'][-1] if indicators['kdj']['k'] else 50.0
        latest_d = indicators['kdj']['d'][-1] if indicators['kdj']['d'] else 50.0
        
        # 计算各指标信号分数
        signal_scores = {}
        signal_reasons = []
        
        # RSI信号
        if latest_rsi <= self.indicators_config["rsi"]["oversold"]:
            signal_scores['rsi'] = 1.0  # 买入信号
            signal_reasons.append(f"RSI超卖({latest_rsi:.2f})")
        elif latest_rsi >= self.indicators_config["rsi"]["overbought"]:
            signal_scores['rsi'] = -1.0  # 卖出信号
            signal_reasons.append(f"RSI超买({latest_rsi:.2f})")
        else:
            signal_scores['rsi'] = 0.0
        
        # MACD信号
        if latest_macd > latest_signal:
            macd_score = min((latest_macd - latest_signal) / abs(latest_signal) * 2, 1.0) if latest_signal != 0 else 0.5
            signal_scores['macd'] = macd_score
            if macd_score > 0.3:
                signal_reasons.append(f"MACD金叉({latest_macd:.4f}>{latest_signal:.4f})")
        else:
            macd_score = max((latest_macd - latest_signal) / abs(latest_signal) * 2, -1.0) if latest_signal != 0 else -0.5
            signal_scores['macd'] = macd_score
            if macd_score < -0.3:
                signal_reasons.append(f"MACD死叉({latest_macd:.4f}<{latest_signal:.4f})")
        
        # 布林带信号
        if current_price <= latest_bb_lower:
            signal_scores['bollinger'] = 1.0  # 买入信号
            signal_reasons.append(f"触及布林带下轨({current_price:.2f}<={latest_bb_lower:.2f})")
        elif current_price >= latest_bb_upper:
            signal_scores['bollinger'] = -1.0  # 卖出信号
            signal_reasons.append(f"触及布林带上轨({current_price:.2f}>={latest_bb_upper:.2f})")
        else:
            signal_scores['bollinger'] = 0.0
        
        # 移动平均线信号
        if latest_ma_short > latest_ma_long:
            ma_score = min((latest_ma_short - latest_ma_long) / latest_ma_long, 0.1) * 10
            signal_scores['ma'] = ma_score
            if ma_score > 0.02:
                signal_reasons.append(f"短期均线上穿长期均线({latest_ma_short:.2f}>{latest_ma_long:.2f})")
        else:
            ma_score = max((latest_ma_short - latest_ma_long) / latest_ma_long, -0.1) * 10
            signal_scores['ma'] = ma_score
            if ma_score < -0.02:
                signal_reasons.append(f"短期均线下穿长期均线({latest_ma_short:.2f}<{latest_ma_long:.2f})")
        
        # KDJ信号
        if latest_k <= 20 and latest_d <= 20:
            signal_scores['kdj'] = 1.0  # 买入信号
            signal_reasons.append(f"KDJ超卖(K:{latest_k:.2f}, D:{latest_d:.2f})")
        elif latest_k >= 80 and latest_d >= 80:
            signal_scores['kdj'] = -1.0  # 卖出信号
            signal_reasons.append(f"KDJ超买(K:{latest_k:.2f}, D:{latest_d:.2f})")
        else:
            signal_scores['kdj'] = 0.0
        # 计算综合信号分数
        total_score = (
            signal_scores.get('rsi', 0) * self.indicators_config["rsi"]["weight"] +
            signal_scores.get('macd', 0) * self.indicators_config["macd"]["weight"] +
            signal_scores.get('bollinger', 0) * self.indicators_config["bollinger"]["weight"] +
            signal_scores.get('ma', 0) * self.indicators_config["sma"]["weight"] +
            signal_scores.get('kdj', 0) * self.indicators_config["kdj"]["weight"]
        )
        
        # 生成信号
        if abs(total_score) >= 0.3:  # 信号阈值
            # 确定信号方向
            side = OrderSide.BUY if total_score > 0 else OrderSide.SELL
            
            # 确定信号强度
            abs_score = abs(total_score)
            if abs_score >= 0.7:
                strength = SignalStrength.VERY_STRONG
            elif abs_score >= 0.5:
                strength = SignalStrength.STRONG
            else:
                strength = SignalStrength.MEDIUM
            
            # 计算置信度
            confidence = min(abs_score, 1.0)
            
            # 创建信号
            signal = Signal(
                id=f"tech_{symbol}_{int(current_time.timestamp())}",
                symbol=symbol,
                side=side,
                price=current_price,
                confidence=confidence,
                reason=f"技术分析: {', '.join(signal_reasons[:3])}" if signal_reasons else "技术分析信号",
                strength=strength,
                timestamp=int(current_time.timestamp() * 1000),
                indicators={
                    'rsi': latest_rsi,
                    'macd_line': latest_macd,
                    'macd_signal': latest_signal,
                    'bb_position': (current_price - latest_bb_lower) / (latest_bb_upper - latest_bb_lower) if latest_bb_upper != latest_bb_lower else 0.5,
                    'ma_spread': (latest_ma_short - latest_ma_long) / latest_ma_long if latest_ma_long != 0 else 0,
                    'kdj_k': latest_k,
                    'kdj_d': latest_d,
                    'total_score': total_score
                }
            )
            
            signals.append(signal)
        
        return signals
    def _calculate_rsi(self, prices: pd.Series, period: int) -> List[float]:
        """计算RSI指标"""
        prices_list = prices.tolist()
        return MathUtils.calculate_rsi(prices_list, period)
    
    def _calculate_macd(
        self,
        prices: pd.Series,
        fast_period: int,
        slow_period: int,
        signal_period: int
    ) -> Tuple[List[float], List[float], List[float]]:
        """计算MACD指标"""
        prices_list = prices.tolist()
        return MathUtils.calculate_macd(prices_list, fast_period, slow_period, signal_period)
    
    def _calculate_bollinger_bands(
        self,
        prices: pd.Series,
        period: int,
        std_multiplier: float
    ) -> Tuple[List[float], List[float], List[float]]:
        """计算布林带"""
        prices_list = prices.tolist()
        return MathUtils.calculate_bollinger_bands(prices_list, period, std_multiplier)
    def _calculate_kdj(
        self,
        highs: List[float],
        lows: List[float],
        closes: List[float],
        period: int,
        m1: int,
        m2: int
    ) -> Tuple[List[float], List[float], List[float]]:
        """计算KDJ指标"""
        return MathUtils.calculate_kdj(highs, lows, closes, period, m1, m2)
    
    def _generate_trend_signals(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> List[Signal]:
        """生成趋势跟随信号"""
        signals = []
        current_price = prices[-1]
        
        # SMA交叉信号
        if self.indicators_config["sma"]["enabled"]:
            sma_signal = self._check_ma_crossover(
                symbol, current_price, 
                indicators.get("sma_fast", []),
                indicators.get("sma_slow", []),
                "SMA"
            )
            if sma_signal:
                signals.append(sma_signal)
        
        # EMA交叉信号
        if self.indicators_config["ema"]["enabled"]:
            ema_signal = self._check_ma_crossover(
                symbol, current_price,
                indicators.get("ema_fast", []),
                indicators.get("ema_slow", []),
                "EMA"
            )
            if ema_signal:
                signals.append(ema_signal)
        
        # MACD信号
        if self.indicators_config["macd"]["enabled"]:
            macd_signal = self._check_macd_signal(symbol, current_price, indicators)
            if macd_signal:
                signals.append(macd_signal)
        
        return signals
    
    def _generate_mean_reversion_signals(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> List[Signal]:
        """生成均值回归信号"""
        signals = []
        current_price = prices[-1]
        
        # RSI超买超卖信号
        if self.indicators_config["rsi"]["enabled"]:
            rsi_signal = self._check_rsi_signal(symbol, current_price, indicators)
            if rsi_signal:
                signals.append(rsi_signal)
        
        # 布林线信号
        if self.indicators_config["bollinger"]["enabled"]:
            bb_signal = self._check_bollinger_signal(symbol, current_price, indicators)
            if bb_signal:
                signals.append(bb_signal)
        
        return signals
    
    def _generate_momentum_signals(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> List[Signal]:
        """生成动量信号"""
        signals = []
        current_price = prices[-1]
        
        # 价格突破信号
        breakthrough_signal = self._check_price_breakthrough(symbol, current_price, prices, indicators)
        if breakthrough_signal:
            signals.append(breakthrough_signal)
        
        # 成交量确认信号
        if self.indicators_config["volume"]["enabled"]:
            volume_signal = self._check_volume_confirmation(symbol, current_price, indicators)
            if volume_signal:
                signals.append(volume_signal)
        
        return signals
    
    def _generate_volatility_signals(
        self,
        symbol: str,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> List[Signal]:
        """生成波动率信号"""
        signals = []
        current_price = prices[-1]
        volatility = indicators.get("volatility", [])
        if not volatility:
            return signals
        
        current_vol = volatility[-1]
        avg_vol = sum(volatility[-20:]) / len(volatility[-20:]) if len(volatility) >= 20 else current_vol
        
        # 低波动率突破信号
        if current_vol < avg_vol * 0.5:  # 波动率显著降低
            price_changes = indicators.get("price_change", [])
            if price_changes and abs(price_changes[-1]) > 0.02:  # 价格变化超过2%
                side = OrderSide.BUY if price_changes[-1] > 0 else OrderSide.SELL
                
                signal = Signal(
                    id=str(uuid.uuid4()),
                    symbol=symbol,
                    side=side,
                    price=current_price,
                    confidence=0.6,
                    reason=f"低波动率突破: 波动率({current_vol:.4f}) < 平均({avg_vol:.4f}), 价格变化{price_changes[-1]:.2%}",
                    strength=SignalStrength.MODERATE,
                    timestamp=int(time.time() * 1000)
                )
                signals.append(signal)
        
        return signals
    
    def _check_ma_crossover(
        self,
        symbol: str,
        current_price: float,
        fast_ma: List[float],
        slow_ma: List[float],
        ma_type: str
    ) -> Optional[Signal]:
        """检查移动平均线交叉"""
        if len(fast_ma) < 2 or len(slow_ma) < 2:
            return None
        
        current_fast = fast_ma[-1]
        current_slow = slow_ma[-1]
        prev_fast = fast_ma[-2]
        prev_slow = slow_ma[-2]
        
        # 金叉
        if prev_fast <= prev_slow and current_fast > current_slow:
            confidence = min(0.8, abs(current_fast - current_slow) / current_slow * 10)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"{ma_type}金叉: 快线({current_fast:.4f}) > 慢线({current_slow:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        # 死叉
        elif prev_fast >= prev_slow and current_fast < current_slow:
            confidence = min(0.8, abs(current_slow - current_fast) / current_slow * 10)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"{ma_type}死叉: 快线({current_fast:.4f}) < 慢线({current_slow:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    
    def _check_rsi_signal(
        self,
        symbol: str,
        current_price: float,
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """检查RSI信号"""
        rsi_values = indicators.get("rsi", [])
        if not rsi_values:
            return None
        
        current_rsi = rsi_values[-1]
        rsi_config = self.indicators_config["rsi"]
        
        if current_rsi < rsi_config["oversold"]:
            confidence = 0.5 + (rsi_config["oversold"] - current_rsi) / rsi_config["oversold"] * 0.3
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"RSI超卖: {current_rsi:.2f} < {rsi_config['oversold']}",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        elif current_rsi > rsi_config["overbought"]:
            confidence = 0.5 + (current_rsi - rsi_config["overbought"]) / (100 - rsi_config["overbought"]) * 0.3
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"RSI超买: {current_rsi:.2f} > {rsi_config['overbought']}",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    def _check_macd_signal(
        self,
        symbol: str,
        current_price: float,
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """检查MACD信号"""
        macd_line = indicators.get("macd_line", [])
        signal_line = indicators.get("macd_signal", [])
        histogram = indicators.get("macd_histogram", [])
        
        if len(macd_line) < 2 or len(signal_line) < 2:
            return None
        current_macd = macd_line[-1]
        current_signal = signal_line[-1]
        prev_macd = macd_line[-2]
        prev_signal = signal_line[-2]
        
        # MACD线上穿信号线
        if prev_macd <= prev_signal and current_macd > current_signal:
            confidence = min(0.7, abs(current_macd - current_signal) * 100)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"MACD金叉: MACD({current_macd:.4f}) > 信号线({current_signal:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        # MACD线下穿信号线
        elif prev_macd >= prev_signal and current_macd < current_signal:
            confidence = min(0.7, abs(current_signal - current_macd) * 100)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"MACD死叉: MACD({current_macd:.4f}) < 信号线({current_signal:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    def _check_bollinger_signal(
        self,
        symbol: str,
        current_price: float,
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """检查布林线信号"""
        bb_upper = indicators.get("bb_upper", [])
        bb_lower = indicators.get("bb_lower", [])
        bb_middle = indicators.get("bb_middle", [])
        
        if not bb_upper or not bb_lower or not bb_middle:
            return None
        current_upper = bb_upper[-1]
        current_lower = bb_lower[-1]
        current_middle = bb_middle[-1]
        
        # 价格触及下轨
        if current_price <= current_lower:
            confidence = 0.6 + min(0.2, (current_lower - current_price) / current_price)
            
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
        
        # 价格触及上轨
        elif current_price >= current_upper:
            confidence = 0.6 + min(0.2, (current_price - current_upper) / current_price)
            
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
    
    def _check_price_breakthrough(
        self,
        symbol: str,
        current_price: float,
        prices: List[float],
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """检查价格突破"""
        if len(prices) < 20:
            return None
        
        # 计算近期高点和低点
        recent_prices = prices[-20:]
        recent_high = max(recent_prices[:-1])  # 排除当前价格
        recent_low = min(recent_prices[:-1])
        
        # 向上突破
        if current_price > recent_high * 1.02:  # 突破幅度超过2%
            confidence = min(0.8, (current_price - recent_high) / recent_high * 5)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.BUY,
                price=current_price,
                confidence=confidence,
                reason=f"向上突破: 价格({current_price:.4f}) > 近期高点({recent_high:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        # 向下突破
        elif current_price < recent_low * 0.98:  # 突破幅度超过2%
            confidence = min(0.8, (recent_low - current_price) / recent_low * 5)
            
            return Signal(
                id=str(uuid.uuid4()),
                symbol=symbol,
                side=OrderSide.SELL,
                price=current_price,
                confidence=confidence,
                reason=f"向下突破: 价格({current_price:.4f}) < 近期低点({recent_low:.4f})",
                strength=self._determine_signal_strength(confidence),
                timestamp=int(time.time() * 1000)
            )
        
        return None
    
    def _check_volume_confirmation(
        self,
        symbol: str,
        current_price: float,
        indicators: Dict[str, Any]
    ) -> Optional[Signal]:
        """检查成交量确认信号"""
        volume_ratio = indicators.get("volume_ratio", [])
        if not volume_ratio:
            return None
        
        current_ratio = volume_ratio[-1]
        threshold = self.indicators_config["volume"]["threshold"]
        
        if current_ratio > threshold:
            # 需要结合价格变化判断方向
            price_changes = indicators.get("price_change", [])
            if not price_changes:
                return None
            
            current_change = price_changes[-1]
            if abs(current_change) > 0.01:  # 价格变化超过1%
                side = OrderSide.BUY if current_change > 0 else OrderSide.SELL
                confidence = min(0.7, current_ratio / threshold * 0.3)
                
                return Signal(
                    id=str(uuid.uuid4()),
                    symbol=symbol,
                    side=side,
                    price=current_price,
                    confidence=confidence,
                    reason=f"成交量确认: 量比({current_ratio:.2f}) > {threshold}, 价格变化{current_change:.2%}",
                    strength=self._determine_signal_strength(confidence),
                    timestamp=int(time.time() * 1000)
                )
        
        return None
    
    def _calculate_volume_ratio(
        self,
        volumes: List[float],
        volume_ma: List[float]
    ) -> List[float]:
        """计算成交量比率"""
        if not volume_ma:
            return []
        
        ratios = []
        start_idx = len(volumes) - len(volume_ma)
        for i, avg_vol in enumerate(volume_ma):
            vol_idx = start_idx + i
            if vol_idx < len(volumes) and avg_vol > 0:
                ratio = volumes[vol_idx] / avg_vol
                ratios.append(ratio)
            else:
                ratios.append(1.0)
        
        return ratios
    
    def _calculate_price_changes(self, prices: List[float]) -> List[float]:
        """计算价格变化率"""
        changes = []
        for i in range(1, len(prices)):
            change = (prices[i] - prices[i-1]) / prices[i-1]
            changes.append(change)
        return changes
    
    def _score_signals(
        self,
        signals: List[Signal],
        indicators: Dict[str, Any]
    ) -> List[Signal]:
        """为信号评分"""
        scored_signals = []
        
        for signal in signals:
            # 基础评分就是置信度
            base_score = signal.confidence
            
            # 根据指标一致性调整评分
            consistency_bonus = self._calculate_indicator_consistency(signal, indicators)
            
            # 最终评分
            final_confidence = min(0.95, base_score + consistency_bonus)
            
            # 创建新的信号对象
            scored_signal = Signal(
                id=signal.id,
                symbol=signal.symbol,
                side=signal.side,
                price=signal.price,
                confidence=final_confidence,
                reason=signal.reason,
                strength=self._determine_signal_strength(final_confidence),
                timestamp=signal.timestamp,
                stop_loss=signal.stop_loss,
                take_profit=signal.take_profit,
                volume=signal.volume
            )
            
            scored_signals.append(scored_signal)
        
        return scored_signals
    
    def _calculate_indicator_consistency(
        self,
        signal: Signal,
        indicators: Dict[str, Any]
    ) -> float:
        """计算指标一致性加分"""
        consistency_score = 0.0
        checked_indicators = 0
        
        # 检查其他指标是否支持该信号方向
        if "rsi" in indicators and indicators["rsi"]:
            rsi = indicators["rsi"][-1]
            if signal.side == OrderSide.BUY and rsi < 50:
                consistency_score += 0.05
            elif signal.side == OrderSide.SELL and rsi > 50:
                consistency_score += 0.05
            checked_indicators += 1
        
        if "macd_line" in indicators and "macd_signal" in indicators:
            macd_line = indicators["macd_line"]
            macd_signal = indicators["macd_signal"]
            if macd_line and macd_signal:
                macd_diff = macd_line[-1] - macd_signal[-1]
                if signal.side == OrderSide.BUY and macd_diff > 0:
                    consistency_score += 0.05
                elif signal.side == OrderSide.SELL and macd_diff < 0:
                    consistency_score += 0.05
                checked_indicators += 1
        
        # 平均一致性奖励
        if checked_indicators > 0:
            return consistency_score
        
        return 0.0
    
    def _determine_signal_strength(self, confidence: float) -> SignalStrength:
        """确定信号强度"""
        if confidence >= 0.8:
            return SignalStrength.STRONG
        elif confidence >= 0.6:
            return SignalStrength.MODERATE
        else:
            return SignalStrength.WEAK
    
    def filter_signals(self, signals: List[Signal]) -> List[Signal]:
        """过滤信号"""
        # 按置信度排序
        signals.sort(key=lambda s: s.confidence, reverse=True)
        
        # 按交易对分组并限制数量
        symbol_groups = {}
        for signal in signals:
            if signal.symbol not in symbol_groups:
                symbol_groups[signal.symbol] = []
            
            if len(symbol_groups[signal.symbol]) < self.max_signals_per_symbol:
                symbol_groups[signal.symbol].append(signal)
        
        # 合并所有信号
        filtered = []
        for symbol_signals in symbol_groups.values():
            filtered.extend(symbol_signals)
        
        # 最终过滤：置信度阈值
        final_signals = [s for s in filtered if s.confidence >= self.signal_threshold]
        
        return final_signals


# 导出
__all__ = ["TechnicalSignalGenerator"]