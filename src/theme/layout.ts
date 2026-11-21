/**
 * 布局常量唯一事实源（逐字平移自 Flutter 仓 lib/surface/design/layout.dart）。
 *
 * 规则（用户指令）：布局数值完全不由页面决定。页面只允许引用本文件常量，
 * 禁止手写任何间距/尺寸/圆角/断点字面量（ESLint 规则 no-restricted-syntax 强制）。
 *
 * 数值来源 = M3 官方规范（兼容性最强，2021 起稳定）：
 *   间距  = 8dp 体系（4/8/12/16/24/32/48/64）
 *   圆角  = M3 shape scale（4/8/12/16/28）+ full
 *   断点  = M3 WindowSizeClass（compact<600 / medium<840 / expanded<1200）
 *   触控  = M3 最小交互目标 48
 */

/** 间距（M3 8dp 体系）。 */
export const Space = {
  /** 微调：图标-文字间隙。 */
  xs: 4,
  /** 8dp 基准。 */
  sm: 8,
  /** 列表项内部、卡片内边距。 */
  md: 12,
  /** 页面水平边距（M3 compact 布局规范）。 */
  lg: 16,
  /** 区块间距。 */
  xl: 24,
  /** 大区块分隔。 */
  xxl: 32,
  /** 页面底部留白。 */
  xxxl: 48,
} as const;

/** 圆角（M3 shape scale）。 */
export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  /** 胶囊。 */
  full: 999,
} as const;

/** 断点（M3 WindowSizeClass，全平台统一）。 */
export const Breakpoint = {
  compact: 600,
  medium: 840,
  expanded: 1200,
  isCompact: (w: number) => w < 840,
  isExpanded: (w: number) => w >= 1200,
} as const;

/** 组件尺寸（M3 官方默认，页面不得另设）。 */
export const Size = {
  /** M3 最小交互目标。 */
  touchTarget: 48,
  /** NavigationBar 官方默认高度。 */
  navBar: 80,
  /** AppBar 高度。 */
  appBar: 64,
  /** 迷你播放条（= AppBar 同高，视觉重量对等）。 */
  miniBar: 64,
  /** 列表项头像。 */
  avatarLg: 48,
  avatarSm: 40,
  /** 横滑歌曲卡宽。 */
  songCard: 128,
  /** 每日推荐横滑行高（封面+两行文字）。 */
  songRow: 176,
  /** 空态区高。 */
  emptyState: 96,
  /** 排行榜卡高。 */
  rankCard: 144,
  /** 歌单网格卡最小宽。 */
  playlistCardMin: 152,
  /** 登录二维码。 */
  qrCode: 240,
  /** 桌面标题栏按钮高。 */
  titlebarButton: 36,
} as const;

/** 页面骨架（唯一事实源的一部分）：官方 AppBar + 统一结构，页面不得自带主题配置。 */
// 该组件在 src/theme/PageScaffold.tsx（JSX 需要 tsx 扩展），layout.ts 保持纯常量。

