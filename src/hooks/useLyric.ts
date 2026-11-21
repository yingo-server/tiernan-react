/**
 * 歌词 hook：useLyric(hash) → LRC 文本 / 逐行数组。
 *
 * 数据来源（端点事实源）：
 * - GET /v1/search（x-router: lyrics.kugou.com）—— 候选
 *   出处: Flutter 仓 lib/core/net/endpoints/misc_endpoints.dart lyricSearch
 *         + docs/API_FIELDS_TRUTH.md §A3-3（响应顶层即数据，status=200 为成功）
 * - GET /download（x-router: lyrics.kugou.com）—— 正文
 *   出处: 同上 lyricDownload + §A3-4（content base64；contenttype=0 → krc 密文）
 * - krc 解密链（base64 → 去 4 字节魔数 → XOR 16 字节 → zlib inflate）
 *   出处: Flutter 仓 misc_endpoints.dart krcDecode + §A3-5
 */
import { useCallback, useEffect, useState } from 'react';
import { KugouApiError } from '../kugou/client';
import { fetchLyricText, type LyricDownload, type LyricLine } from '../kugou/lyric';

export interface LyricState {
  loading: boolean;
  error: string | null;
  /** 歌词全文（明文）。 */
  text: string;
  /** 逐行（时间戳 + 文本）。 */
  lines: LyricLine[];
  /** 源格式：krc / lrc。 */
  fmt: string;
  durationMs: number;
  reload: () => void;
}

/**
 * 歌词 hook。hash 为空时不发请求。
 * @param keyword 歌名（歌词搜索关键词，可空；Flutter 侧 lyricSearch 同参）
 */
export function useLyric(hash: string, keyword = ''): LyricState {
  const [state, setState] = useState<{
    loading: boolean; error: string | null; data: LyricDownload | null;
  }>({ loading: false, error: null, data: null });
  const [tick, setTick] = useState(0);
  const h = hash.trim().toLowerCase();

  useEffect(() => {
    if (!h) {
      setState({ loading: false, error: null, data: null });
      return;
    }
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetchLyricText(h, keyword)
      .then((data) => {
        if (!alive) return;
        setState({ loading: false, error: null, data });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = e instanceof KugouApiError ? `${e.message}` : String(e);
        setState({ loading: false, error: msg, data: null });
      });
    return () => { alive = false; };
  }, [h, keyword, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const data = state.data;
  return {
    loading: state.loading,
    error: state.error,
    text: data?.text ?? '',
    lines: data?.lines ?? [],
    fmt: data?.fmt ?? '',
    durationMs: data?.durationMs ?? 0,
    reload,
  };
}
