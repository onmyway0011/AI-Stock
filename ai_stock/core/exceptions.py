#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 异常处理模块

定义系统中使用的所有自定义异常类。
"""

from typing import Any, Dict, Optional


class AIStockError(Exception):
    """AI股票交易系统基础异常类"""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
    
    def __str__(self) -> str:
        if self.error_code:
            return f"[{self.error_code}] {self.message}"
        return self.message
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "error_code": self.error_code,
            "details": self.details,
        }


class DataCollectionError(AIStockError):
    """数据采集相关异常"""
    
    def __init__(
        self,
        message: str,
        source: Optional[str] = None,
        symbol: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.source = source
        self.symbol = symbol
        if source:
            self.details["source"] = source
        if symbol:
            self.details["symbol"] = symbol


class DataSourceError(DataCollectionError):
    """数据源连接异常"""
    pass


class DataParsingError(DataCollectionError):
    """数据解析异常"""
    pass


class DataValidationError(DataCollectionError):
    """数据验证异常"""
    pass


class RateLimitError(DataCollectionError):
    """API调用频率限制异常"""
    
    def __init__(
        self,
        message: str,
        retry_after: Optional[int] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.retry_after = retry_after
        if retry_after:
            self.details["retry_after"] = retry_after


class StrategyError(AIStockError):
    """策略相关异常"""
    
    def __init__(
        self,
        message: str,
        strategy_name: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.strategy_name = strategy_name
        if strategy_name:
            self.details["strategy_name"] = strategy_name


class StrategyInitializationError(StrategyError):
    """策略初始化异常"""
    pass


class StrategyExecutionError(StrategyError):
    """策略执行异常"""
    pass


class StrategyParameterError(StrategyError):
    """策略参数异常"""
    pass


class SignalGenerationError(AIStockError):
    """信号生成相关异常"""
    
    def __init__(
        self,
        message: str,
        signal_type: Optional[str] = None,
        symbol: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.signal_type = signal_type
        self.symbol = symbol
        if signal_type:
            self.details["signal_type"] = signal_type
        if symbol:
            self.details["symbol"] = symbol


class SignalValidationError(SignalGenerationError):
    """信号验证异常"""
    pass


class SignalFilterError(SignalGenerationError):
    """信号过滤异常"""
    pass


class BacktestError(AIStockError):
    """回测相关异常"""
    
    def __init__(
        self,
        message: str,
        backtest_id: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.backtest_id = backtest_id
        if backtest_id:
            self.details["backtest_id"] = backtest_id


class BacktestConfigError(BacktestError):
    """回测配置异常"""
    pass


class BacktestDataError(BacktestError):
    """回测数据异常"""
    pass


class BacktestExecutionError(BacktestError):
    """回测执行异常"""
    pass


class NotificationError(AIStockError):
    """通知相关异常"""
    
    def __init__(
        self,
        message: str,
        channel: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.channel = channel
        if channel:
            self.details["channel"] = channel


class NotificationChannelError(NotificationError):
    """通知渠道异常"""
    pass


class NotificationDeliveryError(NotificationError):
    """通知发送异常"""
    pass


class RiskManagementError(AIStockError):
    """风险管理相关异常"""
    
    def __init__(
        self,
        message: str,
        risk_type: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.risk_type = risk_type
        if risk_type:
            self.details["risk_type"] = risk_type


class PositionSizeError(RiskManagementError):
    """仓位大小异常"""
    pass


class DrawdownError(RiskManagementError):
    """回撤异常"""
    pass


class StopLossError(RiskManagementError):
    """止损异常"""
    pass


class ConfigurationError(AIStockError):
    """配置相关异常"""
    
    def __init__(
        self,
        message: str,
        config_key: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.config_key = config_key
        if config_key:
            self.details["config_key"] = config_key


class DatabaseError(AIStockError):
    """数据库相关异常"""
    
    def __init__(
        self,
        message: str,
        operation: Optional[str] = None,
        table: Optional[str] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.operation = operation
        self.table = table
        if operation:
            self.details["operation"] = operation
        if table:
            self.details["table"] = table


class NetworkError(AIStockError):
    """网络相关异常"""
    
    def __init__(
        self,
        message: str,
        url: Optional[str] = None,
        status_code: Optional[int] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.url = url
        self.status_code = status_code
        if url:
            self.details["url"] = url
        if status_code:
            self.details["status_code"] = status_code


class AuthenticationError(AIStockError):
    """认证相关异常"""
    pass


class AuthorizationError(AIStockError):
    """授权相关异常"""
    pass


class ValidationError(AIStockError):
    """数据验证异常"""
    
    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Optional[Any] = None,
        **kwargs
    ):
        super().__init__(message, **kwargs)
        self.field = field
        self.value = value
        if field:
            self.details["field"] = field
        if value is not None:
            self.details["value"] = str(value)


# 异常映射字典，用于错误码到异常类的映射
EXCEPTION_MAP = {
    "DATA_COLLECTION_ERROR": DataCollectionError,
    "DATA_SOURCE_ERROR": DataSourceError,
    "DATA_PARSING_ERROR": DataParsingError,
    "DATA_VALIDATION_ERROR": DataValidationError,
    "RATE_LIMIT_ERROR": RateLimitError,
    "STRATEGY_ERROR": StrategyError,
    "STRATEGY_INIT_ERROR": StrategyInitializationError,
    "STRATEGY_EXEC_ERROR": StrategyExecutionError,
    "STRATEGY_PARAM_ERROR": StrategyParameterError,
    "SIGNAL_GENERATION_ERROR": SignalGenerationError,
    "SIGNAL_VALIDATION_ERROR": SignalValidationError,
    "SIGNAL_FILTER_ERROR": SignalFilterError,
    "BACKTEST_ERROR": BacktestError,
    "BACKTEST_CONFIG_ERROR": BacktestConfigError,
    "BACKTEST_DATA_ERROR": BacktestDataError,
    "BACKTEST_EXEC_ERROR": BacktestExecutionError,
    "NOTIFICATION_ERROR": NotificationError,
    "NOTIFICATION_CHANNEL_ERROR": NotificationChannelError,
    "NOTIFICATION_DELIVERY_ERROR": NotificationDeliveryError,
    "RISK_MANAGEMENT_ERROR": RiskManagementError,
    "POSITION_SIZE_ERROR": PositionSizeError,
    "DRAWDOWN_ERROR": DrawdownError,
    "STOP_LOSS_ERROR": StopLossError,
    "CONFIG_ERROR": ConfigurationError,
    "DATABASE_ERROR": DatabaseError,
    "NETWORK_ERROR": NetworkError,
    "AUTH_ERROR": AuthenticationError,
    "AUTHZ_ERROR": AuthorizationError,
    "VALIDATION_ERROR": ValidationError,
}


def get_exception_class(error_code: str) -> type:
    """根据错误码获取异常类"""
    return EXCEPTION_MAP.get(error_code, AIStockError)


def create_exception(error_code: str, message: str, **kwargs) -> AIStockError:
    """根据错误码创建异常实例"""
    exception_class = get_exception_class(error_code)
    return exception_class(message, error_code=error_code, **kwargs)


# 导出所有异常类
__all__ = [
    # 基础异常
    "AIStockError",
    
    # 数据相关异常
    "DataCollectionError",
    "DataSourceError", 
    "DataParsingError",
    "DataValidationError",
    "RateLimitError",
    
    # 策略相关异常
    "StrategyError",
    "StrategyInitializationError",
    "StrategyExecutionError", 
    "StrategyParameterError",
    
    # 信号相关异常
    "SignalGenerationError",
    "SignalValidationError",
    "SignalFilterError",
    
    # 回测相关异常
    "BacktestError",
    "BacktestConfigError",
    "BacktestDataError",
    "BacktestExecutionError",
    
    # 通知相关异常
    "NotificationError",
    "NotificationChannelError", 
    "NotificationDeliveryError",
    
    # 风险管理异常
    "RiskManagementError",
    "PositionSizeError",
    "DrawdownError", 
    "StopLossError",
    
    # 系统相关异常
    "ConfigurationError",
    "DatabaseError",
    "NetworkError",
    "AuthenticationError",
    "AuthorizationError",
    "ValidationError",
    
    # 工具函数
    "get_exception_class",
    "create_exception",
    "EXCEPTION_MAP",
]