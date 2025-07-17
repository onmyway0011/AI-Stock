#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 格式化工具

提供各种数据格式化功能。
"""

from decimal import Decimal
from typing import Union, Optional
import locale


class FormatUtils:
    """格式化工具类"""
    
    @staticmethod
    def format_price(price: Union[int, float, Decimal], precision: int = 4) -> str:
        """
        格式化价格
        
        Args:
            price: 价格数值
            precision: 小数位数
            
        Returns:
            格式化后的价格字符串
        """
        if price is None:
            return "N/A"
        
        try:
            if isinstance(price, (int, float)):
                return f"{float(price):.{precision}f}"
            elif isinstance(price, Decimal):
                return f"{float(price):.{precision}f}"
            else:
                return str(price)
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_volume(volume: Union[int, float, Decimal]) -> str:
        """
        格式化成交量
        
        Args:
            volume: 成交量数值
            
        Returns:
            格式化后的成交量字符串
        """
        if volume is None:
            return "N/A"
        
        try:
            vol = float(volume)
            if vol >= 1_000_000_000:
                return f"{vol / 1_000_000_000:.2f}B"
            elif vol >= 1_000_000:
                return f"{vol / 1_000_000:.2f}M"
            elif vol >= 1_000:
                return f"{vol / 1_000:.2f}K"
            else:
                return f"{vol:.2f}"
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_percentage(value: Union[int, float, Decimal], precision: int = 2) -> str:
        """
        格式化百分比
        
        Args:
            value: 数值 (0-1之间表示百分比，>1表示已经是百分比)
            precision: 小数位数
            
        Returns:
            格式化后的百分比字符串
        """
        if value is None:
            return "N/A"
        
        try:
            val = float(value)
            # 如果值在0-1之间，认为是小数形式，需要转换为百分比
            if 0 <= abs(val) <= 1:
                val *= 100
            
            return f"{val:.{precision}f}%"
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_currency(
        amount: Union[int, float, Decimal], 
        currency: str = "USD",
        precision: int = 2
    ) -> str:
        """
        格式化货币
        
        Args:
            amount: 金额
            currency: 货币代码
            precision: 小数位数
            
        Returns:
            格式化后的货币字符串
        """
        if amount is None:
            return "N/A"
        
        try:
            amt = float(amount)
            
            # 根据货币类型选择符号
            symbols = {
                "USD": "$",
                "CNY": "¥", 
                "EUR": "€",
                "GBP": "£",
                "JPY": "¥",
                "BTC": "₿",
                "ETH": "Ξ",
            }
            
            symbol = symbols.get(currency.upper(), currency)
            
            # 格式化大数值
            if abs(amt) >= 1_000_000:
                return f"{symbol}{amt / 1_000_000:.{precision}f}M"
            elif abs(amt) >= 1_000:
                return f"{symbol}{amt / 1_000:.{precision}f}K"
            else:
                return f"{symbol}{amt:.{precision}f}"
                
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_number(
        number: Union[int, float, Decimal], 
        precision: int = 2,
        use_thousands_separator: bool = True
    ) -> str:
        """
        格式化数字
        
        Args:
            number: 数字
            precision: 小数位数
            use_thousands_separator: 是否使用千分位分隔符
            
        Returns:
            格式化后的数字字符串
        """
        if number is None:
            return "N/A"
        
        try:
            num = float(number)
            
            if use_thousands_separator:
                return f"{num:,.{precision}f}"
            else:
                return f"{num:.{precision}f}"
                
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_ratio(
        numerator: Union[int, float, Decimal],
        denominator: Union[int, float, Decimal],
        precision: int = 2
    ) -> str:
        """
        格式化比率
        
        Args:
            numerator: 分子
            denominator: 分母
            precision: 小数位数
            
        Returns:
            格式化后的比率字符串
        """
        if numerator is None or denominator is None:
            return "N/A"
        
        try:
            num = float(numerator)
            den = float(denominator)
            
            if den == 0:
                return "∞" if num > 0 else "-∞" if num < 0 else "N/A"
            
            ratio = num / den
            return f"{ratio:.{precision}f}"
            
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_change(
        current: Union[int, float, Decimal],
        previous: Union[int, float, Decimal],
        as_percentage: bool = True,
        precision: int = 2
    ) -> str:
        """
        格式化变化值
        
        Args:
            current: 当前值
            previous: 之前值
            as_percentage: 是否显示为百分比
            precision: 小数位数
            
        Returns:
            格式化后的变化字符串
        """
        if current is None or previous is None:
            return "N/A"
        
        try:
            curr = float(current)
            prev = float(previous)
            
            if prev == 0:
                return "N/A"
            
            change = curr - prev
            
            if as_percentage:
                change_pct = (change / prev) * 100
                sign = "+" if change_pct > 0 else ""
                return f"{sign}{change_pct:.{precision}f}%"
            else:
                sign = "+" if change > 0 else ""
                return f"{sign}{change:.{precision}f}"
                
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_size(bytes_size: int) -> str:
        """
        格式化文件大小
        
        Args:
            bytes_size: 字节大小
            
        Returns:
            格式化后的大小字符串
        """
        if bytes_size is None:
            return "N/A"
        
        try:
            size = int(bytes_size)
            
            if size >= 1024**4:
                return f"{size / (1024**4):.2f} TB"
            elif size >= 1024**3:
                return f"{size / (1024**3):.2f} GB"
            elif size >= 1024**2:
                return f"{size / (1024**2):.2f} MB"
            elif size >= 1024:
                return f"{size / 1024:.2f} KB"
            else:
                return f"{size} B"
                
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_duration(seconds: Union[int, float]) -> str:
        """
        格式化时间段
        
        Args:
            seconds: 秒数
            
        Returns:
            格式化后的时间段字符串
        """
        if seconds is None:
            return "N/A"
        
        try:
            secs = int(seconds)
            if secs >= 86400:  # 天
                days = secs // 86400
                hours = (secs % 86400) // 3600
                return f"{days}天{hours}小时"
            elif secs >= 3600:  # 小时
                hours = secs // 3600
                minutes = (secs % 3600) // 60
                return f"{hours}小时{minutes}分钟"
            elif secs >= 60:  # 分钟
                minutes = secs // 60
                seconds_left = secs % 60
                return f"{minutes}分钟{seconds_left}秒"
            else:
                return f"{secs}秒"
                
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def truncate_string(text: str, max_length: int = 50, suffix: str = "...") -> str:
        """
        截断字符串
        
        Args:
            text: 原始字符串
            max_length: 最大长度
            suffix: 后缀
            
        Returns:
            截断后的字符串
        """
        if not text:
            return ""
        
        if len(text) <= max_length:
            return text
        
        return text[:max_length - len(suffix)] + suffix
    
    @staticmethod
    def pad_string(text: str, width: int, align: str = "left", fill_char: str = " ") -> str:
        """
        填充字符串
        
        Args:
            text: 原始字符串
            width: 目标宽度
            align: 对齐方式 ('left', 'right', 'center')
            fill_char: 填充字符
            
        Returns:
            填充后的字符串
        """
        if not text:
            text = ""
        
        if len(text) >= width:
            return text
        
        if align == "right":
            return text.rjust(width, fill_char)
        elif align == "center":
            return text.center(width, fill_char)
        else:  # left
            return text.ljust(width, fill_char)


# 导出
__all__ = ["FormatUtils"]