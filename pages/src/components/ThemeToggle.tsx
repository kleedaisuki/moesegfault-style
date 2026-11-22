import { Icon, IconButton } from "@moesegfault/style/react";
import { type MouseEvent, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { revealTheme } from "../lib/theme-reveal";

type Theme = "light" | "dark";

/**
 * @brief 读取页面当前主题。Read the theme currently applied to the document.
 * @return 当前主题。The active theme.
 */
function readTheme(): Theme {
  return document.documentElement.dataset.moeTheme === "dark" ? "dark" : "light";
}

/**
 * @brief 切换并持久化文档主题。Toggle and persist the document theme.
 * @return 无返回值。No return value.
 * @note 该组件使用库内 IconButton，以持续检验 React 入口。This component dogfoods the library IconButton.
 */
export function ThemeToggle({ locale = "zh-CN" }: { locale?: "zh-CN" | "en" }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setReady(true);
  }, []);

  const apply = (next: Theme) => {
    document.documentElement.dataset.moeTheme = next;
    document.documentElement.style.colorScheme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#160b0c" : "#fffdf9");
    /* 过渡要在回调返回前看到新图标。The transition must see the new icon before its callback returns. */
    flushSync(() => setTheme(next));
  };

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = readTheme() === "dark" ? "light" : "dark";
    localStorage.setItem("moe-theme", next);
    revealTheme(event.currentTarget, () => apply(next));
  };

  const dark = theme === "dark";
  const label =
    locale === "en"
      ? `Switch to ${dark ? "light" : "dark"} theme`
      : `切换至${dark ? "浅色" : "深色"}主题`;

  return (
    <IconButton
      className="theme-toggle"
      data-ready={ready}
      label={label}
      onClick={toggle}
      size="sm"
    >
      <Icon key={theme} name={dark ? "sun" : "moon"} size={16} />
    </IconButton>
  );
}
