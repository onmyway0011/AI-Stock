# 常用工具类（Python版）
from typing import List, Optional, Union, Any
from datetime import datetime

class DateUtils:
    @staticmethod
    def format_timestamp(ts: int) -> str:
        d = datetime.fromtimestamp(ts / 1000)
        return f"{d.year}-{d.month:02d}-{d.day:02d} {d.hour:02d}:{d.minute:02d}"

class FormatUtils:
    @staticmethod
    def format_price(price: float) -> str:
        return f"{price:.2f}"

    @staticmethod
    def format_currency(amount: float) -> str:
        return f"¥{amount:.2f}"

    @staticmethod
    def format_percentage(value: float) -> str:
        return f"{value * 100:.2f}%"

    @staticmethod
    def format_volume(volume: float) -> str:
        if volume >= 1e8:
            return f"{volume / 1e8:.2f}亿"
        if volume >= 1e4:
            return f"{volume / 1e4:.2f}万"
        return f"{volume:.2f}"

class MathUtils:
    @staticmethod
    def sma(values: List[float], period: int) -> List[float]:
        if len(values) < period:
            return []
        return [sum(values[i:i+period]) / period for i in range(len(values) - period + 1)]

    @staticmethod
    def ema(values: List[float], period: int) -> List[float]:
        if len(values) < period:
            return []
        k = 2 / (period + 1)
        ema = []
        prev = sum(values[:period]) / period
        ema.append(prev)
        for v in values[period:]:
            prev = v * k + prev * (1 - k)
            ema.append(prev)
        return ema

    @staticmethod
    def standard_deviation(values: List[float]) -> float:
        if not values:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        return variance ** 0.5

    @staticmethod
    def max_drawdown(values: List[float]) -> float:
        if not values:
            return 0.0
        max_val = values[0]
        max_drawdown = 0.0
        for v in values:
            if v > max_val:
                max_val = v
            drawdown = (max_val - v) / max_val
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        return max_drawdown

    @staticmethod
    def sharpe_ratio(returns: List[float], risk_free_rate: float = 0.0) -> float:
        if not returns:
            return 0.0
        avg = sum(returns) / len(returns)
        std = MathUtils.standard_deviation(returns)
        if std == 0:
            return 0.0
        return (avg - risk_free_rate) / std

    @staticmethod
    def rsi(values: List[float], period: int = 14) -> float:
        if len(values) < period + 1:
            return 50.0
        gains = 0.0
        losses = 0.0
        for i in range(len(values) - period, len(values)):
            change = values[i] - values[i - 1]
            if change > 0:
                gains += change
            else:
                losses -= change
        avg_gain = gains / period
        avg_loss = losses / period
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    @staticmethod
    def subtract(a: Union[List[float], float], b: Union[List[float], float]) -> List[float]:
        if isinstance(a, list) and isinstance(b, list):
            return [v - (b[i] if i < len(b) else 0) for i, v in enumerate(a)]
        elif isinstance(a, list) and isinstance(b, (int, float)):
            return [v - b for v in a]
        elif isinstance(a, (int, float)) and isinstance(b, list):
            return [a - v for v in b]
        elif isinstance(a, (int, float)) and isinstance(b, (int, float)):
            return [a - b]
        return []

    @staticmethod
    def average(values: List[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    @staticmethod
    def percentile(values: List[float], percentile: float) -> float:
        if not values:
            return 0.0
        sorted_vals = sorted(values)
        idx = int((percentile / 100) * len(sorted_vals))
        return sorted_vals[min(idx, len(sorted_vals) - 1)]

class ValidationUtils:
    @staticmethod
    def validate_klines(klines: List[Any]) -> bool:
        if not isinstance(klines, list) or not klines:
            return False
        for k in klines:
            if not (
                isinstance(k, dict) and
                isinstance(k.get('openTime'), (int, float)) and
                isinstance(k.get('open'), (int, float)) and
                isinstance(k.get('high'), (int, float)) and
                isinstance(k.get('low'), (int, float)) and
                isinstance(k.get('close'), (int, float)) and
                isinstance(k.get('volume'), (int, float)) and
                isinstance(k.get('closeTime'), (int, float)) and
                isinstance(k.get('symbol'), str)
            ):
                return False
        return True

    @staticmethod
    def is_valid_price(price: float) -> bool:
        return isinstance(price, (int, float)) and price > 0 and price != float('inf')

    @staticmethod
    def is_valid_symbol(symbol: str) -> bool:
        import re
        return isinstance(symbol, str) and re.match(r'^[A-Z0-9\-_/]+$', symbol) and len(symbol) >= 6 