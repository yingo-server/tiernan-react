/**
 * 歌手详情页：/artist/:id
 * 数据来源：
 * - 详情 POST /kmr/v3/author（kg-tid 36）—— §A4-1
 * - 歌曲 POST /kmr/v1/audio_group/author（kg-tid 220）—— §A4-2'
 * - 专辑：/v1/author/albums 实测 502 → 降级 /v1/search/album + audios 去重（§A4-3'）
 * 播放：曲目行点击 → PlayerStore.play（判权 + play_url v5 + Audio）
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate, useParams } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Radius, Size, Space } from '../theme/layout';
import {
  useArtistAlbums, useArtistAudios, useArtistDetail, type ArtistSong,
} from '../hooks/useArtist';
import { usePlayerStore } from '../player/PlayerStore';

export function ArtistPage() {
  const params = useParams();
  const nav = useNavigate();
  const id = params.id ?? '';
  const detail = useArtistDetail(id);
  const audios = useArtistAudios(id, 30);
  const albums = useArtistAlbums(id);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const name = detail.data?.name || '歌手';
  const avatar = detail.data?.avatar || '';

  const onPlay = (song: ArtistSong, list: ArtistSong[]) => {
    const idx = list.findIndex((x) => x.hash === song.hash);
    void playQueue(list.map((x) => ({
      hash: x.hash, name: x.name, singer: x.singer, cover: x.cover,
      albumId: x.albumId, albumName: x.albumName, durationSec: x.durationSec, isVip: x.isVip,
    })), idx < 0 ? 0 : idx);
  };

  return (
    <TnPageScaffold
      title={name}
      showBack
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <Box sx={{ display: 'flex', gap: Space.lg, pt: Space.lg, alignItems: 'center' }}>
            <CardMedia
              component="div"
              image={avatar || undefined}
              sx={{
                width: Size.artistAvatar,
                height: Size.artistAvatar,
                flexShrink: 0,
                borderRadius: Radius.full,
                backgroundColor: 'action.hover',
              }}
            />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap>{name}</Typography>
              <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                {[
                  detail.data?.songCount ? `歌曲 ${detail.data.songCount}` : '',
                  detail.data?.albumCount ? `专辑 ${detail.data.albumCount}` : '',
                  detail.data?.fans ? `粉丝 ${detail.data.fans}` : '',
                ].filter(Boolean).join(' · ') || '歌手信息'}
              </Typography>
              {detail.data?.intro && (
                <Typography variant="body2" color="text.secondary" sx={{ pt: Space.sm }}>
                  {detail.data.intro}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ pt: Space.xl }}>
            <Typography variant="h6" sx={{ pb: Space.md }}>热门歌曲</Typography>
            {audios.loading && <LinearProgress aria-label="加载中" />}
            {audios.error && !audios.loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center' }}>
                <Typography variant="body2" color="error">{audios.error}</Typography>
                <Button size="small" onClick={audios.reload}>重试</Button>
              </Box>
            )}
            {!audios.loading && !audios.error && audios.songs.length === 0 && (
              <Typography variant="body2" color="text.secondary">暂无歌曲</Typography>
            )}
            <List>
              {audios.songs.map((song) => (
                <ListItem
                  key={song.hash}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`播放 ${song.name}`}
                      onClick={() => onPlay(song, audios.songs)}
                    >
                      <PlayArrowIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar sx={{ minWidth: Size.avatarLg }}>
                    <Avatar variant="rounded" sx={{ width: Size.avatarSm, height: Size.avatarSm }} src={song.cover || undefined}>
                      <MusicNoteIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={song.name || '未知歌曲'}
                    secondary={song.singer}
                    slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                    onClick={() => onPlay(song, audios.songs)}
                    sx={{ cursor: 'pointer' }}
                  />
                </ListItem>
              ))}
            </List>
            {audios.loadingMore && <LinearProgress aria-label="加载更多" />}
            {!audios.loading && !audios.loadingMore && audios.songs.length > 0 && audios.hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: Space.lg }}>
                <Button size="small" variant="outlined" onClick={audios.loadMore}>加载更多</Button>
              </Box>
            )}
          </Box>

          <Box sx={{ pt: Space.xl }}>
            <Typography variant="h6" sx={{ pb: Space.md }}>专辑</Typography>
            {albums.loading && <LinearProgress aria-label="加载中" />}
            {albums.error && !albums.loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center' }}>
                <Typography variant="body2" color="error">{albums.error}</Typography>
                <Button size="small" onClick={albums.reload}>重试</Button>
              </Box>
            )}
            {!albums.loading && !albums.error && (albums.data ?? []).length === 0 && (
              <Typography variant="body2" color="text.secondary">暂无专辑</Typography>
            )}
            <Grid container spacing={Space.md}>
              {(albums.data ?? []).map((a) => (
                <Grid key={a.id} size={{ xs: 6, md: 4, lg: 3 }}>
                  <Card
                    sx={{ minWidth: Size.playlistCardMin, cursor: 'pointer', borderRadius: Radius.md }}
                    onClick={() => nav(`/album/${a.id}`)}
                  >
                    <CardMedia
                      component="div"
                      image={a.cover || undefined}
                      sx={{ aspectRatio: '1', backgroundColor: 'action.hover' }}
                    />
                    <CardContent sx={{ p: Space.md, '&:last-child': { pb: Space.md } }}>
                      <Typography variant="body2" noWrap>{a.name || '未命名专辑'}</Typography>
                      {a.publishDate && (
                        <Typography variant="caption" color="text.secondary" noWrap component="span" sx={{ display: 'block' }}>
                          {a.publishDate}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      }
    />
  );
}
