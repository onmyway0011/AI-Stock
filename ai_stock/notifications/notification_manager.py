# -*- coding: utf-8 -*-
"""
通知管理器
统一管理多个通知通道，支持消息通知开关控制
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from .base_notification_channel import BaseNotificationChannel

@dataclass
class NotificationConfig:
    enabled: bool
    quiet_hours: Optional[Dict[str, str]] = None  # {'start': 'HH:mm', 'end': 'HH:mm'}
    max_daily_notifications: Optional[int] = None
    notification_interval: int = 0
    enabled_channels: List[str] = field(default_factory=list)
    channels: Dict[str, Any] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)

@dataclass
class QueueItem:
    message: Any
    signal: Any
    channels: List[str]
    priority: int
    timestamp: float
    attempts: int

@dataclass
class NotificationStatistics:
    today_sent: int = 0
    total_sent: int = 0
    success_count: int = 0
    failure_count: int = 0
    channel_stats: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    queue_status: Dict[str, int] = field(default_factory=lambda: {'pending': 0, 'processing': 0, 'failed': 0})

class NotificationManager:
    def __init__(self, config: NotificationConfig):
        self.config = config
        self.channels: Dict[str, BaseNotificationChannel] = {}
        self.message_queue: List[QueueItem] = []
        self.processing_queue: set = set()
        self.is_processing: bool = False
        self.last_notification_time: float = 0
        self.daily_notification_count: int = 0
        self.current_date: str = ''
        self.statistics: NotificationStatistics = self.init_statistics()
        self.initialize_channels()
        self.start_queue_processor()

    async def send_signal_notification(self, signal: Any) -> bool:
        # 省略具体实现，保留接口
        return True

    async def send_custom_notification(self, title: str, content: str, channels: Optional[List[str]] = None, priority: str = 'MEDIUM') -> bool:
        # 省略具体实现，保留接口
        return True

    def add_channel(self, channel: BaseNotificationChannel):
        channel_type = channel.get_channel_type()
        self.channels[channel_type] = channel
        if channel_type not in self.statistics.channel_stats:
            self.statistics.channel_stats[channel_type] = {'sent': 0, 'success': 0, 'failure': 0}

    def remove_channel(self, channel_type: str):
        if channel_type in self.channels:
            self.channels[channel_type].disable()
            del self.channels[channel_type]

    def set_enabled(self, enabled: bool):
        self.config.enabled = enabled

    def set_quiet_hours(self, start: str, end: str):
        self.config.quiet_hours = {'start': start, 'end': end}

    def set_max_daily_notifications(self, max_count: int):
        self.config.max_daily_notifications = max_count

    def get_statistics(self) -> NotificationStatistics:
        return self.statistics

    def initialize_channels(self):
        # 省略具体实现，保留接口
        pass

    def start_queue_processor(self):
        # 省略具体实现，保留接口
        pass 