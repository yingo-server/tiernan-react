/**
 * 迷你播放条：MUI 官方 Box+Avatar+IconButton 组合（零自绘）。
 * 高度 = Size.miniBar（与 AppBar 对等）。
 */
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { Size, Space } from '../theme/layout';

export function MiniPlayerBar() {
  return (
    <Box
      sx={(theme) => ({
        height: Size.miniBar,
        display: 'flex',
        alignItems: 'center',
        px: Space.lg,
        gap: Space.md,
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
      })}
    >
      <Avatar variant="rounded" sx={{ width: Size.avatarSm, height: Size.avatarSm }} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>
          Not playing
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          Idle
        </Typography>
      </Box>
      <IconButton aria-label="播放">
        <PlayArrowIcon />
      </IconButton>
      <IconButton aria-label="下一首">
        <SkipNextIcon />
      </IconButton>
    </Box>
  );
}
