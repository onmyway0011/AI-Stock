#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 配置管理工具

提供配置文件读取、验证和管理功能。
"""

import os
import json
import yaml
from pathlib import Path
from typing import Any, Dict, Optional, Union
from dataclasses import asdict
import configparser
from ai_stock.core.exceptions import ConfigurationError


class ConfigUtils:
    """配置管理工具类"""
    
    @staticmethod
    def load_config(
        config_path: Union[str, Path],
        config_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        加载配置文件
        
        Args:
            config_path: 配置文件路径
            config_type: 配置文件类型 ("json", "yaml", "ini")，None时自动检测
            
        Returns:
            配置字典
            
        Raises:
            ConfigurationError: 配置文件加载失败
        """
        config_path = Path(config_path)
        
        if not config_path.exists():
            raise ConfigurationError(f"配置文件不存在: {config_path}")
        
        # 自动检测文件类型
        if config_type is None:
            config_type = ConfigUtils._detect_config_type(config_path)
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                if config_type == "json":
                    return json.load(f)
                elif config_type == "yaml":
                    return yaml.safe_load(f) or {}
                elif config_type == "ini":
                    config = configparser.ConfigParser()
                    config.read(config_path, encoding='utf-8')
                    return {section: dict(config[section]) for section in config.sections()}
                else:
                    raise ConfigurationError(f"不支持的配置文件类型: {config_type}")
                    
        except Exception as e:
            raise ConfigurationError(f"加载配置文件失败: {e}")
    
    @staticmethod
    def save_config(
        config: Dict[str, Any],
        config_path: Union[str, Path],
        config_type: Optional[str] = None
    ) -> None:
        """
        保存配置文件
        
        Args:
            config: 配置字典
            config_path: 配置文件路径
            config_type: 配置文件类型，None时自动检测
            
        Raises:
            ConfigurationError: 配置文件保存失败
        """
        config_path = Path(config_path)
        
        # 确保目录存在
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 自动检测文件类型
        if config_type is None:
            config_type = ConfigUtils._detect_config_type(config_path)
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                if config_type == "json":
                    json.dump(config, f, indent=2, ensure_ascii=False)
                elif config_type == "yaml":
                    yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
                elif config_type == "ini":
                    config_parser = configparser.ConfigParser()
                    for section_name, section_config in config.items():
                        config_parser.add_section(section_name)
                        for key, value in section_config.items():
                            config_parser.set(section_name, key, str(value))
                    config_parser.write(f)
                else:
                    raise ConfigurationError(f"不支持的配置文件类型: {config_type}")
                    
        except Exception as e:
            raise ConfigurationError(f"保存配置文件失败: {e}")
    
    @staticmethod
    def _detect_config_type(config_path: Path) -> str:
        """检测配置文件类型"""
        suffix = config_path.suffix.lower()
        
        if suffix in ['.json']:
            return "json"
        elif suffix in ['.yaml', '.yml']:
            return "yaml"
        elif suffix in ['.ini', '.cfg', '.conf']:
            return "ini"
        else:
            # 默认JSON
            return "json"
    
    @staticmethod
    def merge_configs(*configs: Dict[str, Any]) -> Dict[str, Any]:
        """
        合并多个配置字典
        
        Args:
            *configs: 配置字典列表
            
        Returns:
            合并后的配置字典
        """
        merged = {}
        
        for config in configs:
            merged = ConfigUtils._deep_merge(merged, config)
        
        return merged
    
    @staticmethod
    def _deep_merge(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
        """深度合并字典"""
        result = dict1.copy()
        
        for key, value in dict2.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = ConfigUtils._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    @staticmethod
    def get_nested_value(
        config: Dict[str, Any],
        key_path: str,
        default: Any = None,
        separator: str = "."
    ) -> Any:
        """
        获取嵌套配置值
        
        Args:
            config: 配置字典
            key_path: 键路径，如 "database.host"
            default: 默认值
            separator: 分隔符
            
        Returns:
            配置值或默认值
        """
        keys = key_path.split(separator)
        current = config
        
        try:
            for key in keys:
                current = current[key]
            return current
        except (KeyError, TypeError):
            return default
    
    @staticmethod
    def set_nested_value(
        config: Dict[str, Any],
        key_path: str,
        value: Any,
        separator: str = "."
    ) -> None:
        """
        设置嵌套配置值
        
        Args:
            config: 配置字典
            key_path: 键路径，如 "database.host"
            value: 值
            separator: 分隔符
        """
        keys = key_path.split(separator)
        current = config
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        current[keys[-1]] = value
    
    @staticmethod
    def validate_config(
        config: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> bool:
        """
        验证配置是否符合模式
        
        Args:
            config: 配置字典
            schema: 模式字典
            
        Returns:
            是否有效
            
        Raises:
            ConfigurationError: 验证失败
        """
        return ConfigUtils._validate_recursive(config, schema, "")
    
    @staticmethod
    def _validate_recursive(
        config: Dict[str, Any],
        schema: Dict[str, Any],
        path: str
    ) -> bool:
        """递归验证配置"""
        for key, schema_value in schema.items():
            current_path = f"{path}.{key}" if path else key
            
            if key not in config:
                if isinstance(schema_value, dict) and schema_value.get("required", False):
                    raise ConfigurationError(f"缺少必需的配置项: {current_path}")
                continue
            
            config_value = config[key]
            
            if isinstance(schema_value, dict):
                if "type" in schema_value:
                    expected_type = schema_value["type"]
                    if not isinstance(config_value, expected_type):
                        raise ConfigurationError(
                            f"配置项 {current_path} 类型错误，期望 {expected_type.__name__}，实际 {type(config_value).__name__}"
                        )
                
                if "choices" in schema_value:
                    choices = schema_value["choices"]
                    if config_value not in choices:
                        raise ConfigurationError(
                            f"配置项 {current_path} 值无效，必须是 {choices} 中的一个"
                        )
                
                if "min" in schema_value and config_value < schema_value["min"]:
                    raise ConfigurationError(
                        f"配置项 {current_path} 值太小，最小值为 {schema_value['min']}"
                    )
                
                if "max" in schema_value and config_value > schema_value["max"]:
                    raise ConfigurationError(
                        f"配置项 {current_path} 值太大，最大值为 {schema_value['max']}"
                    )
                
                # 如果有嵌套schema，递归验证
                if "schema" in schema_value and isinstance(config_value, dict):
                    ConfigUtils._validate_recursive(config_value, schema_value["schema"], current_path)
        
        return True
    
    @staticmethod
    def load_env_config(prefix: str = "AI_STOCK_") -> Dict[str, str]:
        """
        从环境变量加载配置
        
        Args:
            prefix: 环境变量前缀
            
        Returns:
            环境变量配置字典
        """
        env_config = {}
        
        for key, value in os.environ.items():
            if key.startswith(prefix):
                config_key = key[len(prefix):].lower()
                env_config[config_key] = value
        
        return env_config
    
    @staticmethod
    def create_default_config() -> Dict[str, Any]:
        """
        创建默认配置
        
        Returns:
            默认配置字典
        """
        return {
            "system": {
                "debug": False,
                "log_level": "INFO",
                "log_file": "ai_stock.log",
                "max_log_size": "10MB",
                "backup_count": 5
            },
            "data": {
                "source": "binance",
                "cache_enabled": True,
                "cache_ttl": 300,
                "retry_attempts": 3,
                "timeout": 30
            },
            "trading": {
                "enabled": False,
                "paper_trading": True,
                "max_position_size": 0.1,
                "max_drawdown": 0.2,
                "commission_rate": 0.001
            },
            "notification": {
                "enabled": True,
                "channels": ["console"],
                "email": {
                    "enabled": False,
                    "smtp_server": "",
                    "smtp_port": 587,
                    "username": "",
                    "password": "",
                    "recipients": []
                },
                "wechat": {
                    "enabled": False,
                    "webhook_url": "",
                    "mentions": []
                }
            },
            "database": {
                "type": "sqlite",
                "url": "sqlite:///ai_stock.db",
                "pool_size": 5,
                "max_overflow": 10
            },
            "redis": {
                "enabled": False,
                "host": "localhost",
                "port": 6379,
                "db": 0,
                "password": None
            }
        }
    
    @staticmethod
    def get_config_schema() -> Dict[str, Any]:
        """
        获取配置验证模式
        
        Returns:
            配置验证模式
        """
        return {
            "system": {
                "type": dict,
                "schema": {
                    "debug": {"type": bool},
                    "log_level": {"type": str, "choices": ["DEBUG", "INFO", "WARNING", "ERROR"]},
                    "log_file": {"type": str},
                    "max_log_size": {"type": str},
                    "backup_count": {"type": int, "min": 1, "max": 10}
                }
            },
            "data": {
                "type": dict,
                "schema": {
                    "source": {"type": str, "choices": ["binance", "yfinance", "sina"]},
                    "cache_enabled": {"type": bool},
                    "cache_ttl": {"type": int, "min": 60, "max": 3600},
                    "retry_attempts": {"type": int, "min": 1, "max": 10},
                    "timeout": {"type": int, "min": 5, "max": 300}
                }
            },
            "trading": {
                "type": dict,
                "schema": {
                    "enabled": {"type": bool},
                    "paper_trading": {"type": bool},
                    "max_position_size": {"type": float, "min": 0.01, "max": 1.0},
                    "max_drawdown": {"type": float, "min": 0.05, "max": 0.5},
                    "commission_rate": {"type": float, "min": 0.0, "max": 0.01}
                }
            }
        }
    
    @staticmethod
    def config_to_dataclass(config: Dict[str, Any], dataclass_type: type):
        """
        将配置字典转换为数据类实例
        
        Args:
            config: 配置字典
            dataclass_type: 数据类类型
            
        Returns:
            数据类实例
        """
        try:
            return dataclass_type(**config)
        except TypeError as e:
            raise ConfigurationError(f"配置转换失败: {e}")
    
    @staticmethod
    def dataclass_to_config(dataclass_instance) -> Dict[str, Any]:
        """
        将数据类实例转换为配置字典
        
        Args:
            dataclass_instance: 数据类实例
            
        Returns:
            配置字典
        """
        return asdict(dataclass_instance)


# 导出
__all__ = ["ConfigUtils"]