/**
 * 数据 hooks：页面消费层（kugou client 的 React 绑定）。
 * 三态：loading / error / data —— 与计划书 §2.3.1 对齐。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { request, KugouApiError, getSession } from '../kugou/client';
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

/** 搜索联想词条（Flutter 仓 SearchSuggestItem）。 */
export interface SearchSuggestItem { keyword: string; type: string }

/** 歌单详情（Flutter 仓 PlaylistDetail 的精简投影）。 */
export interface PlaylistDetailBrief {
  id: string;
  /** 数字 specialid —— 取曲目必须用它（global_collection_id 会被拒）。 */
  specialId: string;
  name: string;
  cover: string;
  count: number;
  creator: string;
  intro: string;
}

/** 分页曲目页。 */
export interface SongPage { songs: SongBrief[]; total: number }

function pick(d: Record<string, unknown>, ...keys: string[]): Record<string, unknown> {
  for (const k of keys) {
    const v = d[k];
    if (v != null) return v as Record<string, unknown>;
  }
  return {};
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

/** 统一曲目映射：兼容 pubsongs（songs[]）与 kmr（songlist[]）两族字段。 */
function toSong(m: Record<string, unknown>): SongBrief {
  const audioInfo = asObj(m.audio_info);
  const deprecated = asObj(m.deprecated);
  const albumInfo = asObj(m.album_info);
  const base = asObj(m.base);
  const albuminfo = asObj(m.albuminfo);
  const singerInfo = asArr(m.singerinfo);
  const authors = asArr(m.authors);
  const firstSinger = asObj(singerInfo[0]);
  const firstAuthor = asObj(authors[0]);
  const singer = s(
    m.singername ?? m.author_name ?? firstSinger.name ?? firstAuthor.author_name ?? m.singer ?? '',
  );
  return {
    hash: s(
      m.hash ?? m.FileHash ?? audioInfo.hash_128 ?? audioInfo.hash ?? deprecated.hash ?? '',
    ).toLowerCase(),
    name: s(
      m.songname ?? m.filename ?? m.FileName ?? m.audio_name ?? base.audio_name ?? m.name ?? '',
    ),
    singer,
    cover: s(
      m.cover ?? m.imgurl ?? m.album_cover ?? albumInfo.cover ?? albuminfo.cover ?? '',
    ),
    albumId: s(m.album_id ?? albuminfo.id ?? ''),
  };
}

// ── 现有端点 ──

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

// ── 浏览闭环（建议 / 歌单详情 / 榜单详情） ──

/**
 * 搜索联想：GET /v2/getSearchTip（x-router: searchtip.kugou.com）。
 * 参数（Flutter 仓 lib/core/net/endpoints/search_endpoints.dart: searchSuggest）：
 *   keyword + AlbumTipCount/CorrectTipCount/MVTipCount/MusicTipCount=10 + radiotip=1
 * 响应（docs/API_FIELDS_TRUTH.md R1-A-8）：data[] 为**数组**分组
 *   { RecordDatas[], RecordCount, LableName }；词条在 RecordDatas[].HintInfo。
 *   兜底：data.records[] / data.lists[].keyword。
 */
export async function fetchSearchSuggest(keyword: string): Promise<SearchSuggestItem[]> {
  const kw = keyword.trim();
  if (!kw) return [];
  const res = await request(EP.searchSuggest, {
    params: {
      keyword: kw,
      AlbumTipCount: 10,
      CorrectTipCount: 10,
      MVTipCount: 10,
      MusicTipCount: 10,
      radiotip: 1,
    },
  });
  const raw = res as Record<string, unknown>;
  const dataAny = raw.data;
  const out: SearchSuggestItem[] = [];
  const seen = new Set<string>();
  const push = (word: string, type: string) => {
    const w = word.trim();
    if (!w || seen.has(w)) return;
    seen.add(w);
    out.push({ keyword: w, type });
  };
  // 主路径：data[] 分组
  for (const group of asArr(dataAny)) {
    const g = asObj(group);
    const label = s(g.LableName ?? g.label_name ?? g.name) || '综合';
    for (const item of asArr(g.RecordDatas ?? g.record_datas)) {
      const it = asObj(item);
      push(s(it.HintInfo ?? it.hint_info ?? it.keyword), label);
    }
  }
  // 兜底：data 为对象时（records / lists）
  const dataObj = asObj(dataAny);
  for (const item of asArr(dataObj.records ?? dataObj.RecordDatas)) {
    const it = asObj(item);
    push(s(it.HintInfo ?? it.keyword ?? it.FileName), '综合');
  }
  for (const item of asArr(dataObj.lists)) {
    const it = asObj(item);
    push(s(it.keyword ?? it.FileName ?? it.songname), '综合');
  }
  return out;
}

/**
 * 搜索建议 hook：输入防抖 300ms 后请求，空关键词不发请求。
 */
export function useSearchSuggest(keyword: string): AsyncState<SearchSuggestItem[]> {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: SearchSuggestItem[] | null }>({
    loading: false, error: null, data: null,
  });
  const [tick, setTick] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const kw = keyword.trim();
    if (!kw) {
      setState({ loading: false, error: null, data: null });
      return;
    }
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    timer.current = window.setTimeout(() => {
      fetchSearchSuggest(kw)
        .then((data) => { if (alive) setState({ loading: false, error: null, data }); })
        .catch((e: unknown) => {
          if (!alive) return;
          const msg = e instanceof KugouApiError ? `${e.message}` : String(e);
          setState({ loading: false, error: msg, data: [] });
        });
    }, 300);
    return () => {
      alive = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [keyword, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/**
 * 歌单详情：GET /v6/special/detail。
 * 响应容错：data 可能为数组（首项为详情）、对象或 data.info 包裹。
 * 字段：name/specialname、pic/imgurl/cover、count/total_count、
 *       list_create_username/username、intro。
 */
export async function fetchPlaylistDetail(id: string): Promise<PlaylistDetailBrief> {
  const pid = id.trim();
  if (!pid) return { id: '', specialId: '', name: '', cover: '', count: 0, creator: '', intro: '' };
  let raw: Record<string, unknown>;
  try {
    raw = await request(EP.playlistDetail, {
      params: {
        specialid: pid,
        special_id: pid,
        global_collection_id: pid,
        id: pid,
      },
    }) as Record<string, unknown>;
  } catch {
    // 主路径失败 → 兜底 Flutter 仓三态实测的 POST /v3/get_list_info
    raw = await request(EP.playlistDetailV3, {
      body: {
        data: [{ global_collection_id: pid }],
        userid: getSession().userid || '0',
        token: getSession().token || '',
      },
    }) as Record<string, unknown>;
  }
  const dataAny = raw.data;
  let first: Record<string, unknown> = {};
  const arr = asArr(dataAny);
  if (arr.length > 0) first = asObj(arr[0]);
  if (!Object.keys(first).length) {
    const d = asObj(dataAny);
    first = asObj(d.info ?? d.detail ?? d);
  }
  return {
    id: s(first.global_collection_id ?? first.specialid ?? first.special_id ?? pid),
    specialId: s(first.specialid ?? first.special_id ?? ''),
    name: s(first.name ?? first.specialname ?? first.special_name ?? first.title),
    cover: s(first.pic ?? first.imgurl ?? first.cover ?? first.img),
    count: Number(first.count ?? first.total_count ?? first.song_count ?? 0) || 0,
    creator: s(first.list_create_username ?? first.username ?? first.nickname),
    intro: s(first.intro ?? first.description),
  };
}

/**
 * 歌单曲目分页：GET /v6/special/tracks（page 从 1 起，pagesize 默认 30）。
 * 参数兼容 pubsongs 口径：specialid / global_collection_id / begin_idx / area_code ...
 * 响应：data.songs[]（另有 data.info / data.list 兜底），总数取 data.count / data.total。
 */
export async function fetchPlaylistTracks(
  id: string,
  page: number,
  pageSize = 30,
): Promise<SongPage> {
  const pid = id.trim();
  if (!pid) return { songs: [], total: 0 };
  const p = page < 1 ? 1 : page;
  const params = {
    specialid: pid,
    special_id: pid,
    global_collection_id: pid,
    id: pid,
    page: p,
    pagesize: pageSize,
    begin_idx: (p - 1) * pageSize,
    area_code: 1,
    plat: 1,
    type: 1,
    mode: 1,
    personal_switch: 1,
    extend_fields: 'abtags,hot_cmt,popularization',
  };
  let res: Record<string, unknown>;
  try {
    res = await request(EP.playlistTracks, { params }) as Record<string, unknown>;
  } catch {
    // 兜底：GET /pubsongs/v2/get_other_list_file_nofilt（Flutter 仓三态实测）
    res = await request(EP.playlistTracksNofilt, { params }) as Record<string, unknown>;
  }
  const data = asObj(res.data);
  const list = asArr(data.songs ?? data.info ?? data.list ?? data.tracks);
  const total = Number(data.count ?? data.total ?? data.total_count ?? list.length) || list.length;
  return { songs: list.map((m) => toSong(asObj(m))), total };
}

/**
 * 榜单曲目分页：POST /openapi/kmr/v2/rank/audio（kg-tid: 369）。
 * body（Flutter 仓 lib/core/net/endpoints/misc_endpoints.dart: rankInfo）：
 *   show_portrait_mv/show_type_total/filter_original_remarks/area_code/pagesize/
 *   rank_cid/type/page/rank_id
 * 响应（docs/API_FIELDS_TRUTH.md R1-A-6）：data.total + data.songlist[]，
 *   曲目 hash 在 audio_info.hash_128，歌手 author_name，名次 business.sort。
 */
export async function fetchRankTracks(
  id: string,
  page: number,
  pageSize = 30,
): Promise<SongPage> {
  const rid = id.trim();
  if (!rid) return { songs: [], total: 0 };
  const p = page < 1 ? 1 : page;
  let res: Record<string, unknown>;
  try {
    res = await request(EP.rankAudio, {
      body: {
        show_portrait_mv: 1,
        show_type_total: 1,
        filter_original_remarks: 1,
        area_code: 1,
        pagesize: pageSize,
        rank_cid: 0,
        type: 1,
        page: p,
        rank_id: Number(rid) || rid,
      },
    }) as Record<string, unknown>;
  } catch (err) {
    // 兜底：GET /ocean/v6/rank/info 只回 3 首预览（Flutter 仓批 N1-B 注释）
    const info = await request(EP.rankInfo, {
      params: { rankid: Number(rid) || rid, rank_cid: 0, with_album_img: 1 },
    }) as Record<string, unknown>;
    const d = asObj(info.data);
    const preview = asArr(d.songlist ?? d.songs ?? d.songinfo ?? d.list);
    if (!preview.length) throw err;
    return { songs: preview.map((m) => toSong(asObj(m))), total: preview.length };
  }
  const data = asObj(res.data);
  const list = asArr(data.songlist ?? data.songs ?? data.list);
  const total = Number(data.total ?? data.count ?? list.length) || list.length;
  return { songs: list.map((m) => toSong(asObj(m))), total };
}

/** 歌单详情 hook。 */
export function usePlaylistDetail(id: string): AsyncState<PlaylistDetailBrief> {
  return useAsync(() => fetchPlaylistDetail(id), [id]);
}

/**
 * 榜单元信息：GET /ocean/v6/rank/info（Flutter 仓 EndpointRegistry.rankInfo）。
 * 只用于头部名称/封面（完整曲目必须走 rankAudio）。
 */
export async function fetchRankBrief(id: string): Promise<RankBrief> {
  const rid = id.trim();
  if (!rid) return { id: '', name: '', cover: '', updateTime: '' };
  const res = await request(EP.rankInfo, {
    params: { rankid: Number(rid) || rid, rank_cid: 0, with_album_img: 1 },
  });
  const data = asObj((res as Record<string, unknown>).data);
  const arr = asArr(data.info);
  const first = arr.length > 0 ? asObj(arr[0]) : asObj(data.info ?? data);
  return {
    id: s(first.rankid ?? first.id ?? rid),
    name: s(first.rankname ?? first.name ?? first.title),
    cover: s(first.imgurl ?? first.cover ?? first.img),
    updateTime: s(first.update_time ?? first.updatetime),
  };
}

/** 榜单元信息 hook。 */
export function useRankBrief(id: string): AsyncState<RankBrief> {
  return useAsync(() => fetchRankBrief(id), [id]);
}

export interface PagedSongsState {
  songs: SongBrief[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * 分页曲目 hook（歌单 / 榜单共用）。
 * loadMore() 追加下一页；hasMore 由已加载条数与 total 比较得出。
 */
export function usePagedSongs(
  fetcher: (page: number, pageSize: number) => Promise<SongPage>,
  id: string,
  pageSize = 30,
): PagedSongsState {
  const [songs, setSongs] = useState<SongBrief[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    setSongs([]);
    setTotal(0);
    setPage(1);
    setError(null);
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetcherRef.current(1, pageSize)
      .then((r) => {
        if (!alive) return;
        setSongs(r.songs);
        setTotal(r.total);
        setPage(1);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof KugouApiError ? `${e.message}` : String(e);
        setError(msg);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [id, pageSize, tick]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    fetcherRef.current(next, pageSize)
      .then((r) => {
        setSongs((prev) => {
          const seen = new Set(prev.map((x) => x.hash || x.name));
          const merged = prev.concat(r.songs.filter((x) => !seen.has(x.hash || x.name)));
          return merged;
        });
        if (r.total) setTotal(r.total);
        setPage(next);
        setLoadingMore(false);
      })
      .catch((e: unknown) => {
        const msg = e instanceof KugouApiError ? `${e.message}` : String(e);
        setError(msg);
        setLoadingMore(false);
      });
  }, [loading, loadingMore, page, pageSize]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const hasMore = total > 0 ? songs.length < total : songs.length > 0 && songs.length % pageSize === 0;

  return { songs, total, loading, loadingMore, error, hasMore, loadMore, reload };
}
