/**
 * 歌单详情页：/playlist/:id
 * 头部：歌单封面 + 名称（playlistDetail /v6/special/detail，失败则降级用 tracks 数据）。
 * 主体：曲目分页（playlistTracks /v6/special/tracks，page/pagesize=30），
 *       滚动到底自动加载下一页（IntersectionObserver，附「加载更多」兜底按钮）。
 * 布局数值全部来自 theme/layout.ts；组件全部 MUI 官方。
 */
import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useParams } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Radius, Size, Space } from '../theme/layout';
import {
  usePlaylistDetail,
  usePagedSongs,
  fetchPlaylistTracks,
  type SongBrief,
} from '../hooks/useKugou';
import { usePlayerStore } from '../player/PlayerStore';

export function PlaylistDetailPage() {
  const params = useParams();
  const id = params.id ?? '';
  const detail = usePlaylistDetail(id);
  const playQueue = usePlayerStore((s) => s.playQueue);
  // 取曲目优先用详情返回的数值 specialid（global_collection_id 会被上游拒）
  const tracksId = detail.data?.specialId || id;
  const paged = usePagedSongs(
    (page, pageSize) => fetchPlaylistTracks(tracksId, page, pageSize),
    tracksId,
    30,
  );

  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) paged.loadMore();
      },
      { rootMargin: '200px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [paged.loadMore]);

  // 详情失败 → 用曲目数据兜底（取第一首歌名/封面）
  const fallbackName = paged.songs[0]?.name ?? '';
  const name = detail.data?.name || fallbackName || '歌单';
  const cover = detail.data?.cover || paged.songs[0]?.cover || '';
  const count = detail.data?.count || paged.total;

  return (
    <TnPageScaffold
      title={name}
      showBack
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <Box sx={{ display: 'flex', gap: Space.lg, pt: Space.lg, alignItems: 'center' }}>
            <CardMedia
              component="div"
              image={cover || undefined}
              sx={{
                width: Size.rankCard,
                height: Size.rankCard,
                flexShrink: 0,
                borderRadius: Radius.md,
                backgroundColor: 'action.hover',
              }}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>{name}</Typography>
              {detail.data?.creator && (
                <Typography variant="body2" color="text.secondary" noWrap component="span" sx={{ display: 'block' }}>
                  {detail.data.creator}
                </Typography>
              )}
              {count > 0 && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                  共 {count} 首
                </Typography>
              )}
              {detail.error && !detail.data && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                  详情加载失败（已用曲目数据兜底）
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ pt: Space.lg }}>
            {paged.loading && <LinearProgress aria-label="加载中" />}
            {paged.error && !paged.loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center', pt: Space.xl }}>
                <Typography variant="body2" color="error">{paged.error}</Typography>
                <Button size="small" onClick={paged.reload}>重试</Button>
              </Box>
            )}
            {!paged.loading && !paged.error && paged.songs.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ pt: Space.xl, textAlign: 'center' }}>
                暂无曲目
              </Typography>
            )}
            <List>
              {paged.songs.map((song: SongBrief, index: number) => (
                <ListItem key={`${song.hash}-${index}`} disablePadding>
                  <ListItemButton onClick={() => playQueue(paged.songs, index)}>
                  <ListItemAvatar sx={{ minWidth: Size.avatarLg }}>
                    <Avatar variant="rounded" sx={{ width: Size.avatarSm, height: Size.avatarSm }} src={song.cover || undefined}>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={song.name || '未知歌曲'}
                    secondary={song.singer}
                    slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                  />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            {paged.loadingMore && <LinearProgress aria-label="加载更多" />}
            {!paged.loading && !paged.loadingMore && paged.songs.length > 0 && paged.hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: Space.lg }}>
                <Button size="small" variant="outlined" onClick={paged.loadMore}>加载更多</Button>
              </Box>
            )}
            <Box ref={sentinel} sx={{ height: Size.emptyState }} />
          </Box>
        </Box>
      }
    />
  );
}
