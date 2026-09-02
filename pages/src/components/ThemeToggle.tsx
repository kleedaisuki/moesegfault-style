import { Button } from "@moesegfault/style/react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * @brief 读取页面当前主题。Read the theme currently applied to the document.
 * @return 当前主题。The active theme.
 */
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * @brief 切换并持久化文档主题。Toggle and persist the document theme.
 * @return 无返回值。No return value.
 * @note 该组件使用库内 Button，以持续检验 React 入口。This component dogfoods the library Button.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(readTheme());
    setReady(true);
  }, []);

  const toggle = () => {
    const next = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("moe-theme", next);
    setTheme(next);
  };

  return (
    <Button
      aria-label={`切换至${theme === "dark" ? "浅色" : "深色"}主题`}
      data-ready={ready}
      onClick={toggle}
      size="sm"
      variant="ghost"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      <span>{theme === "dark" ? "浅色" : "深色"}</span>
    </Button>
  );
}
