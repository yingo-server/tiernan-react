import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 全平台一套代码：
// - 浏览器 / PWA：本配置直接可用
// - Capacitor（Android APK）：webDir 指向 dist，原生壳复用同一产物
// - 桌面壳（Electron/Tauri）：加载同一 dist
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { target: 'es2022', sourcemap: false },
});
