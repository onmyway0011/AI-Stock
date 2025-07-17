/**
 * React应用主入口文件
 * 启动应用并渲染到DOM
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 导入全局样式
import './styles/global.css';

// 获取根元素
const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}

// 创建React根实例
const root = createRoot(container);

// 渲染应用
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 启用热模块替换（HMR）
if (module.hot) {
  module.hot.accept('./App', () => {
    const NextApp = require('./App').default;
    root.render(
      <React.StrictMode>
        <NextApp />
      </React.StrictMode>
    );
  });
}