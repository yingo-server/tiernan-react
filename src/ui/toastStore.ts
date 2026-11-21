/**
 * 全局轻提示（Snackbar）状态。
 * 播放器等非页面模块需要提示（如「当前环境不支持播放（需客户端）」），
 * 不能直接用 MUI Snackbar（需在 React 树里），故用 zustand 承载消息，
 * 由 AppShell 渲染 Snackbar 宿主。
 */
import { create } from 'zustand';

export interface ToastState {
  message: string | null;
  severity: 'info' | 'success' | 'warning' | 'error';
  show: (message: string, severity?: ToastState['severity']) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  severity: 'info',
  show: (message, severity = 'info') => set({ message, severity }),
  hide: () => set({ message: null }),
}));
