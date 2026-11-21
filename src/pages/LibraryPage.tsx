/**
 * 曲库页：排行榜列表 + 歌单网格（真数据，复用 hooks）。
 */
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Size, Space } from '../theme/layout';
import { useRankList, usePlaylistRecommend, type RankBrief, type PlaylistBrief } from '../hooks/useKugou';
import { useNavigate } from 'react-router-dom';

export function LibraryPage() {
  const nav = useNavigate();
  const ranks = useRankList();
  const playlists = usePlaylistRecommend();

  return (
    <TnPageScaffold
      title="曲库"
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <Box sx={{ pt: Space.xl }}>
            <Typography variant="h6" sx={{ pb: Space.md }}>排行榜</Typography>
            {ranks.loading && (
              <Typography variant="body2" color="text.secondary">加载中…</Typography>
            )}
            {ranks.error && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm }}>
                <Typography variant="body2" color="error">{ranks.error}</Typography>
                <Button size="small" onClick={ranks.reload}>重试</Button>
              </Box>
            )}
            {!ranks.loading && !ranks.error && (ranks.data as RankBrief[])?.length > 0 && (
              <List>
                {(ranks.data as RankBrief[]).map((r) => (
                  <ListItem
                    key={r.id}
                    onClick={() => nav(`/rank/${r.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.updateTime}</Typography>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box sx={{ pt: Space.xl }}>
            <Typography variant="h6" sx={{ pb: Space.md }}>歌单</Typography>
            {playlists.loading && (
              <Typography variant="body2" color="text.secondary">加载中…</Typography>
            )}
            {playlists.error && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm }}>
                <Typography variant="body2" color="error">{playlists.error}</Typography>
                <Button size="small" onClick={playlists.reload}>重试</Button>
              </Box>
            )}
            {!playlists.loading && !playlists.error && (playlists.data as PlaylistBrief[])?.length > 0 && (
              <Grid container spacing={Space.md}>
                {(playlists.data as PlaylistBrief[]).map((p) => (
                  <Grid key={p.id} size={{ xs: 6, md: 4, lg: 3 }}>
                    <Card
                      sx={{ minWidth: Size.playlistCardMin, cursor: 'pointer' }}
                      onClick={() => nav(`/playlist/${p.id}`)}
                    >
                      <CardMedia component="div" sx={{ aspectRatio: '1', backgroundColor: 'action.hover' }} image={p.cover || undefined} />
                      <CardContent sx={{ p: Space.md, '&:last-child': { pb: Space.md } }}>
                        <Typography variant="body2" noWrap>{p.name}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Box>
      }
    />
  );
}

