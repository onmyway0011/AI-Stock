#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 命令行界面模块

提供命令行工具和脚本功能。
"""

from ai_stock.cli.main import main
from ai_stock.cli.backtest import main as backtest_main
from ai_stock.cli.monitor import main as monitor_main

__all__ = [
    "main",
    "backtest_main", 
    "monitor_main",
]