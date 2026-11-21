/**
 * 播放状态机（zustand 单例）+ HTML5 Audio 播放核心。
 *
 * 播放链路（端点事实源）：
 * 1) POST /v2/get_res_privilege/lite —— 播放权限/权益预检
 *    出处: Flutter 仓 lib/core/net/endpoints/play_endpoints.dart getPrivilegeLite；
 *          响应字段 docs/API_FIELDS_TRUTH.md §A3-2（privilege 为 int 标量，
 *          三态同值——**不作为权限判定唯一依据**，只作元数据/提示）
 * 2) GET /v5/url —— 取播放地址（顶层即数据，status=1 出 URL）
 *    出处: Flutter 仓 play_endpoints.dart getPlayUrlV5 + §A3-1
 *    失败语义：status=0（error_code 35104 Hash not found）/
 *              status=2（errcode 20028 本次请求需要验证）
 * 3) HTML5 <audio> 播放 —— 仅在原生壳（Capacitor / Tauri WebView）里可靠可播；
 *    浏览器环境直连酷狗 CDN 常被 CORS/混合内容拦截，代码容错并 toast 提示。
 */
import { create } from 'zustand';
import { fetchPlayUrl, fetchPrivilege, PLAY_CLIENT_REQUIRED } from '../hooks/usePlay';
import { useToastStore } from '../ui/toastStore';

/** 播放队列条目（与 hooks/useKugou.SongBrief / hooks/useArtist.ArtistSong 同形）。 */
export interface PlayableSong {
  hash: string;
  name: string;
  singer: string;
  cover?: string;
  albumId?: string;
  albumName?: string;
  durationSec?: number;
  isVip?: boolean;
}

/** 浏览器端 fetch playUrl / CDN 音频受 CORS 限制时的统一提示（验收指定文案）。 */
export const PLAY_UNSUPPORTED_MESSAGE = PLAY_CLIENT_REQUIRED;

export interface PlayerState {
  currentSong: PlayableSong | null;
  /** 是否正在播放。 */
  playing: boolean;
  /** 当前进度（秒）。 */
  position: number;
  /** 总时长（秒）。 */
  duration: number;
  /** 播放队列。 */
  queue: PlayableSong[];
  /** 队列中当前曲目下标。 */
  index: number;
  /** 加载中（判权 + 取地址）。 */
  loading: boolean;
  /** 最近一次错误。 */
  error: string | null;
  /** 当前播放地址（调试/展示用）。 */
  url: string;

  /** 音量（0..1）。 */
  volume: number;
  /** 播放队列中指定曲目（先判权 → 取地址 → 播放）；任务书命名 playQueue。 */
  playQueue: (songs: PlayableSong[], index: number) => Promise<void>;
  /** playQueue 的短别名（页面现有调用点）。 */
  play: (songs: PlayableSong[], index: number) => Promise<void>;
  /** 设置音量（0..1）。 */
  setVolume: (volume: number) => void;
  /** 播放/暂停切换。 */
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  prev: () => void;
  /** 跳转到指定秒数。 */
  seek: (seconds: number) => void;
  /** 停止并清空。 */
  stop: () => void;
  /** 内部：设置错误。 */
  setError: (message: string | null) => void;
}

/** 单例 Audio 元素（模块级，避免每次播放新建）。 */
let audio: HTMLAudioElement | null = null;

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = usePlayerStore.getState().volume;
  }
  return audio;
}

/** 队列中能否播放（hash 必须有）。 */
function isPlayable(song: PlayableSong | null): song is PlayableSong {
  return !!song && song.hash.trim().length > 0;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  /** 绑定 audio 事件 → store（同一函数在 audio 重建时复用）。 */
  const bindEvents = (el: HTMLAudioElement) => {
    el.onloadedmetadata = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      set({ duration: d });
    };
    el.ontimeupdate = () => set({ position: el.currentTime });
    el.onplay = () => set({ playing: true });
    el.onpause = () => set({ playing: false });
    el.onended = () => get().next();
    el.onerror = () => {
      set({ playing: false, error: PLAY_UNSUPPORTED_MESSAGE });
      useToastStore.getState().show(PLAY_UNSUPPORTED_MESSAGE, 'warning');
    };
  };

  return {
    currentSong: null,
    playing: false,
    position: 0,
    duration: 0,
    queue: [],
    index: -1,
    loading: false,
    error: null,
    url: '',
    volume: 1,

    setVolume: (volume) => {
      const v = Math.max(0, Math.min(1, volume));
      if (audio) audio.volume = v;
      set({ volume: v });
    },

    setError: (message) => set({ error: message }),

    playQueue: async (songs, index) => {
      const list = songs.filter((s) => s.hash);
      if (!list.length) {
        useToastStore.getState().show('没有可播放的歌曲', 'warning');
        return;
      }
      const safeIndex = Math.max(0, Math.min(index, list.length - 1));
      const song = list[safeIndex];
      set({
        queue: list,
        index: safeIndex,
        currentSong: song,
        loading: true,
        error: null,
        position: 0,
        duration: song.durationSec ?? 0,
      });

      // ① 判权（privilege_lite）——失败不阻断：仅作提示，权限以 play_url 为准。
      try {
        const priv = await fetchPrivilege(song.hash);
        const item = priv[0];
        if (item && item.privilege > 0) {
          // privilege 为 int 标量、三态同值（§A3-2），仅在明确付费时提示。
          if (item.payType > 0) {
            useToastStore.getState().show('该歌曲为付费内容，可能需要会员', 'info');
          }
        }
      } catch {
        /* 判权失败不阻断播放 */
      }

      // ② 取播放地址（play_url v5）
      let result: Awaited<ReturnType<typeof fetchPlayUrl>>;
      try {
        result = await fetchPlayUrl(song.hash);
      } catch (e) {
        // 浏览器端 fetch 跨域失败 → 统一按「需客户端环境」提示（验收口径）
        const msg = e instanceof Error ? e.message : String(e);
        set({ loading: false, playing: false, error: PLAY_UNSUPPORTED_MESSAGE });
        useToastStore.getState().show(`${PLAY_UNSUPPORTED_MESSAGE}（${msg}）`, 'warning');
        return;
      }
      if (!result.url) {
        // status=2 → 20028 需验证；status=0 → 35104 无权限
        const reason = result.errCode === 20028
          ? '需要登录验证'
          : result.errCode === 35104
            ? '无播放权限（VIP 或资源不存在）'
            : result.error || '未取到播放地址';
        set({ loading: false, playing: false, error: reason });
        useToastStore.getState().show(`${PLAY_UNSUPPORTED_MESSAGE}：${reason}`, 'warning');
        return;
      }

      // ③ 播放
      const el = ensureAudio();
      bindEvents(el);
      el.src = result.url;
      set({ url: result.url, loading: false, duration: result.timeLength || song.durationSec || 0 });
      try {
        await el.play();
        set({ playing: true });
      } catch {
        // 自动播放被拦 / 浏览器不支持该源 → 容错提示，不抛
        set({ playing: false, error: PLAY_UNSUPPORTED_MESSAGE });
        useToastStore.getState().show(PLAY_UNSUPPORTED_MESSAGE, 'warning');
      }
    },

    // 短别名：页面现有调用点统一走 playQueue。
    play: (songs, index) => get().playQueue(songs, index),

    toggle: () => {
      const { playing } = get();
      if (playing) get().pause();
      else get().resume();
    },

    pause: () => {
      audio?.pause();
      set({ playing: false });
    },

    resume: () => {
      const { currentSong } = get();
      if (!isPlayable(currentSong)) return;
      const el = ensureAudio();
      if (!el.src) {
        // 地址已失效 → 重新取
        void get().play(get().queue, get().index);
        return;
      }
      el.play()
        .then(() => set({ playing: true }))
        .catch(() => {
          set({ playing: false, error: PLAY_UNSUPPORTED_MESSAGE });
          useToastStore.getState().show(PLAY_UNSUPPORTED_MESSAGE, 'warning');
        });
    },

    next: () => {
      const { queue, index } = get();
      if (!queue.length) return;
      const nextIndex = index + 1;
      if (nextIndex >= queue.length) {
        get().stop();
        return;
      }
      void get().play(queue, nextIndex);
    },

    prev: () => {
      const { queue, index, position } = get();
      if (!queue.length) return;
      // 播放超过 3 秒 → 先回到开头（通用播放器惯例）
      if (position > 3) {
        get().seek(0);
        return;
      }
      const prevIndex = index - 1;
      if (prevIndex < 0) {
        get().seek(0);
        return;
      }
      void get().play(queue, prevIndex);
    },

    seek: (seconds) => {
      const el = ensureAudio();
      if (!el.src) return;
      const max = Number.isFinite(el.duration) ? el.duration : 0;
      const target = Math.max(0, Math.min(seconds, max > 0 ? max : seconds));
      el.currentTime = target;
      set({ position: target });
    },

    stop: () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      set({
        currentSong: null, playing: false, position: 0, duration: 0,
        queue: [], index: -1, url: '', error: null,
      });
    },
  };
});
