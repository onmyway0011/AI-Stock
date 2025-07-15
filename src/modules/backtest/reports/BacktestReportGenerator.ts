/**
 * 回测报告生成器
 * 生成详细的回测报告，包括图表、统计分析和风险评估
 */

import { BacktestResult, EquityPoint, Trade } from '../engine/BacktestEngine';
import { createLogger } from '../../utils/logger';
import { DateUtils, FormatUtils, MathUtils } from '../../utils';

const logger = createLogger('BACKTEST_REPORT');

/**
 * 报告配置
 */
export interface ReportConfig {
  /** 报告标题 */
  title: string;
  /** 是否包含详细交易记录 */
  includeTradeDetails: boolean;
  /** 是否包含月度分析 */
  includeMonthlyAnalysis: boolean;
  /** 是否包含风险分析 */
  includeRiskAnalysis: boolean;
  /** 输出格式 */
  format: 'html' | 'pdf' | 'json' | 'markdown';
  /** 输出路径 */
  outputPath: string;
}

/**
 * 图表数据接口
 */
export interface ChartData {
  /** 资金曲线图 */
  equityCurve: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color: string;
    }>;
  };
  
  /** 回撤图 */
  drawdownChart: {
    labels: string[];
    data: number[];
  };
  
  /** 月度收益热力图 */
  monthlyReturnsHeatmap: {
    years: string[];
    months: string[];
    data: number[][];
  };
  /** 收益分布直方图 */
  returnsDistribution: {
    bins: string[];
    frequencies: number[];
  };
  
  /** 滚动夏普比率 */
  rollingSharpeRatio: {
    labels: string[];
    data: number[];
  };
}

/**
 * 回测报告生成器类
 */
export class BacktestReportGenerator {
  private config: ReportConfig;

  constructor(config: ReportConfig) {
    this.config = config;
  }

  /**
   * 生成完整报告
   */
  async generateReport(result: BacktestResult): Promise<string> {
    logger.info(`开始生成回测报告: ${this.config.format}`);

    try {
      const reportData = this.analyzeResults(result);
      const chartData = this.generateChartData(result);

      let report: string;

      switch (this.config.format) {
        case 'html':
          report = this.generateHTMLReport(result, reportData, chartData);
          break;
        case 'markdown':
          report = this.generateMarkdownReport(result, reportData);
          break;
        case 'json':
          report = this.generateJSONReport(result, reportData, chartData);
          break;
        default:
          throw new Error(`不支持的报告格式: ${this.config.format}`);
      }

      logger.info('回测报告生成完成');
      return report;

    } catch (error) {
      logger.error('生成回测报告失败', error);
      throw error;
    }
  }

  /**
   * 分析回测结果
   */
  private analyzeResults(result: BacktestResult): {
    performanceGrade: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    riskAssessment: string;
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // 收益分析
    if (result.returns.annualizedReturn > 0.15) {
      strengths.push('年化收益率优秀 (>15%)');
    } else if (result.returns.annualizedReturn > 0.08) {
      strengths.push('年化收益率良好 (>8%)');
    } else if (result.returns.annualizedReturn < 0) {
      weaknesses.push('策略产生负收益');
      recommendations.push('考虑调整策略参数或更换策略');
    }

    // 夏普比率分析
    if (result.riskAdjusted.sharpeRatio > 1.5) {
      strengths.push('夏普比率优秀 (>1.5)');
    } else if (result.riskAdjusted.sharpeRatio > 1.0) {
      strengths.push('夏普比率良好 (>1.0)');
    } else if (result.riskAdjusted.sharpeRatio < 0.5) {
      weaknesses.push('夏普比率偏低 (<0.5)');
      recommendations.push('需要降低策略风险或提高收益');
    }

    // 最大回撤分析
    if (result.risk.maxDrawdown < 0.1) {
      strengths.push('最大回撤控制良好 (<10%)');
    } else if (result.risk.maxDrawdown > 0.3) {
      weaknesses.push('最大回撤过大 (>30%)');
      recommendations.push('加强风险控制，设置更严格的止损');
    }

    // 胜率分析
    if (result.trading.winRate > 0.6) {
      strengths.push('策略胜率较高 (>60%)');
    } else if (result.trading.winRate < 0.4) {
      weaknesses.push('策略胜率偏低 (<40%)');
      recommendations.push('优化入场信号，提高交易准确性');
    }

    // 盈亏比分析
    if (result.trading.profitFactor > 1.5) {
      strengths.push('盈亏比优秀 (>1.5)');
    } else if (result.trading.profitFactor < 1.0) {
      weaknesses.push('盈亏比不足 (<1.0)');
      recommendations.push('优化出场策略，扩大盈利交易规模');
    }

    // 综合评级
    let performanceGrade = 'C';
    const scoreWeights = {
      return: result.returns.annualizedReturn > 0 ? Math.min(result.returns.annualizedReturn * 5, 25) : -10,
      sharpe: Math.min(result.riskAdjusted.sharpeRatio * 20, 25),
      drawdown: Math.max(25 - result.risk.maxDrawdown * 50, 0),
      winRate: result.trading.winRate * 25
    };

    const totalScore = Object.values(scoreWeights).reduce((sum, score) => sum + score, 0);

    if (totalScore >= 80) performanceGrade = 'A';
    else if (totalScore >= 60) performanceGrade = 'B';
    else if (totalScore >= 40) performanceGrade = 'C';
    else performanceGrade = 'D';

    // 风险评估
    let riskAssessment = '中等风险';
    if (result.risk.maxDrawdown > 0.25 || result.risk.volatility > 0.3) {
      riskAssessment = '高风险';
    } else if (result.risk.maxDrawdown < 0.1 && result.risk.volatility < 0.15) {
      riskAssessment = '低风险';
    }

    return {
      performanceGrade,
      strengths,
      weaknesses,
      recommendations,
      riskAssessment
    };
  }

  /**
   * 生成图表数据
   */
  private generateChartData(result: BacktestResult): ChartData {
    // 资金曲线图
    const equityCurve = {
      labels: result.details.equityCurve.map(point => 
        DateUtils.formatTimestamp(point.timestamp, 'YYYY-MM-DD')
      ),
      datasets: [
        {
          label: '策略净值',
          data: result.details.equityCurve.map(point => point.equity),
          color: '#2196F3'
        }
      ]
    };

    // 添加基准对比
    if (result.details.equityCurve[0]?.benchmarkValue) {
      equityCurve.datasets.push({
        label: '基准收益',
        data: result.details.equityCurve.map(point => point.benchmarkValue || 0),
        color: '#FF9800'
      });
    }

    // 回撤图
    const drawdownData = this.calculateDrawdownSeries(result.details.equityCurve);
    const drawdownChart = {
      labels: result.details.equityCurve.map(point => 
        DateUtils.formatTimestamp(point.timestamp, 'YYYY-MM-DD')
      ),
      data: drawdownData
    };

    // 月度收益热力图
    const monthlyReturnsHeatmap = this.generateMonthlyHeatmapData(result.details.monthlyReturns);

    // 收益分布直方图
    const returnsDistribution = this.generateReturnsDistribution(result.details.equityCurve);

    // 滚动夏普比率
    const rollingSharpeRatio = this.calculateRollingSharpeRatio(result.details.equityCurve);

    return {
      equityCurve,
      drawdownChart,
      monthlyReturnsHeatmap,
      returnsDistribution,
      rollingSharpeRatio
    };
  }

  /**
   * 生成HTML报告
   */
  private generateHTMLReport(
    result: BacktestResult,
    analysis: ReturnType<typeof this.analyzeResults>,
    chartData: ChartData
  ): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2196F3, #21CBF3);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header .subtitle {
            margin-top: 10px;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .content {
            padding: 30px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            border-left: 4px solid #2196F3;
            padding: 20px;
            border-radius: 8px;
        }
        .metric-card.positive {
            border-left-color: #4CAF50;
        }
        .metric-card.negative {
            border-left-color: #f44336;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #333;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            border-bottom: 2px solid #2196F3;
            padding-bottom: 10px;
            color: #2196F3;
        }
        .performance-grade {
            display: inline-block;
            padding: 10px 20px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 1.2em;
        }
        .grade-a { background: #4CAF50; color: white; }
        .grade-b { background: #FF9800; color: white; }
        .grade-c { background: #FFC107; color: black; }
        .grade-d { background: #f44336; color: white; }
        .list-item {
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .list-item:last-child {
            border-bottom: none;
        }
        .chart-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            min-height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
        .trades-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .trades-table th,
        .trades-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .trades-table th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .trade-buy {
            color: #4CAF50;
        }
        .trade-sell {
            color: #f44336;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>${this.config.title}</h1>
            <div class="subtitle">
                ${result.summary.strategy} | ${result.summary.symbol} | 
                ${DateUtils.formatTimestamp(result.summary.startTime)} - ${DateUtils.formatTimestamp(result.summary.endTime)}
            </div>
        </div>

        <div class="content">
            <!-- 关键指标摘要 -->
            <div class="section">
                <h2>📊 关键指标摘要</h2>
                <div class="summary-grid">
                    <div class="metric-card ${result.returns.totalReturn > 0 ? 'positive' : 'negative'}">
                        <div class="metric-label">总收益率</div>
                        <div class="metric-value">${(result.returns.totalReturn * 100).toFixed(2)}%</div>
                    </div>
                    <div class="metric-card ${result.returns.annualizedReturn > 0 ? 'positive' : 'negative'}">
                        <div class="metric-label">年化收益率</div>
                        <div class="metric-value">${(result.returns.annualizedReturn * 100).toFixed(2)}%</div>
                    </div>
                    <div class="metric-card ${result.riskAdjusted.sharpeRatio > 1 ? 'positive' : 'negative'}">
                        <div class="metric-label">夏普比率</div>
                        <div class="metric-value">${result.riskAdjusted.sharpeRatio.toFixed(2)}</div>
                    </div>
                    <div class="metric-card negative">
                        <div class="metric-label">最大回撤</div>
                        <div class="metric-value">${(result.risk.maxDrawdown * 100).toFixed(2)}%</div>
                    </div>
                    <div class="metric-card ${result.trading.winRate > 0.5 ? 'positive' : 'negative'}">
                        <div class="metric-label">胜率</div>
                        <div class="metric-value">${(result.trading.winRate * 100).toFixed(1)}%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">交易次数</div>
                        <div class="metric-value">${result.trading.totalTrades}</div>
                    </div>
                </div>
            </div>

            <!-- 策略评级 -->
            <div class="section">
                <h2>🏆 策略评级</h2>
                <div class="performance-grade grade-${analysis.performanceGrade.toLowerCase()}">
                    ${analysis.performanceGrade} 级
                </div>
                <p><strong>风险评估:</strong> ${analysis.riskAssessment}</p>
            </div>

            <!-- 优势与劣势 -->
            <div class="section">
                <h2>✅ 策略优势</h2>
                ${analysis.strengths.map(strength => `<div class="list-item">• ${strength}</div>`).join('')}
                
                <h2>⚠️ 策略劣势</h2>
                ${analysis.weaknesses.map(weakness => `<div class="list-item">• ${weakness}</div>`).join('')}
                
                <h2>💡 改进建议</h2>
                ${analysis.recommendations.map(rec => `<div class="list-item">• ${rec}</div>`).join('')}
            </div>

            <!-- 详细性能指标 -->
            <div class="section">
                <h2>📈 详细性能指标</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h3>收益指标</h3>
                        <div class="list-item">总收益率: ${(result.returns.totalReturn * 100).toFixed(2)}%</div>
                        <div class="list-item">年化收益率: ${(result.returns.annualizedReturn * 100).toFixed(2)}%</div>
                        <div class="list-item">Alpha: ${(result.returns.alpha * 100).toFixed(2)}%</div>
                        <div class="list-item">Beta: ${result.returns.beta.toFixed(2)}</div>
                        
                        <h3>风险指标</h3>
                        <div class="list-item">年化波动率: ${(result.risk.volatility * 100).toFixed(2)}%</div>
                        <div class="list-item">最大回撤: ${(result.risk.maxDrawdown * 100).toFixed(2)}%</div>
                        <div class="list-item">下行标准差: ${(result.risk.downsideDeviation * 100).toFixed(2)}%</div>
                        <div class="list-item">VaR 95%: ${(result.risk.var95 * 100).toFixed(2)}%</div>
                        <div class="list-item">VaR 99%: ${(result.risk.var99 * 100).toFixed(2)}%</div>
                    </div>
                    <div>
                        <h3>风险调整收益</h3>
                        <div class="list-item">夏普比率: ${result.riskAdjusted.sharpeRatio.toFixed(2)}</div>
                        <div class="list-item">索提诺比率: ${result.riskAdjusted.sortinoRatio.toFixed(2)}</div>
                        <div class="list-item">卡玛比率: ${result.riskAdjusted.calmarRatio.toFixed(2)}</div>
                        <div class="list-item">信息比率: ${result.riskAdjusted.informationRatio.toFixed(2)}</div>
                        <div class="list-item">特雷诺比率: ${result.riskAdjusted.treynorRatio.toFixed(2)}</div>
                        
                        <h3>交易统计</h3>
                        <div class="list-item">总交易次数: ${result.trading.totalTrades}</div>
                        <div class="list-item">盈利交易: ${result.trading.winningTrades}</div>
                        <div class="list-item">亏损交易: ${result.trading.losingTrades}</div>
                        <div class="list-item">盈亏比: ${result.trading.profitFactor.toFixed(2)}</div>
                        <div class="list-item">平均交易: ${FormatUtils.formatCurrency(result.trading.averageTrade)}</div>
                    </div>
                </div>
            </div>

            <!-- 图表区域 -->
            <div class="section">
                <h2>📊 图表分析</h2>
                
                <h3>资金曲线</h3>
                <div class="chart-container">
                    📈 资金曲线图 (需要集成图表库如Chart.js)
                    <br>数据点: ${chartData.equityCurve.labels.length}
                </div>
                
                <h3>回撤分析</h3>
                <div class="chart-container">
                    📉 回撤图 (显示最大回撤期间)
                </div>
                
                <h3>收益分布</h3>
                <div class="chart-container">
                    📊 日收益率分布直方图
                </div>
                <h3>滚动夏普比率</h3>
                <div class="chart-container">
                    📈 滚动夏普比率图 (需要集成图表库如Chart.js)
                    <br>数据点: ${chartData.rollingSharpeRatio.labels.length}
                </div>
            </div>
            <!-- 交易详情 -->
            ${this.config.includeTradeDetails ? this.generateTradeDetailsHTML(result.details.trades) : ''}

            <!-- 月度分析 -->
            ${this.config.includeMonthlyAnalysis ? this.generateMonthlyAnalysisHTML(result.details.monthlyReturns) : ''}
        </div>

        <div class="footer">
            <p>报告生成时间: ${DateUtils.formatTimestamp(Date.now())}</p>
            <p>免责声明: 本报告仅供参考，历史表现不代表未来收益，投资有风险，决策需谨慎。</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成交易详情HTML
   */
  private generateTradeDetailsHTML(trades: Trade[]): string {
    const recentTrades = trades.slice(-50); // 只显示最近50笔交易
    
    return `
    <div class="section">
        <h2>💼 交易详情 (最近50笔)</h2>
        <table class="trades-table">
            <thead>
                <tr>
                    <th>时间</th>
                    <th>方向</th>
                    <th>数量</th>
                    <th>价格</th>
                    <th>手续费</th>
                    <th>原因</th>
                </tr>
            </thead>
            <tbody>
                ${recentTrades.map(trade => `
                    <tr>
                        <td>${DateUtils.formatTimestamp(trade.timestamp, 'MM-DD HH:mm')}</td>
                        <td class="trade-${trade.side.toLowerCase()}">${trade.side}</td>
                        <td>${trade.quantity}</td>
                        <td>${trade.price.toFixed(4)}</td>
                        <td>${FormatUtils.formatCurrency(trade.commission)}</td>
                        <td>${trade.reason}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
  }

  /**
   * 生成月度分析HTML
   */
  private generateMonthlyAnalysisHTML(monthlyReturns: { [month: string]: number }): string {
    const months = Object.keys(monthlyReturns).sort();
    
    return `
    <div class="section">
        <h2>📅 月度收益分析</h2>
        <div class="summary-grid">
            ${months.map(month => {
              const return_ = monthlyReturns[month];
              return `
                <div class="metric-card ${return_ > 0 ? 'positive' : 'negative'}">
                    <div class="metric-label">${month}</div>
                    <div class="metric-value">${(return_ * 100).toFixed(2)}%</div>
                </div>
              `;
            }).join('')}
        </div>
    </div>`;
  }

  /**
   * 生成Markdown报告
   */
  private generateMarkdownReport(
    result: BacktestResult,
    analysis: ReturnType<typeof this.analyzeResults>
  ): string {
    return `
# ${this.config.title}

## 📊 基本信息

- **策略名称**: ${result.summary.strategy}
- **交易品种**: ${result.summary.symbol}
- **回测期间**: ${DateUtils.formatTimestamp(result.summary.startTime)} - ${DateUtils.formatTimestamp(result.summary.endTime)}
- **初始资金**: ${FormatUtils.formatCurrency(result.summary.initialCapital)}
- **最终资金**: ${FormatUtils.formatCurrency(result.summary.finalEquity)}

## 🏆 策略评级: ${analysis.performanceGrade}级

**风险评估**: ${analysis.riskAssessment}

## 📈 关键指标

| 指标 | 数值 |
|------|------|
| 总收益率 | ${(result.returns.totalReturn * 100).toFixed(2)}% |
| 年化收益率 | ${(result.returns.annualizedReturn * 100).toFixed(2)}% |
| 夏普比率 | ${result.riskAdjusted.sharpeRatio.toFixed(2)} |
| 最大回撤 | ${(result.risk.maxDrawdown * 100).toFixed(2)}% |
| 胜率 | ${(result.trading.winRate * 100).toFixed(1)}% |
| 交易次数 | ${result.trading.totalTrades} |

## ✅ 策略优势

${analysis.strengths.map(s => `- ${s}`).join('\n')}

## ⚠️ 策略劣势

${analysis.weaknesses.map(w => `- ${w}`).join('\n')}

## 💡 改进建议

${analysis.recommendations.map(r => `- ${r}`).join('\n')}

## 📊 详细统计

### 收益指标
- 总收益率: ${(result.returns.totalReturn * 100).toFixed(2)}%
- 年化收益率: ${(result.returns.annualizedReturn * 100).toFixed(2)}%
- Alpha: ${(result.returns.alpha * 100).toFixed(2)}%
- Beta: ${result.returns.beta.toFixed(2)}

### 风险指标
- 年化波动率: ${(result.risk.volatility * 100).toFixed(2)}%
- 最大回撤: ${(result.risk.maxDrawdown * 100).toFixed(2)}%
- 下行标准差: ${(result.risk.downsideDeviation * 100).toFixed(2)}%
- VaR 95%: ${(result.risk.var95 * 100).toFixed(2)}%

### 风险调整收益
- 夏普比率: ${result.riskAdjusted.sharpeRatio.toFixed(2)}
- 索提诺比率: ${result.riskAdjusted.sortinoRatio.toFixed(2)}
- 卡玛比率: ${result.riskAdjusted.calmarRatio.toFixed(2)}

### 交易统计
- 总交易次数: ${result.trading.totalTrades}
- 盈利交易: ${result.trading.winningTrades}
- 亏损交易: ${result.trading.losingTrades}
- 盈亏比: ${result.trading.profitFactor.toFixed(2)}
- 平均交易: ${FormatUtils.formatCurrency(result.trading.averageTrade)}

---
*报告生成时间: ${DateUtils.formatTimestamp(Date.now())}*
`;
  }

  /**
   * 生成JSON报告
   */
  private generateJSONReport(
    result: BacktestResult,
    analysis: ReturnType<typeof this.analyzeResults>,
    chartData: ChartData
  ): string {
    const report = {
      meta: {
        title: this.config.title,
        generatedAt: Date.now(),
        version: '1.0.0'
      },
      summary: result.summary,
      analysis,
      metrics: {
        returns: result.returns,
        risk: result.risk,
        riskAdjusted: result.riskAdjusted,
        trading: result.trading
      },
      charts: chartData,
      details: this.config.includeTradeDetails ? result.details : undefined
    };

    return JSON.stringify(report, null, 2);
  }

  // =================== 辅助方法 ===================

  /**
   * 计算回撤序列
   */
  private calculateDrawdownSeries(equityCurve: EquityPoint[]): number[] {
    const drawdowns: number[] = [];
    let peak = equityCurve[0]?.equity || 0;

    for (const point of equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      }
      
      const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;
      drawdowns.push(-drawdown); // 负值表示回撤
    }

    return drawdowns;
  }

  /**
   * 生成月度热力图数据
   */
  private generateMonthlyHeatmapData(monthlyReturns: { [month: string]: number }): {
    years: string[];
    months: string[];
    data: number[][];
  } {
    const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const years = new Set<string>();
    
    // 提取所有年份
    Object.keys(monthlyReturns).forEach(monthKey => {
      const year = monthKey.split('-')[0];
      years.add(year);
    });

    const sortedYears = Array.from(years).sort();
    const data: number[][] = [];

    for (const year of sortedYears) {
      const yearData: number[] = [];
      for (const month of monthNames) {
        const monthKey = `${year}-${month}`;
        yearData.push(monthlyReturns[monthKey] || 0);
      }
      data.push(yearData);
    }

    return {
      years: sortedYears,
      months: monthNames,
      data
    };
  }

  /**
   * 生成收益分布数据
   */
  private generateReturnsDistribution(equityCurve: EquityPoint[]): {
    bins: string[];
    frequencies: number[];
  } {
    // 计算日收益率
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].equity;
      const currentEquity = equityCurve[i].equity;
      const dailyReturn = (currentEquity - prevEquity) / prevEquity;
      dailyReturns.push(dailyReturn);
    }

    if (dailyReturns.length === 0) {
      return { bins: [], frequencies: [] };
    }

    // 创建直方图
    const minReturn = Math.min(...dailyReturns);
    const maxReturn = Math.max(...dailyReturns);
    const binCount = Math.min(20, Math.max(5, Math.floor(Math.sqrt(dailyReturns.length))));
    const binWidth = (maxReturn - minReturn) / binCount;

    const bins: string[] = [];
    const frequencies: number[] = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = minReturn + i * binWidth;
      const binEnd = binStart + binWidth;
      bins.push(`${(binStart * 100).toFixed(1)}%-${(binEnd * 100).toFixed(1)}%`);
      const count = dailyReturns.filter(r => r >= binStart && (i === binCount - 1 ? r <= binEnd : r < binEnd)).length;
      frequencies.push(count);
    }

    return { bins, frequencies };
  }

  /**
   * 计算滚动夏普比率
   */
  private calculateRollingSharpeRatio(equityCurve: EquityPoint[], window: number = 252): {
    labels: string[];
    data: number[];
  } {
    const labels: string[] = [];
    const data: number[] = [];

    if (equityCurve.length < window + 1) {
      return { labels, data };
    }

    // 计算日收益率
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prevEquity = equityCurve[i - 1].equity;
      const currentEquity = equityCurve[i].equity;
      const dailyReturn = (currentEquity - prevEquity) / prevEquity;
      dailyReturns.push(dailyReturn);
    }

    // 计算滚动夏普比率
    for (let i = window; i <= dailyReturns.length; i++) {
      const windowReturns = dailyReturns.slice(i - window, i);
      const meanReturn = windowReturns.reduce((sum, r) => sum + r, 0) / window;
      const stdReturn = MathUtils.standardDeviation(windowReturns);
      
      const annualizedReturn = meanReturn * 252;
      const annualizedVolatility = stdReturn * Math.sqrt(252);
      
      const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;
      
      labels.push(DateUtils.formatTimestamp(equityCurve[i].timestamp, 'YYYY-MM-DD'));
      data.push(sharpeRatio);
    }

    return { labels, data };
  }
}