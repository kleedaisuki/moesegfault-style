import { Button } from "@moesegfault/style/react";
import { useEffect, useState } from "react";

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
 * @note 该组件使用库内 Button，以持续检验 React 入口。This component dogfoods the library Button.
 */
export function ThemeToggle({ locale = "zh-CN" }: { locale?: "zh-CN" | "en" }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setReady(true);
  }, []);

  const toggle = () => {
    const next = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.moeTheme = next;
    document.documentElement.style.colorScheme = next;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next === "dark" ? "#21130f" : "#fff6ea");
    localStorage.setItem("moe-theme", next);
    setTheme(next);
  };

  const nextLabel = theme === "dark" ? "light" : "dark";
  const visibleLabel =
    locale === "en" ? (theme === "dark" ? "Light" : "Dark") : theme === "dark" ? "浅色" : "深色";

  return (
    <Button
      aria-label={
        locale === "en"
          ? `Switch to ${nextLabel} theme`
          : `切换至${theme === "dark" ? "浅色" : "深色"}主题`
      }
      data-ready={ready}
      onClick={toggle}
      size="sm"
      variant="ghost"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{visibleLabel}</span>
    </Button>
  );
}
