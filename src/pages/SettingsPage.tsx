/**
 * 设置页：主题切换（明/暗，持久化 localStorage）+ 应用信息。
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { TnPageScaffold } from '../theme/PageScaffold';
import { Space } from '../theme/layout';

const THEME_KEY = 'ui.themeMode';

export function SettingsPage() {
  const [dark, setDark] = useState(() => {
    try {
      return (localStorage.getItem(THEME_KEY) ?? 'dark') === 'dark';
    } catch { return true; }
  });
  const [cleared, setCleared] = useState(false);

  const toggleTheme = (v: boolean) => {
    setDark(v);
    try { localStorage.setItem(THEME_KEY, v ? 'dark' : 'light'); } catch { /* ignore */ }
  };

  const clearCache = () => {
    try {
      if (typeof caches !== 'undefined') { caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))); }
      setCleared(true);
    } catch { setCleared(false); }
  };

  return (
    <TnPageScaffold
      title="设置"
      children={
        <Box sx={{ px: Space.lg, pb: Space.xxxl }}>
          <List>
            <ListItem>
              <ListItemText primary="深色主题" secondary="切换明暗两套森林翡翠色板" />
              <Switch edge="end" checked={dark} onChange={(e) => toggleTheme(e.target.checked)} />
            </ListItem>
            <ListItem>
              <ListItemText primary="清除缓存" secondary="清理封面/资源缓存（不影响登录态）" />
              <Button size="small" variant="outlined" onClick={clearCache}>清除</Button>
            </ListItem>
          </List>
          {cleared && (
            <Typography variant="body2" color="text.secondary" sx={{ px: Space.lg }}>
              缓存已清除
            </Typography>
          )}
          <Box sx={{ px: Space.lg, pt: Space.xl }}>
            <Typography variant="caption" color="text.secondary">
              TiernanMusicNext · React 版 0.1.0
            </Typography>
          </Box>
        </Box>
      }
    />
  );
}
