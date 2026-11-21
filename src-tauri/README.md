# src-tauri

Tauri 2 桌面壳（Windows / Linux / macOS）。

- 加载与 Android 相同的 Vite 产物：`frontendDist: "../dist"`（dev 走 `http://localhost:5173`）。
- CORS 绕过：`native_fetch` command（见 `src/lib.rs`），用 reqwest（rustls，无 openssl 依赖）在原生层直连酷狗。
- 前端桥接：`src/platform/tauri.ts` 导出 `tauriDirectFetch`，由 `gateway.ts` 在检测到 Tauri 环境时接入。

## 开发

```bash
npm run build          # 产出 ../dist
cargo install tauri-cli --version '^2'
cargo tauri dev        # 或 cargo tauri build
```

产物路径（release 二进制）：`src-tauri/target/release/tiernan-music-next(.exe)`
