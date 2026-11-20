# TiernanMusicNext — React + TypeScript

继任已归档的 Flutter 版（[TiernanMusic-Next](https://github.com/yingo-server/TiernanMusic-Next)，冻结保留作回退）。

## 技术栈

- **React 18 + TypeScript + Vite**（一套代码全平台交付）
- **MUI**（Material 官方组件实现）—— 零手写控件，组件默认样式全部在 `src/theme/theme.ts` 唯一事实源
- **布局数值唯一事实源** `src/theme/layout.ts`：8dp 体系 / M3 shape scale / WindowSizeClass —— 页面零决定权（`eslint.layout.cjs` 机器强制）
- **森林翡翠语义色** `src/theme/tokens.ts`（中性灰底 + 翡翠强调，明暗成对，WCAG AA 实算）
- **纯前端直连酷狗**：签名引擎 `src/kugou/`（TS 移植自 Flutter 仓，MD5 四向量冒烟全 PASS）
- **客户端封装（绕 CORS）**：Capacitor（Android，系统 WebView）+ Tauri（桌面，系统 WebView）——体积最小、速度最快

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build → dist/
npx tsx src/kugou/md5.smoke.ts   # 签名冒烟（四向量）
```

## CI

push 即跑：typecheck → layout-lint → md5 冒烟 → vite build；release=true 时发布 gh-pages。
