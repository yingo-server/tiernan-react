/**
 * 迷你播放条：接真状态（src/player/PlayerStore.ts）。
 * - 当前歌名/歌手：来自 PlayerStore.currentSong
 * - 播放/暂停：PlayerStore.toggle（真功能，走 play_url v5 取地址）
 * - 上一首/下一首：PlayerStore.prev / next
 * - 点歌名 → 歌词页 /lyrics/:hash
 * 布局数值全部来自 theme/layout.ts；组件全 MUI 官方。
 */
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import LyricsIcon from '@mui/icons-material/Lyrics';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { usePlayerStore } from '../player/PlayerStore';
import { Size, Space } from '../theme/layout';

export function MiniPlayerBar() {
  const nav = useNavigate();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playing = usePlayerStore((s) => s.playing);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const loading = usePlayerStore((s) => s.loading);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const error = usePlayerStore((s) => s.error);

  const hasSong = !!currentSong;

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
      <Avatar
        variant="rounded"
        sx={{ width: Size.avatarSm, height: Size.avatarSm }}
        src={currentSong?.cover || undefined}
      >
        <MusicNoteIcon />
      </Avatar>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          noWrap
          onClick={() => {
            if (currentSong?.hash) nav(`/lyrics/${currentSong.hash}`);
          }}
          sx={{ cursor: hasSong ? 'pointer' : 'default' }}
        >
          {currentSong?.name || 'Not playing'}
        </Typography>
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} noWrap component="span" sx={{ display: 'block' }}>
          {error || currentSong?.singer || 'Idle'}
        </Typography>
      </Box>
      {hasSong && duration > 0 && (
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', width: Size.rankCard }}>
          <Slider
            size="small"
            min={0}
            max={duration}
            value={Math.min(position, duration)}
            aria-label="播放进度"
            onChange={(_, v) => seek(Array.isArray(v) ? v[0] : v)}
          />
        </Box>
      )}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: Space.sm }}>
        <VolumeUpIcon fontSize="small" color="disabled" />
        <Slider
          size="small"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-label="音量"
          sx={{ width: Size.volumeSlider }}
          onChange={(_, v) => setVolume(Array.isArray(v) ? v[0] : v)}
        />
      </Box>
      <IconButton
        aria-label="上一首"
        disabled={!hasSong}
        onClick={() => prev()}
      >
        <SkipPreviousIcon />
      </IconButton>
      <IconButton aria-label={playing ? '暂停' : '播放'} disabled={!hasSong || loading} onClick={() => toggle()}>
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton aria-label="下一首" disabled={!hasSong} onClick={() => next()}>
        <SkipNextIcon />
      </IconButton>
      <IconButton
        aria-label="歌词"
        disabled={!hasSong}
        onClick={() => {
          if (currentSong?.hash) nav(`/lyrics/${currentSong.hash}`);
        }}
      >
        <LyricsIcon />
      </IconButton>
    </Box>
  );
}
