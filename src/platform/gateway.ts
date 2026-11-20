/**
 * 平台能力网关（WebView 环境探测 + 直连桥）。
 *
 * 浏览器/PWA：fetch 直连酷狗（CORS 是硬坎，仅部分公开端点可用）
 * Capacitor：原生层代理（CapacitorHttp 绕过 CORS，system 与 fully 变体同享）
 */
import { Capacitor } from '@capacitor/core';

export type PlatformKind = 'web' | 'capacitor-system' | 'capacitor-gecko';

export function platformKind(): PlatformKind {
  if (!Capacitor.isNativePlatform()) return 'web';
  // Gecko 变体的 UA 由 GeckoMainActivity 设置标记
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return ua.includes('GeckoView') ? 'capacitor-gecko' : 'capacitor-system';
}

/** 直连请求入口：native 用 CapacitorHttp（绕 CORS），web 用 fetch（受 CORS）。 */
export async function directFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; body: string }> {
  if (Capacitor.isNativePlatform()) {
    const { CapacitorHttp } = await import('@capacitor/core');
    const res = await CapacitorHttp.request({
      url,
      method: (init.method ?? 'GET') as 'GET' | 'POST',
      headers: init.headers ?? {},
      data: init.body,
      // 酷狗网关需要跟随重定向
      disableRedirects: false,
    });
    const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return { status: res.status, body };
  }
  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: init.headers,
    body: init.body,
  });
  return { status: res.status, body: await res.text() };
}
