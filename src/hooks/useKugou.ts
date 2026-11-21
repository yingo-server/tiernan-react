/**
 * 数据 hooks：页面消费层（kugou client 的 React 绑定）。
 * 三态：loading / error / data —— 与计划书 §2.3.1 对齐。
 */
import { useCallback, useEffect, useState } from 'react';
import { request, KugouApiError } from '../kugou/client';
import { EP } from '../kugou/endpoints';

export interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  reload: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: T | null }>({
    loading: true, error: null, data: null,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => { if (alive) setState({ loading: false, error: null, data }); })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof KugouApiError ? `${e.message}` : String(e);
        setState({ loading: false, error: msg, data: null });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

// ── 业务数据类型（酷狗响应字段映射） ──
export interface SongBrief { hash: string; name: string; singer: string; cover: string; albumId: string }
export interface PlaylistBrief { id: string; name: string; cover: string; count?: number }
export interface RankBrief { id: string; name: string; cover: string; updateTime: string }

function pick(d: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  for (const k of keys) {
    const v = d[k];
    if (v != null) return v as Record<string, unknown>;
  }
  return {};
}

/** 每日推荐（登录态；匿名会 20028/权限错，页面展示引导登录）。 */
export function useDailyRecommend(): AsyncState<SongBrief[]> {
  return useAsync(async () => {
    const res = await request(EP.dailyRecommend, { params: { page: 1, pagesize: 30 } });
    const data = pick(res as Record<string, unknown>, 'data');
    const list = (data.list ?? data.songs ?? []) as Record<string, unknown>[];
    return list.map((s) => ({
      hash: String(s.hash ?? ''),
      name: String(s.filename ?? s.songname ?? s.name ?? ''),
      singer: String(s.singername ?? s.author ?? ''),
      cover: String(s.cover ?? ''),
      albumId: String(s.album_id ?? ''),
    }));
  });
}

/** 推荐歌单。 */
export function usePlaylistRecommend(): AsyncState<PlaylistBrief[]> {
  return useAsync(async () => {
    const res = await request(EP.playlistRecommend, { params: { page: 1, pagesize: 30 } });
    const data = pick(res as Record<string, unknown>, 'data');
    const list = (data.list ?? data.special ?? []) as Record<string, unknown>[];
    return list.map((p) => ({
      id: String(p.special_id ?? p.id ?? ''),
      name: String(p.special_name ?? p.name ?? ''),
      cover: String(p.img ?? p.cover ?? ''),
      count: Number(p.total_count ?? 0) || undefined,
    }));
  });
}

/** 排行榜列表。 */
export function useRankList(): AsyncState<RankBrief[]> {
  return useAsync(async () => {
    const res = await request(EP.rankList, { params: {} });
    const data = pick(res as Record<string, unknown>, 'data');
    const list = (data.list ?? data.rank ?? data.toplist ?? []) as Record<string, unknown>[];
    return list.map((r) => ({
      id: String(r.rankid ?? r.id ?? ''),
      name: String(r.rankname ?? r.name ?? ''),
      cover: String(r.imgurl ?? r.cover ?? ''),
      updateTime: String(r.update_time ?? r.updatetime ?? ''),
    }));
  });
}
