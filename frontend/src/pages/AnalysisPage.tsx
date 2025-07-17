/**
 * 数据分析页面
 * 提供深入的股票数据分析和可视化功能
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  DatePicker,
} from '@mui/material';
import {
  Assessment as AnalysisIcon,
  TrendingUp as TrendIcon,
  ShowChart as ChartIcon,
  TableChart as TableIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Scatter,
  ScatterChart,
} from 'recharts';

import { useAppStore } from '../stores/appStore';
import { useAnalysisData } from '../hooks/useElectronAPI';

/**
 * 分析页面组件
 */
const AnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [analysisType, setAnalysisType] = useState('technical');
  const [timeRange, setTimeRange] = useState('30d');

  const {
    config,
    setCurrentPage,
  } = useAppStore();

  // 获取监控的股票列表
  const monitoredSymbols = config?.monitoring?.symbols || [];
  
  // 获取分析数据
  const { data: analysisData, loading, error } = useAnalysisData(
    selectedSymbol,
    analysisType,
    timeRange
  );

  useEffect(() => {
    setCurrentPage('analysis');
    // 默认选择第一只股票
    if (monitoredSymbols.length > 0 && !selectedSymbol) {
      setSelectedSymbol(monitoredSymbols[0]);
    }
  }, [setCurrentPage, monitoredSymbols, selectedSymbol]);

  // 生成模拟技术分析数据
  const generateTechnicalData = () => {
    const data = [];
    const basePrice = 100;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const randomWalk = (Math.random() - 0.5) * 2;
      const price = basePrice + randomWalk * i * 0.1;
      const volume = Math.floor(Math.random() * 1000000) + 500000;
      
      // 简单移动平均线
      const ma5 = price + (Math.random() - 0.5) * 0.5;
      const ma20 = price + (Math.random() - 0.5) * 1;
      
      // RSI (简化计算)
      const rsi = 30 + Math.random() * 40;
      
      // MACD (简化)
      const macd = (Math.random() - 0.5) * 2;
      const signal = macd + (Math.random() - 0.5) * 0.5;
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: price.toFixed(2),
        volume,
        ma5: ma5.toFixed(2),
        ma20: ma20.toFixed(2),
        rsi: rsi.toFixed(1),
        macd: macd.toFixed(3),
        signal: signal.toFixed(3),
        histogram: (macd - signal).toFixed(3),
      });
    }
    
    return data;
  };

  // 生成基本面分析数据
  const generateFundamentalData = () => {
    return {
      financialMetrics: [
        { name: 'PE比率', value: '15.2', change: '+2.1%', status: 'good' },
        { name: 'PB比率', value: '1.8', change: '-0.3%', status: 'neutral' },
        { name: 'ROE', value: '12.5%', change: '+1.2%', status: 'good' },
        { name: 'ROA', value: '8.3%', change: '+0.8%', status: 'good' },
        { name: '毛利率', value: '45.2%', change: '-1.1%', status: 'neutral' },
        { name: '净利率', value: '18.7%', change: '+2.3%', status: 'excellent' },
      ],
      industryComparison: [
        { metric: 'PE', company: selectedSymbol, value: 15.2, industry: 18.5 },
        { metric: 'PB', company: selectedSymbol, value: 1.8, industry: 2.2 },
        { metric: 'ROE', company: selectedSymbol, value: 12.5, industry: 10.8 },
        { metric: 'ROA', company: selectedSymbol, value: 8.3, industry: 6.9 },
      ],
    };
  };

  // 生成风险分析数据
  const generateRiskData = () => {
    return {
      volatility: '15.2%',
      beta: '1.25',
      sharpeRatio: '1.85',
      maxDrawdown: '-12.5%',
      var95: '-5.2%',
      correlationData: [
        { name: '上证指数', correlation: 0.85 },
        { name: '深证成指', correlation: 0.78 },
        { name: '创业板指', correlation: 0.65 },
        { name: '行业指数', correlation: 0.92 },
      ],
    };
  };

  const technicalData = generateTechnicalData();
  const fundamentalData = generateFundamentalData();
  const riskData = generateRiskData();

  // 标签页配置
  const analysisTabs = [
    { id: 'technical', label: '技术分析', icon: ChartIcon },
    { id: 'fundamental', label: '基本面分析', icon: AnalysisIcon },
    { id: 'risk', label: '风险分析', icon: TrendIcon },
    { id: 'signals', label: '交易信号', icon: TableIcon },
  ];

  // 技术分析面板
  const renderTechnicalAnalysis = () => (
    <Grid container spacing={3}>
      {/* 价格和移动平均线 */}
      <Grid item xs={12} lg={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              价格走势与移动平均线
            </Typography>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={technicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#2196f3" name="收盘价" strokeWidth={2} />
                  <Line type="monotone" dataKey="ma5" stroke="#ff9800" name="MA5" strokeWidth={1} />
                  <Line type="monotone" dataKey="ma20" stroke="#4caf50" name="MA20" strokeWidth={1} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 技术指标汇总 */}
      <Grid item xs={12} lg={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              技术指标
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2">RSI (14)</Typography>
                <Typography variant="h4" color={parseFloat(technicalData[technicalData.length - 1]?.rsi) > 70 ? 'error' : parseFloat(technicalData[technicalData.length - 1]?.rsi) < 30 ? 'success' : 'primary'}>
                  {technicalData[technicalData.length - 1]?.rsi}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {parseFloat(technicalData[technicalData.length - 1]?.rsi) > 70 ? '超买' : parseFloat(technicalData[technicalData.length - 1]?.rsi) < 30 ? '超卖' : '正常'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">MACD</Typography>
                <Typography variant="body1">
                  DIF: {technicalData[technicalData.length - 1]?.macd}
                </Typography>
                <Typography variant="body1">
                  DEA: {technicalData[technicalData.length - 1]?.signal}
                </Typography>
                <Typography variant="body1">
                  柱状图: {technicalData[technicalData.length - 1]?.histogram}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 成交量 */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              成交量分析
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={technicalData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${(value / 10000).toFixed(1)}万`, '成交量']} />
                  <Bar dataKey="volume" fill="#9c27b0" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* RSI指标 */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              RSI 相对强弱指标
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={technicalData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rsi" stroke="#f44336" fill="#f44336" fillOpacity={0.3} />
                  {/* 超买超卖线 */}
                  <Line y={70} stroke="#ff5722" strokeDasharray="5 5" />
                  <Line y={30} stroke="#4caf50" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // 基本面分析面板
  const renderFundamentalAnalysis = () => (
    <Grid container spacing={3}>
      {/* 财务指标 */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              关键财务指标
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>指标</TableCell>
                    <TableCell align="right">数值</TableCell>
                    <TableCell align="right">变化</TableCell>
                    <TableCell align="center">评级</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fundamentalData.financialMetrics.map((metric) => (
                    <TableRow key={metric.name}>
                      <TableCell>{metric.name}</TableCell>
                      <TableCell align="right">{metric.value}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          color={metric.change.startsWith('+') ? 'success.main' : 'error.main'}
                        >
                          {metric.change}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={metric.status === 'excellent' ? '优秀' : metric.status === 'good' ? '良好' : '一般'}
                          color={metric.status === 'excellent' ? 'success' : metric.status === 'good' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* 行业对比 */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              行业对比分析
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fundamentalData.industryComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="company" name={selectedSymbol} fill="#2196f3" />
                  <Bar dataKey="industry" name="行业平均" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 估值水平 */}
      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="subtitle2" gutterBottom>
            估值分析结论
          </Typography>
          <Typography variant="body2">
            基于当前财务指标，该股票的PE比率为15.2，低于行业平均水平18.5，显示相对低估。
            ROE为12.5%，高于行业平均，表明盈利能力较强。整体估值水平合理，具有一定投资价值。
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );

  // 风险分析面板
  const renderRiskAnalysis = () => (
    <Grid container spacing={3}>
      {/* 风险指标 */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              风险指标
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {riskData.volatility}
                  </Typography>
                  <Typography variant="caption">波动率</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary">
                    {riskData.beta}
                  </Typography>
                  <Typography variant="caption">Beta系数</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {riskData.sharpeRatio}
                  </Typography>
                  <Typography variant="caption">夏普比率</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {riskData.maxDrawdown}
                  </Typography>
                  <Typography variant="caption">最大回撤</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* 相关性分析 */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              市场相关性
            </Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData.correlationData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(value) => [`${(value * 100).toFixed(1)}%`, '相关性']} />
                  <Bar dataKey="correlation" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* VaR分析 */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              风险价值 (VaR) 分析
            </Typography>
            <Alert severity="warning">
              <Typography variant="body2">
                在95%置信水平下，该股票单日最大损失预期为 {riskData.var95}。
                建议合理控制仓位规模，单只股票仓位不超过总资产的10%。
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // 交易信号面板
  const renderSignalAnalysis = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          交易信号分析功能正在开发中，敬请期待...
        </Alert>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题和控制 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          数据分析
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>股票</InputLabel>
            <Select
              value={selectedSymbol}
              label="股票"
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              {monitoredSymbols.map((symbol) => (
                <MenuItem key={symbol} value={symbol}>
                  {symbol}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>时间范围</InputLabel>
            <Select
              value={timeRange}
              label="时间范围"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">7天</MenuItem>
              <MenuItem value="30d">30天</MenuItem>
              <MenuItem value="90d">90天</MenuItem>
              <MenuItem value="1y">1年</MenuItem>
            </Select>
          </FormControl>

          <Button variant="outlined" startIcon={<RefreshIcon />}>
            刷新
          </Button>
          <Button variant="contained" startIcon={<ExportIcon />}>
            导出
          </Button>
        </Box>
      </Box>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          数据加载失败: {error}
        </Alert>
      )}

      {/* 分析标签页 */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {analysisTabs.map((tab, index) => (
              <Tab
                key={tab.id}
                icon={<tab.icon />}
                label={tab.label}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {!selectedSymbol && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              请先在监控设置中添加股票，然后选择要分析的股票。
            </Alert>
          )}
          
          {selectedSymbol && (
            <>
              {activeTab === 0 && renderTechnicalAnalysis()}
              {activeTab === 1 && renderFundamentalAnalysis()}
              {activeTab === 2 && renderRiskAnalysis()}
              {activeTab === 3 && renderSignalAnalysis()}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AnalysisPage;