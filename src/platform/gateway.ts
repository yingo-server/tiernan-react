/**
 * 平台能力网关：三环境统一出口 platformDirectFetch()。
 *
 * - Capacitor（Android APK）：CapacitorHttp 原生层代理（绕 CORS）
 * - Tauri（桌面）：invoke('native_fetch')（Rust reqwest，绕 CORS）
 * - 浏览器/PWA：fetch（受 CORS，仅部分公开端点可用）
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export type PlatformKind = 'web' | 'capacitor' | 'tauri';

export function platformKind(): PlatformKind {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__) {
    return 'tauri';
  }
  if (Capacitor.isNativePlatform()) return 'capacitor';
  return 'web';
}

export interface DirectFetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface DirectFetchResult {
  status: number;
  body: string;
}

/** Tauri 桥（由 src/platform/tauri.ts 提供，Tauri 环境下动态加载）。 */
let tauriFetchImpl: ((url: string, init: DirectFetchInit) => Promise<DirectFetchResult>) | null = null;

/** Tauri 环境注册实现（由 tauri.ts 在检测到 Tauri 时调用）。 */
export function registerTauriFetch(fn: (url: string, init: DirectFetchInit) => Promise<DirectFetchResult>) {
  tauriFetchImpl = fn;
}

async function capacitorFetch(url: string, init: DirectFetchInit): Promise<DirectFetchResult> {
  const res = await CapacitorHttp.request({
    url,
    method: (init.method ?? 'GET') as 'GET' | 'POST',
    headers: init.headers ?? {},
    data: init.body,
  });
  const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  return { status: res.status, body };
}

async function webFetch(url: string, init: DirectFetchInit): Promise<DirectFetchResult> {
  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: init.headers,
    body: init.body,
  });
  return { status: res.status, body: await res.text() };
}

async function tauriFetch(url: string, init: DirectFetchInit): Promise<DirectFetchResult> {
  // Tauri.ts 注册实现；未注册时降级为 fetch（开发模式 devUrl 下仍受 CORS）
  if (!tauriFetchImpl) {
    try {
      await import('./tauri');
    } catch {
      /* 桥不可用 */
    }
  }
  if (tauriFetchImpl) return tauriFetchImpl(url, init);
  return webFetch(url, init);
}

/** 统一出口：按运行环境选择绕 CORS 的请求通道。 */
export async function platformDirectFetch(url: string, init: DirectFetchInit): Promise<DirectFetchResult> {
  switch (platformKind()) {
    case 'capacitor': return capacitorFetch(url, init);
    case 'tauri': return tauriFetch(url, init);
    default: return webFetch(url, init);
  }
}
