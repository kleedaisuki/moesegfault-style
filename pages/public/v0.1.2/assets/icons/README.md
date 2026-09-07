# 品牌 SVG / Brand SVG

`brand.svg` 原样来自本仓库 `pages/public/favicon.svg`；其几何与相邻博客项目的 favicon 一致。
`brand.svg` is copied unchanged from this repository's `pages/public/favicon.svg`; its geometry matches the original blog favicon.

许可证沿用本仓库 GPL-3.0-or-later，参见仓库 LICENSE；没有引入第三方图标或额外许可证声明。
These assets retain this repository's GPL-3.0-or-later license; see the repository LICENSE. No third-party icons or additional license claims are introduced.

`sparkle.svg` 仅提取该图的星芒路径，使用 `currentColor`，不是另行绘制的历史图标。
`sparkle.svg` extracts that icon's sparkle using `currentColor`; it is not a newly invented heritage icon.

React：`<Icon name="brand" title="MoeSegfault" size={48} />`。未命名的图标默认装饰用途；语义图标传入 `title` 或 `aria-label`，操作仍放在原生按钮中。
React: unnamed icons are decorative; supply `title` or `aria-label` for meaningful icons and keep actions on native buttons.

静态使用：`<img src="/brand.svg" alt="MoeSegfault" width="48" height="48">`；装饰图片用 `alt=""`。外链 SVG 的内部 title 不替代 HTML 图片的 alt。
Static usage: use `alt=""` for decoration. An external SVG's internal title does not replace the HTML image's alt.

参考 / References: [W3C SVG accessible naming](https://www.w3.org/WAI/tutorials/images/tips/), [W3C decorative images](https://www.w3.org/WAI/tutorials/images/decorative/).
