import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 配置（Android 壳，系统 WebView 版 = without-webview 包）。
 * webDir 指向 vite 产物，一套代码全平台。
 */
const config: CapacitorConfig = {
  appId: 'com.tiernan.music.next',
  appName: 'TiernanMusicNext',
  webDir: 'dist',
  android: {
    // 保守：不加实验性 API；允许混合内容（酷狗部分封面是 http）
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
  server: {
    // 直连酷狗：native 桥请求不受浏览器 CORS 限制（Capacitor 原生层代理）
    androidScheme: 'https',
  },
};

export default config;
