/**
 * 歌手 / 专辑数据 hooks。
 *
 * 端点与字段事实源（全部来自 Flutter 仓，禁臆造）：
 * - artistList    GET  /ocean/v6/singer/list
 *                 参数五参见 Flutter 仓 lib/core/net/endpoints/artist_endpoints.dart
 *                 · getArtistList（hotsize=200, musician=0, sextype=0, showtype=2, type=0）
 *                 响应键: author_id / author_name / sizable_avatar / fansnums
 * - artistDetail  POST /kmr/v3/author（x-router openapi.kugou.com, kg-tid 36）
 *                 body {author_id}
 *                 响应键（docs/API_FIELDS_TRUTH.md §A4-1）: author_id / author_name /
 *                 sizable_avatar / intro / long_intro / album_count / song_count /
 *                 mv_count / fansnums
 * - artistAudios  POST /kmr/v1/audio_group/author（kg-tid 220）
 *                 body {author_id,page,pagesize}
 *                 响应（§A4-2'）: data 为**平铺数组**，item 键 audio_name /
 *                 author_name / album_name / album_id / hash / timelength(毫秒) /
 *                 trans_param.musicpack_advance；total 在顶层
 * - artistAlbums  /v1/author/albums 实测恒 502（§A4-3'）→ 降级：
 *                 ① GET /v1/search/album（keyword=歌手名，§A1-3 键集
 *                    albumid/albumname/singer/songcount/publish_time/img）
 *                 ② 兜底：从 artistAudios 的 item.album_id/album_name 去重重组
 * - albumDetail   POST /kmr/v2/albums（kg-tid 255）body data:[{album_id}]
 *                 响应（§A4-3）: data 为**数组**，data[0] 键 album_id /
 *                 album_name / author_name / sizable_cover / intro / publish_date
 *                 （⚠️ 无曲目数字段；曲目数取 albumSongs 的 total）
 * - albumSongs    POST /v1/album_audio/lite（kg-tid 255）
 *                 body {album_id,page,pagesize,is_buy:0}
 *                 响应（§A4-2）: data.songs[]，item 结构 base{} / audio_info{} /
 *                 album_info{} / authors[]；hash 在 audio_info.hash
 */
import { useCallback, useEffect, useState } from 'react';
import { request, KugouApiError } from '../kugou/client';
import { EP } from '../kugou/endpoints';

/** 歌手摘要。 */
export interface ArtistBrief {
  id: string;
  name: string;
  avatar: string;
  fans: number;
}

/** 歌手详情。 */
export interface ArtistDetail {
  id: string;
  name: string;
  avatar: string;
  intro: string;
  albumCount: number;
  songCount: number;
  mvCount: number;
  fans: number;
}

/** 专辑摘要。 */
export interface AlbumBrief {
  id: string;
  name: string;
  cover: string;
  singer: string;
  publishDate: string;
  songCount: number;
}

/** 专辑详情。 */
export interface AlbumDetail {
  id: string;
  name: string;
  cover: string;
  author: string;
  intro: string;
  publishDate: string;
}

/** 歌手/专辑域曲目（与 useKugou.SongBrief 同形，便于统一播放）。 */
export interface ArtistSong {
  hash: string;
  name: string;
  singer: string;
  cover: string;
  albumId: string;
  albumName: string;
  /** 时长（秒）。 */
  durationSec: number;
  /** VIP 曲标记（trans_param.musicpack_advance=1）。 */
  isVip: boolean;
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

/** 封面 URL 归一：{size} 模板 → 具体像素档（出处: Flutter 仓 cover_url.dart）。 */
export function normalizeCoverUrl(raw: string, size = 240): string {
  const u = raw.trim();
  if (!u.startsWith('http')) return '';
  return u.replace('{size}', String(size));
}

/** 详情响应取首个对象：data / data.author / data.data[] / 顶层（Flutter _detailMap）。 */
function detailMap(res: Record<string, unknown>): Record<string, unknown> {
  const d = asObj(res.data);
  for (const v of [d.author, d.author_info, d.detail, d.data, d.info, res.author, res.data]) {
    const m = asObj(v);
    if (Object.keys(m).length) return m;
    const l = asArr(v);
    if (l.length) return asObj(l[0]);
  }
  return d;
}

/** 列表响应取数组：data 平铺数组优先，再试候选键（Flutter _pickList）。 */
function pickList(res: Record<string, unknown>, keys: string[]): Record<string, unknown>[] {
  const flat = asArr(res.data);
  if (flat.length) return flat.map(asObj);
  const d = asObj(res.data);
  for (const k of keys) {
    for (const src of [d[k], res[k]]) {
      const l = asArr(src);
      if (l.length) return l.map(asObj);
    }
  }
  return [];
}

/** 歌手摘要映射（Flutter 仓 ArtistBrief.fromMap）。 */
function toArtistBrief(m: Record<string, unknown>): ArtistBrief {
  return {
    id: s(m.author_id ?? m.AuthorId ?? m.authorid ?? m.singerid ?? m.id),
    name: s(m.author_name ?? m.AuthorName ?? m.singername ?? m.name),
    avatar: normalizeCoverUrl(
      s(m.sizable_avatar ?? m.Avatar ?? m.avatar ?? m.imgurl ?? m.pic),
    ),
    fans: num(m.fansnums ?? m.fans ?? m.FansNum ?? m.fans_count ?? m.fans_num),
  };
}

/**
 * 歌手列表：GET /ocean/v6/singer/list。
 * 出处: Flutter 仓 artist_endpoints.dart getArtistList（参数五参见注释）。
 */
export async function fetchArtistList(): Promise<ArtistBrief[]> {
  const res = await request<Record<string, unknown>>(EP.artistList, {
    params: { hotsize: 200, musician: 0, sextype: 0, showtype: 2, type: 0 },
  });
  return pickList(res, ['info', 'list', 'lists', 'singerlist', 'singers'])
    .map(toArtistBrief)
    .filter((a) => a.id || a.name);
}

/**
 * 歌手详情：POST /kmr/v3/author（kg-tid 36，body {author_id}）。
 * 出处: Flutter 仓 artist_endpoints.dart getArtistDetail + §A4-1。
 */
export async function fetchArtistDetail(authorId: string): Promise<ArtistDetail> {
  const id = authorId.trim();
  if (!id) {
    return { id: '', name: '', avatar: '', intro: '', albumCount: 0, songCount: 0, mvCount: 0, fans: 0 };
  }
  const a = /^\d+$/.test(id) ? Number(id) : id;
  const res = await request<Record<string, unknown>>(EP.artistDetail, {
    params: { author_id: a },
    body: { author_id: a },
  });
  const m = detailMap(res);
  const brief = toArtistBrief(m);
  const intro = [m.intro, m.introduction, m.desc, m.description, m.long_intro, m.brief]
    .map((v) => s(v))
    .find((v) => v.length > 0) ?? '';
  return {
    id: brief.id || id,
    name: brief.name,
    avatar: brief.avatar,
    intro,
    albumCount: num(m.album_count),
    songCount: num(m.song_count),
    mvCount: num(m.mv_count),
    fans: num(m.fansnums ?? brief.fans),
  };
}

/** kmr 系（audio_group/author）曲目映射：键在顶层（§A4-2'）。 */
function toArtistSong(m: Record<string, unknown>): ArtistSong {
  const trans = asObj(m.trans_param);
  const timelength = num(m.timelength ?? m.timelen);
  return {
    hash: s(m.hash ?? m.hash_128 ?? m.FileHash).toLowerCase(),
    name: s(m.audio_name ?? m.name ?? m.songname ?? m.FileName),
    singer: s(m.author_name ?? m.singername),
    cover: normalizeCoverUrl(s(m.cover ?? m.imgurl ?? m.album_cover)),
    albumId: s(m.album_id),
    albumName: s(m.album_name),
    durationSec: timelength > 100000 ? Math.floor(timelength / 1000) : timelength,
    isVip: trans.musicpack_advance === true || num(trans.musicpack_advance) === 1,
  };
}

/**
 * 歌手歌曲分页：POST /kmr/v1/audio_group/author（kg-tid 220）。
 * 出处: Flutter 仓 artist_endpoints.dart getArtistAudios + §A4-2'。
 * ⚠️ 签名须「默认参 + body 合并」：业务参数同时进 query 与 body（PARITY_NOTES §1）。
 */
export async function fetchArtistAudios(
  authorId: string,
  page: number,
  pageSize = 30,
): Promise<{ songs: ArtistSong[]; total: number }> {
  const id = authorId.trim();
  if (!id) return { songs: [], total: 0 };
  const p = page < 1 ? 1 : page;
  const a = /^\d+$/.test(id) ? Number(id) : id;
  const res = await request<Record<string, unknown>>(EP.artistAudios, {
    params: { author_id: a, page: p, pagesize: pageSize },
    body: { author_id: a, page: p, pagesize: pageSize },
  });
  const items = pickList(res, ['songs', 'lists', 'list', 'info', 'audio_list', 'audios'])
    .map(toArtistSong)
    .filter((x) => x.hash);
  const total = num(asObj(res.data).total ?? res.total) || items.length;
  return { songs: items, total };
}

/**
 * 歌手专辑（降级链，Flutter 仓 getArtistAlbums 同款）。
 * /v1/author/albums 实测恒 502 → 走 /v1/search/album，再用 audios 去重兜底。
 */
export async function fetchArtistAlbums(
  authorId: string,
  page: number,
  pageSize = 30,
): Promise<AlbumBrief[]> {
  const id = authorId.trim();
  if (!id) return [];
  const p = page < 1 ? 1 : page;
  // ① 歌手名 → 专辑搜索
  let name = '';
  try {
    name = (await fetchArtistDetail(id)).name.trim();
  } catch {
    name = '';
  }
  const kw = name || id;
  let out: AlbumBrief[] = [];
  try {
    const res = await request<Record<string, unknown>>(EP.searchAlbum, {
      params: {
        keyword: kw,
        page: p,
        pagesize: pageSize,
        albumhide: 0,
        iscorrection: 1,
        nocollect: 0,
        platform: 'AndroidFilter',
      },
    });
    out = pickList(res, ['lists', 'albumlist', 'info', 'data'])
      .map((m) => {
        const img = normalizeCoverUrl(s(m.img ?? m.imgurl ?? m.sizable_cover));
        return {
          id: s(m.albumid ?? m.album_id ?? m.id),
          name: s(m.albumname ?? m.album_name ?? m.name),
          cover: img.startsWith('http') ? img : '',
          singer: s(m.singer),
          publishDate: s(m.publish_time ?? m.publish_date),
          songCount: num(m.songcount ?? m.song_count ?? m.count),
        };
      })
      .filter((a) => a.id && a.name);
  } catch {
    out = [];
  }
  if (out.length) return out;
  // ② 兜底：从 audios 的 album_id/album_name 去重重组
  const audios = await fetchArtistAudios(id, p, pageSize);
  const seen = new Set<string>();
  const fallback: AlbumBrief[] = [];
  for (const song of audios.songs) {
    if (!song.albumId || !song.albumName) continue;
    if (seen.has(song.albumId)) continue;
    seen.add(song.albumId);
    fallback.push({
      id: song.albumId,
      name: song.albumName,
      cover: song.cover,
      singer: song.singer,
      publishDate: '',
      songCount: 0,
    });
  }
  return fallback;
}

/**
 * 专辑详情：POST /kmr/v2/albums（kg-tid 255，body data:[{album_id}]）。
 * 出处: Flutter 仓 album_endpoints.dart getAlbumDetail + §A4-3。
 */
export async function fetchAlbumDetail(albumId: string): Promise<AlbumDetail> {
  const id = albumId.trim();
  if (!id) return { id: '', name: '', cover: '', author: '', intro: '', publishDate: '' };
  const res = await request<Record<string, unknown>>(EP.albumDetail, {
    body: { data: [{ album_id: id }] },
  });
  const d = asObj(res.data);
  const list = asArr(d.data ?? d.list ?? d.info);
  const m = list.length ? asObj(list[0]) : d;
  return {
    id: s(m.album_id ?? m.id ?? id),
    name: s(m.album_name ?? m.name ?? m.albumname),
    // ⚠️ cover 键是裸文件名（非 URL），只用 sizable_cover / imgurl（§A4-3）
    cover: normalizeCoverUrl(s(m.sizable_cover ?? m.imgurl)),
    author: s(m.author_name),
    intro: s(m.intro ?? m.description),
    publishDate: s(m.publish_date ?? m.publish_time),
  };
}

/** album_audio/lite 曲目映射（Flutter 仓 SongBrief.fromAlbumLite，§A4-2）。 */
function toAlbumSong(m: Record<string, unknown>): ArtistSong {
  const base = asObj(m.base);
  const ai = asObj(m.audio_info);
  const alb = asObj(m.album_info);
  const authors = asArr(m.authors).map(asObj);
  const trans = asObj(m.trans_param);
  const dur = num(ai.duration);
  return {
    hash: s(ai.hash ?? ai.hash_128 ?? m.hash).toLowerCase(),
    name: s(base.audio_name ?? m.name ?? m.FileName),
    singer: s(base.author_name) || authors.map((a) => s(a.author_name)).filter(Boolean).join('、'),
    cover: normalizeCoverUrl(s(alb.cover)),
    albumId: s(base.album_id ?? m.album_id),
    albumName: s(alb.album_name ?? m.album_name),
    durationSec: dur > 100000 ? Math.floor(dur / 1000) : dur,
    isVip: trans.musicpack_advance === true || num(trans.musicpack_advance) === 1,
  };
}

/**
 * 专辑曲目分页：POST /v1/album_audio/lite（kg-tid 255）。
 * 出处: Flutter 仓 album_endpoints.dart getAlbumSongs + §A4-2。
 */
export async function fetchAlbumSongs(
  albumId: string,
  page: number,
  pageSize = 30,
): Promise<{ songs: ArtistSong[]; total: number }> {
  const id = albumId.trim();
  if (!id) return { songs: [], total: 0 };
  const p = page < 1 ? 1 : page;
  const res = await request<Record<string, unknown>>(EP.albumSongs, {
    body: { album_id: id, page: p, pagesize: pageSize, is_buy: 0 },
  });
  const d = asObj(res.data);
  const raw = d.songs ?? d.list ?? d.info ?? res.songs ?? res.list;
  const items = asArr(raw).map(asObj).map(toAlbumSong).filter((x) => x.hash);
  const total = num(d.total ?? res.total) || items.length;
  return { songs: items, total };
}

// ── hooks ──

interface Async<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
  reload: () => void;
}

function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[]): Async<T> {
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: T | null }>({
    loading: true, error: null, data: null,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
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

/** 歌手列表 hook。 */
export function useArtistList(): Async<ArtistBrief[]> {
  return useAsyncData(() => fetchArtistList(), []);
}

/** 歌手详情 hook。 */
export function useArtistDetail(id: string): Async<ArtistDetail> {
  return useAsyncData(() => fetchArtistDetail(id), [id]);
}

/** 歌手专辑 hook。 */
export function useArtistAlbums(id: string): Async<AlbumBrief[]> {
  return useAsyncData(() => fetchArtistAlbums(id, 1, 30), [id]);
}

/** 专辑详情 hook。 */
export function useAlbumDetail(id: string): Async<AlbumDetail> {
  return useAsyncData(() => fetchAlbumDetail(id), [id]);
}

/** 专辑曲目分页 hook（加载更多追加）。 */
export function useAlbumSongs(id: string, pageSize = 30) {
  const [songs, setSongs] = useState<ArtistSong[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setSongs([]); setTotal(0); setPage(1); setError(null);
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchAlbumSongs(id, 1, pageSize)
      .then((r) => {
        if (!alive) return;
        setSongs(r.songs); setTotal(r.total); setPage(1); setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof KugouApiError ? `${e.message}` : String(e));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [id, pageSize, tick]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    fetchAlbumSongs(id, next, pageSize)
      .then((r) => {
        setSongs((prev) => {
          const seen = new Set(prev.map((x) => x.hash));
          return prev.concat(r.songs.filter((x) => !seen.has(x.hash)));
        });
        if (r.total) setTotal(r.total);
        setPage(next);
        setLoadingMore(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof KugouApiError ? `${e.message}` : String(e));
        setLoadingMore(false);
      });
  }, [id, loading, loadingMore, page, pageSize]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const hasMore = total > 0 ? songs.length < total : songs.length > 0 && songs.length % pageSize === 0;
  return { songs, total, loading, loadingMore, error, hasMore, loadMore, reload };
}

/** 歌手歌曲分页 hook（加载更多追加）。 */
export function useArtistAudios(id: string, pageSize = 30) {
  const [songs, setSongs] = useState<ArtistSong[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setSongs([]); setTotal(0); setPage(1); setError(null);
  }, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchArtistAudios(id, 1, pageSize)
      .then((r) => {
        if (!alive) return;
        setSongs(r.songs); setTotal(r.total); setPage(1); setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof KugouApiError ? `${e.message}` : String(e));
        setLoading(false);
      });
    return () => { alive = false; };
  }, [id, pageSize, tick]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore) return;
    const next = page + 1;
    setLoadingMore(true);
    fetchArtistAudios(id, next, pageSize)
      .then((r) => {
        setSongs((prev) => {
          const seen = new Set(prev.map((x) => x.hash));
          return prev.concat(r.songs.filter((x) => !seen.has(x.hash)));
        });
        if (r.total) setTotal(r.total);
        setPage(next);
        setLoadingMore(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof KugouApiError ? `${e.message}` : String(e));
        setLoadingMore(false);
      });
  }, [id, loading, loadingMore, page, pageSize]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const hasMore = total > 0 ? songs.length < total : songs.length > 0 && songs.length % pageSize === 0;
  return { songs, total, loading, loadingMore, error, hasMore, loadMore, reload };
}
