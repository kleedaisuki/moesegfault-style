import { tokens, type ThemePreference } from "@moesegfault/style";
import type { ButtonProps, ClusterProps } from "@moesegfault/style/react";
import { highlightCode, type CodeLanguage } from "@moesegfault/style/code";
import type {
  CodeBlockProps,
  GlassProps,
  IconProps,
  MessageBubbleProps,
  MotionProps,
} from "@moesegfault/style/react";

/** @brief 验证根入口可被 NodeNext 消费。Verify that NodeNext can consume the root entry point. */
const preference: ThemePreference = "auto";

/** @brief 验证 React 入口的公共组件属性可解析。Verify public React component props resolve. */
const button: ButtonProps = { children: "继续", variant: "primary" };

/** @brief 验证 React 布局类型及其依赖声明可解析。Verify React layout types and dependent declarations resolve. */
const cluster: ClusterProps = { align: "center", justify: "between" };

void [preference, button, cluster, tokens["color.ink"]];

/** @brief 新增入口与扩展属性保持 NodeNext 可消费。New entry points and extended props remain NodeNext-compatible. */
const language: CodeLanguage = "typescript";
const code: CodeBlockProps = { code: "const n = 42", language };
const glass: GlassProps = { tone: "warm" };
const motion: MotionProps = { preset: "rise", disabled: true };
const icon: IconProps = { name: "brand", title: "MoeSegfault" };
const message: MessageBubbleProps = { variant: "assistant", tone: "soft", status: "Done" };
void [highlightCode(code.code, language), glass, motion, icon, message];
