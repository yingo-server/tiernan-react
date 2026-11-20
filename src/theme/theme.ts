/**
 * MUI 主题装配（唯一事实源）。组件默认样式全部在此配置，
 * 页面零自定义样式数值 —— 与 Flutter 仓 theme 是唯一事实源同一原则。
 */
import { createTheme, type Theme } from '@mui/material/styles';
import { palette, type ThemeModeName } from './tokens';
import { Radius } from './layout';

export function buildTheme(mode: ThemeModeName): Theme {
  const p = palette(mode);
  return createTheme({
    palette: {
      mode,
      primary: { main: p.primary, contrastText: p.onPrimary },
      secondary: { main: p.secondary, contrastText: p.onSecondary },
      error: { main: p.error, contrastText: p.onError },
      background: { default: p.bgCanvas, paper: p.bgSurface },
      text: { primary: p.textPrimary, secondary: p.textSecondary, disabled: p.textDisabled },
      divider: p.divider,
      success: { main: p.success },
      warning: { main: p.warning },
      info: { main: p.info },
    },
    shape: { borderRadius: Radius.md },
    components: {
      MuiAppBar: {
        defaultProps: { position: 'sticky', color: 'inherit', elevation: 0 },
        styleOverrides: {
          root: { backgroundColor: p.bgCanvas, color: p.textPrimary },
        },
      },
      MuiBottomNavigation: {
        defaultProps: { showLabels: true },
        styleOverrides: {
          root: { backgroundColor: p.bgSurface, height: 64 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { backgroundColor: p.bgContainer, backgroundImage: 'none' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { '&.Mui-selected': { backgroundColor: p.bgContainerHigh } },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
    },
  });
}
