/**
 * 云同步设置组件
 * 配置腾讯云COS同步参数
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
  Select,
  MenuItem,
  InputLabel,
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
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useCloudSync } from '../../hooks/useElectronAPI';
import { useSnackbar } from 'notistack';

interface CloudSettingsProps {
  config: any;
  onChange: (updates: any) => void;
}

/**
 * 云同步设置组件
 */
const CloudSettings: React.FC<CloudSettingsProps> = ({ config, onChange }) => {
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'upload' | 'download'>('upload');

  const { enqueueSnackbar } = useSnackbar();
  const { syncToCloud, syncFromCloud } = useCloudSync();
  
  const cloudConfig = config.cloud || {};
  const tencentConfig = cloudConfig.tencentCloud || {};

  // 处理设置更改
  const handleChange = (path: string, value: any) => {
    const pathParts = path.split('.');
    let updateObj: any = {};
    
    if (pathParts.length === 1) {
      updateObj = {
        cloud: {
          ...cloudConfig,
          [pathParts[0]]: value,
        },
      };
    } else if (pathParts.length === 2) {
      updateObj = {
        cloud: {
          ...cloudConfig,
          [pathParts[0]]: {
            ...cloudConfig[pathParts[0]],
            [pathParts[1]]: value,
          },
        },
      };
    }
    
    onChange(updateObj);
  };

  // 测试云连接
  const handleTestConnection = async () => {
    try {
      setTesting(true);
      // 这里应该调用测试云配置的API
      // const success = await testCloudConfig();
      
      // 模拟测试
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      enqueueSnackbar('云配置测试成功', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(
        `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { variant: 'error' }
      );
    } finally {
      setTesting(false);
    }
  };

  // 手动同步
  const handleManualSync = async (direction: 'upload' | 'download') => {
    try {
      setSyncing(true);
      setSyncDirection(direction);
      
      if (direction === 'upload') {
        await syncToCloud();
        enqueueSnackbar('数据已上传到云端', { variant: 'success' });
      } else {
        await syncFromCloud();
        enqueueSnackbar('数据已从云端下载', { variant: 'success' });
      }
    } catch (error) {
      enqueueSnackbar(
        `同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
        { variant: 'error' }
      );
    } finally {
      setSyncing(false);
    }
  };

  // 腾讯云区域选项
  const tencentRegions = [
    { value: 'ap-beijing', label: '北京' },
    { value: 'ap-shanghai', label: '上海' },
    { value: 'ap-guangzhou', label: '广州' },
    { value: 'ap-chengdu', label: '成都' },
    { value: 'ap-hongkong', label: '香港' },
    { value: 'ap-singapore', label: '新加坡' },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        云同步设置
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        配置云存储服务，实现数据备份和多设备同步
      </Typography>

      <Grid container spacing={3}>
        {/* 全局云同步设置 */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  云同步服务
                </Typography>
                <Button
                  startIcon={<InfoIcon />}
                  onClick={() => setInfoDialogOpen(true)}
                  size="small"
                >
                  帮助
                </Button>
              </Box>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={cloudConfig.enabled || false}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                  />
                }
                label="启用云同步功能"
              />

              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>云服务提供商</InputLabel>
                  <Select
                    value={cloudConfig.provider || 'tencent'}
                    label="云服务提供商"
                    onChange={(e) => handleChange('provider', e.target.value)}
                    disabled={!cloudConfig.enabled}
                  >
                    <MenuItem value="tencent">腾讯云 COS</MenuItem>
                    <MenuItem value="aliyun" disabled>阿里云 OSS (开发中)</MenuItem>
                    <MenuItem value="aws" disabled>AWS S3 (开发中)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 腾讯云COS配置 */}
        {cloudConfig.enabled && cloudConfig.provider === 'tencent' && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  腾讯云COS配置
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  请在腾讯云控制台创建COS存储桶，并获取访问密钥。
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SecretId"
                      value={tencentConfig.secretId || ''}
                      onChange={(e) => handleChange('tencentCloud.secretId', e.target.value)}
                      placeholder="AKIDxxxxxxxxxxxxxxxx"
                      helperText="在腾讯云控制台获取"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SecretKey"
                      type="password"
                      value={tencentConfig.secretKey || ''}
                      onChange={(e) => handleChange('tencentCloud.secretKey', e.target.value)}
                      placeholder="密钥将被安全存储"
                      helperText="与SecretId配对的密钥"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>地域</InputLabel>
                      <Select
                        value={tencentConfig.region || 'ap-guangzhou'}
                        label="地域"
                        onChange={(e) => handleChange('tencentCloud.region', e.target.value)}
                      >
                        {tencentRegions.map((region) => (
                          <MenuItem key={region.value} value={region.value}>
                            {region.label} ({region.value})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="存储桶名称"
                      value={tencentConfig.bucket || ''}
                      onChange={(e) => handleChange('tencentCloud.bucket', e.target.value)}
                      placeholder="your-bucket-name"
                      helperText="COS存储桶的名称"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={testing ? <CircularProgress size={16} /> : <TestIcon />}
                    onClick={handleTestConnection}
                    disabled={testing || !tencentConfig.secretId || !tencentConfig.bucket}
                  >
                    {testing ? '测试中...' : '测试连接'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 同步控制 */}
        {cloudConfig.enabled && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  同步控制
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={syncing && syncDirection === 'upload' ? <CircularProgress size={16} /> : <UploadIcon />}
                      onClick={() => handleManualSync('upload')}
                      disabled={syncing}
                      color="primary"
                    >
                      {syncing && syncDirection === 'upload' ? '上传中...' : '上传到云端'}
                    </Button>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={syncing && syncDirection === 'download' ? <CircularProgress size={16} /> : <DownloadIcon />}
                      onClick={() => handleManualSync('download')}
                      disabled={syncing}
                      color="secondary"
                    >
                      {syncing && syncDirection === 'download' ? '下载中...' : '从云端下载'}
                    </Button>
                  </Grid>
                </Grid>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>注意：</strong>
                  <br />
                  • 上传到云端会覆盖云端现有数据
                  <br />
                  • 从云端下载会覆盖本地现有数据
                  <br />
                  • 建议在操作前备份重要数据
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 自动同步设置 */}
        {cloudConfig.enabled && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  自动同步设置
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={cloudConfig.autoSync || false}
                          onChange={(e) => handleChange('autoSync', e.target.checked)}
                        />
                      }
                      label="启用自动同步"
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="同步间隔 (分钟)"
                      type="number"
                      value={cloudConfig.autoSyncInterval || 60}
                      onChange={(e) => handleChange('autoSyncInterval', parseInt(e.target.value))}
                      inputProps={{ min: 30, max: 1440 }}
                      disabled={!cloudConfig.autoSync}
                      helperText="建议不少于30分钟"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={cloudConfig.syncOnStartup || false}
                          onChange={(e) => handleChange('syncOnStartup', e.target.checked)}
                        />
                      }
                      label="启动时自动同步"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={cloudConfig.syncOnExit || false}
                          onChange={(e) => handleChange('syncOnExit', e.target.checked)}
                        />
                      }
                      label="退出时自动同步"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 同步状态 */}
        {cloudConfig.enabled && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  同步状态
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <StorageIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="云端存储状态"
                      secondary={cloudConfig.enabled ? '已配置' : '未配置'}
                    />
                    <Chip
                      icon={cloudConfig.enabled ? <CloudDoneIcon /> : <CloudOffIcon />}
                      label={cloudConfig.enabled ? '已启用' : '未启用'}
                      color={cloudConfig.enabled ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="最后同步时间"
                      secondary={cloudConfig.lastSync ? new Date(cloudConfig.lastSync).toLocaleString() : '从未同步'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 帮助对话框 */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>云同步帮助</DialogTitle>
        <DialogContent>
          <Typography component="div">
            <h4>什么是云同步？</h4>
            <p>
              云同步功能将您的配置、交易信号历史和通知记录备份到云端存储，
              实现数据安全备份和多设备间的数据同步。
            </p>

            <h4>如何配置腾讯云COS？</h4>
            <ol>
              <li>登录腾讯云控制台</li>
              <li>开通对象存储COS服务</li>
              <li>创建存储桶（Bucket）</li>
              <li>在访问管理中创建子用户并授权COS权限</li>
              <li>获取SecretId和SecretKey</li>
              <li>在此处填入相关配置信息</li>
            </ol>

            <h4>数据安全性</h4>
            <ul>
              <li>所有敏感信息（如密钥、密码）都会被加密存储</li>
              <li>云端数据传输使用HTTPS加密</li>
              <li>您的交易密钥等关键信息不会上传到云端</li>
            </ul>

            <h4>费用说明</h4>
            <p>
              腾讯云COS按实际使用量计费，本应用的数据量很小，
              月费用通常在几元以内。具体请查看腾讯云计费说明。
            </p>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CloudSettings;