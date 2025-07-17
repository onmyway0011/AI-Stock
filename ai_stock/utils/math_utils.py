#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 数学计算工具

提供各种数学计算和统计分析功能。
"""

import math
import statistics
from typing import List, Union, Optional, Tuple
import numpy as np
from decimal import Decimal


class MathUtils:
    """数学计算工具类"""
    
    @staticmethod
    def safe_divide(
        numerator: Union[int, float, Decimal],
        denominator: Union[int, float, Decimal],
        default: Union[int, float, Decimal] = 0
    ) -> Union[int, float, Decimal]:
        """
        安全除法，避免除零错误
        
        Args:
            numerator: 分子
            denominator: 分母
            default: 默认值（当分母为0时返回）
            
        Returns:
            除法结果或默认值
        """
        try:
            if denominator == 0:
                return default
            return numerator / denominator
        except (TypeError, ZeroDivisionError):
            return default
    
    @staticmethod
    def calculate_percentage_change(
        current: Union[int, float, Decimal],
        previous: Union[int, float, Decimal]
    ) -> float:
        """
        计算百分比变化
        
        Args:
            current: 当前值
            previous: 之前值
            
        Returns:
            百分比变化 (-1 到 +∞)
        """
        if previous == 0:
            return 0.0
        
        try:
            return float((current - previous) / previous)
        except (TypeError, ZeroDivisionError):
            return 0.0
    
    @staticmethod
    def calculate_sma(prices: List[float], period: int) -> List[float]:
        """
        计算简单移动平均线 (SMA)
        
        Args:
            prices: 价格列表
            period: 周期
            
        Returns:
            SMA值列表
        """
        if len(prices) < period:
            return []
        
        sma_values = []
        for i in range(period - 1, len(prices)):
            sma = sum(prices[i - period + 1:i + 1]) / period
            sma_values.append(sma)
        
        return sma_values
    
    @staticmethod
    def calculate_ema(prices: List[float], period: int) -> List[float]:
        """
        计算指数移动平均线 (EMA)
        
        Args:
            prices: 价格列表
            period: 周期
            
        Returns:
            EMA值列表
        """
        if len(prices) < period:
            return []
        
        alpha = 2 / (period + 1)
        ema_values = []
        
        # 第一个EMA值使用SMA
        first_ema = sum(prices[:period]) / period
        ema_values.append(first_ema)
        
        # 后续EMA值
        for i in range(period, len(prices)):
            ema = alpha * prices[i] + (1 - alpha) * ema_values[-1]
            ema_values.append(ema)
        
        return ema_values
    
    @staticmethod
    def calculate_rsi(prices: List[float], period: int = 14) -> List[float]:
        """
        计算相对强弱指数 (RSI)
        
        Args:
            prices: 价格列表
            period: 周期（默认14）
            
        Returns:
            RSI值列表 (0-100)
        """
        if len(prices) < period + 1:
            return []
        
        # 计算价格变化
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        
        # 分离上涨和下跌
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [-d if d < 0 else 0 for d in deltas]
        
        rsi_values = []
        
        # 计算初始平均增益和损失
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        # 计算第一个RSI值
        if avg_loss == 0:
            rsi_values.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))
            rsi_values.append(rsi)
        
        # 计算后续RSI值
        for i in range(period, len(deltas)):
            avg_gain = (avg_gain * (period - 1) + gains[i]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i]) / period
            
            if avg_loss == 0:
                rsi_values.append(100.0)
            else:
                rs = avg_gain / avg_loss
                rsi = 100 - (100 / (1 + rs))
                rsi_values.append(rsi)
        
        return rsi_values
    
    @staticmethod
    def calculate_bollinger_bands(
        prices: List[float], 
        period: int = 20, 
        std_dev: float = 2.0
    ) -> Tuple[List[float], List[float], List[float]]:
        """
        计算布林线
        
        Args:
            prices: 价格列表
            period: 周期（默认20）
            std_dev: 标准差倍数（默认2.0）
            
        Returns:
            (上轨, 中轨, 下轨) 的元组
        """
        if len(prices) < period:
            return [], [], []
        
        middle_band = MathUtils.calculate_sma(prices, period)
        upper_band = []
        lower_band = []
        
        for i in range(period - 1, len(prices)):
            price_slice = prices[i - period + 1:i + 1]
            std = statistics.stdev(price_slice)
            ma = middle_band[i - period + 1]
            
            upper_band.append(ma + std_dev * std)
            lower_band.append(ma - std_dev * std)
        return upper_band, middle_band, lower_band
    
    @staticmethod
    def calculate_macd(
        prices: List[float],
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9
    ) -> Tuple[List[float], List[float], List[float]]:
        """
        计算MACD指标
        
        Args:
            prices: 价格列表
            fast_period: 快线周期（默认12）
            slow_period: 慢线周期（默认26）
            signal_period: 信号线周期（默认9）
            
        Returns:
            (MACD线, 信号线, 柱状图) 的元组
        """
        if len(prices) < slow_period:
            return [], [], []
        
        # 计算快慢EMA
        fast_ema = MathUtils.calculate_ema(prices, fast_period)
        slow_ema = MathUtils.calculate_ema(prices, slow_period)
        
        # 对齐数据（慢EMA开始较晚）
        start_idx = slow_period - fast_period
        fast_ema_aligned = fast_ema[start_idx:]
        
        # 计算MACD线
        macd_line = [fast - slow for fast, slow in zip(fast_ema_aligned, slow_ema)]
        
        # 计算信号线
        signal_line = MathUtils.calculate_ema(macd_line, signal_period)
        
        # 计算柱状图
        histogram = []
        signal_start = len(macd_line) - len(signal_line)
        for i in range(len(signal_line)):
            hist = macd_line[signal_start + i] - signal_line[i]
            histogram.append(hist)
        
        return macd_line, signal_line, histogram
    
    @staticmethod
    def calculate_volatility(prices: List[float], period: int = 20) -> List[float]:
        """
        计算波动率
        
        Args:
            prices: 价格列表
            period: 周期
            
        Returns:
            波动率列表
        """
        if len(prices) < period + 1:
            return []
        
        # 计算收益率
        returns = []
        for i in range(1, len(prices)):
            ret = math.log(prices[i] / prices[i-1])
            returns.append(ret)
        
        # 计算滚动波动率
        volatilities = []
        for i in range(period - 1, len(returns)):
            period_returns = returns[i - period + 1:i + 1]
            vol = statistics.stdev(period_returns) * math.sqrt(252)  # 年化
            volatilities.append(vol)
        
        return volatilities
    
    @staticmethod
    def calculate_sharpe_ratio(
        returns: List[float],
        risk_free_rate: float = 0.02
    ) -> float:
        """
        计算夏普比率
        
        Args:
            returns: 收益率列表
            risk_free_rate: 无风险利率（年化）
            
        Returns:
            夏普比率
        """
        if not returns:
            return 0.0
        
        try:
            avg_return = statistics.mean(returns)
            std_return = statistics.stdev(returns) if len(returns) > 1 else 0
            
            if std_return == 0:
                return 0.0
            
            # 年化处理
            excess_return = avg_return - risk_free_rate / 252  # 日收益率
            sharpe = excess_return / std_return * math.sqrt(252)
            
            return sharpe
        except (ZeroDivisionError, statistics.StatisticsError):
            return 0.0
    
    @staticmethod
    def calculate_max_drawdown(equity_curve: List[float]) -> Tuple[float, int, int]:
        """
        计算最大回撤
        
        Args:
            equity_curve: 资金曲线
            
        Returns:
            (最大回撤比例, 开始位置, 结束位置)
        """
        if not equity_curve:
            return 0.0, 0, 0
        
        peak = equity_curve[0]
        max_dd = 0.0
        max_dd_start = 0
        max_dd_end = 0
        current_dd_start = 0
        
        for i, value in enumerate(equity_curve):
            if value > peak:
                peak = value
                current_dd_start = i
            else:
                dd = (peak - value) / peak
                if dd > max_dd:
                    max_dd = dd
                    max_dd_start = current_dd_start
                    max_dd_end = i
        
        return max_dd, max_dd_start, max_dd_end
    
    @staticmethod
    def calculate_win_rate(trades: List[float]) -> float:
        """
        计算胜率
        
        Args:
            trades: 交易盈亏列表
            
        Returns:
            胜率 (0-1)
        """
        if not trades:
            return 0.0
        
        winning_trades = sum(1 for trade in trades if trade > 0)
        return winning_trades / len(trades)
    
    @staticmethod
    def calculate_profit_factor(trades: List[float]) -> float:
        """
        计算盈利因子
        
        Args:
            trades: 交易盈亏列表
            
        Returns:
            盈利因子
        """
        if not trades:
            return 0.0
        
        total_profit = sum(trade for trade in trades if trade > 0)
        total_loss = abs(sum(trade for trade in trades if trade < 0))
        
        if total_loss == 0:
            return float('inf') if total_profit > 0 else 0.0
        
        return total_profit / total_loss
    
    @staticmethod
    def calculate_correlation(x: List[float], y: List[float]) -> float:
        """
        计算相关系数
        
        Args:
            x: 第一组数据
            y: 第二组数据
            
        Returns:
            相关系数 (-1 到 1)
        """
        if len(x) != len(y) or len(x) < 2:
            return 0.0
        
        try:
            return statistics.correlation(x, y)
        except (statistics.StatisticsError, ValueError):
            return 0.0
    
    @staticmethod
    def normalize_data(data: List[float], method: str = "min_max") -> List[float]:
        """
        数据标准化
        
        Args:
            data: 原始数据
            method: 标准化方法 ("min_max", "z_score")
            
        Returns:
            标准化后的数据
        """
        if not data:
            return []
        
        if method == "min_max":
            min_val = min(data)
            max_val = max(data)
            if max_val == min_val:
                return [0.0] * len(data)
            return [(x - min_val) / (max_val - min_val) for x in data]
        
        elif method == "z_score":
            mean_val = statistics.mean(data)
            std_val = statistics.stdev(data) if len(data) > 1 else 1.0
            if std_val == 0:
                return [0.0] * len(data)
            return [(x - mean_val) / std_val for x in data]
        
        else:
            return data.copy()
    
    @staticmethod
    def calculate_support_resistance(
        prices: List[float],
        window: int = 10,
        threshold: float = 0.02
    ) -> Tuple[List[float], List[float]]:
        """
        计算支撑位和阻力位
        
        Args:
            prices: 价格列表
            window: 窗口大小
            threshold: 阈值
            
        Returns:
            (支撑位列表, 阻力位列表)
        """
        if len(prices) < window * 2:
            return [], []
        
        supports = []
        resistances = []
        
        for i in range(window, len(prices) - window):
            current_price = prices[i]
            
            # 检查是否为局部最低点（支撑位）
            is_support = True
            for j in range(i - window, i + window + 1):
                if j != i and prices[j] < current_price * (1 - threshold):
                    is_support = False
                    break
            
            if is_support:
                supports.append(current_price)
            
            # 检查是否为局部最高点（阻力位）
            is_resistance = True
            for j in range(i - window, i + window + 1):
                if j != i and prices[j] > current_price * (1 + threshold):
                    is_resistance = False
                    break
            
            if is_resistance:
                resistances.append(current_price)
        
        return supports, resistances
    
    @staticmethod
    def round_to_tick_size(price: float, tick_size: float) -> float:
        """
        将价格舍入到最小变动价位
        
        Args:
            price: 原始价格
            tick_size: 最小变动价位
            
        Returns:
            舍入后的价格
        """
        if tick_size <= 0:
            return price
        
        return round(price / tick_size) * tick_size


# 导出
__all__ = ["MathUtils"]