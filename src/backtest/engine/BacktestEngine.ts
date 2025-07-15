/**
 * 回测引擎
 * 实现策略历史数据回测和性能分析
 */

import {
  BacktestConfig,
  BacktestResult,
  Trade,
  EquityPoint,
  PerformanceMetrics,
  Signal,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  MarketData,
  Kline,
  IStrategy,
  BacktestError
} from '../../types';
import { MathUtils, DateUtils, PerformanceUtils } from '../../utils';

/**
 * 回测引擎状态
 */
export enum BacktestState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

/**
 * 回测进度信息
 */
export interface BacktestProgress {
  currentDate: string;
  processedBars: number;
  totalBars: number;
  progressPercent: number;
  estimatedTimeRemaining: number;
}

/**
 * 回测账户状态
 */
interface AccountState {
  cash: number;
  positions: Map<string, number>;
  totalValue: number;
  availableMargin: number;
}

/**
 * 回测引擎类
 */
export class BacktestEngine {
  private state: BacktestState = BacktestState.IDLE;
  private config!: BacktestConfig;
  private strategy!: IStrategy;
  private account!: AccountState;
  private trades: Trade[] = [];
  private orders: Order[] = [];
  private equityCurve: EquityPoint[] = [];
  private currentBar = 0;
  private startTime = 0;
  private onProgressCallback?: (progress: BacktestProgress) => void;

  /**
   * 构造函数
   */
  constructor() {
    this.resetState();
  }

  /**
   * 运行回测
   * @param config 回测配置
   * @param onProgress 进度回调函数
   * @returns 回测结果
   */
  async run(
    config: BacktestConfig,
    onProgress?: (progress: BacktestProgress) => void
  ): Promise<BacktestResult> {
    try {
      this.state = BacktestState.RUNNING;
      this.config = config;
      this.onProgressCallback = onProgress;
      this.startTime = Date.now();

      // 验证配置
      this.validateConfig();

      // 初始化策略
      await this.initializeStrategy();

      // 初始化账户
      this.initializeAccount();

      // 获取历史数据
      const historicalData = await this.loadHistoricalData();

      // 执行回测
      await this.executeBacktest(historicalData);

      // 计算结果
      const result = this.calculateResults();

      this.state = BacktestState.COMPLETED;
      console.log('回测完成');

      return result;
    } catch (error) {
      this.state = BacktestState.ERROR;
      throw new BacktestError(`回测执行失败: ${error.message}`, error);
    }
  }

  /**
   * 暂停回测
   */
  pause(): void {
    if (this.state === BacktestState.RUNNING) {
      this.state = BacktestState.PAUSED;
    }
  }

  /**
   * 恢复回测
   */
  resume(): void {
    if (this.state === BacktestState.PAUSED) {
      this.state = BacktestState.RUNNING;
    }
  }

  /**
   * 停止回测
   */
  stop(): void {
    this.state = BacktestState.IDLE;
    this.resetState();
  }

  /**
   * 获取当前状态
   */
  getState(): BacktestState {
    return this.state;
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.strategy) {
      throw new BacktestError('策略配置不能为空');
    }

    if (!this.config.startDate || !this.config.endDate) {
      throw new BacktestError('回测日期范围不能为空');
    }

    if (new Date(this.config.startDate) >= new Date(this.config.endDate)) {
      throw new BacktestError('开始日期必须早于结束日期');
    }

    if (this.config.initialCapital <= 0) {
      throw new BacktestError('初始资金必须大于0');
    }
    if (this.config.commission < 0 || this.config.commission > 0.1) {
      throw new BacktestError('手续费必须在0-10%之间');
    }

    if (this.config.symbols.length === 0) {
      throw new BacktestError('必须指定至少一个交易对');
    }
  }

  /**
   * 初始化策略
   */
  private async initializeStrategy(): Promise<void> {
    // 这里应该根据配置创建策略实例
    // 暂时假设策略已经在配置中提供
    this.strategy = this.config.strategy as any;
    
    if (this.strategy.initialize) {
      await this.strategy.initialize();
    }
  }

  /**
   * 初始化账户
   */
  private initializeAccount(): void {
    this.account = {
      cash: this.config.initialCapital,
      positions: new Map(),
      totalValue: this.config.initialCapital,
      availableMargin: this.config.initialCapital
    };

    // 记录初始资金曲线点
    this.equityCurve.push({
      timestamp: DateUtils.parseDate(this.config.startDate),
      equity: this.config.initialCapital,
      drawdown: 0
    });
  }

  /**
   * 加载历史数据（模拟实现）
   */
  private async loadHistoricalData(): Promise<Map<string, Kline[]>> {
    const data = new Map<string, Kline[]>();
    
    // 这里应该从数据源加载实际的历史数据
    // 暂时生成模拟数据
    for (const symbol of this.config.symbols) {
      const klines = this.generateMockData(symbol);
      data.set(symbol, klines);
    }

    return data;
  }

  /**
   * 生成模拟数据（用于演示）
   */
  private generateMockData(symbol: string): Kline[] {
    const startTime = DateUtils.parseDate(this.config.startDate);
    const endTime = DateUtils.parseDate(this.config.endDate);
    const interval = 24 * 60 * 60 * 1000; // 1天
    const klines: Kline[] = [];

    let currentTime = startTime;
    let price = 100; // 初始价格

    while (currentTime <= endTime) {
      // 模拟价格变动
      const change = (Math.random() - 0.5) * 0.1; // ±5%的随机变动
      price *= (1 + change);
      const high = price * (1 + Math.random() * 0.05);
      const low = price * (1 - Math.random() * 0.05);
      const volume = 1000000 + Math.random() * 5000000;

      klines.push({
        symbol,
        openTime: currentTime,
        closeTime: currentTime + interval - 1,
        open: price,
        high,
        low,
        close: price,
        volume,
        interval: '1d'
      });

      currentTime += interval;
    }

    return klines;
  }

  /**
   * 执行回测
   */
  private async executeBacktest(historicalData: Map<string, Kline[]>): Promise<void> {
    // 获取所有K线数据并按时间排序
    const allBars = this.mergeAndSortBars(historicalData);
    
    this.currentBar = 0;

    for (const bar of allBars) {
      // 检查状态
      if (this.state === BacktestState.PAUSED) {
        await this.waitForResume();
      }
      
      if (this.state !== BacktestState.RUNNING) {
        break;
      }

      // 处理当前K线
      await this.processBar(bar, historicalData);

      // 更新进度
      this.updateProgress(allBars.length);

      this.currentBar++;
    }
  }

  /**
   * 合并并排序K线数据
   */
  private mergeAndSortBars(historicalData: Map<string, Kline[]>): Kline[] {
    const allBars: Kline[] = [];
    
    for (const klines of historicalData.values()) {
      allBars.push(...klines);
    }

    // 按时间排序
    return allBars.sort((a, b) => a.openTime - b.openTime);
  }

  /**
   * 处理单个K线
   */
  private async processBar(currentBar: Kline, historicalData: Map<string, Kline[]>): Promise<void> {
    // 更新市场数据
    const marketData = this.createMarketData(currentBar, historicalData);

    // 处理挂单
    this.processOrders(currentBar);

    // 生成策略信号
    const signal = await this.strategy.generateSignal(marketData);

    // 处理信号
    if (signal) {
      this.processSignal(signal, currentBar);
    }
    // 更新账户价值
    this.updateAccountValue(currentBar);

    // 记录资金曲线
    this.recordEquityPoint(currentBar);
  }

  /**
   * 创建市场数据
   */
  private createMarketData(currentBar: Kline, historicalData: Map<string, Kline[]>): MarketData {
    // 获取当前交易对的历史数据
    const symbolData = historicalData.get(currentBar.symbol) || [];
    
    // 找到当前K线在历史数据中的位置
    const currentIndex = symbolData.findIndex(k => k.openTime === currentBar.openTime);
    
    // 获取包含当前K线在内的历史数据切片
    const historySlice = symbolData.slice(0, currentIndex + 1);

    return {
      klines: historySlice,
      ticker: {
        symbol: currentBar.symbol,
        timestamp: currentBar.closeTime,
        price: currentBar.close,
        change24h: 0,
        changePercent24h: 0,
        high24h: currentBar.high,
        low24h: currentBar.low,
        volume24h: currentBar.volume
      }
    };
  }

  /**
   * 处理挂单
   */
  private processOrders(currentBar: Kline): void {
    const symbol = currentBar.symbol;
    
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const order = this.orders[i];
      
      if (order.symbol !== symbol) continue;
      if (order.status !== OrderStatus.PENDING) continue;

      let filled = false;
      let fillPrice = 0;

      // 检查订单是否成交
      if (order.type === OrderType.MARKET) {
        filled = true;
        fillPrice = currentBar.open; // 市价单按开盘价成交
      } else if (order.type === OrderType.LIMIT) {
        if (order.side === OrderSide.BUY && currentBar.low <= order.price!) {
          filled = true;
          fillPrice = order.price!;
        } else if (order.side === OrderSide.SELL && currentBar.high >= order.price!) {
          filled = true;
          fillPrice = order.price!;
        }
      }

      if (filled) {
        this.executeOrder(order, fillPrice, currentBar.openTime);
      }
    }
  }

  /**
   * 执行订单
   */
  private executeOrder(order: Order, fillPrice: number, timestamp: number): void {
    // 计算手续费
    const notional = order.quantity * fillPrice;
    const commission = notional * this.config.commission;

    // 更新仓位
    const currentPosition = this.account.positions.get(order.symbol) || 0;
    if (order.side === OrderSide.BUY) {
      this.account.positions.set(order.symbol, currentPosition + order.quantity);
      this.account.cash -= (notional + commission);
    } else {
      this.account.positions.set(order.symbol, currentPosition - order.quantity);
      this.account.cash += (notional - commission);
    }

    // 更新订单状态
    order.status = OrderStatus.FILLED;
    order.filledQuantity = order.quantity;
    order.avgPrice = fillPrice;
    order.updatedAt = timestamp;

    // 记录交易
    this.recordTrade(order, fillPrice, commission, timestamp);

    console.log(`订单成交: ${order.symbol} ${order.side} ${order.quantity}@${fillPrice}`);
  }

  /**
   * 处理信号
   */
  private processSignal(signal: Signal, currentBar: Kline): void {
    // 检查是否有足够的资金
    if (!this.canExecuteSignal(signal)) {
      return;
    }

    // 创建订单
    const order = this.createOrderFromSignal(signal, currentBar.openTime);
    // 添加到订单列表
    this.orders.push(order);

    console.log(`生成订单: ${signal.symbol} ${signal.side} 置信度: ${signal.confidence.toFixed(2)}`);
  }

  /**
   * 检查是否可以执行信号
   */
  private canExecuteSignal(signal: Signal): boolean {
    const riskConfig = this.config.strategy.riskManagement;
    const maxPositionValue = this.account.totalValue * riskConfig.maxPositionSize;
    const requiredCash = signal.price * (signal.quantity || 100); // 默认100股

    return this.account.cash >= requiredCash && requiredCash <= maxPositionValue;
  }

  /**
   * 从信号创建订单
   */
  private createOrderFromSignal(signal: Signal, timestamp: number): Order {
    // 计算订单数量
    const riskConfig = this.config.strategy.riskManagement;
    const maxPositionValue = this.account.totalValue * riskConfig.maxPositionSize;
    const quantity = Math.floor(maxPositionValue / signal.price);

    return {
      id: this.generateOrderId(),
      symbol: signal.symbol,
      side: signal.side,
      type: OrderType.MARKET, // 简化为市价单
      quantity,
      status: OrderStatus.PENDING,
      createdAt: timestamp,
      updatedAt: timestamp,
      filledQuantity: 0
    };
  }

  /**
   * 记录交易
   */
  private recordTrade(order: Order, fillPrice: number, commission: number, timestamp: number): void {
    // 查找对应的开仓交易
    const symbol = order.symbol;
    const currentPosition = this.account.positions.get(symbol) || 0;

    // 如果是平仓交易，计算盈亏
    if (Math.abs(currentPosition) < order.quantity) {
      // 找到对应的开仓交易
      const openTrade = this.findOpenTrade(symbol, order.side);
      
      if (openTrade) {
        // 计算盈亏
        const pnl = this.calculatePnL(openTrade, fillPrice, order.quantity);
        
        // 更新交易记录
        openTrade.exitTime = timestamp;
        openTrade.exitPrice = fillPrice;
        openTrade.pnl = pnl - commission;
        openTrade.pnlPercent = pnl / (openTrade.entryPrice * openTrade.quantity);
        openTrade.commission = commission;
      }
    } else {
      // 开仓交易
      const trade: Trade = {
        id: this.generateTradeId(),
        symbol: order.symbol,
        entryTime: timestamp,
        exitTime: 0,
        side: order.side,
        entryPrice: fillPrice,
        exitPrice: 0,
        quantity: order.quantity,
        pnl: 0,
        pnlPercent: 0,
        commission
      };

      this.trades.push(trade);
    }
  }

  /**
   * 查找开仓交易
   */
  private findOpenTrade(symbol: string, side: OrderSide): Trade | undefined {
    const oppositeSide = side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
    
    return this.trades.find(trade => 
      trade.symbol === symbol && 
      trade.side === oppositeSide && 
      trade.exitTime === 0
    );
  }

  /**
   * 计算盈亏
   */
  private calculatePnL(openTrade: Trade, exitPrice: number, quantity: number): number {
    if (openTrade.side === OrderSide.BUY) {
      return (exitPrice - openTrade.entryPrice) * quantity;
    } else {
      return (openTrade.entryPrice - exitPrice) * quantity;
    }
  }

  /**
   * 更新账户价值
   */
  private updateAccountValue(currentBar: Kline): void {
    let totalValue = this.account.cash;

    // 计算持仓价值
    for (const [symbol, position] of this.account.positions) {
      if (symbol === currentBar.symbol) {
        totalValue += position * currentBar.close;
      }
    }

    this.account.totalValue = totalValue;
  }

  /**
   * 记录资金曲线点
   */
  private recordEquityPoint(currentBar: Kline): void {
    const peak = Math.max(...this.equityCurve.map(p => p.equity));
    const drawdown = peak > 0 ? (peak - this.account.totalValue) / peak : 0;

    this.equityCurve.push({
      timestamp: currentBar.closeTime,
      equity: this.account.totalValue,
      drawdown
    });
  }

  /**
   * 计算回测结果
   */
  private calculateResults(): BacktestResult {
    const initialCapital = this.config.initialCapital;
    const finalValue = this.account.totalValue;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    
    // 计算交易日数
    const startDate = new Date(this.config.startDate);
    const endDate = new Date(this.config.endDate);
    const tradingDays = DateUtils.getTradingDaysBetween(startDate, endDate);
    
    // 计算年化收益率
    const annualizedReturn = PerformanceUtils.calculateAnnualizedReturn(totalReturn, tradingDays);
    
    // 计算最大回撤
    const equityValues = this.equityCurve.map(p => p.equity);
    const maxDrawdown = MathUtils.maxDrawdown(equityValues);
    
    // 计算夏普比率
    const returns = PerformanceUtils.calculateReturns(equityValues);
    const sharpeRatio = MathUtils.sharpeRatio(returns);
    
    // 计算交易统计
    const completedTrades = this.trades.filter(t => t.exitTime > 0);
    const winningTrades = completedTrades.filter(t => t.pnl > 0);
    const winRate = completedTrades.length > 0 ? winningTrades.length / completedTrades.length : 0;
    const profitLossRatio = PerformanceUtils.calculateProfitLossRatio(completedTrades.map(t => t.pnl));

    // 计算性能指标
    const metrics = this.calculatePerformanceMetrics();

    return {
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio,
      winRate,
      profitLossRatio,
      totalTrades: completedTrades.length,
      trades: completedTrades,
      equityCurve: this.equityCurve,
      metrics
    };
  }

  /**
   * 计算性能指标
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    const equityValues = this.equityCurve.map(p => p.equity);
    const returns = PerformanceUtils.calculateReturns(equityValues);
    const completedTrades = this.trades.filter(t => t.exitTime > 0);
    const tradePnLs = completedTrades.map(t => t.pnl);

    return {
      returns: {
        total: (this.account.totalValue - this.config.initialCapital) / this.config.initialCapital,
        annualized: PerformanceUtils.calculateAnnualizedReturn(
          (this.account.totalValue - this.config.initialCapital) / this.config.initialCapital,
          DateUtils.getTradingDaysBetween(new Date(this.config.startDate), new Date(this.config.endDate))
        ),
        monthly: [], // 这里需要根据实际情况计算月度收益
        daily: returns
      },
      risk: {
        volatility: MathUtils.standardDeviation(returns),
        maxDrawdown: MathUtils.maxDrawdown(equityValues),
        var95: MathUtils.percentile(returns, 5),
        var99: MathUtils.percentile(returns, 1)
      },
      riskAdjusted: {
        sharpeRatio: MathUtils.sharpeRatio(returns),
        sortinoRatio: 0, // 需要单独计算
        calmarRatio: 0   // 需要单独计算
      },
      trading: {
        totalTrades: completedTrades.length,
        winningTrades: completedTrades.filter(t => t.pnl > 0).length,
        losingTrades: completedTrades.filter(t => t.pnl < 0).length,
        winRate: PerformanceUtils.calculateWinRate(tradePnLs),
        avgWin: completedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / Math.max(1, completedTrades.filter(t => t.pnl > 0).length),
        avgLoss: Math.abs(completedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)) / Math.max(1, completedTrades.filter(t => t.pnl < 0).length),
        profitFactor: PerformanceUtils.calculateProfitLossRatio(tradePnLs)
      }
    };
  }

  /**
   * 等待恢复
   */
  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const checkState = () => {
        if (this.state === BacktestState.RUNNING) {
          resolve();
        } else {
          setTimeout(checkState, 100);
        }
      };
      checkState();
    });
  }

  /**
   * 更新进度
   */
  private updateProgress(totalBars: number): void {
    if (this.onProgressCallback) {
      const progressPercent = (this.currentBar / totalBars) * 100;
      const elapsed = Date.now() - this.startTime;
      const estimatedTotal = elapsed / (this.currentBar / totalBars);
      const estimatedTimeRemaining = estimatedTotal - elapsed;

      const progress: BacktestProgress = {
        currentDate: DateUtils.formatTimestamp(Date.now()),
        processedBars: this.currentBar,
        totalBars,
        progressPercent,
        estimatedTimeRemaining
      };

      this.onProgressCallback(progress);
    }
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.trades = [];
    this.orders = [];
    this.equityCurve = [];
    this.currentBar = 0;
    this.startTime = 0;
  }

  /**
   * 生成订单ID
   */
  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  /**
   * 生成交易ID
   */
  private generateTradeId(): string {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }
}