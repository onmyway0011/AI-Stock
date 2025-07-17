#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 日期时间工具

提供日期时间处理功能。
"""

from datetime import datetime, timedelta, timezone
from typing import Union, Optional
import time
import pytz


class DateUtils:
    """日期时间工具类"""
    
    # 常用时区
    UTC = timezone.utc
    BEIJING = pytz.timezone('Asia/Shanghai')
    NEW_YORK = pytz.timezone('America/New_York')
    LONDON = pytz.timezone('Europe/London')
    TOKYO = pytz.timezone('Asia/Tokyo')
    
    @staticmethod
    def now() -> datetime:
        """获取当前时间（UTC）"""
        return datetime.now(timezone.utc)
    
    @staticmethod
    def now_timestamp() -> int:
        """获取当前时间戳（毫秒）"""
        return int(time.time() * 1000)
    
    @staticmethod
    def timestamp_to_datetime(timestamp: Union[int, float]) -> datetime:
        """
        将时间戳转换为datetime对象
        
        Args:
            timestamp: 时间戳（毫秒或秒）
            
        Returns:
            datetime对象（UTC时区）
        """
        # 判断是毫秒还是秒
        if timestamp > 1e10:  # 毫秒时间戳
            timestamp = timestamp / 1000
        
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)
    
    @staticmethod
    def datetime_to_timestamp(dt: datetime) -> int:
        """
        将datetime对象转换为时间戳（毫秒）
        
        Args:
            dt: datetime对象
            
        Returns:
            时间戳（毫秒）
        """
        return int(dt.timestamp() * 1000)
    
    @staticmethod
    def format_timestamp(
        timestamp: Union[int, float],
        format_str: str = "%Y-%m-%d %H:%M:%S",
        timezone_info: Optional[timezone] = None
    ) -> str:
        """
        格式化时间戳
        
        Args:
            timestamp: 时间戳（毫秒或秒）
            format_str: 格式字符串
            timezone_info: 时区信息
            
        Returns:
            格式化后的时间字符串
        """
        try:
            dt = DateUtils.timestamp_to_datetime(timestamp)
            
            if timezone_info:
                dt = dt.astimezone(timezone_info)
            
            return dt.strftime(format_str)
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def format_datetime(
        dt: datetime,
        format_str: str = "%Y-%m-%d %H:%M:%S",
        timezone_info: Optional[timezone] = None
    ) -> str:
        """
        格式化datetime对象
        
        Args:
            dt: datetime对象
            format_str: 格式字符串
            timezone_info: 时区信息
            
        Returns:
            格式化后的时间字符串
        """
        try:
            if timezone_info and dt.tzinfo:
                dt = dt.astimezone(timezone_info)
            
            return dt.strftime(format_str)
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def parse_date_string(
        date_str: str,
        format_str: str = "%Y-%m-%d",
        timezone_info: Optional[timezone] = None
    ) -> datetime:
        """
        解析日期字符串
        
        Args:
            date_str: 日期字符串
            format_str: 格式字符串
            timezone_info: 时区信息
            
        Returns:
            datetime对象
        """
        dt = datetime.strptime(date_str, format_str)
        
        if timezone_info:
            dt = dt.replace(tzinfo=timezone_info)
        else:
            dt = dt.replace(tzinfo=timezone.utc)
        
        return dt
    
    @staticmethod
    def get_trading_day_start(
        date: Union[datetime, str],
        timezone_info: timezone = UTC
    ) -> datetime:
        """
        获取交易日开始时间
        
        Args:
            date: 日期
            timezone_info: 时区信息
            
        Returns:
            交易日开始时间
        """
        if isinstance(date, str):
            dt = DateUtils.parse_date_string(date, "%Y-%m-%d", timezone_info)
        else:
            dt = date
        
        # 设置为当天00:00:00
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    
    @staticmethod
    def get_trading_day_end(
        date: Union[datetime, str],
        timezone_info: timezone = UTC
    ) -> datetime:
        """
        获取交易日结束时间
        
        Args:
            date: 日期
            timezone_info: 时区信息
            
        Returns:
            交易日结束时间
        """
        if isinstance(date, str):
            dt = DateUtils.parse_date_string(date, "%Y-%m-%d", timezone_info)
        else:
            dt = date
        
        # 设置为当天23:59:59
        return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    @staticmethod
    def get_market_timezone(market: str) -> timezone:
        """
        获取市场时区
        
        Args:
            market: 市场代码
            
        Returns:
            时区对象
        """
        market_timezones = {
            "US": DateUtils.NEW_YORK,
            "NYSE": DateUtils.NEW_YORK,
            "NASDAQ": DateUtils.NEW_YORK,
            "CN": DateUtils.BEIJING,
            "SSE": DateUtils.BEIJING,
            "SZSE": DateUtils.BEIJING,
            "HK": pytz.timezone('Asia/Hong_Kong'),
            "HKEX": pytz.timezone('Asia/Hong_Kong'),
            "JP": DateUtils.TOKYO,
            "TSE": DateUtils.TOKYO,
            "UK": DateUtils.LONDON,
            "LSE": DateUtils.LONDON,
            "CRYPTO": DateUtils.UTC,  # 加密货币24小时交易
        }
        
        return market_timezones.get(market.upper(), DateUtils.UTC)
    
    @staticmethod
    def is_market_open(
        market: str,
        check_time: Optional[datetime] = None
    ) -> bool:
        """
        检查市场是否开放
        
        Args:
            market: 市场代码
            check_time: 检查时间（默认为当前时间）
            
        Returns:
            市场是否开放
        """
        if check_time is None:
            check_time = DateUtils.now()
        
        market_tz = DateUtils.get_market_timezone(market)
        local_time = check_time.astimezone(market_tz)
        
        # 加密货币市场24小时开放
        if market.upper() == "CRYPTO":
            return True
        
        # 检查是否为周末
        if local_time.weekday() >= 5:  # 5=Saturday, 6=Sunday
            return False
        
        # 不同市场的交易时间
        market_hours = {
            "US": (9.5, 16),      # 9:30 AM - 4:00 PM EST
            "NYSE": (9.5, 16),
            "NASDAQ": (9.5, 16),
            "CN": (9.5, 15),      # 9:30 AM - 3:00 PM CST (with lunch break)
            "SSE": (9.5, 15),
            "SZSE": (9.5, 15),
            "HK": (9.5, 16),      # 9:30 AM - 4:00 PM HKT
            "HKEX": (9.5, 16),
            "JP": (9, 15),        # 9:00 AM - 3:00 PM JST
            "TSE": (9, 15),
            "UK": (8, 16.5),      # 8:00 AM - 4:30 PM GMT
            "LSE": (8, 16.5),
        }
        
        hours = market_hours.get(market.upper())
        if not hours:
            return False
        start_hour, end_hour = hours
        current_hour = local_time.hour + local_time.minute / 60
        
        # 中国市场有午休时间
        if market.upper() in ["CN", "SSE", "SZSE"]:
            morning_end = 11.5  # 11:30 AM
            afternoon_start = 13  # 1:00 PM
            
            return (start_hour <= current_hour <= morning_end) or \
                   (afternoon_start <= current_hour <= end_hour)
        
        return start_hour <= current_hour <= end_hour
    
    @staticmethod
    def get_business_days(
        start_date: datetime,
        end_date: datetime,
        exclude_weekends: bool = True
    ) -> int:
        """
        计算工作日数量
        
        Args:
            start_date: 开始日期
            end_date: 结束日期
            exclude_weekends: 是否排除周末
            
        Returns:
            工作日数量
        """
        total_days = (end_date - start_date).days + 1
        
        if not exclude_weekends:
            return total_days
        
        # 计算周末天数
        weekend_days = 0
        current_date = start_date
        
        while current_date <= end_date:
            if current_date.weekday() >= 5:  # Saturday or Sunday
                weekend_days += 1
            current_date += timedelta(days=1)
        return total_days - weekend_days
    
    @staticmethod
    def add_business_days(
        start_date: datetime,
        business_days: int,
        exclude_weekends: bool = True
    ) -> datetime:
        """
        添加工作日
        
        Args:
            start_date: 开始日期
            business_days: 工作日数量
            exclude_weekends: 是否排除周末
            
        Returns:
            结束日期
        """
        if not exclude_weekends:
            return start_date + timedelta(days=business_days)
        
        current_date = start_date
        days_added = 0
        
        while days_added < business_days:
            current_date += timedelta(days=1)
            if current_date.weekday() < 5:  # Monday to Friday
                days_added += 1
        
        return current_date
    
    @staticmethod
    def get_relative_time_string(timestamp: Union[int, float]) -> str:
        """
        获取相对时间字符串
        
        Args:
            timestamp: 时间戳（毫秒或秒）
            
        Returns:
            相对时间字符串
        """
        try:
            dt = DateUtils.timestamp_to_datetime(timestamp)
            now = DateUtils.now()
            diff = now - dt
            
            seconds = int(diff.total_seconds())
            
            if seconds < 60:
                return f"{seconds}秒前"
            elif seconds < 3600:
                minutes = seconds // 60
                return f"{minutes}分钟前"
            elif seconds < 86400:
                hours = seconds // 3600
                return f"{hours}小时前"
            elif seconds < 604800:  # 7 days
                days = seconds // 86400
                return f"{days}天前"
            else:
                return DateUtils.format_datetime(dt, "%Y-%m-%d")
                
        except (ValueError, TypeError):
            return "N/A"
    
    @staticmethod
    def get_time_until_market_open(market: str) -> Optional[timedelta]:
        """
        获取距离市场开盘的时间
        
        Args:
            market: 市场代码
            
        Returns:
            距离开盘的时间，如果市场已开盘则返回None
        """
        if DateUtils.is_market_open(market):
            return None
        
        now = DateUtils.now()
        market_tz = DateUtils.get_market_timezone(market)
        local_now = now.astimezone(market_tz)
        # 计算下一个开盘时间
        next_open = local_now.replace(hour=9, minute=30, second=0, microsecond=0)
        
        # 如果当前时间已过开盘时间，计算下一个交易日
        if local_now.time() > next_open.time() or local_now.weekday() >= 5:
            days_to_add = 1
            
            # 如果是周五晚上或周末，跳到下周一
            if local_now.weekday() == 4 and local_now.time() > next_open.time():
                days_to_add = 3  # Friday to Monday
            elif local_now.weekday() == 5:  # Saturday
                days_to_add = 2  # Saturday to Monday
            elif local_now.weekday() == 6:  # Sunday
                days_to_add = 1  # Sunday to Monday
            
            next_open += timedelta(days=days_to_add)
        
        return next_open - local_now


# 导出
__all__ = ["DateUtils"]
