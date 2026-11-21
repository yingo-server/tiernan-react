/**
 * Tauri 2 桌面端直连桥。
 *
 * Tauri 的 WebView 加载在自定义协议（tauri://localhost / http://tauri.localhost）下，
 * 由 invoke 发起的请求走 Rust 原生层（reqwest + rustls），不受浏览器 CORS 限制，
 * 与 Android 端 CapacitorHttp 方案对齐。
 *
 * 接入方式（gateway.ts）：动态 import('./tauri') 会触发本文件顶层注册；
 * 也可显式 import { registerTauriFetch } 后调用 registerTauriFetch(tauriDirectFetch)。
 *
 * 注意：`@tauri-apps/api` 全部使用动态 import，Web/Capacitor 打包不会引入 Tauri 代码。
 */
import type { DirectFetchInit, DirectFetchResult } from './gateway';
import { registerTauriFetch } from './gateway';

/** 检测是否运行在 Tauri 桌面壳内（Tauri 2 注入 __TAURI_INTERNALS__）。 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Tauri 环境直连：invoke('native_fetch', { url, init }) -> [status, body]。
 * 非 Tauri 环境抛错（调用方应先 isTauri() 判断）。
 */
export async function tauriDirectFetch(
  url: string,
  init: DirectFetchInit = {},
): Promise<DirectFetchResult> {
  if (!isTauri()) throw new Error('tauriDirectFetch: not in Tauri environment');
  const { invoke } = await import('@tauri-apps/api/core');
  const result = await invoke<[number, string]>('native_fetch', {
    url,
    init: {
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body ?? null,
    },
  });
  return { status: result[0], body: result[1] };
}

// 自注册：gateway.ts 的 tauriFetch 分支动态 import('./tauri') 后即可直接可用。
registerTauriFetch(tauriDirectFetch);
