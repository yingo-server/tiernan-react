/**
 * 应用外壳：桌面（expanded≥1200）用 Drawer 侧栏 + 移动用 BottomNavigation。
 * 断点分流集中在此一处（用户指令：布局不由页面决定）。
 * 迷你播放条放 BottomNavigation 上方（MUI 官方槽位组合，全平台一致）。
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import SettingsIcon from '@mui/icons-material/Settings';
import { Breakpoint, Size } from '../theme/layout';
import { MiniPlayerBar } from './MiniPlayerBar';

const TABS = [
  { path: '/', label: '首页', icon: <HomeIcon /> },
  { path: '/search', label: '搜索', icon: <SearchIcon /> },
  { path: '/library', label: '曲库', icon: <LibraryMusicIcon /> },
  { path: '/settings', label: '设置', icon: <SettingsIcon /> },
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen] = useState(false);
  // 宽度判定：window.innerWidth + resize 监听（MUI useMediaQuery 亦可，先用最简）
  const isExpanded =
    typeof window !== 'undefined' &&
    window.innerWidth >= Breakpoint.expanded;
  const currentIdx = TABS.findIndex((t) => t.path === location.pathname);

  const navList = (
    <List>
      {TABS.map((t) => (
        <ListItemButton
          key={t.path}
          selected={location.pathname === t.path}
          onClick={() => navigate(t.path)}
        >
          <ListItemIcon>{t.icon}</ListItemIcon>
          <ListItemText primary={t.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {/* 桌面侧栏 */}
      {isExpanded && (
        <Drawer
          variant="permanent"
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: 240, boxSizing: 'border-box' },
          }}
        >
          {navList}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <Outlet />
        </Box>
        <MiniPlayerBar />
        {!isExpanded && (
          <BottomNavigation
            showLabels
            value={currentIdx}
            onChange={(_, v: number) => navigate(TABS[v].path)}
            sx={{ height: Size.navBar }}
          >
            {TABS.map((t) => (
              <BottomNavigationAction key={t.path} label={t.label} icon={t.icon} />
            ))}
          </BottomNavigation>
        )}
      </Box>
      {/* 移动临时抽屉（预留） */}
      <Drawer open={mobileOpen} onClose={() => undefined} />
    </Box>
  );
}
