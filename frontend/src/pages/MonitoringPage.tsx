/**
 * 股票监控页面
 * 显示实时股票监控状态和价格数据
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as FlatIcon,
  Visibility as ViewIcon,
  VisibilityOff as HideIcon,
} from '@mui/icons-material';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '../stores/appStore';
import { useMonitoring, useRealTimeData } from '../hooks/useElectronAPI';
import { useSnackbar } from 'notistack';

/**
 * 股票监控页面组件
 */
const MonitoringPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hiddenSymbols, setHiddenSymbols] = useState<Set<string>>(new Set());
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { enqueueSnackbar } = useSnackbar();
  const {
    config,
    monitoringStatus,
    setCurrentPage,
  } = useAppStore();

  const { startMonitoring, stopMonitoring } = useMonitoring();

  // 获取监控的股票符号
  const monitoredSymbols = config?.monitoring?.symbols || [];
  const cryptoSymbols = config?.monitoring?.cryptoSymbols || [];
  const allSymbols = config?.monitoring?.enableCrypto 
    ? [...monitoredSymbols, ...cryptoSymbols] 
    : monitoredSymbols;

  // 实时股票数据
  const { data: realTimeData, loading: dataLoading, error: dataError } = useRealTimeData(
    allSymbols,
    10000 // 10秒更新一次
  );

  useEffect(() => {
    setCurrentPage('monitoring');
  }, [setCurrentPage]);

  // 处理监控切换
  const handleMonitoringToggle = async () => {
    try {
      if (monitoringStatus?.isRunning) {
        await stopMonitoring();
        enqueueSnackbar('监控已停止', { variant: 'info' });
      } else {
        await startMonitoring();
        enqueueSnackbar('监控已启动', { variant: 'success' });
      }
    } catch (error) {
      enqueueSnackbar(
        `操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { variant: 'error' }
      );
    }
  };

  // 切换股票可见性
  const toggleSymbolVisibility = (symbol: string) => {
    const newHiddenSymbols = new Set(hiddenSymbols);
    if (newHiddenSymbols.has(symbol)) {
      newHiddenSymbols.delete(symbol);
    } else {
      newHiddenSymbols.add(symbol);
    }
    setHiddenSymbols(newHiddenSymbols);
  };

  // 过滤股票数据
  const getFilteredStockData = () => {
    const filteredData = Object.entries(realTimeData || {})
      .filter(([symbol]) => !hiddenSymbols.has(symbol))
      .filter(([symbol]) => 
        !searchTerm || 
        symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return filteredData.map(([symbol, data]) => ({
      symbol,
      ...data,
    }));
  };

  // 获取价格趋势图标
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUpIcon color="success" fontSize="small" />;
    if (change < 0) return <TrendingDownIcon color="error" fontSize="small" />;
    return <FlatIcon color="disabled" fontSize="small" />;
  };

  // 获取价格变化颜色
  const getChangeColor = (change: number) => {
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  // 生成图表数据
  const getChartData = (symbol: string) => {
    // 模拟历史价格数据
    const mockData = [];
    const currentPrice = realTimeData?.[symbol]?.close || 100;
    
    for (let i = 20; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60000);
      const randomChange = (Math.random() - 0.5) * 2; // -1% 到 +1%
      const price = currentPrice + randomChange;
      
      mockData.push({
        time: time.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        price: price.toFixed(2),
        timestamp: time.getTime(),
      });
    }
    
    return mockData;
  };

  const filteredStockData = getFilteredStockData();

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题和控制 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          股票监控
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="搜索股票..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            disabled={dataLoading}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={monitoringStatus?.isRunning ? <StopIcon /> : <PlayIcon />}
            onClick={handleMonitoringToggle}
            color={monitoringStatus?.isRunning ? 'error' : 'success'}
          >
            {monitoringStatus?.isRunning ? '停止监控' : '开始监控'}
          </Button>
        </Box>
      </Box>

      {/* 状态信息 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                监控状态
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={monitoringStatus?.isRunning ? '运行中' : '已停止'}
                  color={monitoringStatus?.isRunning ? 'success' : 'error'}
                  size="small"
                />
                {monitoringStatus?.isRunning && dataLoading && (
                  <LinearProgress sx={{ flexGrow: 1, ml: 1 }} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                监控股票
              </Typography>
              <Typography variant="h6">
                {allSymbols.length}只
              </Typography>
              <Typography variant="caption" color="text.secondary">
                显示 {filteredStockData.length}只
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                更新频率
              </Typography>
              <Typography variant="h6">
                10秒
              </Typography>
              <Typography variant="caption" color="text.secondary">
                最后更新: {monitoringStatus?.lastUpdate ? 
                  new Date(monitoringStatus.lastUpdate).toLocaleTimeString() : 
                  '未知'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                错误计数
              </Typography>
              <Typography variant="h6" color={monitoringStatus?.errorCount > 0 ? 'error' : 'inherit'}>
                {monitoringStatus?.errorCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                今日累计
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 错误提示 */}
      {dataError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          数据获取失败: {dataError}
        </Alert>
      )}

      {/* 股票价格表格 */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                实时价格
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>股票代码</TableCell>
                      <TableCell align="right">当前价格</TableCell>
                      <TableCell align="right">涨跌额</TableCell>
                      <TableCell align="right">涨跌幅</TableCell>
                      <TableCell align="right">成交量</TableCell>
                      <TableCell align="center">操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStockData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          {dataLoading ? '加载中...' : '暂无数据'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStockData.map((stock) => (
                        <TableRow
                          key={stock.symbol}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSymbol(stock.symbol)}
                        >
                          <TableCell component="th" scope="row">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getTrendIcon(stock.change || 0)}
                              <Typography variant="body2" fontWeight="medium">
                                {stock.symbol}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              ¥{(stock.close || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              color={getChangeColor(stock.change || 0)}
                            >
                              {stock.change >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${stock.changePercent >= 0 ? '+' : ''}${(stock.changePercent || 0).toFixed(2)}%`}
                              color={getChangeColor(stock.changePercent || 0)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {stock.volume ? (stock.volume / 10000).toFixed(1) + '万' : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={hiddenSymbols.has(stock.symbol) ? '显示' : '隐藏'}>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSymbolVisibility(stock.symbol);
                                }}
                              >
                                {hiddenSymbols.has(stock.symbol) ? <HideIcon /> : <ViewIcon />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 价格趋势图 */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedSymbol ? `${selectedSymbol} 价格趋势` : '选择股票查看趋势'}
              </Typography>
              
              {selectedSymbol ? (
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getChartData(selectedSymbol)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                      <RechartsTooltip
                        formatter={(value) => [`¥${value}`, '价格']}
                        labelFormatter={(label) => `时间: ${label}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#2196f3" 
                        strokeWidth={2}
                        dot={{ fill: '#2196f3', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  点击表格中的股票查看价格趋势
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringPage;