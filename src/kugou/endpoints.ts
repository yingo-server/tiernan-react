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
  /**
   * 忽略响应顶层 status 的成功/失败归一（client.ts 默认把 status≠0/1 当错误）。
   * 用于 status 语义非「1=成功」的端点：
   * - play_url v5：status 1=出URL / 0=无权限 / 2=需验证（Flutter 仓 play_endpoints.dart 自行判定）
   * - 歌词 search/download：status=200 表示 OK（API_FIELDS_TRUTH.md §A3-2/§A3-4）
   */
  ignoreStatus?: boolean;
  /** 允许的成功 status 码集合（未设置时默认 [0,1]）。 */
  successCodes?: number[];
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
  // 出处：Flutter 仓 lib/core/net/endpoint_registry.dart · EndpointRegistry.playUrlV5
  //   + docs/API_FIELDS_TRUTH.md §A3-1（key 盐 57ae12eb…，响应顶层即数据）
  playUrlV5: {
    id: 'play_url_v5', path: '/v5/url', router: 'trackercdn.kugou.com',
    encryptKey: true, cacheable: false,
    // status 语义：1=出URL / 0=无权限(error_code 35104) / 2=需验证(errcode 20028)
    ignoreStatus: true,
  } as Endpoint,
  privilegeLite: {
    id: 'privilege_lite', path: '/v2/get_res_privilege/lite', method: 'POST',
    router: 'media.store.kugou.com',
  } as Endpoint,
  // 匿名试听（Flutter 仓 EndpointRegistry.anonymousSongUrl，⚠️ 待实测）：
  //   signType=none（上游 song_url.js L51 notSign）、encryptKey=true、
  //   clearDefaultParams（不注默认参）、cookie 带随机 24 位 dfid。
  //   参数集见 lib/core/net/endpoints/mv_anonymous.dart · anonymousPlayUrl。
  anonymousSongUrl: {
    id: 'anonymous_song_url', path: '/v5/url', router: 'trackercdn.kugou.com',
    encryptKey: true, signType: 'none', clearDefaultParams: true, cacheable: false,
    ignoreStatus: true,
  } as Endpoint,

  // ── 歌词 ──
  // Flutter 仓 EndpointRegistry.lyricSearch / lyricDownload：
  //   必须走 gateway + x-router: lyrics.kugou.com（直连该域恒返回 HTTP 200 空体，
  //   见 docs/API_FIELDS_TRUTH.md §A3-2）；android 签名 + 默认参在场。
  lyricSearch: {
    id: 'lyric_search', path: '/v1/search', router: 'lyrics.kugou.com',
    // 成功语义 status=200（不是 1），见 §A3-3
    ignoreStatus: true,
  } as Endpoint,
  lyricDownload: {
    id: 'lyric_download', path: '/download', router: 'lyrics.kugou.com',
    // 成功语义 status=200，见 §A3-4
    ignoreStatus: true,
  } as Endpoint,

  // ── 歌手/专辑 ──
  // 歌手列表：Flutter 仓 EndpointRegistry.artistList（/ocean/v6/singer/list）
  //   参数五参见 lib/core/net/endpoints/artist_endpoints.dart · getArtistList
  //   （hotsize=200, musician=0, sextype=0, showtype=2, type=0）
  artistList: {
    id: 'artist_list', path: '/ocean/v6/singer/list',
  } as Endpoint,
  // 歌手详情：POST /kmr/v3/author，x-router openapi.kugou.com，kg-tid 36，
  //   body {author_id}（docs/API_FIELDS_TRUTH.md §A4-1）
  artistDetail: {
    id: 'artist_detail', path: '/kmr/v3/author', method: 'POST',
    router: 'openapi.kugou.com', tid: '36',
  } as Endpoint,
  // 歌手歌曲：POST /kmr/v1/audio_group/author，kg-tid 220，
  //   body {author_id,page,pagesize}（§A4-2'；旧口径 /kmr/v1/author/audios 实测 502）
  artistAudios: {
    id: 'artist_audios', path: '/kmr/v1/audio_group/author', method: 'POST',
    router: 'openapi.kugou.com', tid: '220',
  } as Endpoint,
  // 歌手专辑：/v1/author/albums 实测恒 502（§A4-3'），声明保留；
  //   数据源降级走 searchAlbum（见 hooks/useArtist.ts 降级链）
  artistAlbums: {
    id: 'artist_albums', path: '/v1/author/albums', router: 'openapi.kugou.com',
  } as Endpoint,
  // 专辑搜索（歌手专辑降级数据源）：GET /v1/search/album
  //   键集 albumid/albumname/singer/songcount/publish_time/img（§A1-3）
  searchAlbum: {
    id: 'search_album', path: '/v1/search/album', router: 'complexsearch.kugou.com',
  } as Endpoint,
  // 专辑详情：POST /kmr/v2/albums，kg-tid 255，body data:[{album_id}]（§A4-3）
  albumDetail: {
    id: 'album_detail', path: '/kmr/v2/albums', method: 'POST',
    router: 'openapi.kugou.com', tid: '255',
  } as Endpoint,
  // 专辑曲目：POST /v1/album_audio/lite，kg-tid 255，
  //   body {album_id,page,pagesize,is_buy}（§A4-2）
  albumSongs: {
    id: 'album_songs', path: '/v1/album_audio/lite', method: 'POST',
    router: 'openapi.kugou.com', tid: '255',
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
