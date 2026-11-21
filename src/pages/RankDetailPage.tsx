/**
 * 排行榜详情页：/rank/:id
 * 曲目来源：POST /openapi/kmr/v2/rank/audio（kg-tid: 369）——榜单曲目必须走该端点，
 * /ocean/v6/rank/info 只回 3 首预览（Flutter 仓 endpoint_registry.dart 批 N1-B 注释）。
 * 结构与歌单详情一致：头部封面/名称 + 分页曲目列表（滚动到底自动加载）。
 */
import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useParams } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Radius, Size, Space } from '../theme/layout';
import { usePagedSongs, useRankBrief, fetchRankTracks, type SongBrief } from '../hooks/useKugou';

export function RankDetailPage() {
  const params = useParams();
  const id = params.id ?? '';
  const brief = useRankBrief(id);
  const paged = usePagedSongs((page, pageSize) => fetchRankTracks(id, page, pageSize), id, 30);

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

  const name = brief.data?.name || '榜单';
  const cover = brief.data?.cover || paged.songs[0]?.cover || '';

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
              <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                {paged.total > 0 ? `共 ${paged.total} 首` : '榜单曲目'}
              </Typography>
              {brief.data?.updateTime && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                  {brief.data.updateTime}
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
                暂无榜单曲目
              </Typography>
            )}
            <List>
              {paged.songs.map((song: SongBrief, index: number) => (
                <ListItem key={`${song.hash}-${index}`} disablePadding>
                  <ListItemAvatar sx={{ minWidth: Size.avatarLg }}>
                    <Avatar variant="rounded" sx={{ width: Size.avatarSm, height: Size.avatarSm }} src={song.cover || undefined}>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${index + 1}. ${song.name || '未知歌曲'}`}
                    secondary={song.singer}
                    slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                  />
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
