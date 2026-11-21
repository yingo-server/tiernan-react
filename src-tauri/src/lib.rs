//! TiernanMusicNext 桌面壳（Tauri 2）。
//!
//! 关键能力：`native_fetch` command —— 桌面端在原生层直连酷狗 API，
//! 不受 WebView CORS 限制（自定义协议 tauri://localhost 下原生请求无 CORS），
//! 与 Android 端 CapacitorHttp 方案对齐。

use serde::Deserialize;
use tauri::Manager;

#[derive(Debug, Deserialize)]
pub struct FetchInit {
    #[serde(default = "default_method")]
    pub method: String,
    #[serde(default)]
    pub headers: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub body: Option<String>,
}

fn default_method() -> String {
    "GET".into()
}

/// 原生直连请求：返回 (status, body)。
/// 前端签名见 src/platform/tauri.ts（tauriDirectFetch）。
#[tauri::command]
async fn native_fetch(
    url: String,
    init: Option<FetchInit>,
) -> Result<(u16, String), String> {
    let init = init.unwrap_or(FetchInit {
        method: default_method(),
        headers: Default::default(),
        body: None,
    });

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (TiernanMusicNext Desktop)")
        .build()
        .map_err(|e| format!("build client: {e}"))?;

    let method = reqwest::Method::from_bytes(init.method.to_uppercase().as_bytes())
        .map_err(|e| format!("bad method: {e}"))?;

    let mut req = client.request(method, &url);
    for (k, v) in &init.headers {
        req = req.header(k, v);
    }
    if let Some(b) = init.body {
        req = req.body(b);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;
    let status = resp.status().as_u16();
    let body = resp.text().await.map_err(|e| format!("read body: {e}"))?;
    Ok((status, body))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![native_fetch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Manager trait 引用占位：保持常用预导入，避免编辑器报 unused import 反复调整。
#[allow(unused)]
fn _manager_bound<T: Manager>() {}
