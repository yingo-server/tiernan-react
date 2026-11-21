/**
 * 播放链路端点封装（play_url v5 / anonymous / privilege_lite）。
 *
 * 事实源：
 * - Flutter 仓 lib/core/net/endpoints/play_endpoints.dart
 *   · getPlayUrlV5（参数集逐字对齐）
 *   · getPrivilegeLite（body resource[] 结构）
 * - Flutter 仓 lib/core/net/endpoints/mv_anonymous.dart · anonymousPlayUrl
 * - Flutter 仓 lib/core/net/endpoint_registry.dart · EndpointRegistry
 *   （playUrlV5 / privilegeLite / anonymousSongUrl 声明）
 * - 响应字段：docs/API_FIELDS_TRUTH.md §A3-1（play_url v5）/
 *   §A3-2（privilege_lite）
 *
 * 响应「顶层即数据」（无 data 包层）——这是 play_url 与酷狗其它网关端点的
 * 最大差异，解析时不要按 data.xxx 取。
 */
import { request } from './client';
import { EP } from './endpoints';

/** 播放地址解析结果（字段: API_FIELDS_TRUTH.md §A3-1）。 */
export interface PlayUrlResult {
  /** 主链播放地址（url[] 首条）。 */
  url: string;
  /** 备份链（backupUrl[]）。 */
  backupUrls: string[];
  /** status: 1=出URL / 0=无权限 / 2=需验证。 */
  status: number;
  /** priv_status: 1=有权限 / 0=无权限（缺失表示未知）。 */
  privStatus: number;
  /** 权限位是否已知（priv_status 存在与否——缺失不得折叠成 0 误判）。 */
  privKnown: boolean;
  /** error_code / errcode（20028=需验证，35104=Hash not found）。 */
  errCode: number;
  error: string;
  /** 比特率（bps；flac 档实测恒 0）。 */
  bitRate: number;
  extName: string;
  /** 时长（秒）。 */
  timeLength: number;
  /** tracker_through.musicpack_advance=1 → VIP 曲。 */
  isVipTrack: boolean;
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function s(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** url[]/backupUrl[] 容错：数组或单串均可。 */
function collectUrls(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((u) => s(u)).filter((u) => u.length > 0);
  const one = s(v);
  if (!one) return [];
  if (one.includes(',')) {
    return one.split(',').map((x) => x.trim()).filter((x) => x.length > 0);
  }
  return [one];
}

/** 解析 play_url v5 / anonymous 的响应（两者同契约）。 */
export function parsePlayUrl(res: Record<string, unknown>): PlayUrlResult {
  const urls = collectUrls(res.url);
  const backups = collectUrls(res.backupUrl);
  const tracker = asObj(res.tracker_through);
  return {
    url: urls[0] ?? '',
    backupUrls: backups,
    status: num(res.status),
    privStatus: num(res.priv_status),
    privKnown: res.priv_status !== undefined && res.priv_status !== null,
    errCode: num(res.error_code ?? res.errcode),
    error: s(res.error ?? res.hint),
    bitRate: num(res.bitRate),
    extName: s(res.extName),
    timeLength: num(res.timeLength),
    isVipTrack: tracker.musicpack_advance === true || num(tracker.musicpack_advance) === 1,
  };
}

/** play_url v5 的完整参数集（出处: play_endpoints.dart getPlayUrlV5）。 */
function playUrlParams(hash: string, quality: string, isFreePart: boolean): Record<string, unknown> {
  const q = quality.trim() || '128';
  // 魔法音质（piano/acappella/…）→ quality=128 + magic_<q>=1（上游 song_url.js L15-18）
  const magic = ['piano', 'acappella', 'subwoofer', 'ancient', 'dj', 'surnay'].includes(q);
  return {
    hash,
    quality: magic ? '128' : q,
    ...(magic ? { [`magic_${q}`]: 1 } : {}),
    album_audio_id: 0,
    album_id: 0,
    area_code: 1,
    behavior: 'play',
    ssa_flag: 'is_fromtrack',
    version: 11430,
    clientver: 11430,
    page_id: 151369488,
    ppage_id: '463467626,350369493,788954147',
    pid: 2,
    cmd: 26,
    pidversion: 3001,
    IsFreePart: isFreePart ? 1 : 0,
    cdnBackup: 1,
  };
}

/**
 * 取播放地址（登录态）。
 * 出处: Flutter 仓 play_endpoints.dart getPlayUrlV5；响应 §A3-1 顶层即数据。
 * 匿名调用会得 status=2 / errcode=20028「本次请求需要验证」。
 */
export async function fetchPlayUrl(
  hash: string,
  quality = '128',
  isFreePart = false,
): Promise<PlayUrlResult> {
  const h = hash.trim().toLowerCase();
  if (!h) {
    return {
      url: '', backupUrls: [], status: 0, privStatus: 0, privKnown: false,
      errCode: -1, error: 'hash 为空', bitRate: 0, extName: '', timeLength: 0, isVipTrack: false,
    };
  }
  const res = await request<Record<string, unknown>>(EP.playUrlV5, {
    params: playUrlParams(h, quality, isFreePart),
  });
  return parsePlayUrl(res);
}

/**
 * 匿名试听地址（免登录）。
 * 出处: Flutter 仓 mv_anonymous.dart anonymousPlayUrl（⚠️ 上游标注「待实测」，
 * 匿名实测常返 20028 fail_process:['pkg']）。IsFreePart 恒 1（试听语义）。
 */
export async function fetchAnonymousPlayUrl(hash: string, quality = '128'): Promise<PlayUrlResult> {
  const h = hash.trim().toLowerCase();
  if (!h) {
    return {
      url: '', backupUrls: [], status: 0, privStatus: 0, privKnown: false,
      errCode: -1, error: 'hash 为空', bitRate: 0, extName: '', timeLength: 0, isVipTrack: false,
    };
  }
  const res = await request<Record<string, unknown>>(EP.anonymousSongUrl, {
    params: {
      hash: h,
      quality,
      album_audio_id: 0,
      album_id: 0,
      area_code: 1,
      behavior: 'play',
      cmd: 26,
      pid: 2,
      pidversion: 3001,
      IsFreePart: 1,
      cdnBackup: 1,
    },
  });
  return parsePlayUrl(res);
}

/** 权益批量查询结果（字段: API_FIELDS_TRUTH.md §A3-2 data[]）。 */
export interface PrivilegeItem {
  hash: string;
  /** privilege 为 int 标量（三态同值，不可用于权限判定——仅元数据）。 */
  privilege: number;
  /** pay_type / price：付费形态元数据。 */
  payType: number;
  price: number;
  name: string;
  singer: string;
  albumName: string;
  /** data[].info.bitrate / duration(毫秒) / extname。 */
  bitrate: number;
  durationMs: number;
  extName: string;
}

/**
 * 播放权限查询（POST /v2/get_res_privilege/lite）。
 * 出处: Flutter 仓 play_endpoints.dart getPrivilegeLite；
 *   body resource 必须是 {type,page_id,hash,album_id} 对象数组
 *   （裸 hash 字符串数组 → 20010，见 §A3-2）。
 */
export async function fetchPrivilegeLite(hashes: string[]): Promise<PrivilegeItem[]> {
  const clean = Array.from(
    new Set(hashes.map((h) => h.trim().toLowerCase()).filter((h) => h.length > 0)),
  );
  if (!clean.length) return [];
  const res = await request<Record<string, unknown>>(EP.privilegeLite, {
    params: {
      appid: '1005',
      clientver: '20489',
      area_code: 1,
      behavior: 'play',
      need_hash_offset: 1,
      relate: 1,
      support_verify: 1,
    },
    body: {
      resource: clean.map((h) => ({ type: 'audio', hash: h, album_id: '', page_id: 0 })),
      qualities: ['128', '320', 'flac', 'high'],
      appid: '1005',
      clientver: '20489',
      area_code: 1,
      behavior: 'play',
    },
  });
  const data = asObj(res.data);
  const list = asArr(data.data ?? res.data);
  return list.map((it) => {
    const m = asObj(it);
    const info = asObj(m.info);
    return {
      hash: s(m.hash).toLowerCase(),
      privilege: num(m.privilege),
      payType: num(m.pay_type),
      price: num(m.price),
      name: s(m.name),
      singer: s(m.singername),
      albumName: s(m.albumname),
      bitrate: num(info.bitrate),
      durationMs: num(info.duration),
      extName: s(info.extname),
    };
  });
}
