/**
 * 歌手列表页：/artists
 * 数据来源：GET /ocean/v6/singer/list（Flutter 仓 artist_endpoints.dart getArtistList）。
 * 响应键: author_id / author_name / sizable_avatar / fansnums（§A4-1 键族）。
 */
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import { useNavigate } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Radius, Size, Space } from '../theme/layout';
import { useArtistList } from '../hooks/useArtist';

export function ArtistsPage() {
  const nav = useNavigate();
  const st = useArtistList();
  const list = st.data ?? [];

  return (
    <TnPageScaffold
      title="歌手"
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          {st.loading && <LinearProgress aria-label="加载中" />}
          {st.error && !st.loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center', pt: Space.xl }}>
              <Typography variant="body2" color="error">{st.error}</Typography>
              <Button size="small" onClick={st.reload}>重试</Button>
            </Box>
          )}
          {!st.loading && !st.error && list.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ pt: Space.xl, textAlign: 'center' }}>
              暂无歌手数据
            </Typography>
          )}

          <Box sx={{ pt: Space.lg }}>
            <Grid container spacing={Space.md}>
              {list.map((a) => (
                <Grid key={a.id} size={{ xs: 6, md: 4, lg: 3 }}>
                  <Card
                    sx={{ minWidth: Size.playlistCardMin, cursor: 'pointer', borderRadius: Radius.md }}
                    onClick={() => nav(`/artist/${a.id}`)}
                  >
                    <CardMedia
                      component="div"
                      image={a.avatar || undefined}
                      sx={{ aspectRatio: '1', backgroundColor: 'action.hover' }}
                    />
                    <CardContent sx={{ p: Space.md, '&:last-child': { pb: Space.md } }}>
                      <Typography variant="body2" noWrap>{a.name || '未知歌手'}</Typography>
                      {a.fans > 0 && (
                        <Typography variant="caption" color="text.secondary" noWrap component="span" sx={{ display: 'block' }}>
                          粉丝 {a.fans}
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
