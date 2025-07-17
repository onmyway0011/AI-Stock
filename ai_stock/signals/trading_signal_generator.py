# 交易信号生成器（Python版）
from typing import List, Optional, Dict, Any
from ai_stock.types import MarketData, Kline, Signal, SignalStrength
from ai_stock.utils import MathUtils
from ai_stock.signals.base_signal_generator import BaseSignalGenerator, SignalGeneratorConfig
import time
import random

class TechnicalIndicators:
    def __init__(self, sma, ema, rsi, macd, bollinger, stochastic, atr, volume, support, resistance):
        self.sma = sma
        self.ema = ema
        self.rsi = rsi
        self.macd = macd
        self.bollinger = bollinger
        self.stochastic = stochastic
        self.atr = atr
        self.volume = volume
        self.support = support
        self.resistance = resistance

class TradingSignalGenerator(BaseSignalGenerator):
    def __init__(self, config: SignalGeneratorConfig):
        super().__init__(config)
        self.last_signal_time: int = 0
        self.weights = {
            'trend': 0.3,
            'momentum': 0.25,
            'volume': 0.15,
            'volatility': 0.15,
            'support_resistance': 0.15
        }

    def generate_signal(self, market_data: MarketData) -> Optional[Signal]:
        if not self.config.enabled or not market_data.klines or len(market_data.klines) < 50:
            return None
        symbol = market_data.symbol
        current_price = market_data.klines[-1].close
        if self.is_in_cooldown(symbol):
            return None
        indicators = self.calculate_technical_indicators(market_data.klines)
        market_condition = self.analyze_market_condition(market_data.klines, indicators)
        signal_type = self.determine_signal_type(indicators, market_condition)
        if signal_type == 'HOLD':
            return None
        confidence = self.calculate_confidence(indicators, market_condition, signal_type)
        if not confidence['meetsThreshold']:
            return None
        risk_assessment = self.assess_risk(indicators, market_condition, current_price)
        strength = self.determine_signal_strength(confidence)
        if not self.passes_filter(signal_type, strength, confidence):
            return None
        signal = Signal(
            id=self.generate_signal_id(),
            symbol=symbol,
            side=signal_type,
            price=current_price,
            confidence=confidence['overall'],
            reason=self.generate_signal_reason(signal_type, indicators, confidence),
            strength=strength,
            stopLoss=risk_assessment['stopLoss'],
            takeProfit=risk_assessment['takeProfit']
        )
        self.last_signal_time = int(time.time() * 1000)
        self.signal_history.append(signal)
        if len(self.signal_history) > 1000:
            self.signal_history = self.signal_history[-500:]
        return signal

    # 其余方法（calculate_technical_indicators、analyze_market_condition、determine_signal_type、calculate_confidence、assess_risk、determine_signal_strength、passes_filter、generate_signal_reason、等）
    # 可按 TypeScript 逻辑逐步迁移为 Python 静态/实例方法，类型安全、中文注释 