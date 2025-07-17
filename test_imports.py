#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 导入测试脚本

测试所有Python模块的导入情况，发现问题并报告。
"""

import sys
import traceback
from typing import List, Tuple

def test_import(module_name: str, description: str) -> Tuple[bool, str]:
    """测试单个模块的导入"""
    try:
        __import__(module_name)
        return True, f"✅ {description}"
    except Exception as e:
        error_msg = f"❌ {description}: {str(e)}"
        return False, error_msg

def main():
    """主测试函数"""
    print("🔍 AI Stock Trading System - 模块导入测试")
    print("=" * 60)
    
    # 定义测试模块列表
    test_modules = [
        # 核心模块
        ("ai_stock.core.types", "核心类型定义"),
        ("ai_stock.core.exceptions", "异常处理"),
        ("ai_stock.core.interfaces", "接口定义"),
        
        # 工具模块
        ("ai_stock.utils.format_utils", "格式化工具"),
        ("ai_stock.utils.date_utils", "日期时间工具"),
        ("ai_stock.utils.math_utils", "数学计算工具"),
        ("ai_stock.utils.config_utils", "配置管理工具"),
        ("ai_stock.utils.validation_utils", "数据验证工具"),
        ("ai_stock.utils.logging_utils", "日志管理工具"),
        
        # 数据采集模块
        ("ai_stock.data.collectors.base_collector", "基础数据采集器"),
        ("ai_stock.data.collectors.binance_collector", "Binance数据采集器"),
        ("ai_stock.data.collectors.yfinance_collector", "YFinance数据采集器"),
        
        # 信号模块
        ("ai_stock.signals.generators.trading_signal_generator", "交易信号生成器"),
        ("ai_stock.signals.generators.technical_signal_generator", "技术分析信号生成器"),
        ("ai_stock.signals.filters.signal_filter", "信号过滤器"),
        
        # CLI模块
        ("ai_stock.cli.main", "主命令行工具"),
        ("ai_stock.cli.backtest", "回测命令行工具"),
        ("ai_stock.cli.monitor", "监控命令行工具"),
        
        # 主包
        ("ai_stock", "主包"),
    ]
    
    # 执行测试
    passed = 0
    failed = 0
    failed_modules = []
    
    for module_name, description in test_modules:
        success, message = test_import(module_name, description)
        print(message)
        
        if success:
            passed += 1
        else:
            failed += 1
            failed_modules.append((module_name, description))
    
    print("\n" + "=" * 60)
    print(f"📊 测试结果: 通过 {passed}, 失败 {failed}, 总计 {passed + failed}")
    
    if failed_modules:
        print(f"\n❌ 失败的模块 ({failed}):")
        for module_name, description in failed_modules:
            print(f"  • {module_name} - {description}")
            
            # 显示详细错误信息
            try:
                __import__(module_name)
            except Exception as e:
                print(f"    错误: {str(e)}")
                if "--verbose" in sys.argv:
                    print("    详细错误:")
                    traceback.print_exc()
                print()
    
    # 功能测试
    if failed == 0:
        print(f"\n🎉 所有模块导入成功！开始功能测试...")
        test_basic_functionality()
    
    return failed == 0

def test_basic_functionality():
    """测试基础功能"""
    print("\n🔧 基础功能测试:")
    
    try:
        # 测试类型创建
        from ai_stock.core.types import Kline, Signal, OrderSide, SignalStrength
        
        kline = Kline(
            open_time=1640995200000,
            open=50000.0,
            high=50500.0,
            low=49500.0,
            close=50200.0,
            volume=100.0,
            close_time=1640998800000,
            symbol="BTCUSDT"
        )
        print("✅ Kline对象创建成功")
        
        signal = Signal(
            id="test_signal_1",
            symbol="BTCUSDT",
            side=OrderSide.BUY,
            price=50200.0,
            confidence=0.85,
            reason="测试信号",
            strength=SignalStrength.STRONG
        )
        print("✅ Signal对象创建成功")
        
        # 测试工具函数
        from ai_stock.utils.format_utils import FormatUtils
        
        formatted_price = FormatUtils.format_price(50200.1234, precision=2)
        formatted_percentage = FormatUtils.format_percentage(0.15)
        print(f"✅ 格式化工具测试成功: 价格={formatted_price}, 百分比={formatted_percentage}")
        
        # 测试数学工具
        from ai_stock.utils.math_utils import MathUtils
        
        prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109]
        sma = MathUtils.calculate_sma(prices, 5)
        print(f"✅ 数学工具测试成功: SMA长度={len(sma)}")
        
        # 测试配置工具
        from ai_stock.utils.config_utils import ConfigUtils
        
        default_config = ConfigUtils.create_default_config()
        print(f"✅ 配置工具测试成功: 配置项数量={len(default_config)}")
        
        print("🎉 所有基础功能测试通过！")
        
    except Exception as e:
        print(f"❌ 功能测试失败: {e}")
        if "--verbose" in sys.argv:
            traceback.print_exc()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)