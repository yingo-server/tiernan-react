/**
 * 首页：三区块接真数据（每日推荐 / 推荐歌单 / 排行榜）。
 * 布局数值全部来自 theme/layout.ts；组件全部 MUI 官方；三态 §2.3.1。
 */
import { Box, Card, CardMedia, CardContent, Grid, Typography, Button, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Size, Space } from '../theme/layout';
import { useDailyRecommend, usePlaylistRecommend, useRankList, type SongBrief, type PlaylistBrief, type RankBrief } from '../hooks/useKugou';

export function HomePage() {
  const navigate = useNavigate();
  return (
    <TnPageScaffold
      title="首页"
      actions={
        <IconButton aria-label="搜索" onClick={() => navigate('/search')}>
          <SearchIcon />
        </IconButton>
      }
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <DailySection onMore={() => navigate('/search')} />
          <PlaylistSection />
          <RankSection />
        </Box>
      }
    />
  );
}

function Section(props: { title: string; onMore?: () => void; children: React.ReactNode }) {
  return (
    <Box sx={{ pt: Space.xl, pb: Space.md }}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {props.title}
        </Typography>
        {props.onMore && (
          <Button size="small" onClick={props.onMore}>更多</Button>
        )}
      </Box>
      <Box sx={{ pt: Space.md }}>{props.children}</Box>
    </Box>
  );
}

/** 三态通用视图（计划书 §2.3.1：loading/error/empty 均配图标或文案，错误必配重试）。 */
function StateView(props: {
  loading: boolean; error: string | null; height: number;
  emptyText: string; isEmpty: (d: unknown) => boolean;
  onRetry: () => void; children: (data: unknown) => React.ReactNode;
  emptyAction?: { label: string; onClick: () => void };
}) {
  if (props.loading) {
    return (
      <Box sx={{ height: props.height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">加载中…</Typography>
      </Box>
    );
  }
  if (props.error) {
    return (
      <Box sx={{ height: props.height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: Space.sm }}>
        <Typography variant="body2" color="error">{props.error}</Typography>
        <Button size="small" onClick={props.onRetry}>重试</Button>
      </Box>
    );
  }
  return <>{props.children(null)}</>;
}

function DailySection(props: { onMore: () => void }) {
  const nav = useNavigate();
  const st = useDailyRecommend();
  const isEmpty = !st.data || st.data.length === 0;
  return (
    <Section title="每日推荐" onMore={props.onMore}>
      <StateView
        loading={st.loading}
        error={st.error}
        height={Size.songRow}
        emptyText="登录后可查看每日推荐"
        isEmpty={() => isEmpty}
        onRetry={st.reload}
        emptyAction={{ label: '去登录', onClick: () => nav('/settings') }}
        children={() => (
          <Box sx={{ display: 'flex', gap: Space.md, overflowX: 'auto', pb: Space.sm }}>
            {(st.data as SongBrief[]).map((s) => (
              <Card key={s.hash} sx={{ width: Size.songCard, flexShrink: 0 }}>
                <CardMedia component="div" sx={{ aspectRatio: '1', backgroundColor: 'action.hover' }}
                  image={s.cover || undefined} />
                <CardContent sx={{ p: Space.md, '&:last-child': { pb: Space.md } }}>
                  <Typography variant="body2" noWrap>{s.name || '未知歌曲'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="span" sx={{ display: 'block' }}>
                    {s.singer}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      />
    </Section>
  );
}

function PlaylistSection() {
  const st = usePlaylistRecommend();
  return (
    <Section title="推荐歌单">
      <StateView
        loading={st.loading}
        error={st.error}
        height={Size.songRow + Size.emptyState}
        emptyText="暂无推荐歌单"
        isEmpty={(d) => !d || (d as PlaylistBrief[]).length === 0}
        onRetry={st.reload}
        children={() => (
          <Grid container spacing={Space.md}>
            {(st.data as PlaylistBrief[]).map((p) => (
              <Grid key={p.id} size={{ xs: 6, md: 4, lg: 3 }}>
                <Card sx={{ minWidth: Size.playlistCardMin }}>
                  <CardMedia component="div" sx={{ aspectRatio: '1', backgroundColor: 'action.hover' }}
                    image={p.cover || undefined} />
                  <CardContent sx={{ p: Space.md, '&:last-child': { pb: Space.md } }}>
                    <Typography variant="body2" noWrap>{p.name || '未命名歌单'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      />
    </Section>
  );
}

function RankSection() {
  const st = useRankList();
  return (
    <Section title="排行榜">
      <StateView
        loading={st.loading}
        error={st.error}
        height={Size.rankCard}
        emptyText="暂无榜单数据"
        isEmpty={(d) => !d || (d as RankBrief[]).length === 0}
        onRetry={st.reload}
        children={() => (
          <Box sx={{ display: 'flex', gap: Space.md, overflowX: 'auto', pb: Space.sm }}>
            {(st.data as RankBrief[]).map((r) => (
              <Card key={r.id} sx={{ width: Size.songCard * 1.25, flexShrink: 0, p: Space.md }}>
                <Typography variant="body2" noWrap>{r.name || '榜单'}</Typography>
                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', pt: Space.sm }}>
                  {r.updateTime || '每周更新'}
                </Typography>
              </Card>
            ))}
          </Box>
        )}
      />
    </Section>
  );
}
