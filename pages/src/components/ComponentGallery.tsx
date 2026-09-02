import {
  Badge,
  Button,
  Card,
  Composer,
  MessageBubble,
  Notice,
  StatusDot,
} from "@moesegfault/style/react";

/**
 * @brief 展示 React 组件的真实组合。Show a real composition of React components.
 * @return React 展示组件。A React showcase element.
 * @note 作为客户端岛渲染，可同时验证事件和无障碍名称。Rendered as an island to verify events and labels.
 */
export function ComponentGallery({ locale = "zh-CN" }: { locale?: "zh-CN" | "en" }) {
  const en = locale === "en";
  return (
    <div className="component-gallery">
      <section className="specimen" aria-labelledby="buttons-title">
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">Action</p>
            <h2 id="buttons-title">Button · Badge · Status</h2>
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
            <StatusDot label={en ? "Service online" : "服务在线"} status="online" />{" "}
            {en ? "Service online" : "服务在线"}
          </span>
          <span className="status-label">
            <StatusDot label={en ? "Creating" : "正在创作"} status="busy" />{" "}
            {en ? "Creating" : "正在创作"}
          </span>
        </div>
      </section>

      <section className="specimen" aria-labelledby="feedback-title">
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">Feedback</p>
            <h2 id="feedback-title">Notice · Card</h2>
          </div>
        </div>
        <div className="demo-grid">
          <Notice title={en ? "Everything is ready" : "一切准备就绪"} tone="info">
            {en
              ? "Import tokens, foundations, and components by layer—or simply start with all.css."
              : "令牌、基础样式和组件可以分层引入；从 all.css 开始也完全没问题。"}
          </Notice>
          <Notice title={en ? "A gentle reminder" : "温柔提醒"} tone="warning">
            {en
              ? "Remote versioned assets suit static styles; do not entrust business logic to a mutable URL."
              : "远程版本资源适合静态样式，不建议把业务逻辑交给可变 URL。"}
          </Notice>
          <Card>
            <p className="eyebrow">Workshop note</p>
            <h3>{en ? "Let content speak first" : "让内容先说话"}</h3>
            <p>
              {en
                ? "Paper, ink, and a restrained berry accent establish hierarchy without distracting from the text."
                : "纸张、墨色和少量莓红构成层级；装饰不会抢走正文的注意力。"}
            </p>
            <Button variant="secondary" size="sm">
              {en ? "Read the guidelines" : "阅读规范"}
            </Button>
          </Card>
        </div>
      </section>

      <section className="specimen" aria-labelledby="conversation-title">
        <div className="specimen-heading">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2 id="conversation-title">MessageBubble · Composer</h2>
          </div>
        </div>
        <div className="conversation-demo">
          <MessageBubble variant="assistant">
            {en
              ? "Good afternoon! Which little idea shall we turn into something today?"
              : "下午好呀。今天想把哪一个小小的想法写成作品？"}
          </MessageBubble>
          <MessageBubble variant="user">
            {en
              ? "Let's start with a warm, quiet home page that still feels technical."
              : "先做一个温暖、安静，但不失技术感的首页。"}
          </MessageBubble>
          <Composer
            aria-label={en ? "Demo message composer" : "展示用消息编辑器"}
            onSubmitMessage={() => undefined}
            placeholder={en ? "Write a message…" : "写下一句话……"}
            submitLabel={en ? "Send" : undefined}
            textareaProps={en ? { "aria-label": "Message" } : undefined}
          />
        </div>
      </section>
    </div>
  );
}
