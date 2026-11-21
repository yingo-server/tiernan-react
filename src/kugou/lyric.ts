/**
 * 歌词端点封装（lyrics.kugou.com search / download）。
 *
 * 事实源：
 * - Flutter 仓 lib/core/net/endpoints/misc_endpoints.dart
 *   · lyricSearch（§A3-3：响应顶层即数据，status=200 为成功，candidates[] 在顶层）
 *   · lyricDownload（§A3-4：顶层 status/fmt/contenttype/content，content 为 base64）
 *   · krcDecode（§A3-5：base64 → 去 4 字节魔数 → XOR 16 字节密钥 → zlib inflate）
 * - Flutter 仓 lib/core/net/endpoint_registry.dart · lyricSearch / lyricDownload
 *   （必须 gateway + x-router: lyrics.kugou.com，直连该域恒返空体）
 *
 * 关键约束（docs/API_FIELDS_TRUTH.md §A3-2）：
 *   直连 lyrics.kugou.com 一律 HTTP 200 + 0 字节；必须走 gateway 转发头。
 *   成功语义 status=200（不是 1）——故这两个端点在 endpoints.ts 里标了 ignoreStatus。
 */
import { request } from './client';
import { EP } from './endpoints';

/** krc XOR 密钥表（16 字节，出处: misc_endpoints.dart kKrcXorKey / §A3-5）。 */
const KRC_XOR_KEY = [
  64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105,
];

function s(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** 歌词候选（字段: API_FIELDS_TRUTH.md §A3-3 candidates[] item）。 */
export interface LyricCandidate {
  /** 候选 id（实测为字符串，如 "274944371"）。 */
  id: string;
  /** accesskey（大写 hex），/download 必带。 */
  accessKey: string;
  /** 官方轨 / UGC 轨标识。 */
  productFrom: string;
  singer: string;
  song: string;
  /** 时长（毫秒）。 */
  durationMs: number;
  /** contenttype: 0=krc / 非 0=lrc。 */
  contentType: number;
}

/**
 * 歌词搜索：GET /v1/search（x-router: lyrics.kugou.com）。
 * 出处: Flutter 仓 misc_endpoints.dart lyricSearch；响应 §A3-3（顶层 candidates[]）。
 */
export async function fetchLyricCandidates(hash: string, keyword = ''): Promise<LyricCandidate[]> {
  const h = hash.trim().toLowerCase();
  if (!h) return [];
  const res = await request<Record<string, unknown>>(EP.lyricSearch, {
    params: {
      hash: h,
      keyword,
      duration: 0,
      album_audio_id: 0,
      lrctxt: 1,
      man: 'no',
      appid: '1005',
      clientver: '20489',
    },
  });
  // §A3-3：成功语义 status=200；404=未命中（返回结构，按空处理）。
  const status = num(res.status ?? res.errcode);
  if (status !== 200) return [];
  return asArr(res.candidates).map((c) => {
    const m = asObj(c);
    return {
      id: s(m.id),
      accessKey: s(m.accesskey),
      productFrom: s(m.product_from),
      singer: s(m.singer),
      song: s(m.song),
      durationMs: num(m.duration),
      contentType: num(m.contenttype),
    };
  });
}

/** 歌词下载结果。 */
export interface LyricDownload {
  /** 明文歌词正文（krc 已解密并转 LRC 行文本，lrc 为原样）。 */
  text: string;
  /** 逐行（时间戳 + 文本），供歌词页展示。 */
  lines: LyricLine[];
  /** fmt: 'krc' / 'lrc'。 */
  fmt: string;
  isKrc: boolean;
  durationMs: number;
}

/** 歌词行：时间（秒）+ 文本。 */
export interface LyricLine {
  /** 时间（秒）；纯文本行（无时间戳）为 -1。 */
  time: number;
  text: string;
}

/** base64 → Uint8Array（浏览器原生 atob，无 Node 依赖）。 */
function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.trim();
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** zlib inflate（DecompressionStream('deflate') 处理 RFC1950 包裹）。 */
async function inflate(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前环境不支持 DecompressionStream（无法解 krc）');
  }
  const stream = new Blob([bytes as unknown as BlobPart]).stream()
    .pipeThrough(new DecompressionStream('deflate'));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder('utf-8').decode(buf);
}

/**
 * krc 解密：base64 → 跳过 4 字节魔数("krc1") → 16 字节 XOR → zlib inflate → utf8。
 * 出处: Flutter 仓 misc_endpoints.dart krcDecode；§A3-5 逐字节实测一致。
 */
export async function krcDecode(base64Content: string): Promise<string> {
  const raw = base64ToBytes(base64Content);
  if (raw.length <= 4) return '';
  const body = raw.slice(4);
  for (let i = 0; i < body.length; i += 1) body[i] ^= KRC_XOR_KEY[i % 16];
  return inflate(body);
}

/** KRC 行 → 纯文本（抽 <s,e,0>… 段内的字，去时间轴标签）。 */
function krcLineToText(line: string): string {
  const segs = line.match(/<[^>]*>/g);
  let text = line;
  if (segs && segs.length) {
    // 行内可能有多段（逐字），保留每段后的文字
    text = line
      .replace(/<\d+,\d+,\d+>/g, '')
      .replace(/<\d+,\d+>/g, '');
  }
  // 去掉行首时间标签 [start,dur]
  text = text.replace(/^\[\d+,\d+\]\s*/, '');
  return text.trim();
}

/** 解析 LRC / KRC 明文 → 行数组。 */
export function parseLyricLines(raw: string, isKrc: boolean): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (isKrc) {
      const m = /^\[(\d+),(\d+)\]/.exec(t);
      if (!m) continue;
      const text = krcLineToText(t);
      if (!text) continue;
      out.push({ time: Number(m[1]) / 1000, text });
    } else {
      const m = /^\[(\d+):(\d+(?:\.\d+)?)\]/.exec(t);
      if (m) {
        const time = Number(m[1]) * 60 + Number(m[2]);
        const text = t.slice(m[0].length).trim();
        if (text) out.push({ time, text });
      } else if (!/^\[[a-z]+:/i.test(t)) {
        out.push({ time: -1, text: t });
      }
    }
  }
  return out;
}

/**
 * 歌词下载：GET /download（x-router: lyrics.kugou.com）。
 * 出处: Flutter 仓 misc_endpoints.dart lyricDownload；响应 §A3-4（顶层即数据）。
 * @param fmt 'krc'（加密，需解密）/ 'lrc'（明文 base64）
 */
export async function fetchLyricDownload(
  id: string,
  accessKey: string,
  fmt: 'krc' | 'lrc' = 'krc',
): Promise<LyricDownload> {
  const empty: LyricDownload = { text: '', lines: [], fmt, isKrc: false, durationMs: 0 };
  if (!id || !accessKey.trim()) return empty;
  const res = await request<Record<string, unknown>>(EP.lyricDownload, {
    params: {
      id,
      accesskey: accessKey.trim(),
      fmt,
      client: 'android',
      ver: 1,
      charset: 'utf8',
    },
  });
  const status = num(res.status);
  if (status !== 200) return empty;
  const contentType = num(res.contenttype);
  const isKrc = contentType === 0;
  const b64 = s(res.content);
  let text = '';
  try {
    text = isKrc ? await krcDecode(b64) : new TextDecoder('utf-8').decode(base64ToBytes(b64));
  } catch {
    text = '';
  }
  return {
    text,
    lines: text ? parseLyricLines(text, isKrc) : [],
    fmt: s(res.fmt) || fmt,
    isKrc,
    durationMs: num(res.duration),
  };
}

/**
 * 一站式取歌词：search → 取首个候选 → download → 明文。
 * 优先官方轨（product_from 含「官方」），否则取第一候选。
 */
export async function fetchLyricText(hash: string, keyword = ''): Promise<LyricDownload> {
  const candidates = await fetchLyricCandidates(hash, keyword);
  if (!candidates.length) return { text: '', lines: [], fmt: 'krc', isKrc: false, durationMs: 0 };
  const official = candidates.find((c) => c.productFrom.includes('官方')) ?? candidates[0];
  return fetchLyricDownload(official.id, official.accessKey, 'krc');
}
