import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 全平台一套代码：
// - 浏览器 / PWA：本配置直接可用
// - Capacitor（Android APK）：webDir 指向 dist，原生壳复用同一产物
// - 桌面壳（Electron/Tauri）：加载同一 dist
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    // 压缩加强（用户指令）：terser 最激进压缩 + 死代码剔除 + console 移除
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 3,            // 多轮压缩
        drop_console: true,   // 移除 console（生产无调试输出）
        drop_debugger: true,
        pure_getters: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
      },
      mangle: { toplevel: true },
      format: { comments: false },
    },
    // 分包：大依赖单拆（长缓存友好）
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
