/** @brief 文档导航项。Documentation navigation item. */
export interface NavItem {
  /** @brief 站内路径。Site-relative path. */
  href: string;
  /** @brief 可见标签。Visible label. */
  label: string;
}

/** @brief 文档支持的语言。Supported documentation locale. */
export type SiteLocale = "zh-CN" | "en";

/** @brief 文档站的唯一导航数据源。Single source of truth for docs navigation. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "首页" },
  { href: "/foundations/", label: "视觉规范" },
  { href: "/components/", label: "组件" },
  { href: "/guides/", label: "接入指南" },
  { href: "/distribution/", label: "版本资源" },
] as const;

/** @brief 英文文档导航。English documentation navigation. */
export const EN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/en/", label: "Home" },
  { href: "/en/foundations/", label: "Foundations" },
  { href: "/en/components/", label: "Components" },
  { href: "/en/guides/", label: "Guides" },
  { href: "/en/distribution/", label: "Distribution" },
] as const;

/** @brief 按语言返回导航项。Return navigation items for a locale. */
export function getNavItems(locale: SiteLocale): readonly NavItem[] {
  return locale === "en" ? EN_NAV_ITEMS : NAV_ITEMS;
}

/**
 * @brief 返回同一页面的另一语言路径。Return the alternate-language path for a page.
 * @param currentPath 当前规范路径。Current canonical path.
 * @param locale 当前语言。Current locale.
 * @return 对应的另一语言路径。Equivalent path in the other locale.
 */
export function getAlternatePath(currentPath: string, locale: SiteLocale): string {
  if (locale === "en") {
    const localized = currentPath.replace(/^\/en(?=\/)/, "");
    return localized || "/";
  }

  return currentPath === "/" ? "/en/" : `/en${currentPath}`;
}

/**
 * @brief 判断导航路径是否为当前页面。Determine whether a navigation path is current.
 * @param currentPath 当前页面规范路径。Canonical path of the current page.
 * @param href 导航目标路径。Navigation target path.
 * @return 路径是否精确匹配。Whether the paths exactly match.
 */
export function isCurrentPath(currentPath: string, href: string): boolean {
  return currentPath === href;
}
