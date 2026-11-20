/**
 * 双包打包说明（构建全部在 CI 完成，本地仅纯代码——用户指令）。
 *
 * without-webview.apk：Capacitor 默认（系统 WebView），体积最小（~6-8MB）
 * fully.apk：自带 GeckoView 内核（Mozilla 维护，不受系统 WebView 老化影响），+40-60MB
 *
 * fully 的实现走「保守」路线：Capacitor WebView 不支持热替换内核，
 * 因此 fully 包用 GeckoViewActivity 作为启动 Activity 的独立变体：
 *   android/app/src/geckoview/AndroidManifest.xml —— application/activity 覆盖
 *   android/app/src/geckoview/java/.../GeckoMainActivity.kt —— GeckoView 装载同一 dist
 * 两个变体共享全部 Kotlin/JS 代码，仅 WebView 实现不同（productFlavors 分包）。
 *
 * CI（.github/workflows/android.yml）产出：
 *   dist/TiernanMusicNext-<ver>-system-<abi>.apk      （without-webview）
 *   dist/TiernanMusicNext-<ver>-fully-<abi>.apk       （自带内核）
 */
export const APK_VARIANTS = [
  { id: 'system', label: 'without-webview（系统 WebView）', flavor: 'system' },
  { id: 'fully', label: 'fully（自带 GeckoView 内核）', flavor: 'fully' },
] as const;
