#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 数据验证工具

提供各种数据验证功能。
"""

import re
from datetime import datetime
from typing import Any, List, Optional, Union
from ai_stock.core.exceptions import ValidationError
from ai_stock.core.types import Kline, Signal, Trade, OrderSide, SignalStrength


class ValidationUtils:
    """数据验证工具类"""
    
    @staticmethod
    def validate_symbol(symbol: str) -> bool:
        """
        验证交易对符号格式
        
        Args:
            symbol: 交易对符号
            
        Returns:
            是否有效
        """
        if not symbol or not isinstance(symbol, str):
            return False
        
        # 基本格式验证（字母数字组合，长度3-20）
        pattern = r'^[A-Z0-9]{3,20}$'
        return bool(re.match(pattern, symbol.upper()))
    
    @staticmethod
    def validate_price(price: Union[int, float]) -> bool:
        """
        验证价格
        
        Args:
            price: 价格
            
        Returns:
            是否有效
        """
        try:
            price_val = float(price)
            return price_val > 0 and not (price_val != price_val)  # 检查NaN
        except (TypeError, ValueError):
            return False
    
    @staticmethod
    def validate_volume(volume: Union[int, float]) -> bool:
        """
        验证成交量
        
        Args:
            volume: 成交量
            
        Returns:
            是否有效
        """
        try:
            volume_val = float(volume)
            return volume_val >= 0 and not (volume_val != volume_val)  # 检查NaN
        except (TypeError, ValueError):
            return False
    
    @staticmethod
    def validate_timestamp(timestamp: Union[int, float]) -> bool:
        """
        验证时间戳
        
        Args:
            timestamp: 时间戳
            
        Returns:
            是否有效
        """
        try:
            ts = int(timestamp)
            # 检查时间戳范围（1970年到2100年）
            min_ts = 0
            max_ts = 4102444800000  # 2100年的毫秒时间戳
            
            # 自动判断是秒还是毫秒时间戳
            if ts < 1e10:  # 秒时间戳
                ts *= 1000
            
            return min_ts <= ts <= max_ts
        except (TypeError, ValueError):
            return False
    
    @staticmethod
    def validate_confidence(confidence: Union[int, float]) -> bool:
        """
        验证置信度
        
        Args:
            confidence: 置信度
            
        Returns:
            是否有效
        """
        try:
            conf_val = float(confidence)
            return 0.0 <= conf_val <= 1.0
        except (TypeError, ValueError):
            return False
    
    @staticmethod
    def validate_percentage(percentage: Union[int, float]) -> bool:
        """
        验证百分比值
        
        Args:
            percentage: 百分比值
            
        Returns:
            是否有效
        """
        try:
            pct_val = float(percentage)
            return -1.0 <= pct_val <= 1.0
        except (TypeError, ValueError):
            return False
    
    @staticmethod
    def validate_kline(kline: Kline) -> List[str]:
        """
        验证K线数据
        
        Args:
            kline: K线数据
            
        Returns:
            错误消息列表，空列表表示验证通过
        """
        errors = []
        
        if not ValidationUtils.validate_symbol(kline.symbol):
            errors.append("交易对符号格式无效")
        
        if not ValidationUtils.validate_timestamp(kline.open_time):
            errors.append("开盘时间无效")
        
        if not ValidationUtils.validate_timestamp(kline.close_time):
            errors.append("收盘时间无效")
        
        if kline.close_time <= kline.open_time:
            errors.append("收盘时间必须大于开盘时间")
        
        for price_field in ['open', 'high', 'low', 'close']:
            price = getattr(kline, price_field)
            if not ValidationUtils.validate_price(price):
                errors.append(f"{price_field}价格无效")
        
        if kline.high < max(kline.open, kline.close):
            errors.append("最高价不能低于开盘价或收盘价")
        
        if kline.low > min(kline.open, kline.close):
            errors.append("最低价不能高于开盘价或收盘价")
        
        if not ValidationUtils.validate_volume(kline.volume):
            errors.append("成交量无效")
        
        if kline.quote_volume is not None and not ValidationUtils.validate_volume(kline.quote_volume):
            errors.append("成交额无效")
        
        return errors
    
    @staticmethod
    def validate_signal(signal: Signal) -> List[str]:
        """
        验证交易信号
        
        Args:
            signal: 交易信号
            
        Returns:
            错误消息列表，空列表表示验证通过
        """
        errors = []
        
        if not signal.id or not isinstance(signal.id, str):
            errors.append("信号ID无效")
        
        if not ValidationUtils.validate_symbol(signal.symbol):
            errors.append("交易对符号格式无效")
        
        if signal.side not in [OrderSide.BUY, OrderSide.SELL]:
            errors.append("订单方向无效")
        
        if not ValidationUtils.validate_price(signal.price):
            errors.append("信号价格无效")
        
        if not ValidationUtils.validate_confidence(signal.confidence):
            errors.append("置信度无效")
        
        if not signal.reason or not isinstance(signal.reason, str):
            errors.append("信号原因不能为空")
        
        if signal.strength not in [SignalStrength.STRONG, SignalStrength.MODERATE, SignalStrength.WEAK]:
            errors.append("信号强度无效")
        
        if signal.timestamp and not ValidationUtils.validate_timestamp(signal.timestamp):
            errors.append("时间戳无效")
        
        if signal.stop_loss is not None and not ValidationUtils.validate_price(signal.stop_loss):
            errors.append("止损价格无效")
        
        if signal.take_profit is not None and not ValidationUtils.validate_price(signal.take_profit):
            errors.append("止盈价格无效")
        
        if signal.volume is not None and not ValidationUtils.validate_volume(signal.volume):
            errors.append("交易量无效")
        
        # 逻辑验证
        if signal.side == OrderSide.BUY:
            if signal.stop_loss and signal.stop_loss >= signal.price:
                errors.append("买入信号的止损价格应低于信号价格")
            if signal.take_profit and signal.take_profit <= signal.price:
                errors.append("买入信号的止盈价格应高于信号价格")
        else:  # SELL
            if signal.stop_loss and signal.stop_loss <= signal.price:
                errors.append("卖出信号的止损价格应高于信号价格")
            if signal.take_profit and signal.take_profit >= signal.price:
                errors.append("卖出信号的止盈价格应低于信号价格")
        
        return errors
    
    @staticmethod
    def validate_trade(trade: Trade) -> List[str]:
        """
        验证交易记录
        
        Args:
            trade: 交易记录
            
        Returns:
            错误消息列表，空列表表示验证通过
        """
        errors = []
        
        if not trade.id or not isinstance(trade.id, str):
            errors.append("交易ID无效")
        
        if not ValidationUtils.validate_symbol(trade.symbol):
            errors.append("交易对符号格式无效")
        
        if not ValidationUtils.validate_timestamp(trade.entry_time):
            errors.append("入场时间无效")
        
        if not ValidationUtils.validate_timestamp(trade.exit_time):
            errors.append("出场时间无效")
        
        if trade.exit_time <= trade.entry_time:
            errors.append("出场时间必须大于入场时间")
        
        if not ValidationUtils.validate_price(trade.entry_price):
            errors.append("入场价格无效")
        
        if not ValidationUtils.validate_price(trade.exit_price):
            errors.append("出场价格无效")
        
        if not ValidationUtils.validate_volume(trade.volume):
            errors.append("交易量无效")
        
        if trade.commission is not None and trade.commission < 0:
            errors.append("手续费不能为负数")
        
        if trade.side and trade.side not in [OrderSide.BUY, OrderSide.SELL]:
            errors.append("交易方向无效")
        
        # 计算验证
        expected_pnl = (trade.exit_price - trade.entry_price) * trade.volume
        if trade.side == OrderSide.SELL:
            expected_pnl = -expected_pnl
        
        if trade.commission:
            expected_pnl -= trade.commission
        
        if abs(trade.pnl - expected_pnl) > 0.01:  # 允许小误差
            errors.append("盈亏计算不正确")
        
        return errors
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        验证邮箱地址
        
        Args:
            email: 邮箱地址
            
        Returns:
            是否有效
        """
        if not email or not isinstance(email, str):
            return False
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """
        验证URL
        
        Args:
            url: URL地址
            
        Returns:
            是否有效
        """
        if not url or not isinstance(url, str):
            return False
        
        pattern = r'^https?://[^\s/$.?#].[^\s]*$'
        return bool(re.match(pattern, url))
    
    @staticmethod
    def validate_phone_number(phone: str, country_code: str = "CN") -> bool:
        """
        验证电话号码
        
        Args:
            phone: 电话号码
            country_code: 国家代码
            
        Returns:
            是否有效
        """
        if not phone or not isinstance(phone, str):
            return False
        
        # 移除所有非数字字符
        digits_only = re.sub(r'\D', '', phone)
        
        if country_code == "CN":
            # 中国手机号验证
            pattern = r'^1[3-9]\d{9}$'
            return bool(re.match(pattern, digits_only))
        elif country_code == "US":
            # 美国电话号码验证
            return len(digits_only) == 10 or (len(digits_only) == 11 and digits_only[0] == '1')
        else:
            # 通用验证：7-15位数字
            return 7 <= len(digits_only) <= 15
    
    @staticmethod
    def validate_date_range(start_date: str, end_date: str) -> bool:
        """
        验证日期范围
        
        Args:
            start_date: 开始日期 (YYYY-MM-DD)
            end_date: 结束日期 (YYYY-MM-DD)
            
        Returns:
            是否有效
        """
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = datetime.strptime(end_date, "%Y-%m-%d")
            return start < end
        except ValueError:
            return False
    
    @staticmethod
    def validate_json_structure(data: Any, expected_structure: dict) -> List[str]:
        """
        验证JSON数据结构
        
        Args:
            data: 待验证数据
            expected_structure: 期望的结构定义
            
        Returns:
            错误消息列表
        """
        errors = []
        
        def validate_recursive(obj, structure, path=""):
            if "type" in structure:
                expected_type = structure["type"]
                if not isinstance(obj, expected_type):
                    errors.append(f"{path}: 期望类型 {expected_type.__name__}，实际类型 {type(obj).__name__}")
                    return
            
            if "required_fields" in structure and isinstance(obj, dict):
                for field in structure["required_fields"]:
                    if field not in obj:
                        errors.append(f"{path}.{field}: 缺少必需字段")
            
            if "fields" in structure and isinstance(obj, dict):
                for field, field_structure in structure["fields"].items():
                    if field in obj:
                        validate_recursive(obj[field], field_structure, f"{path}.{field}")
            
            if "items" in structure and isinstance(obj, list):
                for i, item in enumerate(obj):
                    validate_recursive(item, structure["items"], f"{path}[{i}]")
        
        validate_recursive(data, expected_structure)
        return errors
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = 1000) -> str:
        """
        清理字符串
        
        Args:
            text: 原始字符串
            max_length: 最大长度
            
        Returns:
            清理后的字符串
        """
        if not isinstance(text, str):
            return ""
        
        # 移除控制字符
        cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        
        # 限制长度
        if len(cleaned) > max_length:
            cleaned = cleaned[:max_length]
        
        # 移除首尾空格
        return cleaned.strip()
    
    @staticmethod
    def validate_and_raise(
        data: Any,
        validator_func: callable,
        error_message: str = "数据验证失败"
    ) -> None:
        """
        验证数据并在失败时抛出异常
        
        Args:
            data: 待验证数据
            validator_func: 验证函数
            error_message: 错误消息
            
        Raises:
            ValidationError: 验证失败时抛出
        """
        if not validator_func(data):
            raise ValidationError(error_message, value=data)


# 导出
__all__ = ["ValidationUtils"]
