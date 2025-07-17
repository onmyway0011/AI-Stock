# -*- coding: utf-8 -*-
"""
新浪财经数据查询命令行工具
支持实时价格、历史数据、搜索、热门、监控、市场概览等命令
"""
import click
from typing import List, Optional

# 占位：Collector 类接口，后续实现
class SinaFinanceCollector:
    def __init__(self, enable_cache=False, timeout=10000):
        pass
    async def start(self):
        pass
    async def stop(self):
        pass
    async def getRealTimeData(self, symbols: List[str]):
        pass
    async def getHistoricalData(self, symbol: str, interval: str, start_time: int, end_time: int):
        pass
    async def searchStocks(self, keyword: str):
        pass
    async def getPopularStocks(self):
        pass
    async def getMultipleRealTimeData(self, stocks: List[str]):
        pass

@click.group()
def cli():
    """新浪财经数据查询命令行工具"""
    pass

@cli.command()
@click.argument('symbols', nargs=-1)
@click.option('-f', '--format', default='table', help='输出格式 (table, json)')
@click.option('-c', '--cache', is_flag=True, default=False, help='启用缓存')
def price(symbols, format, cache):
    """查询股票实时价格"""
    # TODO: 调用 Collector，输出结果
    click.echo(f'查询股票实时价格: {symbols}, 格式: {format}, 缓存: {cache}')

@cli.command()
@click.argument('symbol')
@click.option('-d', '--days', default='30', help='查询天数')
@click.option('-i', '--interval', default='1d', help='时间间隔')
@click.option('-f', '--format', default='table', help='输出格式 (table, json)')
def history(symbol, days, interval, format):
    """查询股票历史数据"""
    click.echo(f'查询 {symbol} 历史数据, 天数: {days}, 间隔: {interval}, 格式: {format}')

@cli.command()
@click.argument('keyword')
@click.option('-l', '--limit', default='10', help='限制结果数量')
def search(keyword, limit):
    """搜索股票"""
    click.echo(f'搜索股票: {keyword}, 限制: {limit}')

@cli.command()
@click.option('-f', '--format', default='table', help='输出格式 (table, json)')
@click.option('-t', '--top', default='10', help='显示前N只股票')
def hot(format, top):
    """获取热门股票"""
    click.echo(f'获取热门股票, 格式: {format}, Top: {top}')

@cli.command()
@click.argument('symbols', nargs=-1)
@click.option('-i', '--interval', default='30', help='刷新间隔(秒)')
@click.option('-t', '--threshold', default='5', help='涨跌幅提醒阈值(%)')
def monitor(symbols, interval, threshold):
    """监控股票价格变化"""
    click.echo(f'监控股票: {symbols}, 刷新间隔: {interval}秒, 阈值: {threshold}%')

@cli.command()
def market():
    """显示市场概览"""
    click.echo('显示市场概览')

if __name__ == '__main__':
    cli() 