/**
 * 主应用组件
 * 配置路由、主题和全局状态管理
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';

// 导入页面组件
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

// 导入自定义hooks和stores
import { useAppStore } from './stores/appStore';

/**
 * 创建Material-UI主题
 */
const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      success: {
        main: '#2e7d32',
        light: '#4caf50',
        dark: '#1b5e20',
      },
      error: {
        main: '#d32f2f',
        light: '#f44336',
        dark: '#c62828',
      },
      warning: {
        main: '#ed6c02',
        light: '#ff9800',
        dark: '#e65100',
      },
      info: {
        main: '#0288d1',
        light: '#03a9f4',
        dark: '#01579b',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", "PingFang SC", "Microsoft YaHei", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 500,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 500,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 500,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 500,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 500,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: mode === 'light' 
              ? '0 2px 8px rgba(0,0,0,0.1)' 
              : '0 2px 8px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 6,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            backgroundColor: mode === 'light' ? '#f5f5f5' : '#2c2c2c',
          },
        },
      },
    },
  });
};

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const { config } = useAppStore();
  
  // 获取主题模式
  const getThemeMode = (): 'light' | 'dark' => {
    const themeConfig = config?.general?.theme || 'auto';
    
    if (themeConfig === 'auto') {
      // 跟随系统主题
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return themeConfig as 'light' | 'dark';
  };

  const theme = createAppTheme(getThemeMode());

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        autoHideDuration={3000}
      >
        <Router>
          <Box sx={{ display: 'flex', height: '100vh' }}>
            <Layout>
              <Routes>
                {/* 默认路由重定向到仪表板 */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* 主要页面路由 */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/monitoring" element={<MonitoringPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                
                {/* 404 页面 */}
                <Route 
                  path="*" 
                  element={
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <h1>404 - 页面未找到</h1>
                      <p>您访问的页面不存在</p>
                    </Box>
                  } 
                />
              </Routes>
            </Layout>
          </Box>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;