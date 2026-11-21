/**
 * 页面骨架（布局唯一事实源的一部分）：官方 AppBar + 统一结构。
 * 页面不得自带 Scaffold/AppBar 主题配置——全站一致从这里出。
 */
import { AppBar, Box, Toolbar, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Space } from './layout';

export function TnPageScaffold(props: {
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
  showBack?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <Box>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 56, md: 64 } }}>
          {props.showBack && (
            <IconButton edge="start" aria-label="返回" onClick={() => navigate(-1)} sx={{ mr: Space.sm }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {props.title}
          </Typography>
          {props.actions}
        </Toolbar>
      </AppBar>
      <Box component="main">{props.children}</Box>
    </Box>
  );
}
