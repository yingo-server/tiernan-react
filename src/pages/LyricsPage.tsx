/**
 * 歌词页：/lyrics/:hash
 * 数据来源：GET /v1/search（候选）+ GET /download（正文），经 gateway +
 *   x-router: lyrics.kugou.com（直连该域恒空体，见 API_FIELDS_TRUTH.md §A3-2）。
 *   krc 正文需 base64 → 去 4 字节魔数 → XOR 16 字节 → zlib inflate（§A3-5）。
 * 展示：逐行 LRC（无时间轴同步亦可）。
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import { useParams } from 'react-router-dom';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Size, Space } from '../theme/layout';
import { useLyric } from '../hooks/useLyric';

function formatTime(sec: number): string {
  if (sec < 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LyricsPage() {
  const params = useParams();
  const hash = params.hash ?? '';
  const lyric = useLyric(hash);

  return (
    <TnPageScaffold
      title="歌词"
      showBack
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <Typography variant="body2" color="text.secondary" sx={{ pt: Space.lg, pb: Space.sm }}>
            {hash ? `hash ${hash}` : '未指定歌曲'}
          </Typography>

          {lyric.loading && <LinearProgress aria-label="加载歌词" />}

          {lyric.error && !lyric.loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center', pt: Space.xl }}>
              <Typography variant="body2" color="error">{lyric.error}</Typography>
              <Button size="small" onClick={lyric.reload}>重试</Button>
            </Box>
          )}

          {!lyric.loading && !lyric.error && lyric.lines.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ pt: Space.xl, textAlign: 'center' }}>
              暂无歌词
            </Typography>
          )}

          <Box sx={{ pt: Space.md, minHeight: Size.emptyState }}>
            {lyric.lines.map((line, i) => (
              <Box
                key={`${line.time}-${i}`}
                sx={{ display: 'flex', gap: Space.md, py: Space.xs, alignItems: 'baseline' }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: Size.timeLabel, fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatTime(line.time)}
                </Typography>
                <Typography variant="body1" sx={{ flexGrow: 1 }}>
                  {line.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      }
    />
  );
}
