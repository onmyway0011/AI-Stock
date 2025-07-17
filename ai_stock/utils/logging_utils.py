#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 日志管理工具

提供日志配置和管理功能。
"""

import logging
import logging.handlers
import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any, Union
from datetime import datetime
import json


def setup_logger(
    name: str,
    log_file: Optional[Union[str, Path]] = None,
    level: Union[str, int] = logging.INFO,
    format_string: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
    console_output: bool = True,
    json_format: bool = False
) -> logging.Logger:
    """
    设置日志器
    
    Args:
        name: 日志器名称
        log_file: 日志文件路径
        level: 日志级别
        format_string: 日志格式字符串
        max_bytes: 单个日志文件最大字节数
        backup_count: 备份文件数量
        console_output: 是否输出到控制台
        json_format: 是否使用JSON格式
        
    Returns:
        配置好的日志器
    """
    logger = logging.getLogger(name)
    
    # 避免重复添加处理器
    if logger.handlers:
        return logger
    
    logger.setLevel(level)
    # 设置格式
    if format_string is None:
        if json_format:
            formatter = JSONFormatter()
        else:
            format_string = (
                "%(asctime)s - %(name)s - %(levelname)s - "
                "%(filename)s:%(lineno)d - %(message)s"
            )
            formatter = logging.Formatter(format_string)
    else:
        formatter = logging.Formatter(format_string)
    
    # 控制台处理器
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    # 文件处理器
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_path,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    获取日志器
    
    Args:
        name: 日志器名称
        
    Returns:
        日志器实例
    """
    return logging.getLogger(name)


class JSONFormatter(logging.Formatter):
    """JSON格式的日志格式化器"""
    
    def format(self, record: logging.LogRecord) -> str:
        """格式化日志记录为JSON"""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process": record.process,
            "thread": record.thread,
        }
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        # 添加额外字段
        for key, value in record.__dict__.items():
            if key not in log_data and not key.startswith('_'):
                log_data[key] = value
        
        return json.dumps(log_data, ensure_ascii=False)


class TradingLogger:
    """交易系统专用日志器"""
    
    def __init__(
        self,
        name: str = "ai_stock",
        log_dir: Optional[Union[str, Path]] = None,
        level: Union[str, int] = logging.INFO
    ):
        self.name = name
        self.log_dir = Path(log_dir) if log_dir else Path.home() / ".ai_stock" / "logs"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # 主日志器
        self.main_logger = setup_logger(
            name=f"{name}.main",
            log_file=self.log_dir / "main.log",
            level=level
        )
        
        # 交易日志器
        self.trade_logger = setup_logger(
            name=f"{name}.trade",
            log_file=self.log_dir / "trades.log",
            level=logging.INFO,
            console_output=False,
            json_format=True
        )
        
        # 错误日志器
        self.error_logger = setup_logger(
            name=f"{name}.error",
            log_file=self.log_dir / "errors.log",
            level=logging.ERROR,
            console_output=False
        )
        
        # 性能日志器
        self.performance_logger = setup_logger(
            name=f"{name}.performance",
            log_file=self.log_dir / "performance.log",
            level=logging.INFO,
            console_output=False,
            json_format=True
        )
    
    def info(self, message: str, **kwargs) -> None:
        """记录信息日志"""
        self.main_logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs) -> None:
        """记录警告日志"""
        self.main_logger.warning(message, extra=kwargs)
    
    def error(self, message: str, **kwargs) -> None:
        """记录错误日志"""
        self.main_logger.error(message, extra=kwargs)
        self.error_logger.error(message, extra=kwargs)
    
    def debug(self, message: str, **kwargs) -> None:
        """记录调试日志"""
        self.main_logger.debug(message, extra=kwargs)
    def log_trade(self, trade_data: Dict[str, Any]) -> None:
        """记录交易日志"""
        self.trade_logger.info("Trade executed", extra=trade_data)
    
    def log_signal(self, signal_data: Dict[str, Any]) -> None:
        """记录信号日志"""
        self.main_logger.info("Signal generated", extra=signal_data)
    
    def log_performance(self, performance_data: Dict[str, Any]) -> None:
        """记录性能日志"""
        self.performance_logger.info("Performance metrics", extra=performance_data)
    
    def log_backtest_start(self, config: Dict[str, Any]) -> None:
        """记录回测开始"""
        self.main_logger.info("Backtest started", extra={"config": config})
    
    def log_backtest_end(self, results: Dict[str, Any]) -> None:
        """记录回测结束"""
        self.main_logger.info("Backtest completed", extra={"results": results})
    
    def log_strategy_action(self, action: str, strategy: str, **kwargs) -> None:
        """记录策略动作"""
        self.main_logger.info(
            f"Strategy action: {action}",
            extra={"strategy": strategy, "action": action, **kwargs}
        )
    
    def log_data_collection(self, source: str, symbol: str, count: int) -> None:
        """记录数据采集"""
        self.main_logger.info(
            f"Data collected from {source}",
            extra={"source": source, "symbol": symbol, "count": count}
        )
    
    def log_notification_sent(self, channel: str, message: str, success: bool) -> None:
        """记录通知发送"""
        level = self.main_logger.info if success else self.main_logger.error
        level(
            f"Notification {'sent' if success else 'failed'}",
            extra={"channel": channel, "message": message, "success": success}
        )


class LogContext:
    """日志上下文管理器"""
    
    def __init__(self, logger: logging.Logger, operation: str, **context):
        self.logger = logger
        self.operation = operation
        self.context = context
        self.start_time = None
    
    def __enter__(self):
        self.start_time = datetime.now()
        self.logger.info(
            f"Starting {self.operation}",
            extra={"operation": self.operation, **self.context}
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (datetime.now() - self.start_time).total_seconds()
        
        if exc_type is None:
            self.logger.info(
                f"Completed {self.operation}",
                extra={
                    "operation": self.operation,
                    "duration": duration,
                    "status": "success",
                    **self.context
                }
            )
        else:
            self.logger.error(
                f"Failed {self.operation}",
                extra={
                    "operation": self.operation,
                    "duration": duration,
                    "status": "error",
                    "error": str(exc_val),
                    **self.context
                },
                exc_info=True
            )


def log_function_call(logger: logging.Logger, level: int = logging.DEBUG):
    """函数调用日志装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            func_name = func.__name__
            logger.log(
                level,
                f"Calling {func_name}",
                extra={"function": func_name, "args": str(args), "kwargs": str(kwargs)}
            )
            
            try:
                result = func(*args, **kwargs)
                logger.log(
                    level,
                    f"Completed {func_name}",
                    extra={"function": func_name, "status": "success"}
                )
                return result
            except Exception as e:
                logger.error(
                    f"Error in {func_name}",
                    extra={"function": func_name, "error": str(e)},
                    exc_info=True
                )
                raise
        
        return wrapper
    return decorator


class PerformanceLogger:
    """性能监控日志器"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        self.metrics = {}
    
    def start_timer(self, name: str) -> None:
        """开始计时"""
        self.metrics[name] = {"start_time": datetime.now()}
    
    def end_timer(self, name: str) -> Optional[float]:
        """结束计时并记录"""
        if name not in self.metrics:
            return None
        
        start_time = self.metrics[name]["start_time"]
        duration = (datetime.now() - start_time).total_seconds()
        
        self.logger.info(
            f"Performance metric: {name}",
            extra={"metric": name, "duration": duration, "unit": "seconds"}
        )
        
        del self.metrics[name]
        return duration
    
    def log_metric(self, name: str, value: Union[int, float], unit: str = "") -> None:
        """记录性能指标"""
        self.logger.info(
            f"Performance metric: {name}",
            extra={"metric": name, "value": value, "unit": unit}
        )
    
    def log_memory_usage(self) -> None:
        """记录内存使用情况"""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            
            self.logger.info(
                "Memory usage",
                extra={
                    "rss": memory_info.rss,
                    "vms": memory_info.vms,
                    "percent": process.memory_percent()
                }
            )
        except ImportError:
            self.logger.warning("psutil not available for memory monitoring")


# 全局日志器实例
_global_logger = None


def get_global_logger() -> TradingLogger:
    """获取全局日志器实例"""
    global _global_logger
    if _global_logger is None:
        _global_logger = TradingLogger()
    return _global_logger


def set_global_log_level(level: Union[str, int]) -> None:
    """设置全局日志级别"""
    if isinstance(level, str):
        level = getattr(logging, level.upper())
    
    logging.getLogger().setLevel(level)
    
    # 更新所有ai_stock相关的日志器
    for name in logging.Logger.manager.loggerDict:
        if name.startswith('ai_stock'):
            logging.getLogger(name).setLevel(level)


# 导出
__all__ = [
    "setup_logger",
    "get_logger", 
    "JSONFormatter",
    "TradingLogger",
    "LogContext",
    "log_function_call",
    "PerformanceLogger",
    "get_global_logger",
    "set_global_log_level",
]