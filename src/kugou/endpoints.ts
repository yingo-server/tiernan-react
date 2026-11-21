/**
 * 酷狗端点注册表（TS 移植自 Flutter 仓 lib/core/net/endpoint_registry.dart）。
 * 声明式配置：path / base / x-router / 签名类型 / 缓存开关。
 */
export type SignType = 'android' | 'web' | 'register' | 'none';

export interface Endpoint {
  id: string;
  path: string;
  method?: 'GET' | 'POST';
  signType?: SignType;
  router?: string;
  base?: string;
  clearDefaultParams?: boolean;
  encryptKey?: boolean;
  cacheable?: boolean;
  tid?: string;
  includeSrcappid?: boolean;
}

export const BASE = 'https://gateway.kugou.com';

export const EP = {
  // ── 搜索 ──
  searchSong: {
    id: 'search_song', path: '/v3/search/song', router: 'complexsearch.kugou.com',
  } as Endpoint,
  searchComplex: {
    id: 'search_complex', base: 'https://complexsearch.kugou.com', path: '/v6/search/complex',
  } as Endpoint,
  searchSuggest: {
    id: 'search_suggest', path: '/v2/getSearchTip', router: 'searchtip.kugou.com',
  } as Endpoint,
  searchHot: {
    id: 'search_hot', path: '/api/v3/search/hot_tab', router: 'msearch.kugou.com',
  } as Endpoint,

  // ── 播放/下载 ──
  playUrlV5: {
    id: 'play_url_v5', path: '/v5/url', router: 'trackercdn.kugou.com',
    encryptKey: true, cacheable: false,
  } as Endpoint,
  privilegeLite: {
    id: 'privilege_lite', path: '/v2/get_res_privilege/lite', method: 'POST',
    router: 'media.store.kugou.com',
  } as Endpoint,

  // ── 歌单 ──
  playlistRecommend: {
    id: 'playlist_recommend', path: '/v2/special_recommend',
  } as Endpoint,
  playlistDetail: {
    id: 'playlist_detail', path: '/v6/special/detail',
  } as Endpoint,
  playlistTracks: {
    id: 'playlist_tracks', path: '/v6/special/tracks',
  } as Endpoint,
  // 兜底端点（Flutter 仓 EndpointRegistry.playlistDetail / playlistTracks，三态实测）：
  // 详情 POST /v3/get_list_info（x-router: pubsongs.kugou.com），body data:[{global_collection_id}]
  //   → 响应 data 为数组，首项含 name/pic/count/list_create_username/specialid。
  // 曲目 GET /pubsongs/v2/get_other_list_file_nofilt，参数键必须 specialid（传
  //   global_collection_id 一律 20010），begin_idx=(page-1)*pagesize →
  //   响应 data.songs[]，总数 data.count。
  playlistDetailV3: {
    id: 'playlist_detail_v3', path: '/v3/get_list_info', method: 'POST',
    router: 'pubsongs.kugou.com',
  } as Endpoint,
  playlistTracksNofilt: {
    id: 'playlist_tracks_nofilt', path: '/pubsongs/v2/get_other_list_file_nofilt',
  } as Endpoint,

  // ── 每日推荐/排行榜 ──
  dailyRecommend: {
    id: 'daily_recommend', path: '/v1/getdailyrecommend', router: 'gateway.kugou.com',
  } as Endpoint,
  topList: {
    id: 'toplist', path: '/v2/toplist', router: 'toplist.kugou.com',
  } as Endpoint,
  rankList: {
    id: 'rank_list', path: '/v1/rank_list', router: 'gateway.kugou.com',
  } as Endpoint,
  // 榜单曲目（Flutter 仓 EndpointRegistry.rankAudio）：
  // POST /openapi/kmr/v2/rank/audio，kg-tid: 369，无 x-router。
  // 缺 kg-tid → error_code 20006 "err KG-TID"。
  rankAudio: {
    id: 'rank_audio', path: '/openapi/kmr/v2/rank/audio',
    method: 'POST', tid: '369',
  } as Endpoint,
  // 榜单元信息（Flutter 仓 EndpointRegistry.rankInfo）：
  // GET /ocean/v6/rank/info —— 只回榜单元信息 + 3 首 songinfo 预览，
  // 完整曲目必须走 rankAudio（见上）。
  rankInfo: {
    id: 'rank_info', path: '/ocean/v6/rank/info',
  } as Endpoint,
} as const;
