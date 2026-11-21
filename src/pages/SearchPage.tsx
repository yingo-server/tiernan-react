/**
 * 搜索页：MUI SearchBar（官方）+ 三态结果列表。
 * 数据：直连酷狗 search_song（v3/search/song，complexsearch router）。
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Space } from '../theme/layout';
import { request } from '../kugou/client';
import { EP } from '../kugou/endpoints';

interface Hit {
  hash: string;
  name: string;
  singer: string;
  album: string;
}

export function SearchPage() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<{ loading: boolean; error: string | null; hits: Hit[]; done: string }>({
    loading: false, error: null, hits: [], done: '',
  });

  const search = async (query: string) => {
    const kw = query.trim();
    if (!kw) return;
    setState((s) => ({ ...s, loading: true, error: null, done: kw }));
    try {
      const res = await request(EP.searchSong, {
        params: { keyword: kw, page: 1, pagesize: 30 },
      });
      const data = (res.data ?? {}) as Record<string, unknown>;
      const lists = (data.lists ?? []) as Record<string, unknown>[];
      const hits: Hit[] = lists.map((s) => ({
        hash: String(s.hash ?? s.FileHash ?? ''),
        name: String(s.songname ?? s.SongName ?? '').replace(/<em>|<\/em>/g, ''),
        singer: String(s.singername ?? s.SingerName ?? '').replace(/<em>|<\/em>/g, ''),
        album: String(s.album_name ?? s.AlbumName ?? ''),
      }));
      setState({ loading: false, error: null, hits, done: kw });
    } catch (e) {
      setState({ loading: false, error: String(e), hits: [], done: kw });
    }
  };

  return (
    <TnPageScaffold
      title="搜索"
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <Box sx={{ display: 'flex', gap: Space.sm, pt: Space.md, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="搜索歌曲、歌手"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search(q); }}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon fontSize="small" sx={{ mr: Space.sm, color: 'text.secondary' }} />,
                  endAdornment: q ? (
                    <IconButton size="small" onClick={() => setQ('')} aria-label="清空">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : undefined,
                },
              }}
            />
            <Button variant="contained" onClick={() => search(q)} disabled={!q.trim() || state.loading}>
              搜索
            </Button>
          </Box>

          <Box sx={{ pt: Space.xl }}>
            {state.loading && (
              <Typography variant="body2" color="text.secondary">
                搜索「{state.done}」中…
              </Typography>
            )}
            {state.error && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: Space.sm, alignItems: 'center', pt: Space.xl }}>
                <Typography variant="body2" color="error">{state.error}</Typography>
                <Button size="small" onClick={() => search(state.done)}>重试</Button>
              </Box>
            )}
            {!state.loading && !state.error && state.hits.length > 0 && (
              <List>
                {state.hits.map((h) => (
                  <ListItem key={h.hash} disablePadding>
                    <ListItemText
                      primary={h.name || '未知歌曲'}
                      secondary={`${h.singer}${h.album ? ` · ${h.album}` : ''}`}
                      slotProps={{
                        primary: { noWrap: true },
                        secondary: { noWrap: true },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {!state.loading && !state.error && state.done && state.hits.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ pt: Space.xl, textAlign: 'center' }}>
                「{state.done}」无结果
              </Typography>
            )}
            {!state.done && !state.loading && (
              <Typography variant="body2" color="text.secondary" sx={{ pt: Space.xl, textAlign: 'center' }}>
                输入关键词开始搜索
              </Typography>
            )}
          </Box>
        </Box>
      }
    />
  );
}
