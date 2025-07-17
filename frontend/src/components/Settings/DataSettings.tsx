/**
 * 数据设置组件
 * 配置数据收集、存储和缓存参数
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Grid,
  Slider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Storage as StorageIcon,
  Cache as CacheIcon,
  History as HistoryIcon,
  CleaningServices as CleanIcon,
  Assessment as AnalyticsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useSnackbar } from 'notistack';

interface DataSettingsProps {
  config: any;
  onChange: (updates: any) => void;
}

/**
 * 数据设置组件
 */
const DataSettings: React.FC<DataSettingsProps> = ({ config, onChange }) => {
  const [cleaning, setCleaning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

  const { enqueueSnackbar } = useSnackbar();
  
  const dataConfig = config.data || {};

  // 处理设置更改
  const handleChange = (field: string, value: any) => {
    onChange({
      data: {
        ...dataConfig,
        [field]: value,
      },
    });
  };

  // 数据清理
  const handleDataCleanup = async (type: string) => {
    try {
      setCleaning(true);
      
      // 模拟清理过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let message = '';
      switch (type) {
        case 'cache':
          message = '缓存数据已清理';
          break;
        case 'logs':
          message = '日志文件已清理';
          break;
        case 'history':
          message = '历史数据已清理';
          break;
        case 'all':
          message = '所有临时数据已清理';
          break;
      }
      
      enqueueSnackbar(message, { variant: 'success' });
      setCleanupDialogOpen(false);
    } catch (error) {
      enqueueSnackbar('清理失败', { variant: 'error' });
    } finally {
      setCleaning(false);
    }
  };

  // 数据分析
  const handleDataAnalysis = async () => {
    try {
      setAnalyzing(true);
      
      // 模拟分析过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      enqueueSnackbar('数据分析完成', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('分析失败', { variant: 'error' });
    } finally {
      setAnalyzing(false);
    }
  };

  // 获取数据大小
  const getDataSizeInfo = () => {
    // 模拟数据大小信息
    return {
      cache: '15.2 MB',
      logs: '8.7 MB',
      history: '45.3 MB',
      config: '1.2 MB',
      total: '70.4 MB'
    };
  };

  const dataSizeInfo = getDataSizeInfo();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        数据设置
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        配置数据收集、存储和缓存策略
      </Typography>

      <Grid container spacing={3}>
        {/* 数据收集设置 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                数据收集设置
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography gutterBottom>
                    历史数据保留天数: {dataConfig.historyDays || 30}天
                  </Typography>
                  <Slider
                    value={dataConfig.historyDays || 30}
                    onChange={(_, value) => handleChange('historyDays', value)}
                    min={7}
                    max={365}
                    step={7}
                    marks={[
                      { value: 7, label: '7天' },
                      { value: 30, label: '30天' },
                      { value: 90, label: '90天' },
                      { value: 365, label: '1年' },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}天`}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="数据收集频率 (秒)"
                  type="number"
                  value={dataConfig.collectionInterval || 30}
                  onChange={(e) => handleChange('collectionInterval', parseInt(e.target.value))}
                  inputProps={{ min: 10, max: 300 }}
                  helperText="股票数据收集的时间间隔"
                />

                <TextField
                  fullWidth
                  label="批量查询大小"
                  type="number"
                  value={dataConfig.batchSize || 20}
                  onChange={(e) => handleChange('batchSize', parseInt(e.target.value))}
                  inputProps={{ min: 5, max: 100 }}
                  helperText="单次查询的股票数量"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 缓存设置 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                缓存设置
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={dataConfig.cacheEnabled || true}
                      onChange={(e) => handleChange('cacheEnabled', e.target.checked)}
                    />
                  }
                  label="启用数据缓存"
                />

                <Box>
                  <Typography gutterBottom>
                    缓存过期时间: {dataConfig.cacheExpiry || 60}秒
                  </Typography>
                  <Slider
                    value={dataConfig.cacheExpiry || 60}
                    onChange={(_, value) => handleChange('cacheExpiry', value)}
                    min={30}
                    max={600}
                    step={30}
                    marks={[
                      { value: 30, label: '30秒' },
                      { value: 60, label: '1分钟' },
                      { value: 300, label: '5分钟' },
                      { value: 600, label: '10分钟' },
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}秒`}
                    disabled={!dataConfig.cacheEnabled}
                  />
                </Box>

                <TextField
                  fullWidth
                  label="最大缓存大小 (MB)"
                  type="number"
                  value={dataConfig.maxCacheSize || 100}
                  onChange={(e) => handleChange('maxCacheSize', parseInt(e.target.value))}
                  inputProps={{ min: 50, max: 1000 }}
                  helperText="缓存数据的最大占用空间"
                  disabled={!dataConfig.cacheEnabled}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 数据存储统计 */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                存储空间使用情况
              </Typography>
              
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>数据类型</TableCell>
                      <TableCell>大小</TableCell>
                      <TableCell>描述</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CacheIcon fontSize="small" />
                          缓存数据
                        </Box>
                      </TableCell>
                      <TableCell>{dataSizeInfo.cache}</TableCell>
                      <TableCell>股票价格和指标缓存</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleDataCleanup('cache')}
                          disabled={cleaning}
                        >
                          清理
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <HistoryIcon fontSize="small" />
                          历史数据
                        </Box>
                      </TableCell>
                      <TableCell>{dataSizeInfo.history}</TableCell>
                      <TableCell>交易信号和通知历史</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleDataCleanup('history')}
                          disabled={cleaning}
                        >
                          清理
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StorageIcon fontSize="small" />
                          日志文件
                        </Box>
                      </TableCell>
                      <TableCell>{dataSizeInfo.logs}</TableCell>
                      <TableCell>应用运行日志</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleDataCleanup('logs')}
                          disabled={cleaning}
                        >
                          清理
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <InfoIcon fontSize="small" />
                          配置文件
                        </Box>
                      </TableCell>
                      <TableCell>{dataSizeInfo.config}</TableCell>
                      <TableCell>应用配置和设置</TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">
                  总计使用空间: <strong>{dataSizeInfo.total}</strong>
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<CleanIcon />}
                  onClick={() => setCleanupDialogOpen(true)}
                  disabled={cleaning}
                >
                  全部清理
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 数据质量设置 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                数据质量控制
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={dataConfig.enableDataValidation || true}
                      onChange={(e) => handleChange('enableDataValidation', e.target.checked)}
                    />
                  }
                  label="启用数据验证"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={dataConfig.enableOutlierDetection || false}
                      onChange={(e) => handleChange('enableOutlierDetection', e.target.checked)}
                    />
                  }
                  label="启用异常值检测"
                />

                <TextField
                  fullWidth
                  label="数据容错率 (%)"
                  type="number"
                  value={dataConfig.errorTolerance || 5}
                  onChange={(e) => handleChange('errorTolerance', parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 20 }}
                  helperText="允许的数据错误百分比"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 数据导出设置 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                数据导出设置
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={dataConfig.enableAutoExport || false}
                      onChange={(e) => handleChange('enableAutoExport', e.target.checked)}
                    />
                  }
                  label="启用自动导出"
                />

                <TextField
                  fullWidth
                  label="导出间隔 (天)"
                  type="number"
                  value={dataConfig.exportInterval || 7}
                  onChange={(e) => handleChange('exportInterval', parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 30 }}
                  disabled={!dataConfig.enableAutoExport}
                  helperText="自动导出数据的时间间隔"
                />

                <Button
                  variant="outlined"
                  startIcon={analyzing ? <CircularProgress size={16} /> : <AnalyticsIcon />}
                  onClick={handleDataAnalysis}
                  disabled={analyzing}
                >
                  {analyzing ? '分析中...' : '数据质量分析'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 性能优化建议 */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              性能优化建议
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>适当延长历史数据保留时间可以提高策略回测的准确性</li>
              <li>启用缓存可以显著提高数据查询速度，但会占用更多内存</li>
              <li>定期清理日志和缓存数据可以节省存储空间</li>
              <li>开启数据验证可以提高交易信号的可靠性</li>
              <li>批量查询大小建议设置在10-50之间以平衡速度和稳定性</li>
            </ul>
          </Alert>
        </Grid>
      </Grid>

      {/* 数据清理确认对话框 */}
      <Dialog
        open={cleanupDialogOpen}
        onClose={() => setCleanupDialogOpen(false)}
      >
        <DialogTitle>确认数据清理</DialogTitle>
        <DialogContent>
          <Typography>
            此操作将清理所有临时数据，包括：
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CacheIcon />
              </ListItemIcon>
              <ListItemText primary="缓存数据" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StorageIcon />
              </ListItemIcon>
              <ListItemText primary="日志文件" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <HistoryIcon />
              </ListItemIcon>
              <ListItemText primary="过期历史数据" />
            </ListItem>
          </List>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>注意：</strong>此操作不可恢复，配置文件和重要历史记录不会被删除。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => handleDataCleanup('all')}
            disabled={cleaning}
            color="warning"
          >
            {cleaning ? '清理中...' : '确认清理'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataSettings;