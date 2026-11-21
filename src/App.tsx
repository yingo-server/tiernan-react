import { useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme } from './theme/theme';
import type { ThemeModeName } from './theme/tokens';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';

const THEME_KEY = 'ui.themeMode';

function initialMode(): ThemeModeName {
  try {
    return (localStorage.getItem(THEME_KEY) ?? 'dark') === 'light' ? 'light' : 'dark';
  } catch { return 'dark'; }
}

export default function App() {
  const [mode, setMode] = useState<ThemeModeName>(initialMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  // 设置页切主题：监听 localStorage（同页同步用 storage 事件 + 首次直读）
  useState(() => {
    try {
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY && e.newValue) setMode(e.newValue === 'light' ? 'light' : 'dark');
      });
    } catch { /* ignore */ }
    return null;
  });

  // 设置页切换的即时反馈：轮询检查（同 document 无法触发 storage 事件，用轻量同步）
  useState(() => {
    const t = window.setInterval(() => {
      try {
        const v = (localStorage.getItem(THEME_KEY) ?? 'dark') === 'light' ? 'light' : 'dark';
        setMode((cur) => (cur === v ? cur : v));
      } catch { /* ignore */ }
    }, 400);
    return () => window.clearInterval(t);
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
