/**
 * 森林翡翠语义色（逐字平移自 Flutter 仓 lib/surface/design/tokens_v2.dart，
 * 2026-11-19 配色修订版：中性灰底 + 翡翠强调，明暗成对，实算 WCAG AA）。
 */
export interface SemanticPalette {
  bgCanvas: string;
  bgSurface: string;
  bgContainer: string;
  bgContainerHigh: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  outline: string;
  divider: string;
  focus: string;
  success: string;
  warning: string;
  error: string;
  onError: string;
  info: string;
}

export const light: SemanticPalette = {
  bgCanvas: '#F7F8FA',
  bgSurface: '#FFFFFF',
  bgContainer: '#E4E7EB',
  bgContainerHigh: '#C2C8D0',
  primary: '#12833C', // 深翡翠：浅底 4.56:1（亮翡翠 #1DB954 白底仅 2.43 不可用）
  onPrimary: '#FFFFFF',
  secondary: '#1DB954',
  onSecondary: '#0E0F12',
  textPrimary: '#111111',
  textSecondary: '#5F646D',
  textDisabled: '#9AA0AA',
  outline: '#7F9186',
  divider: '#DCDFE4',
  focus: '#12833C',
  success: '#157347',
  warning: '#8A5A00',
  error: '#B3261E',
  onError: '#FFFFFF',
  info: '#0B6BCB',
};

export const dark: SemanticPalette = {
  bgCanvas: '#0E0F12',
  bgSurface: '#181A1F',
  bgContainer: '#2B3038',
  bgContainerHigh: '#3A4049',
  primary: '#1DB954', // 翡翠：深底 7.41:1
  onPrimary: '#06120A',
  secondary: '#2ECC71',
  onSecondary: '#06120A',
  textPrimary: '#EDEFF2',
  textSecondary: '#A9AFB8',
  textDisabled: '#6C737D',
  outline: '#5A6B60',
  divider: '#2E3137',
  focus: '#1DB954',
  success: '#2ECC71',
  warning: '#F2A25C',
  error: '#E05B5B',
  onError: '#1A0505',
  info: '#8EC5FF',
};

export type ThemeModeName = 'light' | 'dark';
export const palette = (mode: ThemeModeName): SemanticPalette =>
  mode === 'dark' ? dark : light;
