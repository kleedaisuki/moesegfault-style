import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Composer,
  Icon,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageBubble,
  MessageQuote,
  MessageTyping,
  Motion,
  Notice,
  StatusDot,
} from "@moesegfault/style/react";

import { FrostedScene } from "./FrostedScene";

/** 真实可交互的双语组件组合。 / Interactive bilingual compositions using public APIs. */
export function ComponentGallery({ locale = "zh-CN" }: { locale?: "zh-CN" | "en" }) {
  const en = locale === "en";
  const [motionKey, setMotionKey] = useState(0);
  const [helpful, setHelpful] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  return (
    <div className="component-gallery">
      <section
        className="specimen"
        id="glass"
        data-testid="v012-glass"
        aria-labelledby="glass-title"
      >
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">01 / Behind the glass</p>
            <h2 id="glass-title">
              {en ? "A softer view of what lies beneath." : "隔着毛玻璃，仍看得见灵感。"}
            </h2>
          </div>
          <Badge tone="accent">v0.1.2</Badge>
        </div>
        <FrostedScene locale={locale} />
        <p className="material-caption">
          {en
            ? "The text and curves sit behind the panel, not inside a background image. Switch off the frost to compare. Without blur support, or when reduced transparency is preferred, the surface stays readable."
            : "文字与曲线真实铺在面板下方，不是背景贴图。关掉雾面，对比遮盖前后的轮廓；不支持背景模糊或偏好降低透明度时，回退为可读的实色表面。"}
        </p>
      </section>

      <section
        className="specimen"
        id="motion"
        data-testid="v012-motion"
        aria-labelledby="motion-title"
      >
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">02 / A considered entrance</p>
            <h2 id="motion-title">
              {en ? "Movement, not distraction." : "轻轻出现，不喧宾夺主。"}
            </h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setMotionKey((value) => value + 1)}>
            {en ? "Replay motion" : "重播动效"}
          </Button>
        </div>
        <div className="motion-grid">
          {(["fade", "rise", "scale"] as const).map((preset) => (
            <div className="motion-tile" key={preset}>
              <Motion key={`${preset}-${motionKey}`} preset={preset} duration={500}>
                <span className="motion-token">
                  <Icon name="sparkle" size={28} />
                </span>
              </Motion>
              <code>{preset}</code>
            </div>
          ))}
        </div>
        <p className="material-caption">
          {en
            ? "One entrance, then stillness. Replay is optional; reduced-motion preferences take priority."
            : "入场一次，随后静止。重播由你决定；始终尊重减少动态效果偏好。"}
        </p>
      </section>

      <section
        className="specimen"
        id="icons"
        data-testid="v012-icons"
        aria-labelledby="icons-title"
      >
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">03 / Familiar signatures</p>
            <h2 id="icons-title">{en ? "The original, now reusable." : "祖传星芒，正式入库。"}</h2>
          </div>
        </div>
        <div className="demo-grid">
          <Card className="icon-specimen">
            <Icon name="brand" size={64} title="MoeSegfault" />
            <div>
              <h3>brand</h3>
              <p>
                {en
                  ? "The original coral K and sparkle, preserved as SVG geometry."
                  : "原版珊瑚 K 与星芒，保留 SVG 原始几何。"}
              </p>
            </div>
          </Card>
          <Card className="icon-specimen">
            <Icon name="sparkle" size={48} />
            <div>
              <h3>sparkle</h3>
              <p>
                {en
                  ? "The same sparkle, inheriting the color of its surroundings."
                  : "同一颗星芒，随上下文继承颜色。"}
              </p>
            </div>
          </Card>
          <Card>
            <p className="eyebrow">Native SVG</p>
            <p>
              {en
                ? "Decorative by default. Add a title when the icon carries meaning; label icon-only buttons."
                : "默认作为装饰。图标承载含义时提供 title；纯图标按钮需有可访问名称。"}
            </p>
          </Card>
        </div>
      </section>

      <section className="specimen" aria-labelledby="buttons-title">
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">04 / Everyday essentials</p>
            <h2 id="buttons-title">Button · Badge · Notice</h2>
          </div>
          <Badge>React island</Badge>
        </div>
        <div className="demo-row">
          <Button>{en ? "Create" : "开始创作"}</Button>
          <Button variant="secondary">{en ? "Save draft" : "保存草稿"}</Button>
          <Button variant="ghost">{en ? "Maybe later" : "稍后再说"}</Button>
          <Button disabled>{en ? "Processing" : "处理中"}</Button>
        </div>
        <div className="demo-row">
          <Badge>Default</Badge>
          <Badge tone="accent">New</Badge>
          <Badge tone="success">Stable</Badge>
          <span className="status-label">
            <StatusDot label={en ? "Service online" : "服务在线"} status="online" />
            {en ? "Service online" : "服务在线"}
          </span>
        </div>
        <div className="callout">
          <Notice title={en ? "Still the same foundations" : "底色与基础，一如既往"} tone="info">
            {en
              ? "Native semantics, composable props, and layers you can import independently."
              : "原生语义、可组合属性，以及可以独立引入的样式层。"}
          </Notice>
        </div>
      </section>

      <section
        className="specimen"
        id="messages"
        data-testid="v012-messages"
        aria-labelledby="conversation-title"
      >
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">05 / A conversation with texture</p>
            <h2 id="conversation-title">MessageBubble · Composer</h2>
          </div>
          <Badge>{en ? "Composable, not prescriptive" : "自由组合，不预设业务"}</Badge>
        </div>
        <div className="conversation-demo">
          <MessageBubble variant="system" tone="outline">
            {en
              ? "A new idea starts here. This conversation is a local demo."
              : "一个新想法，从这里开始。这是仅在本地运行的对话演示。"}
          </MessageBubble>
          <MessageBubble variant="user" author="Klee" tone="soft" status={en ? "Sent" : "已发送"}>
            <p>
              {en
                ? "Let's make a warm, quiet home page that still feels technical."
                : "做一个温暖、安静，但不失技术感的首页吧。"}
            </p>
            <MessageAttachment
              href={en ? "/en/foundations/" : "/foundations/"}
              name={en ? "Design foundations" : "设计基础"}
              description={en ? "Style reference · Open documentation" : "风格参考 · 打开文档"}
              icon={<Icon name="sparkle" />}
            />
          </MessageBubble>
          <MessageBubble
            variant="assistant"
            author="Moe"
            avatar={<Icon name="brand" size={28} />}
            footer={en ? "Just now" : "刚刚"}
            actions={
              <MessageActions aria-label={en ? "Assistant message actions" : "助手消息操作"}>
                <MessageAction aria-pressed={helpful} onClick={() => setHelpful((value) => !value)}>
                  {helpful ? (en ? "Marked helpful" : "已标记有帮助") : en ? "Helpful" : "有帮助"}
                </MessageAction>
              </MessageActions>
            }
          >
            <MessageQuote author="Klee">
              {en ? "Warm, quiet, and technical." : "温暖、安静，但不失技术感。"}
            </MessageQuote>
            <p>
              {en
                ? "Keep the paper and berry palette. Add a translucent note, thoughtful motion, and code that reads beautifully in either theme."
                : "保留暖纸与莓红，添一张透光便笺、几处克制的动效，再让代码在明暗两种主题下都好读。"}
            </p>
          </MessageBubble>
          <MessageTyping label={en ? "Typing indicator specimen" : "输入状态指示器示例"} />
          {sentMessage && (
            <MessageBubble
              variant="user"
              author="Klee"
              status={en ? "Local preview only" : "仅本地预览"}
            >
              {sentMessage}
            </MessageBubble>
          )}
          <Composer
            aria-label={en ? "Demo message composer" : "展示用消息编辑器"}
            onSubmitMessage={setSentMessage}
            placeholder={en ? "Write a message…" : "写下一句话……"}
            submitLabel={en ? "Send" : undefined}
            textareaProps={en ? { "aria-label": "Message" } : undefined}
          />
        </div>
      </section>
    </div>
  );
}
