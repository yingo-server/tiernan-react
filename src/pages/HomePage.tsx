/**
 * 首页：三区块（每日推荐横滑 / 推荐歌单网格 / 排行榜横滑）。
 * 布局数值全部来自 theme/layout.ts；组件全部 MUI 官方。
 * 数据接 kugou client（后续接直连），先渲染结构 + 空态。
 */
import { Typography, Box, Grid, Card, CardMedia, CardContent, Button } from '@mui/material';
import { Size, Space } from '../theme/layout';

export function HomePage() {
  return (
    <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
      <Section title="每日推荐" onMore={() => undefined}>
        <Box
          sx={{
            height: Size.emptyState,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Space.md,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            登录后可查看每日推荐
          </Typography>
          <Button size="small">去登录</Button>
        </Box>
      </Section>

      <Section title="推荐歌单">
        <Grid container spacing={Space.md}>
          {Array.from({ length: 4 }, (_, i) => (
            <Grid key={i} size={{ xs: 6, md: 4, lg: 3 }}>
              <Card sx={{ minWidth: Size.playlistCardMin }}>
                <CardMedia component="div" sx={{ aspectRatio: '1', backgroundColor: 'action.hover' }} />
                <CardContent>
                  <Typography variant="body2" noWrap>
                    暂无推荐歌单
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Section>
    </Box>
  );
}

function Section(props: { title: string; onMore?: () => void; children: React.ReactNode }) {
  return (
    <Box sx={{ pt: Space.xl, pb: Space.md }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {props.title}
        </Typography>
        {props.onMore && (
          <Button size="small" onClick={props.onMore}>
            更多
          </Button>
        )}
      </Box>
      <Box sx={{ pt: Space.md }}>{props.children}</Box>
    </Box>
  );
}
