#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 主命令行工具

提供系统的主要功能入口和交互式命令行界面。
"""

import asyncio
import click
import sys
from typing import Optional, Dict, Any
from pathlib import Path
import json

from ai_stock import __version__, get_version_info, get_architecture_info
from ai_stock.utils.config_utils import ConfigUtils
from ai_stock.utils.logging_utils import setup_logger, set_global_log_level
from ai_stock.data.collectors.binance_collector import BinanceCollector
from ai_stock.data.collectors.yfinance_collector import YFinanceCollector
from ai_stock.signals.generators.trading_signal_generator import TradingSignalGenerator
from ai_stock.core.exceptions import AIStockError


@click.group()
@click.version_option(version=__version__)
@click.option(
    "--config", "-c",
    type=click.Path(exists=True),
    help="配置文件路径"
)
@click.option(
    "--log-level", "-l",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"], case_sensitive=False),
    default="INFO",
    help="日志级别"
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="详细输出"
)
@click.pass_context
def cli(ctx: click.Context, config: Optional[str], log_level: str, verbose: bool):
    """
    AI Stock Trading System - 智能股票交易系统
    
    一个基于AI的股票交易系统，具有智能信号生成和自动化监控功能。
    """
    # 确保上下文对象存在
    ctx.ensure_object(dict)
    
    # 设置日志级别
    if verbose:
        log_level = "DEBUG"
    set_global_log_level(log_level)
    
    # 加载配置
    if config:
        try:
            ctx.obj["config"] = ConfigUtils.load_config(config)
            click.echo(f"已加载配置文件: {config}")
        except Exception as e:
            click.echo(f"配置文件加载失败: {e}", err=True)
            sys.exit(1)
    else:
        ctx.obj["config"] = ConfigUtils.create_default_config()
    
    ctx.obj["log_level"] = log_level
    ctx.obj["verbose"] = verbose


@cli.command()
@click.pass_context
def info(ctx: click.Context):
    """显示系统信息"""
    click.echo(f"🚀 AI Stock Trading System v{__version__}")
    click.echo("=" * 50)
    
    # 版本信息
    version_info = get_version_info()
    click.echo("📊 版本信息:")
    for key, value in version_info.items():
        click.echo(f"  {key}: {value}")
    
    click.echo()
    
    # 架构信息
    arch_info = get_architecture_info()
    click.echo("🏗️ 架构信息:")
    click.echo(f"  版本: {arch_info['version']}")
    click.echo(f"  迁移状态: {arch_info['migration']['status']}")
    click.echo(f"  从 {arch_info['migration']['from']} 迁移到 {arch_info['migration']['to']}")
    
    click.echo()
    click.echo("📦 系统层次:")
    for layer, description in arch_info["layers"].items():
        click.echo(f"  {description}")


@cli.command()
@click.option(
    "--source", "-s",
    type=click.Choice(["binance", "yfinance"], case_sensitive=False),
    default="binance",
    help="数据源选择"
)
@click.option(
    "--symbol",
    required=True,
    help="交易对符号，如 BTCUSDT 或 AAPL"
)
@click.option(
    "--interval", "-i",
    default="1d",
    help="时间间隔 (1m, 5m, 1h, 1d 等)"
)
@click.option(
    "--limit", "-n",
    type=int,
    default=100,
    help="数据数量限制"
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出文件路径"
)
@click.pass_context
def collect(
    ctx: click.Context,
    source: str,
    symbol: str,
    interval: str,
    limit: int,
    output: Optional[str]
):
    """采集市场数据"""
    click.echo(f"🔍 开始采集数据...")
    click.echo(f"数据源: {source}")
    click.echo(f"交易对: {symbol}")
    click.echo(f"时间间隔: {interval}")
    click.echo(f"数据量: {limit}")
    
    async def collect_data():
        try:
            # 创建数据采集器
            if source.lower() == "binance":
                collector = BinanceCollector()
            else:
                collector = YFinanceCollector()
            
            await collector.start()
            
            # 获取数据
            klines = await collector.get_klines(symbol, interval, limit)
            
            if not klines:
                click.echo("❌ 未获取到数据", err=True)
                return
            
            click.echo(f"✅ 成功获取 {len(klines)} 条数据")
            
            # 输出数据
            if output:
                data = [kline.to_dict() for kline in klines]
                output_path = Path(output)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False, default=str)
                
                click.echo(f"📁 数据已保存到: {output_path}")
            else:
                # 显示最新几条数据
                click.echo("\n📊 最新数据:")
                for i, kline in enumerate(klines[-5:], 1):
                    click.echo(
                        f"  {i}. 时间: {kline.open_time}, "
                        f"开: {kline.open:.4f}, "
                        f"高: {kline.high:.4f}, "
                        f"低: {kline.low:.4f}, "
                        f"收: {kline.close:.4f}, "
                        f"量: {kline.volume:.2f}"
                    )
            
            await collector.stop()
            
        except Exception as e:
            click.echo(f"❌ 数据采集失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(collect_data())


@cli.command()
@click.option(
    "--source", "-s",
    type=click.Choice(["binance", "yfinance"], case_sensitive=False),
    default="binance",
    help="数据源选择"
)
@click.option(
    "--symbol",
    required=True,
    help="交易对符号"
)
@click.option(
    "--interval", "-i",
    default="1h",
    help="时间间隔"
)
@click.option(
    "--limit", "-n",
    type=int,
    default=100,
    help="数据数量"
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="输出文件路径"
)
@click.pass_context
def signal(
    ctx: click.Context,
    source: str,
    symbol: str,
    interval: str,
    limit: int,
    output: Optional[str]
):
    """生成交易信号"""
    click.echo(f"🔮 开始生成交易信号...")
    click.echo(f"数据源: {source}")
    click.echo(f"交易对: {symbol}")
    click.echo(f"时间间隔: {interval}")
    
    async def generate_signals():
        try:
            # 创建数据采集器
            if source.lower() == "binance":
                collector = BinanceCollector()
            else:
                collector = YFinanceCollector()
            
            await collector.start()
            # 获取市场数据
            market_data = await collector.get_market_data(symbol, interval, limit)
            
            if not market_data or not market_data.klines:
                click.echo("❌ 未获取到市场数据", err=True)
                return
            
            click.echo(f"✅ 获取到 {len(market_data.klines)} 条市场数据")
            
            # 创建信号生成器
            signal_generator = TradingSignalGenerator()
            
            # 生成信号
            signals = signal_generator.generate_signals(market_data)
            
            if not signals:
                click.echo("🔍 未生成任何交易信号")
            else:
                click.echo(f"🎯 生成了 {len(signals)} 个交易信号")
                
                # 显示信号
                for i, sig in enumerate(signals, 1):
                    side_emoji = "🟢" if sig.side.value == "BUY" else "🔴"
                    strength_emoji = {
                        "STRONG": "🔥",
                        "MODERATE": "⚡",
                        "WEAK": "💫"
                    }.get(sig.strength.value, "")
                    
                    click.echo(
                        f"  {i}. {side_emoji} {sig.side.value} {sig.symbol} "
                        f"@ {sig.price:.4f} {strength_emoji}"
                    )
                    click.echo(f"     置信度: {sig.confidence:.2%}")
                    click.echo(f"     原因: {sig.reason}")
                    click.echo()
                
                # 保存信号
                if output:
                    signals_data = []
                    for sig in signals:
                        signals_data.append({
                            "id": sig.id,
                            "symbol": sig.symbol,
                            "side": sig.side.value,
                            "price": sig.price,
                            "confidence": sig.confidence,
                            "reason": sig.reason,
                            "strength": sig.strength.value,
                            "timestamp": sig.timestamp
                        })
                    
                    output_path = Path(output)
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    with open(output_path, 'w', encoding='utf-8') as f:
                        json.dump(signals_data, f, indent=2, ensure_ascii=False)
                    
                    click.echo(f"📁 信号已保存到: {output_path}")
            
            await collector.stop()
            
        except Exception as e:
            click.echo(f"❌ 信号生成失败: {e}", err=True)
            sys.exit(1)
    asyncio.run(generate_signals())


@cli.command()
@click.option(
    "--config-file", "-c",
    type=click.Path(),
    help="配置文件路径"
)
@click.pass_context
def config(ctx: click.Context, config_file: Optional[str]):
    """配置管理"""
    if config_file:
        # 创建示例配置文件
        config_path = Path(config_file)
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        default_config = ConfigUtils.create_default_config()
        ConfigUtils.save_config(default_config, config_path)
        
        click.echo(f"✅ 默认配置已保存到: {config_path}")
        click.echo("📝 请编辑配置文件后重新运行程序")
    else:
        # 显示当前配置
        current_config = ctx.obj.get("config", {})
        
        click.echo("⚙️ 当前配置:")
        click.echo("=" * 30)
        
        def print_config(config_dict, indent=0):
            for key, value in config_dict.items():
                prefix = "  " * indent
                if isinstance(value, dict):
                    click.echo(f"{prefix}{key}:")
                    print_config(value, indent + 1)
                else:
                    click.echo(f"{prefix}{key}: {value}")
        
        print_config(current_config)


@cli.command()
@click.option(
    "--source", "-s",
    type=click.Choice(["binance", "yfinance"], case_sensitive=False),
    default="binance",
    help="数据源选择"
)
@click.pass_context
def test(ctx: click.Context, source: str):
    """测试系统连接"""
    click.echo(f"🔧 测试系统连接...")
    click.echo(f"数据源: {source}")
    
    async def test_connection():
        try:
            # 创建数据采集器
            if source.lower() == "binance":
                collector = BinanceCollector()
                test_symbol = "BTCUSDT"
            else:
                collector = YFinanceCollector()
                test_symbol = "AAPL"
            
            await collector.start()
            
            # 测试连接
            click.echo("📡 测试数据连接...")
            ticker = await collector.get_ticker(test_symbol)
            
            click.echo(f"✅ 连接成功!")
            click.echo(f"测试数据: {test_symbol} 价格 {ticker.price:.4f}")
            
            # 测试状态
            status = collector.get_status()
            click.echo(f"采集器状态: {status}")
            
            await collector.stop()
        except Exception as e:
            click.echo(f"❌ 连接测试失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(test_connection())


@cli.command()
@click.pass_context
def interactive(ctx: click.Context):
    """启动交互式模式"""
    click.echo("🎮 启动交互式模式...")
    click.echo("输入 'help' 查看可用命令，'exit' 退出")
    
    while True:
        try:
            command = click.prompt("ai-stock", type=str).strip()
            
            if command.lower() in ['exit', 'quit', 'q']:
                break
            elif command.lower() in ['help', 'h']:
                click.echo("可用命令:")
                click.echo("  info     - 显示系统信息")
                click.echo("  collect  - 采集数据")
                click.echo("  signal   - 生成信号")
                click.echo("  test     - 测试连接")
                click.echo("  config   - 显示配置")
                click.echo("  help     - 显示帮助")
                click.echo("  exit     - 退出")
            elif command.lower() == 'info':
                ctx.invoke(info)
            elif command.lower() == 'config':
                ctx.invoke(config)
            elif command.lower() == 'test':
                ctx.invoke(test)
            else:
                click.echo(f"未知命令: {command}")
                click.echo("输入 'help' 查看可用命令")
                
        except (KeyboardInterrupt, EOFError):
            break
        except Exception as e:
            click.echo(f"命令执行失败: {e}", err=True)
    
    click.echo("👋 再见!")


def main():
    """主入口函数"""
    try:
        cli()
    except AIStockError as e:
        click.echo(f"❌ 系统错误: {e}", err=True)
        sys.exit(1)
    except KeyboardInterrupt:
        click.echo("\n👋 程序被用户中断")
        sys.exit(0)
    except Exception as e:
        click.echo(f"❌ 未知错误: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
