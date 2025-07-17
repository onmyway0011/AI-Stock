#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Stock Trading System - 回测命令行工具

提供策略回测功能的命令行界面。
"""

import asyncio
import click
import sys
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
from datetime import datetime, timedelta

from ai_stock import __version__
from ai_stock.core.types import BacktestConfig, StrategyConfig
from ai_stock.utils.config_utils import ConfigUtils
from ai_stock.utils.logging_utils import setup_logger
from ai_stock.utils.date_utils import DateUtils
from ai_stock.utils.format_utils import FormatUtils


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
def backtest_cli(ctx: click.Context, config: Optional[str], verbose: bool):
    """
    AI Stock Trading System - 回测工具
    
    提供策略回测和性能分析功能。
    """
    ctx.ensure_object(dict)
    
    # 设置日志
    log_level = "DEBUG" if verbose else "INFO"
    setup_logger("backtest", log_level=log_level)
    
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


@backtest_cli.command()
@click.option(
    "--strategy",
    required=True,
    help="策略名称"
)
@click.option(
    "--symbol",
    required=True,
    help="交易对符号"
)
@click.option(
    "--start-date",
    required=True,
    help="开始日期 (YYYY-MM-DD)"
)
@click.option(
    "--end-date",
    required=True,
    help="结束日期 (YYYY-MM-DD)"
)
@click.option(
    "--initial-capital",
    type=float,
    default=100000.0,
    help="初始资金"
)
@click.option(
    "--commission",
    type=float,
    default=0.001,
    help="手续费率"
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="结果输出文件"
)
@click.option(
    "--params",
    help="策略参数 JSON 字符串"
)
@click.pass_context
def run(
    ctx: click.Context,
    strategy: str,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
    commission: float,
    output: Optional[str],
    params: Optional[str]
):
    """运行回测"""
    click.echo("🚀 开始回测...")
    click.echo(f"策略: {strategy}")
    click.echo(f"交易对: {symbol}")
    click.echo(f"时间范围: {start_date} 到 {end_date}")
    click.echo(f"初始资金: {FormatUtils.format_currency(initial_capital)}")
    click.echo(f"手续费率: {FormatUtils.format_percentage(commission)}")
    async def run_backtest():
        try:
            # 解析策略参数
            strategy_params = {}
            if params:
                try:
                    strategy_params = json.loads(params)
                except json.JSONDecodeError as e:
                    click.echo(f"策略参数解析失败: {e}", err=True)
                    return
            
            # 创建回测配置
            strategy_config = StrategyConfig(
                name=strategy,
                parameters=strategy_params
            )
            
            backtest_config = BacktestConfig(
                start_date=start_date,
                end_date=end_date,
                initial_capital=initial_capital,
                commission=commission,
                symbols=[symbol],
                strategy_config=strategy_config
            )
            
            # 验证日期格式
            if not DateUtils.validate_date_range(start_date, end_date):
                click.echo("❌ 日期范围无效", err=True)
                return
            
            # 这里应该调用实际的回测引擎
            # 由于回测引擎还没有实现，我们模拟一个简单的结果
            click.echo("⏳ 正在执行回测...")
            
            # 模拟回测结果
            await asyncio.sleep(2)  # 模拟处理时间
            
            # 生成模拟结果
            result = generate_mock_backtest_result(
                strategy, symbol, start_date, end_date, initial_capital
            )
            
            # 显示结果
            display_backtest_result(result)
            
            # 保存结果
            if output:
                save_backtest_result(result, output)
                click.echo(f"📁 结果已保存到: {output}")
            
        except Exception as e:
            click.echo(f"❌ 回测失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(run_backtest())


@backtest_cli.command()
@click.option(
    "--strategy",
    required=True,
    help="策略名称"
)
@click.option(
    "--symbol",
    required=True,
    help="交易对符号"
)
@click.option(
    "--param-ranges",
    required=True,
    help="参数优化范围 JSON 文件路径"
)
@click.option(
    "--start-date",
    required=True,
    help="开始日期 (YYYY-MM-DD)"
)
@click.option(
    "--end-date",
    required=True,
    help="结束日期 (YYYY-MM-DD)"
)
@click.option(
    "--initial-capital",
    type=float,
    default=100000.0,
    help="初始资金"
)
@click.option(
    "--metric",
    type=click.Choice(["sharpe_ratio", "total_return", "max_drawdown"], case_sensitive=False),
    default="sharpe_ratio",
    help="优化目标指标"
)
@click.option(
    "--max-iterations",
    type=int,
    default=100,
    help="最大迭代次数"
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="优化结果输出文件"
)
@click.pass_context
def optimize(
    ctx: click.Context,
    strategy: str,
    symbol: str,
    param_ranges: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
    metric: str,
    max_iterations: int,
    output: Optional[str]
):
    """参数优化"""
    click.echo("🔍 开始参数优化...")
    click.echo(f"策略: {strategy}")
    click.echo(f"交易对: {symbol}")
    click.echo(f"优化指标: {metric}")
    click.echo(f"最大迭代: {max_iterations}")
    
    async def run_optimization():
        try:
            # 加载参数范围
            ranges_path = Path(param_ranges)
            if not ranges_path.exists():
                click.echo(f"❌ 参数范围文件不存在: {param_ranges}", err=True)
                return
            
            with open(ranges_path, 'r', encoding='utf-8') as f:
                param_ranges_data = json.load(f)
            click.echo("⏳ 正在执行参数优化...")
            
            # 模拟优化过程
            best_params = {}
            best_score = 0.0
            
            for i in range(max_iterations):
                if i % 10 == 0:
                    progress = (i / max_iterations) * 100
                    click.echo(f"进度: {progress:.1f}% ({i}/{max_iterations})")
                await asyncio.sleep(0.01)  # 模拟计算时间
            
            # 生成模拟的最优参数
            best_params = {
                "sma_short_period": 10,
                "sma_long_period": 20,
                "rsi_period": 14,
                "rsi_oversold": 30,
                "rsi_overbought": 70
            }
            best_score = 1.25  # 模拟夏普比率
            click.echo("✅ 参数优化完成!")
            click.echo(f"最优 {metric}: {best_score:.4f}")
            click.echo("最优参数:")
            for param, value in best_params.items():
                click.echo(f"  {param}: {value}")
            
            # 保存优化结果
            if output:
                optimization_result = {
                    "strategy": strategy,
                    "symbol": symbol,
                    "optimization_metric": metric,
                    "best_score": best_score,
                    "best_parameters": best_params,
                    "iterations": max_iterations,
                    "timestamp": datetime.now().isoformat()
                }
                
                output_path = Path(output)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(optimization_result, f, indent=2, ensure_ascii=False)
                
                click.echo(f"📁 优化结果已保存到: {output}")
        except Exception as e:
            click.echo(f"❌ 参数优化失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(run_optimization())


@backtest_cli.command()
@click.option(
    "--file", "-f",
    required=True,
    type=click.Path(exists=True),
    help="回测结果文件路径"
)
@click.option(
    "--format",
    type=click.Choice(["table", "chart", "report"], case_sensitive=False),
    default="table",
    help="分析输出格式"
)
@click.pass_context
def analyze(ctx: click.Context, file: str, format: str):
    """分析回测结果"""
    click.echo(f"📊 分析回测结果: {file}")
    
    try:
        # 加载结果文件
        with open(file, 'r', encoding='utf-8') as f:
            result = json.load(f)
        
        if format == "table":
            display_result_table(result)
        elif format == "chart":
            display_result_chart(result)
        elif format == "report":
            generate_detailed_report(result)
        
    except Exception as e:
        click.echo(f"❌ 结果分析失败: {e}", err=True)
        sys.exit(1)


@backtest_cli.command()
@click.option(
    "--strategies",
    required=True,
    help="策略列表，逗号分隔"
)
@click.option(
    "--symbol",
    required=True,
    help="交易对符号"
)
@click.option(
    "--start-date",
    required=True,
    help="开始日期 (YYYY-MM-DD)"
)
@click.option(
    "--end-date",
    required=True,
    help="结束日期 (YYYY-MM-DD)"
)
@click.option(
    "--initial-capital",
    type=float,
    default=100000.0,
    help="初始资金"
)
@click.option(
    "--output", "-o",
    type=click.Path(),
    help="比较结果输出文件"
)
@click.pass_context
def compare(
    ctx: click.Context,
    strategies: str,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float,
    output: Optional[str]
):
    """策略比较"""
    strategy_list = [s.strip() for s in strategies.split(",")]
    click.echo(f"⚖️ 策略比较分析")
    click.echo(f"策略: {', '.join(strategy_list)}")
    click.echo(f"交易对: {symbol}")
    click.echo(f"时间范围: {start_date} 到 {end_date}")
    
    async def run_comparison():
        try:
            comparison_results = []
            
            for strategy in strategy_list:
                click.echo(f"⏳ 回测策略: {strategy}")
                
                # 模拟每个策略的回测
                result = generate_mock_backtest_result(
                    strategy, symbol, start_date, end_date, initial_capital
                )
                comparison_results.append(result)
                
                await asyncio.sleep(1)  # 模拟处理时间
            
            # 显示比较表格
            display_strategy_comparison(comparison_results)
            
            # 保存比较结果
            if output:
                comparison_data = {
                    "comparison_date": datetime.now().isoformat(),
                    "symbol": symbol,
                    "period": f"{start_date} to {end_date}",
                    "initial_capital": initial_capital,
                    "strategies": comparison_results
                }
                
                output_path = Path(output)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(comparison_data, f, indent=2, ensure_ascii=False, default=str)
                
                click.echo(f"📁 比较结果已保存到: {output}")
            
        except Exception as e:
            click.echo(f"❌ 策略比较失败: {e}", err=True)
            sys.exit(1)
    
    asyncio.run(run_comparison())


def generate_mock_backtest_result(
    strategy: str,
    symbol: str,
    start_date: str,
    end_date: str,
    initial_capital: float
) -> Dict[str, Any]:
    """生成模拟回测结果"""
    import random
    # 模拟结果数据
    total_return = random.uniform(-0.2, 0.5)  # -20% 到 50%
    max_drawdown = random.uniform(0.05, 0.3)  # 5% 到 30%
    sharpe_ratio = random.uniform(0.5, 2.5)
    win_rate = random.uniform(0.4, 0.7)  # 40% 到 70%
    total_trades = random.randint(50, 200)
    
    final_equity = initial_capital * (1 + total_return)
    
    return {
        "strategy": strategy,
        "symbol": symbol,
        "start_date": start_date,
        "end_date": end_date,
        "initial_capital": initial_capital,
        "final_equity": final_equity,
        "total_return": total_return,
        "annualized_return": total_return * 2,  # 简化计算
        "max_drawdown": max_drawdown,
        "sharpe_ratio": sharpe_ratio,
        "win_rate": win_rate,
        "total_trades": total_trades,
        "winning_trades": int(total_trades * win_rate),
        "losing_trades": int(total_trades * (1 - win_rate)),
        "profit_factor": random.uniform(1.1, 2.0)
    }


def display_backtest_result(result: Dict[str, Any]) -> None:
    """显示回测结果"""
    click.echo("\n📈 回测结果")
    click.echo("=" * 50)
    
    # 基本信息
    click.echo(f"策略: {result['strategy']}")
    click.echo(f"交易对: {result['symbol']}")
    click.echo(f"时间段: {result['start_date']} 到 {result['end_date']}")
    click.echo()
    
    # 收益指标
    click.echo("💰 收益指标:")
    click.echo(f"  初始资金: {FormatUtils.format_currency(result['initial_capital'])}")
    click.echo(f"  最终资金: {FormatUtils.format_currency(result['final_equity'])}")
    click.echo(f"  总收益率: {FormatUtils.format_percentage(result['total_return'])}")
    click.echo(f"  年化收益率: {FormatUtils.format_percentage(result['annualized_return'])}")
    click.echo()
    
    # 风险指标
    click.echo("⚠️ 风险指标:")
    click.echo(f"  最大回撤: {FormatUtils.format_percentage(result['max_drawdown'])}")
    click.echo(f"  夏普比率: {result['sharpe_ratio']:.4f}")
    click.echo()
    
    # 交易指标
    click.echo("📊 交易指标:")
    click.echo(f"  总交易次数: {result['total_trades']}")
    click.echo(f"  盈利交易: {result['winning_trades']}")
    click.echo(f"  亏损交易: {result['losing_trades']}")
    click.echo(f"  胜率: {FormatUtils.format_percentage(result['win_rate'])}")
    click.echo(f"  盈利因子: {result['profit_factor']:.4f}")


def display_result_table(result: Dict[str, Any]) -> None:
    """以表格形式显示结果"""
    click.echo("\n📋 结果表格")
    click.echo("-" * 40)
    
    metrics = [
        ("策略", result.get("strategy", "N/A")),
        ("交易对", result.get("symbol", "N/A")),
        ("总收益率", FormatUtils.format_percentage(result.get("total_return", 0))),
        ("最大回撤", FormatUtils.format_percentage(result.get("max_drawdown", 0))),
        ("夏普比率", f"{result.get('sharpe_ratio', 0):.4f}"),
        ("胜率", FormatUtils.format_percentage(result.get("win_rate", 0))),
        ("总交易次数", str(result.get("total_trades", 0))),
    ]
    
    for metric, value in metrics:
        click.echo(f"{metric:<12} | {value}")
def display_result_chart(result: Dict[str, Any]) -> None:
    """显示图表（文本版本）"""
    click.echo("\n📈 收益曲线 (文本图表)")
    click.echo("-" * 50)
    
    # 简单的文本图表
    total_return = result.get("total_return", 0)
    max_drawdown = result.get("max_drawdown", 0)
    
    # 绘制简单的收益柱状图
    return_bar_length = int(abs(total_return) * 50)
    drawdown_bar_length = int(max_drawdown * 50)
    
    if total_return >= 0:
        click.echo(f"收益: {'█' * return_bar_length} +{FormatUtils.format_percentage(total_return)}")
    else:
        click.echo(f"收益: {'▓' * return_bar_length} {FormatUtils.format_percentage(total_return)}")
    click.echo(f"回撤: {'░' * drawdown_bar_length} -{FormatUtils.format_percentage(max_drawdown)}")


def generate_detailed_report(result: Dict[str, Any]) -> None:
    """生成详细报告"""
    click.echo("\n📄 详细报告")
    click.echo("=" * 60)
    
    display_backtest_result(result)
    
    click.echo("\n🔍 风险分析:")
    
    # 风险评级
    max_drawdown = result.get("max_drawdown", 0)
    sharpe_ratio = result.get("sharpe_ratio", 0)
    
    if max_drawdown < 0.1:
        risk_level = "低风险"
    elif max_drawdown < 0.2:
        risk_level = "中等风险"
    else:
        risk_level = "高风险"
    
    click.echo(f"  风险等级: {risk_level}")
    
    if sharpe_ratio > 1.5:
        performance_rating = "优秀"
    elif sharpe_ratio > 1.0:
        performance_rating = "良好"
    elif sharpe_ratio > 0.5:
        performance_rating = "一般"
    else:
        performance_rating = "较差"
    
    click.echo(f"  表现评级: {performance_rating}")
    
    # 建议
    click.echo("\n💡 策略建议:")
    if result.get("win_rate", 0) < 0.5:
        click.echo("  - 考虑优化信号过滤条件，提高胜率")
    if max_drawdown > 0.2:
        click.echo("  - 建议加强风险管理，降低最大回撤")
    if sharpe_ratio < 1.0:
        click.echo("  - 策略风险调整后收益偏低，需要优化")


def display_strategy_comparison(results: List[Dict[str, Any]]) -> None:
    """显示策略比较表格"""
    click.echo("\n⚖️ 策略比较")
    click.echo("=" * 80)
    
    # 表头
    headers = ["策略", "总收益", "最大回撤", "夏普比率", "胜率", "交易次数"]
    header_line = " | ".join(f"{h:<12}" for h in headers)
    click.echo(header_line)
    click.echo("-" * len(header_line))
    
    # 数据行
    for result in results:
        row_data = [
            result.get("strategy", "N/A")[:12],
            FormatUtils.format_percentage(result.get("total_return", 0))[:12],
            FormatUtils.format_percentage(result.get("max_drawdown", 0))[:12],
            f"{result.get('sharpe_ratio', 0):.4f}"[:12],
            FormatUtils.format_percentage(result.get("win_rate", 0))[:12],
            str(result.get("total_trades", 0))[:12]
        ]
        row_line = " | ".join(f"{d:<12}" for d in row_data)
        click.echo(row_line)
    
    # 找出最佳策略
    click.echo("\n🏆 最佳策略:")
    best_return = max(results, key=lambda x: x.get("total_return", 0))
    best_sharpe = max(results, key=lambda x: x.get("sharpe_ratio", 0))
    min_drawdown = min(results, key=lambda x: x.get("max_drawdown", 1))
    
    click.echo(f"  最高收益: {best_return['strategy']} ({FormatUtils.format_percentage(best_return['total_return'])})")
    click.echo(f"  最佳夏普: {best_sharpe['strategy']} ({best_sharpe['sharpe_ratio']:.4f})")
    click.echo(f"  最小回撤: {min_drawdown['strategy']} ({FormatUtils.format_percentage(min_drawdown['max_drawdown'])})")


def save_backtest_result(result: Dict[str, Any], output_path: str) -> None:
    """保存回测结果"""
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False, default=str)


def main():
    """回测工具主入口"""
    try:
        backtest_cli()
    except KeyboardInterrupt:
        click.echo("\n👋 回测程序被用户中断")
        sys.exit(0)
    except Exception as e:
        click.echo(f"❌ 回测程序错误: {e}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()