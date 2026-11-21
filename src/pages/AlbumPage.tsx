/**
 * 专辑详情页：/album/:id
 * 数据来源：
 * - 详情 POST /kmr/v2/albums（kg-tid 255，body data:[{album_id}]）—— §A4-3
 *   （⚠️ cover 键是裸文件名，只用 sizable_cover；⚠️ 无曲目数字段）
 * - 曲目 POST /v1/album_audio/lite（kg-tid 255）—— §A4-2
 *   （hash 在 audio_info.hash；名 base.audio_name；歌手 base.author_name / authors[]）
 */
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
import IconButton from '@mui/material/IconButton';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useParams } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Radius, Size, Space } from '../theme/layout';
import { useAlbumDetail, useAlbumSongs, type ArtistSong } from '../hooks/useArtist';
import { usePlayerStore } from '../player/PlayerStore';

export function AlbumPage() {
  const params = useParams();
  const id = params.id ?? '';
  const detail = useAlbumDetail(id);
  const songs = useAlbumSongs(id, 30);
  const playQueue = usePlayerStore((s) => s.playQueue);

  const name = detail.data?.name || '专辑';

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
              image={detail.data?.cover || undefined}
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
                {[
                  detail.data?.author,
                  songs.total > 0 ? `${songs.total} 首` : '',
                  detail.data?.publishDate,
                ].filter(Boolean).join(' · ') || '专辑'}
              </Typography>
              {detail.data?.intro && (
                <Typography variant="body2" color="text.secondary" sx={{ pt: Space.sm }}>
                  {detail.data.intro}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ pt: Space.xl }}>
            {songs.loading && <LinearProgress aria-label="加载中" />}
            {songs.error && !songs.loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center' }}>
                <Typography variant="body2" color="error">{songs.error}</Typography>
                <Button size="small" onClick={songs.reload}>重试</Button>
              </Box>
            )}
            {!songs.loading && !songs.error && songs.songs.length === 0 && (
              <Typography variant="body2" color="text.secondary">暂无曲目</Typography>
            )}
            <List>
              {songs.songs.map((song, index) => (
                <ListItem
                  key={song.hash}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label={`播放 ${song.name}`}
                      onClick={() => onPlay(song, songs.songs)}
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
                    primary={`${index + 1}. ${song.name || '未知歌曲'}`}
                    secondary={song.singer}
                    slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }}
                    onClick={() => onPlay(song, songs.songs)}
                    sx={{ cursor: 'pointer' }}
                  />
                </ListItem>
              ))}
            </List>
            {songs.loadingMore && <LinearProgress aria-label="加载更多" />}
            {!songs.loading && !songs.loadingMore && songs.songs.length > 0 && songs.hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: Space.lg }}>
                <Button size="small" variant="outlined" onClick={songs.loadMore}>加载更多</Button>
              </Box>
            )}
          </Box>
        </Box>
      }
    />
  );
}
