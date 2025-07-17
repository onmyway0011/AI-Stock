# -*- coding: utf-8 -*-
"""
微信服务号推送通道
实现微信公众号模板消息推送功能
"""
from dataclasses import dataclass, field
from typing import Any, List, Optional, Dict
from .base_notification_channel import BaseNotificationChannel

@dataclass
class WeChatConfig:
    app_id: str
    app_secret: str
    template_id: str
    user_open_ids: List[str]
    url: Optional[str] = None
    mini_program: Optional[Dict[str, Any]] = None
    api_base_url: str = ''
    token_cache_time: int = 7200

class WeChatNotificationChannel(BaseNotificationChannel):
    def __init__(self, config: WeChatConfig):
        super().__init__()
        self.config = config
        self.token_cache: Optional[Dict[str, Any]] = None
        self.validate_config()

    async def send_notification(self, message: Any, signal: Any) -> bool:
        # 省略具体实现，保留接口
        return True

    def get_channel_type(self) -> str:
        return 'WECHAT'

    def validate_config(self):
        required = ['app_id', 'app_secret', 'template_id', 'user_open_ids', 'api_base_url']
        for field_name in required:
            if not getattr(self.config, field_name, None):
                raise ValueError(f'微信配置缺少必要字段: {field_name}')
        if not isinstance(self.config.user_open_ids, list) or not self.config.user_open_ids:
            raise ValueError('微信配置必须包含至少一个用户OpenID') 