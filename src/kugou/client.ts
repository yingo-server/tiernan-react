/**
 * 酷狗直连客户端（TS 移植自 Flutter 仓 lib/core/net/kugou_client.dart 请求组装逻辑）。
 *
 * 三环境统一出口 directFetch()：
 * - Capacitor（Android APK）：CapacitorHttp 原生层代理（绕 CORS）
 * - Tauri（桌面）：invoke('native_fetch')（Rust reqwest，绕 CORS）
 * - 浏览器/PWA：fetch（受 CORS，仅部分公开端点可用）
 */
import { androidSign, webSign, registerSign, playKey, APPID, CLIENTVER, SRCAPPID } from './sign';
import type { Endpoint, SignType } from './endpoints';
import { BASE } from './endpoints';
import { platformDirectFetch } from '../platform/gateway';

// ── 会话（设备参数 + 登录态） ──
export interface KugouSession {
  token: string;
  userid: string;
  mid: string;
  dfid: string;
  cookies: Record<string, string>;
}

/** dfid：随机 24 位（A-Z0-9），进程内缓存（契约：play_url v5 必须随机 24 位 dfid）。 */
function genDfid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

let _session: KugouSession | null = null;

export function getSession(): KugouSession {
  if (!_session) {
    _session = { token: '', userid: '', mid: '', dfid: genDfid(), cookies: {} };
  }
  return _session;
}

export function setSessionToken(token: string, userid: string, cookies: Record<string, string>) {
  const s = getSession();
  s.token = token;
  s.userid = userid;
  s.cookies = cookies;
}

// ── 异常 ──
export class KugouApiError extends Error {
  constructor(public readonly code: number, message: string) {
    super(`[${code}] ${message}`);
  }
}

// ── 请求组装（逐字对齐 Flutter 版） ──
export interface RequestOptions {
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  rawBody?: string;
}

export async function request<T = Record<string, unknown>>(
  ep: Endpoint,
  opts: RequestOptions = {},
): Promise<T> {
  const session = getSession();
  const p: Record<string, unknown> = { ...(opts.params ?? {}) };

  const method = ep.method ?? 'GET';
  const bodyStr = opts.rawBody ?? (method === 'POST' ? JSON.stringify(opts.body ?? {}) : '');

  if (!ep.clearDefaultParams) {
    p.dfid = session.dfid;
    p.uuid = '-';
    p.appid = APPID;
    p.clientver = CLIENTVER;
    // 实测：srcappid 参与签名会让搜索/cloudlist 等端点返回 20006；默认不注入
    if (ep.includeSrcappid) p.srcappid = SRCAPPID;
    p.mid = session.mid || '0';
    p.clienttime = Math.floor(Date.now() / 1000);
    if (session.token) p.token = session.token;
    if (session.userid) p.userid = session.userid;
  }

  if (ep.encryptKey && p.hash != null) {
    p.key = playKey(String(p.hash).toLowerCase(), session.mid, session.userid);
  }

  const signType: SignType = ep.signType ?? 'android';
  switch (signType) {
    case 'android': p.signature = androidSign(p, bodyStr); break;
    case 'web': p.signature = webSign(p); break;
    case 'register': p.signature = registerSign(p); break;
    case 'none': break;
  }

  const q = Object.entries(p)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const base = ep.base ?? BASE;
  const url = `${base}${ep.path}?${q}`;

  const headers: Record<string, string> = {};
  if (ep.router) headers['x-router'] = ep.router;
  if (ep.tid) headers['kg-tid'] = ep.tid;
  const ct = Date.now();
  headers.dfid = session.dfid;
  headers.clienttime = String(Math.floor(ct / 1000));
  headers.mid = session.mid;
  headers['kg-rc'] = '1';
  headers['kg-thash'] = '5d816a0';
  headers['kg-rec'] = '1';
  headers['kg-rf'] = 'B9EDA08A64250DEFFBCADDEE00F8F25F';
  if (Object.keys(session.cookies).length > 0) {
    headers.Cookie = Object.entries(session.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  if (bodyStr) headers['Content-Type'] = 'application/json';

  const { status, body } = await platformDirectFetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  if (status !== 200) {
    throw new KugouApiError(status, `http ${status} (${ep.id})`);
  }

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(body);
  } catch {
    throw new KugouApiError(-1, `invalid json (${ep.id})`);
  }
  const code = Number(json.status ?? json.error_code ?? json.err_code ?? 0);
  if (code !== 0 && code !== 1) {
    // 20028 = 权限不足（VIP 端点未登录）；20006 = 签名/参数错
    throw new KugouApiError(code, String(json.error ?? json.hint ?? 'api error'));
  }
  return json as T;
}
