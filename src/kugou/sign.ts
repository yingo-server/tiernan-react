/**
 * 酷狗原生 API 签名引擎（TS 移植自 Flutter 仓 lib/core/net/signing.dart，
 * 知识来源：docs/KUGOU_API.md §1，逐字实现，测试锚点见 md5.smoke.ts）。
 *
 * 纯前端直连：签名在浏览器侧完成，无服务器依赖。
 */
import { md5Hex } from './md5';

// ── 盐常量（docs/KUGOU_API.md §1.1）──
export const ANDROID_SALT = 'OIlwieks28dk2k092lksi2UIkp';
export const WEB_SALT = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt';
export const REGISTER_SALT = '1014';
export const SIGN_KEY_SALT = '57ae12eb6890223e355ccfcb74edf70d';
export const TRACKER_KEY_SALT = '185672dd44712f60bb1736df5a377e82';

// ── 设备常量（config.json）──
export const APPID = '1005';
export const CLIENTVER = '20489';
export const SRCAPPID = '2919';
export const DEFAULT_UA = 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi';

/** Android 签名（§1.2）：参数名 ASCII 升序 k=v 无分隔拼接，对象值 JSON 序列化；
 *  GET body 空串 / POST body JSON 原文；md5(salt + s + body + salt)。 */
export function androidSign(
  params: Record<string, unknown>,
  body = '',
  salt: string = ANDROID_SALT,
): string {
  const keys = Object.keys(params).sort();
  let s = '';
  for (const k of keys) {
    const v = params[k];
    const vs = v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);
    s += `${k}=${vs}`;
  }
  return md5Hex(salt + s + body + salt);
}

/** Web 签名（§1.3）：先拼 "k=v" 串再整体排序后拼接。 */
export function webSign(params: Record<string, unknown>): string {
  const parts = Object.entries(params).map(([k, v]) => `${k}=${v}`);
  parts.sort();
  return md5Hex(WEB_SALT + parts.join('') + WEB_SALT);
}

/** Register 签名（§1.4）：只排序"值"，不含键名。 */
export function registerSign(params: Record<string, unknown>): string {
  const values = Object.values(params).map((v) => String(v));
  values.sort();
  return md5Hex(REGISTER_SALT + values.join('') + REGISTER_SALT);
}

/** play_url key（§1.5）：md5(hash + 盐 + appid + mid + userid) */
export function playKey(
  hash: string,
  mid: string,
  userid: string,
  opts: { lite?: boolean } = {},
): string {
  const salt = opts.lite ? TRACKER_KEY_SALT : SIGN_KEY_SALT;
  return md5Hex(`${hash}${salt}${APPID}${mid}${userid || '0'}`);
}

/** signParamsKey（§1.6）：md5(appid + androidSalt + clientver + clienttimeMs) */
export function signParamsKey(clienttimeMs: string): string {
  return md5Hex(`${APPID}${ANDROID_SALT}${CLIENTVER}${clienttimeMs}`);
}
