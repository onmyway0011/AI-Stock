#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 监控命令行工具

提供实时监控和报警功能的命令行界面。
"""

import asyncio
import click
import sys
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
from datetime import datetime, timedelta
import signal
import time

from ai_stock import __version__
from ai_stock.data.collectors.binance_collector import BinanceCollector
from ai_stock.data.collectors.yfinance_collector import YFinanceCollector
from ai_stock.signals.generators.trading_signal_generator import TradingSignalGenerator
from ai_stock.signals.filters.signal_filter import SignalFilter
from ai_stock.utils.config_utils import ConfigUtils
from ai_stock.utils.logging_utils import setup_logger
from ai_stock.utils.format_utils import FormatUtils
from ai_stock.core.types import Signal


class MonitorState:
    """监控状态管理"""
    
    def __init__(self):
        self.running = False
        self.signals_generated = 0
        self.signals_filtered = 0
        self.start_time = None
        self.last_update = None
        self.errors = []
        self.active_signals = []


@click.group()
@click.version_option(version=__version__)
@click.option(
    "--config", "-c",
    type=click.Path(exists=True),
    help="配置文件路径"
)
@click.option(
    "--verbose", "-v",
    is_flag=True,
    help="详细输出"
)
@click.pass_context
def monitor_cli(ctx: click.Context, config: Optional[str], verbose: bool):
    """
    AI Stock Trading System - 监控工具
    
    提供实时监控和报警功能。
    """
    ctx.ensure_object(dict)
    
    # 设置日志
    log_level = "DEBUG" if verbose else "INFO"
    setup_logger("monitor", log_level=log_level)
    
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
    
    ctx.obj["verbose"] = verbose
    ctx.obj["state"] = MonitorState()


@monitor_cli.command()
@click.option(
    "--source", "-s",
    type=click.Choice(["binance", "yfinance"], case_sensitive=False),
    default="binance",
    help="数据源选择"
)
@click.option(
    "--symbols",
    required=True,
    help="监控的交易对，逗号分隔"
)
@click.option(
    "--interval", "-i",
    default="1m",
    help="监控间隔"
)
@click.option(
    "--update-frequency",
    type=int,
    default=60,
    help="更新频率（秒）"
)
@click.option(
    "--alert-file",
    type=click.Path(),
    help="报警输出文件"
)
@click.option(
    "--log-signals",
    is_flag=True,
    help="记录所有信号到文件"
)
@click.pass_context
def watch(
    ctx: click.Context,
    source: str,
    symbols: str,
    interval: str,
    update_frequency: int,
    alert_file: Optional[str],
    log_signals: bool
):
    """实时监控交易信号"""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    state = ctx.obj["state"]
    
    click.echo("👀 启动实时监控...")
    click.echo(f"数据源: {source}")
    click.echo(f"监控交易对: {', '.join(symbol_list)}")
    click.echo(f"监控间隔: {interval}")
    click.echo(f"更新频率: {update_frequency}秒")
    click.echo("按 Ctrl+C 停止监控")
    click.echo("=" * 60)
    
    async def monitor_signals():
        try:
            # 创建数据采集器
            if source.lower() == "binance":
                collector = BinanceCollector()
            else:
                collector = YFinanceCollector()
            
            await collector.start()
            
            # 创建信号生成器和过滤器
            signal_generator = TradingSignalGenerator()
            signal_filter = SignalFilter()
            
            state.running = True
            state.start_time = datetime.now()
            
            # 设置信号处理
            def handle_shutdown(signum, frame):
                state.running = False
                click.echo("\n🛑 收到停止信号，正在关闭监控...")
            
            signal.signal(signal.SIGINT, handle_shutdown)
            signal.signal(signal.SIGTERM, handle_shutdown)
            
            last_display_time = 0
            
            while state.running:
                try:
                    current_time = time.time()
                    
                    # 获取所有交易对的数据
                    for symbol in symbol_list:
                        try:
                            # 获取市场数据
                            market_data = await collector.get_market_data(symbol, interval, 100)
                            
                            # 生成信号
                            signals = signal_generator.generate_signals(market_data)
                            state.signals_generated += len(signals)
                            
                            # 过滤信号
                            filtered_signals = signal_filter.filter_signals(signals)
                            state.signals_filtered += len(filtered_signals)
                            
                            # 处理新信号
                            for signal in filtered_signals:
                                await handle_new_signal(signal, alert_file, log_signals)
                                state.active_signals.append(signal)
                            
                            # 清理过期信号
                            state.active_signals = [
                                s for s in state.active_signals
                                if current_time - (s.timestamp / 1000) < 3600  # 1小时内的信号
                            ]
                            
                        except Exception as e:
                            error_msg = f"处理 {symbol} 时出错: {e}"
                            state.errors.append(error_msg)
                            click.echo(f"⚠️ {error_msg}")
                    
                    state.last_update = datetime.now()
                    
                    # 定期显示状态
                    if current_time - last_display_time >= update_frequency:
                        display_monitor_status(state, symbol_list)
                        last_display_time = current_time
                    
                    # 等待下次更新
                    await asyncio.sleep(5)  # 每5秒检查一次
                    
                except Exception as e:
                    error_msg = f"监控循环出错: {e}"
                    state.errors.append(error_msg)
                    click.echo(f"❌ {error_msg}")
                    await asyncio.sleep(10)  # 出错后等待更长时间
            
            await collector.stop()
            click.echo("✅ 监控已停止")
            
        except Exception as e:
            click.echo(f"❌ 监控启动失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(monitor_signals())


@monitor_cli.command()
@click.option(
    "--source", "-s",
    type=click.Choice(["binance", "yfinance"], case_sensitive=False),
    default="binance",
    help="数据源选择"
)
@click.option(
    "--symbols",
    help="交易对列表，逗号分隔（为空时显示所有）"
)
@click.option(
    "--sort-by",
    type=click.Choice(["price", "volume", "change"], case_sensitive=False),
    default="change",
    help="排序方式"
)
@click.option(
    "--limit", "-n",
    type=int,
    default=20,
    help="显示数量限制"
)
@click.option(
    "--refresh",
    type=int,
    default=10,
    help="刷新间隔（秒）"
)
@click.pass_context
def prices(
    ctx: click.Context,
    source: str,
    symbols: Optional[str],
    sort_by: str,
    limit: int,
    refresh: int
):
    """实时价格监控"""
    click.echo("💹 启动价格监控...")
    click.echo(f"数据源: {source}")
    click.echo(f"排序: {sort_by}")
    click.echo(f"刷新间隔: {refresh}秒")
    click.echo("按 Ctrl+C 停止")
    click.echo("=" * 80)
    
    async def monitor_prices():
        try:
            # 创建数据采集器
            if source.lower() == "binance":
                collector = BinanceCollector()
            else:
                collector = YFinanceCollector()
            
            await collector.start()
            
            # 获取交易对列表
            if symbols:
                symbol_list = [s.strip().upper() for s in symbols.split(",")]
            else:
                # 使用默认的热门交易对
                if source.lower() == "binance":
                    symbol_list = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "SOLUSDT"]
                else:
                    symbol_list = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"]
            
            running = True
            
            def handle_shutdown(signum, frame):
                nonlocal running
                running = False
                click.echo("\n🛑 停止价格监控...")
            
            signal.signal(signal.SIGINT, handle_shutdown)
            signal.signal(signal.SIGTERM, handle_shutdown)
            
            while running:
                try:
                    # 获取所有价格数据
                    price_data = []
                    
                    for symbol in symbol_list[:limit]:
                        try:
                            ticker = await collector.get_ticker(symbol)
                            price_data.append({
                                "symbol": ticker.symbol,
                                "price": ticker.price,
                                "change_24h": ticker.change_percent_24h,
                                "volume": ticker.volume,
                                "high": ticker.high_price,
                                "low": ticker.low_price
                            })
                        except Exception as e:
                            click.echo(f"⚠️ 获取 {symbol} 价格失败: {e}")
                    
                    # 排序
                    if sort_by == "price":
                        price_data.sort(key=lambda x: x["price"], reverse=True)
                    elif sort_by == "volume":
                        price_data.sort(key=lambda x: x["volume"], reverse=True)
                    else:  # change
                        price_data.sort(key=lambda x: x["change_24h"], reverse=True)
                    
                    # 显示价格表格
                    display_price_table(price_data)
                    
                    # 等待刷新
                    await asyncio.sleep(refresh)
                except Exception as e:
                    click.echo(f"❌ 价格监控错误: {e}")
                    await asyncio.sleep(5)
            
            await collector.stop()
            
        except Exception as e:
            click.echo(f"❌ 价格监控启动失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(monitor_prices())


@monitor_cli.command()
@click.option(
    "--file", "-f",
    type=click.Path(exists=True),
    help="信号日志文件路径"
)
@click.option(
    "--symbol",
    help="过滤特定交易对"
)
@click.option(
    "--side",
    type=click.Choice(["BUY", "SELL"], case_sensitive=False),
    help="过滤交易方向"
)
@click.option(
    "--min-confidence",
    type=float,
    help="最小置信度过滤"
)
@click.option(
    "--limit", "-n",
    type=int,
    default=50,
    help="显示数量限制"
)
@click.pass_context
def history(
    ctx: click.Context,
    file: Optional[str],
    symbol: Optional[str],
    side: Optional[str],
    min_confidence: Optional[float],
    limit: int
):
    """查看信号历史"""
    click.echo("📋 信号历史查询")
    
    try:
        if file:
            # 从文件读取信号历史
            with open(file, 'r', encoding='utf-8') as f:
                signal_data = []
                for line in f:
                    try:
                        signal_json = json.loads(line.strip())
                        signal_data.append(signal_json)
                    except json.JSONDecodeError:
                        continue
        else:
            # 模拟一些历史信号
            signal_data = generate_mock_signal_history()
        
        # 应用过滤器
        filtered_signals = signal_data
        
        if symbol:
            filtered_signals = [s for s in filtered_signals if s.get("symbol", "").upper() == symbol.upper()]
        
        if side:
            filtered_signals = [s for s in filtered_signals if s.get("side", "").upper() == side.upper()]
        
        if min_confidence is not None:
            filtered_signals = [s for s in filtered_signals if s.get("confidence", 0) >= min_confidence]
        
        # 按时间排序
        filtered_signals.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        
        # 限制数量
        filtered_signals = filtered_signals[:limit]
        
        # 显示结果
        display_signal_history(filtered_signals)
        
    except Exception as e:
        click.echo(f"❌ 历史查询失败: {e}", err=True)
        sys.exit(1)


@monitor_cli.command()
@click.pass_context
def status(ctx: click.Context):
    """显示监控状态"""
    state = ctx.obj["state"]
    
    click.echo("📊 监控状态")
    click.echo("=" * 40)
    
    if state.running:
        click.echo("🟢 状态: 运行中")
        uptime = datetime.now() - state.start_time if state.start_time else timedelta(0)
        click.echo(f"⏱️ 运行时间: {format_duration(uptime)}")
    else:
        click.echo("🔴 状态: 已停止")
    
    click.echo(f"📈 生成信号数: {state.signals_generated}")
    click.echo(f"✅ 有效信号数: {state.signals_filtered}")
    click.echo(f"🎯 活跃信号数: {len(state.active_signals)}")
    
    if state.last_update:
        click.echo(f"🔄 最后更新: {state.last_update.strftime('%H:%M:%S')}")
    
    if state.errors:
        click.echo(f"❌ 错误数量: {len(state.errors)}")
        if ctx.obj.get("verbose"):
            click.echo("最近错误:")
            for error in state.errors[-5:]:
                click.echo(f"  • {error}")


async def handle_new_signal(signal: Signal, alert_file: Optional[str], log_signals: bool) -> None:
    """处理新信号"""
    # 显示信号
    side_emoji = "🟢" if signal.side.value == "BUY" else "🔴"
    strength_emoji = {
        "STRONG": "🔥",
        "MODERATE": "⚡",
        "WEAK": "💫"
    }.get(signal.strength.value, "")
    
    timestamp = datetime.fromtimestamp(signal.timestamp / 1000).strftime("%H:%M:%S")
    
    click.echo(
        f"[{timestamp}] {side_emoji} {signal.side.value} {signal.symbol} "
        f"@ {signal.price:.4f} {strength_emoji} "
        f"({signal.confidence:.1%})"
    )
    
    # 报警文件
    if alert_file:
        alert_data = {
            "timestamp": signal.timestamp,
            "datetime": datetime.fromtimestamp(signal.timestamp / 1000).isoformat(),
            "symbol": signal.symbol,
            "side": signal.side.value,
            "price": signal.price,
            "confidence": signal.confidence,
            "strength": signal.strength.value,
            "reason": signal.reason
        }
        
        alert_path = Path(alert_file)
        alert_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(alert_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(alert_data, ensure_ascii=False) + "\n")
    
    # 信号日志
    if log_signals:
        log_path = Path("signals.log")
        signal_data = {
            "id": signal.id,
            "timestamp": signal.timestamp,
            "symbol": signal.symbol,
            "side": signal.side.value,
            "price": signal.price,
            "confidence": signal.confidence,
            "strength": signal.strength.value,
            "reason": signal.reason
        }
        
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(signal_data, ensure_ascii=False) + "\n")


def display_monitor_status(state: MonitorState, symbols: List[str]) -> None:
    """显示监控状态"""
    current_time = datetime.now().strftime("%H:%M:%S")
    uptime = datetime.now() - state.start_time if state.start_time else timedelta(0)
    click.echo(f"\n📊 [{current_time}] 监控状态 (运行时间: {format_duration(uptime)})")
    click.echo(f"监控交易对: {', '.join(symbols)}")
    click.echo(f"生成信号: {state.signals_generated} | 有效信号: {state.signals_filtered} | 活跃信号: {len(state.active_signals)}")
    
    if state.active_signals:
        click.echo("最近信号:")
        for signal in state.active_signals[-3:]:
            side_emoji = "🟢" if signal.side.value == "BUY" else "🔴"
            signal_time = datetime.fromtimestamp(signal.timestamp / 1000).strftime("%H:%M")
            click.echo(f"  [{signal_time}] {side_emoji} {signal.side.value} {signal.symbol} @ {signal.price:.4f}")
    
    click.echo("-" * 60)


def display_price_table(price_data: List[Dict[str, Any]]) -> None:
    """显示价格表格"""
    # 清屏（在支持的终端中）
    click.clear()
    
    current_time = datetime.now().strftime("%H:%M:%S")
    click.echo(f"💹 实时价格 [{current_time}]")
    click.echo("=" * 80)
    
    # 表头
    headers = ["交易对", "价格", "24h变化", "成交量", "24h最高", "24h最低"]
    header_line = " | ".join(f"{h:<12}" for h in headers)
    click.echo(header_line)
    click.echo("-" * len(header_line))
    
    # 数据行
    for data in price_data:
        change_24h = data["change_24h"]
        change_color = "green" if change_24h >= 0 else "red"
        change_prefix = "+" if change_24h >= 0 else ""
        
        row_data = [
            data["symbol"][:12],
            f"{data['price']:.4f}"[:12],
            f"{change_prefix}{change_24h:.2f}%"[:12],
            FormatUtils.format_volume(data["volume"])[:12],
            f"{data['high']:.4f}"[:12],
            f"{data['low']:.4f}"[:12]
        ]
        
        row_line = " | ".join(f"{d:<12}" for d in row_data)
        
        if change_24h >= 0:
            click.echo(click.style(row_line, fg="green"))
        else:
            click.echo(click.style(row_line, fg="red"))


def display_signal_history(signals: List[Dict[str, Any]]) -> None:
    """显示信号历史"""
    if not signals:
        click.echo("📭 没有找到符合条件的信号")
        return
    click.echo(f"📋 找到 {len(signals)} 个信号")
    click.echo("=" * 80)
    
    for i, signal in enumerate(signals, 1):
        timestamp = signal.get("timestamp", 0)
        dt = datetime.fromtimestamp(timestamp / 1000) if timestamp > 1000000000000 else datetime.fromtimestamp(timestamp)
        
        side = signal.get("side", "").upper()
        side_emoji = "🟢" if side == "BUY" else "🔴"
        
        strength = signal.get("strength", "").upper()
        strength_emoji = {
            "STRONG": "🔥",
            "MODERATE": "⚡",
            "WEAK": "💫"
        }.get(strength, "")
        
        click.echo(
            f"{i:3d}. [{dt.strftime('%m-%d %H:%M')}] {side_emoji} {side} "
            f"{signal.get('symbol', 'N/A')} @ {signal.get('price', 0):.4f} {strength_emoji}"
        )
        click.echo(f"     置信度: {signal.get('confidence', 0):.1%} | {signal.get('reason', '')}")
        click.echo()


def generate_mock_signal_history() -> List[Dict[str, Any]]:
    """生成模拟信号历史"""
    import random
    
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "ADAUSDT", "SOLUSDT"]
    sides = ["BUY", "SELL"]
    strengths = ["STRONG", "MODERATE", "WEAK"]
    
    signals = []
    current_time = int(time.time() * 1000)
    
    for i in range(20):
        timestamp = current_time - (i * 3600000)  # 每小时一个信号
        
        signal = {
            "id": f"signal_{i}",
            "timestamp": timestamp,
            "symbol": random.choice(symbols),
            "side": random.choice(sides),
            "price": random.uniform(100, 50000),
            "confidence": random.uniform(0.5, 0.95),
            "strength": random.choice(strengths),
            "reason": f"Technical analysis signal #{i}"
        }
        signals.append(signal)
    
    return signals


def format_duration(duration: timedelta) -> str:
    """格式化时间间隔"""
    total_seconds = int(duration.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    if hours > 0:
        return f"{hours}h {minutes}m"
    elif minutes > 0:
        return f"{minutes}m {seconds}s"
    else:
        return f"{seconds}s"


def main():
    """监控工具主入口"""
    try:
        monitor_cli()
    except KeyboardInterrupt:
        click.echo("\n👋 监控程序被用户中断")
        sys.exit(0)
    except Exception as e:
        click.echo(f"❌ 监控程序错误: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()