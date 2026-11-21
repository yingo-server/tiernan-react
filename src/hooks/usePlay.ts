/**
 * 播放链路 React 绑定（usePlay）。
 *
 * 只做「取地址 / 判权」两件网络事，真正的 Audio 播放在 src/player/PlayerStore.ts：
 * - fetchPlayUrl(hash)    → 可播放 URL（失败返回 result.url='' 并带 errCode/error）
 * - fetchPrivilege(hash)  → 可播/付费元数据（判权仅以 play_url 为准）
 * - usePlayable(hash)     → 三态 hook（loading / error / data）
 *
 * 端点与字段事实源（禁臆造）：
 * - GET  /v5/url（x-router trackercdn.kugou.com, encryptKey）
 *   参数: Flutter 仓 lib/core/net/endpoints/play_endpoints.dart getPlayUrlV5
 *   响应: docs/API_FIELDS_TRUTH.md §A3-1（顶层即数据；status=1 出 URL；
 *         非 VIP 态 error_code=35104；匿名态 errcode=20028）
 * - POST /v2/get_res_privilege/lite（x-router media.store.kugou.com）
 *   参数: Flutter 仓 play_endpoints.dart getPrivilegeLite
 *         + 上游 KuGouMusicApi/module/privilege_lite.js
 *   响应: docs/API_FIELDS_TRUTH.md §A3-2（privilege=int 标量，三态同值，
 *         仅元数据，不作权限判定依据）
 * - 匿名 GET /v5/url: Flutter 仓 mv_anonymous.dart anonymousPlayUrl（⚠️ 待实测）
 *
 * 浏览器环境：取地址走 gateway + x-router，本身不带 CORS；但 CDN 音频
 * （fsandroid/fsmobile.tx.kugou.com）在浏览器 <audio> 播放会被 CORS/混合内容拦截，
 * 故错误文案统一引导到客户端环境（Android APK / Tauri 桌面）。
 */
import { useCallback, useEffect, useState } from 'react';
import {
  fetchAnonymousPlayUrl,
  fetchPlayUrl as requestPlayUrl,
  fetchPrivilegeLite,
  type PlayUrlResult,
  type PrivilegeItem,
} from '../kugou/play';

/** 浏览器端 CDN 播放受限时的统一提示（播放器/页面共用）。 */
export const PLAY_CLIENT_REQUIRED = '播放需要客户端环境（Android APK/桌面）';

export interface PlayableState {
  loading: boolean;
  error: string | null;
  url: string;
  result: PlayUrlResult | null;
  reload: () => void;
}

/**
 * 取播放地址（hash → URL）。
 * 失败容错：主链失败 → 备份链 → 匿名试听 → 仍失败则返回空 URL + 原因（不抛）。
 */
export async function fetchPlayUrl(hash: string): Promise<PlayUrlResult> {
  const result = await requestPlayUrl(hash);
  if (result.url || !result.backupUrls.length) return result;
  // 主链空但备份链在场（status=1 偶发单链缺失）→ 用备份链兜底
  return { ...result, url: result.backupUrls[0] };
}

/**
 * 匿名试听地址兜底（⚠️ 上游标注待实测，匿名态常返 status=2 / 20028）。
 */
export async function fetchAnonymousUrl(hash: string): Promise<PlayUrlResult> {
  return fetchAnonymousPlayUrl(hash);
}

/** 判权（POST /v2/get_res_privilege/lite）——单曲版，失败返回空数组不阻断播放。 */
export async function fetchPrivilege(hash: string): Promise<PrivilegeItem[]> {
  if (!hash.trim()) return [];
  try {
    return await fetchPrivilegeLite([hash]);
  } catch {
    return [];
  }
}

/** 取地址 + 判权的三态 hook（页面展示「URL 可用/付费」提示用）。 */
export function usePlayable(hash: string): PlayableState {
  const [state, setState] = useState<{
    loading: boolean; error: string | null; result: PlayUrlResult | null;
  }>({ loading: false, error: null, result: null });
  const [tick, setTick] = useState(0);
  const h = hash.trim().toLowerCase();

  useEffect(() => {
    if (!h) {
      setState({ loading: false, error: null, result: null });
      return;
    }
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    void (async () => {
      try {
        const result = await fetchPlayUrl(h);
        if (!alive) return;
        const reason = result.errCode === 20028
          ? '需要登录验证'
          : result.errCode === 35104
            ? '无播放权限（VIP 或资源不存在）'
            : result.error;
        setState({
          loading: false,
          error: result.url ? null : (reason || '未取到播放地址'),
          result,
        });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, error: e instanceof Error ? e.message : String(e), result: null });
      }
    })();
    return () => { alive = false; };
  }, [h, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return {
    loading: state.loading,
    error: state.error,
    url: state.result?.url ?? '',
    result: state.result,
    reload,
  };
}
