/** @brief 用户可持久化的主题偏好 (Theme preference that may be persisted for a user). */
export type ThemePreference = "light" | "dark" | "auto";

/** @brief 浏览器当前实际呈现的主题 (Theme currently rendered by the browser). */
export type MoeTheme = "light" | "dark";

/** @brief 主题操作所需的最小 DOM 根元素接口 (Minimal DOM root contract required for theme operations). */
interface ThemeRoot {
  dataset: DOMStringMap;
}

/** @brief 根据偏好与系统配色解析实际主题 (Resolve the effective theme from a preference and system scheme). */
export function resolveTheme(preference: ThemePreference, prefersDark = false): MoeTheme {
  return preference === "auto" ? (prefersDark ? "dark" : "light") : preference;
}

/**
 * @brief 将主题偏好应用至文档根元素 (Apply a theme preference to the document root).
 * @param preference 需要应用的 light、dark 或 auto 偏好 (The light, dark, or auto preference to apply).
 * @param root 可选的文档根元素，服务端可省略 (Optional document root; may be omitted during SSR).
 * @return 已应用的主题偏好 (The applied theme preference).
 * @note auto 保留显式属性以方便调试，同时由 CSS 媒体查询解析 (auto keeps an explicit attribute for observability and is resolved by a CSS media query).
 */
export function applyTheme(
  preference: ThemePreference,
  root: ThemeRoot | null = typeof document === "undefined" ? null : document.documentElement,
): ThemePreference {
  if (root) root.dataset.moeTheme = preference;
  return preference;
}

/**
 * @brief 创建无闪烁主题启动脚本 (Create a flash-free theme bootstrap script).
 * @param storageKey localStorage 中保存偏好的键名 (Key used to persist the preference in localStorage).
 * @return 可直接放入内联 script 的 JavaScript 源码 (JavaScript source suitable for an inline script).
 * @note 脚本在存储不可用或内容非法时自然回退到 auto (The script naturally falls back to auto when storage is unavailable or invalid).
 */
export function createThemeBootstrap(storageKey = "moe-theme"): string {
  return `(function(){var p="auto";try{var v=localStorage.getItem(${JSON.stringify(storageKey)});if(v==="light"||v==="dark"||v==="auto")p=v}catch(e){}document.documentElement.dataset.moeTheme=p})()`;
}
