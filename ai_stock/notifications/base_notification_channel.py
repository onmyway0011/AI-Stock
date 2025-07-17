# -*- coding: utf-8 -*-
"""
基础通知通道抽象类
定义通知通道的通用接口和行为
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional
import time

# 通道状态
class ChannelStatus(Enum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    ERROR = 'ERROR'
    MAINTENANCE = 'MAINTENANCE'

# 发送结果
dataclass
class SendResult:
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    retry_after: Optional[int] = None
    delivery_status: Optional[str] = None  # 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED'

# 通道统计信息
dataclass
class ChannelStatistics:
    total_sent: int = 0
    success_count: int = 0
    failure_count: int = 0
    average_response_time: float = 0.0
    uptime: float = field(default_factory=lambda: time.time())
    last_sent_time: Optional[float] = None
    last_error_time: Optional[float] = None

class BaseNotificationChannel(ABC):
    def __init__(self):
        self.is_enabled: bool = True
        self.status: ChannelStatus = ChannelStatus.ACTIVE
        self.statistics: ChannelStatistics = ChannelStatistics()
        self.error_count: int = 0
        self.max_retries: int = 3
        self.retry_delay: int = 1000  # ms

    @abstractmethod
    async def send_notification(self, message: Any, signal: Any) -> bool:
        """
        发送通知（抽象方法，子类必须实现）
        """
        pass

    @abstractmethod
    def get_channel_type(self) -> str:
        """
        获取通道类型（抽象方法，子类必须实现）
        """
        pass

    async def send_with_retry(self, message: Any, signal: Any) -> SendResult:
        start_time = time.time()
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                if not self.is_enabled or self.status != ChannelStatus.ACTIVE:
                    raise Exception(f'通道状态异常: {self.status}')
                success = await self.send_notification(message, signal)
                if success:
                    response_time = time.time() - start_time
                    self.update_statistics(True, response_time)
                    self.reset_error_count()
                    return SendResult(success=True, message_id=getattr(message, 'id', None), delivery_status='SENT')
                else:
                    raise Exception('发送失败，返回false')
            except Exception as e:
                last_error = str(e)
                if attempt < self.max_retries:
                    await self.sleep(self.retry_delay * attempt / 1000)
        response_time = time.time() - start_time
        self.update_statistics(False, response_time)
        self.increment_error_count()
        return SendResult(success=False, message_id=getattr(message, 'id', None), error=last_error, delivery_status='FAILED')

    async def sleep(self, seconds: float):
        import asyncio
        await asyncio.sleep(seconds)

    def enable(self):
        self.is_enabled = True
        if self.status == ChannelStatus.INACTIVE:
            self.set_status(ChannelStatus.ACTIVE)

    def disable(self):
        self.is_enabled = False
        self.set_status(ChannelStatus.INACTIVE)

    def set_status(self, status: ChannelStatus):
        self.status = status

    def is_available(self) -> bool:
        return self.is_enabled and self.status == ChannelStatus.ACTIVE

    def update_statistics(self, success: bool, response_time: float):
        self.statistics.total_sent += 1
        if success:
            self.statistics.success_count += 1
        else:
            self.statistics.failure_count += 1
        # 平均响应时间
        n = self.statistics.total_sent
        self.statistics.average_response_time = ((self.statistics.average_response_time * (n - 1)) + response_time) / n
        self.statistics.last_sent_time = time.time()

    def reset_statistics(self):
        self.statistics = ChannelStatistics()

    def increment_error_count(self):
        self.error_count += 1
        self.statistics.last_error_time = time.time()

    def reset_error_count(self):
        self.error_count = 0

    def get_statistics(self) -> ChannelStatistics:
        return self.statistics

    def get_error_count(self) -> int:
        return self.error_count 