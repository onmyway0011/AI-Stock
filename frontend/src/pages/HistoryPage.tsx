/**
 * 历史记录页面
 * 显示交易信号历史、通知记录和操作日志
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DatePicker,
  Pagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as ExportIcon,
  Visibility as ViewIcon,
  TrendingUp as BuyIcon,
  TrendingDown as SellIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useAppStore } from '../stores/appStore';
import { useHistoryData } from '../hooks/useElectronAPI';
import { useSnackbar } from 'notistack';

interface HistoryRecord {
  id: string;
  timestamp: string;
  type: 'signal' | 'notification' | 'operation';
  symbol?: string;
  side?: 'buy' | 'sell';
  price?: number;
  confidence?: number;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

/**
 * 历史记录页面组件
 */
const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  const { setCurrentPage: setAppCurrentPage } = useAppStore();

  // 获取历史数据
  const { data: historyData, loading, error, refresh } = useHistoryData({
    page: currentPage,
    pageSize,
    search: searchTerm,
    type: filterType === 'all' ? undefined : filterType,
    status: filterStatus === 'all' ? undefined : filterStatus,
    startDate,
    endDate,
  });

  useEffect(() => {
    setAppCurrentPage('history');
  }, [setAppCurrentPage]);

  // 生成模拟历史数据
  const generateMockHistoryData = (): HistoryRecord[] => {
    const types: ('signal' | 'notification' | 'operation')[] = ['signal', 'notification', 'operation'];
    const symbols = ['000001', '000002', '600036', '600519', 'AAPL', 'TSLA'];
    const sides: ('buy' | 'sell')[] = ['buy', 'sell'];
    const statuses: ('success' | 'error' | 'pending')[] = ['success', 'error', 'pending'];

    const records: HistoryRecord[] = [];

    for (let i = 0; i < 100; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
      
      let record: HistoryRecord = {
        id: `record_${i}`,
        timestamp,
        type,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        message: '',
      };

      switch (type) {
        case 'signal':
          const symbol = symbols[Math.floor(Math.random() * symbols.length)];
          const side = sides[Math.floor(Math.random() * sides.length)];
          const price = 50 + Math.random() * 100;
          const confidence = 60 + Math.random() * 40;
          
          record = {
            ...record,
            symbol,
            side,
            price,
            confidence,
            message: `${symbol} ${side === 'buy' ? '买入' : '卖出'}信号 - 价格: ¥${price.toFixed(2)}, 置信度: ${confidence.toFixed(1)}%`,
            details: {
              strategy: side === 'buy' ? '左侧建仓策略' : '移动平均策略',
              reason: side === 'buy' ? '股价下跌5%，触发建仓条件' : '短期均线下穿长期均线',
              indicators: {
                rsi: 30 + Math.random() * 40,
                macd: (Math.random() - 0.5) * 2,
                volume: Math.floor(Math.random() * 1000000),
              },
            },
          };
          break;

        case 'notification':
          const notificationTypes = ['微信群通知', '邮件通知', '桌面通知'];
          const notificationType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
          
          record.message = `${notificationType} ${record.status === 'success' ? '发送成功' : record.status === 'error' ? '发送失败' : '发送中'}`;
          record.details = {
            channel: notificationType,
            recipients: record.status === 'success' ? 3 : 0,
            errorReason: record.status === 'error' ? '网络连接超时' : null,
          };
          break;

        case 'operation':
          const operations = ['启动监控', '停止监控', '配置更新', '数据同步', '系统重启'];
          const operation = operations[Math.floor(Math.random() * operations.length)];
          
          record.message = `${operation} ${record.status === 'success' ? '完成' : record.status === 'error' ? '失败' : '进行中'}`;
          record.details = {
            operation,
            duration: record.status === 'success' ? Math.floor(Math.random() * 1000) + 'ms' : null,
            errorCode: record.status === 'error' ? 'ERR_' + Math.floor(Math.random() * 1000) : null,
          };
          break;
      }

      records.push(record);
    }

    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const mockData = generateMockHistoryData();

  // 过滤数据
  const getFilteredData = () => {
    let filtered = mockData;

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 类型过滤
    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.type === filterType);
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    // 日期过滤
    if (startDate) {
      filtered = filtered.filter(record => new Date(record.timestamp) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(record => new Date(record.timestamp) <= endDate);
    }

    return filtered;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'pending':
        return <InfoIcon color="info" fontSize="small" />;
      default:
        return <InfoIcon color="disabled" fontSize="small" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 获取信号方向图标
  const getSideIcon = (side?: string) => {
    if (side === 'buy') return <BuyIcon color="success" fontSize="small" />;
    if (side === 'sell') return <SellIcon color="error" fontSize="small" />;
    return null;
  };

  // 查看详情
  const handleViewDetail = (record: HistoryRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  // 清空历史记录
  const handleClearHistory = async () => {
    try {
      // 这里应该调用清空历史记录的API
      enqueueSnackbar('历史记录已清空', { variant: 'success' });
      refresh();
    } catch (error) {
      enqueueSnackbar('清空失败', { variant: 'error' });
    }
  };

  // 导出数据
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(filteredData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `history_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      enqueueSnackbar('数据已导出', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('导出失败', { variant: 'error' });
    }
  };

  // 标签页配置
  const historyTabs = [
    { id: 'all', label: '全部记录' },
    { id: 'signals', label: '交易信号' },
    { id: 'notifications', label: '通知记录' },
    { id: 'operations', label: '操作日志' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题和控制 */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          历史记录
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
          >
            导出
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleClearHistory}
            color="error"
          >
            清空
          </Button>
        </Box>
      </Box>

      {/* 统计信息 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                总记录数
              </Typography>
              <Typography variant="h6">
                {mockData.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                交易信号
              </Typography>
              <Typography variant="h6">
                {mockData.filter(r => r.type === 'signal').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                通知记录
              </Typography>
              <Typography variant="h6">
                {mockData.filter(r => r.type === 'notification').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                成功率
              </Typography>
              <Typography variant="h6" color="success.main">
                {((mockData.filter(r => r.status === 'success').length / mockData.length) * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 筛选控制 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="搜索记录..."
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
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>类型</InputLabel>
                <Select
                  value={filterType}
                  label="类型"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="signal">交易信号</MenuItem>
                  <MenuItem value="notification">通知记录</MenuItem>
                  <MenuItem value="operation">操作日志</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>状态</InputLabel>
                <Select
                  value={filterStatus}
                  label="状态"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="success">成功</MenuItem>
                  <MenuItem value="error">失败</MenuItem>
                  <MenuItem value="pending">进行中</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                  时间范围:
                </Typography>
                <Button
                  size="small"
                  variant={!startDate && !endDate ? 'contained' : 'outlined'}
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                >
                  全部
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const today = new Date();
                    setStartDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
                    setEndDate(today);
                  }}
                >
                  近7天
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    const today = new Date();
                    setStartDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
                    setEndDate(today);
                  }}
                >
                  近30天
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          数据加载失败: {error}
        </Alert>
      )}

      {/* 历史记录表格 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            历史记录 ({filteredData.length} 条)
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>时间</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>内容</TableCell>
                  <TableCell>股票代码</TableCell>
                  <TableCell>操作</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {loading ? '加载中...' : '暂无数据'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(record.timestamp).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={
                            record.type === 'signal' ? '交易信号' :
                            record.type === 'notification' ? '通知记录' : '操作日志'
                          }
                          color={
                            record.type === 'signal' ? 'primary' :
                            record.type === 'notification' ? 'secondary' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {record.message}
                        </Typography>
                        {record.confidence && (
                          <Typography variant="caption" color="text.secondary">
                            置信度: {record.confidence.toFixed(1)}%
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {record.symbol && (
                          <Typography variant="body2">
                            {record.symbol}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSideIcon(record.side)}
                          {record.side && (
                            <Typography variant="body2">
                              {record.side === 'buy' ? '买入' : '卖出'}
                            </Typography>
                          )}
                          {record.price && (
                            <Typography variant="caption" color="text.secondary">
                              ¥{record.price.toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(record.status)}
                          <Chip
                            label={
                              record.status === 'success' ? '成功' :
                              record.status === 'error' ? '失败' : '进行中'
                            }
                            color={getStatusColor(record.status)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Tooltip title="查看详情">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetail(record)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 分页 */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          记录详情
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">记录ID</Typography>
                  <Typography variant="body2">{selectedRecord.id}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">时间</Typography>
                  <Typography variant="body2">
                    {new Date(selectedRecord.timestamp).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">类型</Typography>
                  <Typography variant="body2">
                    {selectedRecord.type === 'signal' ? '交易信号' :
                     selectedRecord.type === 'notification' ? '通知记录' : '操作日志'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">状态</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(selectedRecord.status)}
                    <Typography variant="body2">
                      {selectedRecord.status === 'success' ? '成功' :
                       selectedRecord.status === 'error' ? '失败' : '进行中'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">消息内容</Typography>
                  <Typography variant="body2">{selectedRecord.message}</Typography>
                </Grid>
                {selectedRecord.details && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">详细信息</Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedRecord.details, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryPage;