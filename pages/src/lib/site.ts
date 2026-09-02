/** @brief 文档导航项。Documentation navigation item. */
export interface NavItem {
  /** @brief 站内路径。Site-relative path. */
  href: string;
  /** @brief 可见标签。Visible label. */
  label: string;
}

/** @brief 文档站的唯一导航数据源。Single source of truth for docs navigation. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "首页" },
  { href: "/foundations/", label: "视觉规范" },
  { href: "/components/", label: "组件" },
  { href: "/guides/", label: "接入指南" },
  { href: "/distribution/", label: "版本资源" },
] as const;

/**
 * @brief 判断导航路径是否为当前页面。Determine whether a navigation path is current.
 * @param currentPath 当前页面规范路径。Canonical path of the current page.
 * @param href 导航目标路径。Navigation target path.
 * @return 路径是否精确匹配。Whether the paths exactly match.
 */
export function isCurrentPath(currentPath: string, href: string): boolean {
  return currentPath === href;
}
