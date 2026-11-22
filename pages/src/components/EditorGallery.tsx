import { useState } from "react";
import { Button, Checkbox, Panel, Textarea } from "@moesegfault/style/react";
import { RichTextEditor } from "@moesegfault/style/react/editor";
import { Markdown } from "@moesegfault/style/react/rich-text";

/** 展示页语言。 / Language of the local editing specimen. */
interface EditorGalleryProps {
  /** 默认中文，与站点路径一致。 / Defaults to Chinese; follows the site route. */
  locale?: "zh-CN" | "en";
}

/** 可直接编辑的示例；不预放公式，以免进入源码保护模式。 / Start with visually editable syntax, without source-protected math. */
function initialDraft(en: boolean): string {
  return en
    ? "## Release notes\n\n**Crimson** for action, **honey** for highlights.\n\n- Hairlines replace shadows\n- Controls share one height scale\n\n```ts\nconst version = '0.2.0';\n```\n"
    : "## 发布说明\n\n**绯红**给行动，**蜜金**给高光。\n\n- 发丝线代替阴影\n- 控件共用一套高度\n\n```ts\nconst version = '0.2.0';\n```\n";
}

/**
 * 本地受控编辑 → Markdown → 安全预览；不包含保存或同步。
 * Local controlled editing → Markdown → safe preview; no persistence or synchronization.
 */
export function EditorGallery({ locale = "zh-CN" }: EditorGalleryProps) {
  const en = locale === "en";
  const [value, setValue] = useState(() => initialDraft(en));
  const [copyStatus, setCopyStatus] = useState("");
  const [readOnly, setReadOnly] = useState(false);
  const [disabled, setDisabled] = useState(false);

  /** 只报告真实剪贴板结果，失败时保留可手动选择的源码。 / Report actual clipboard results; leave source selectable on failure. */
  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(en ? "Markdown copied." : "Markdown 已复制。");
    } catch {
      setCopyStatus(
        en
          ? "Copy was blocked. Select and copy the source below."
          : "复制未成功，请在下方源码框中手动选择并复制。",
      );
    }
  }

  /** 切换示例也是外部受控值更新，不伪装为保存动作。 / Sample changes exercise controlled updates, never pretend to save. */
  function loadSample(math: boolean) {
    setValue(
      math
        ? en
          ? "## A small proof\n\nInline $e^{i\\pi}+1=0$ sits in the sentence.\n\n$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$\n"
          : "## 一小段推导\n\n行内公式 $e^{i\\pi}+1=0$ 与文字同行。\n\n$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$\n"
        : initialDraft(en),
    );
    setCopyStatus("");
  }

  return (
    <section
      className="specimen editor-gallery"
      id="editor"
      data-testid="editor-demo"
      aria-labelledby="editor-title"
    >
      <div className="specimen__head">
        <h2 id="editor-title">{en ? "Editor" : "编辑器"}</h2>
        <div className="row">
          <Button onClick={() => loadSample(false)} size="sm" variant="secondary">
            {en ? "Note" : "文稿"}
          </Button>
          <Button onClick={() => loadSample(true)} size="sm" variant="secondary">
            {en ? "Try a formula" : "公式文稿"}
          </Button>
        </div>
      </div>
      <div className="row">
        <Checkbox
          checked={readOnly}
          label={en ? "Read only" : "只读"}
          onChange={(event) => setReadOnly(event.target.checked)}
        />
        <Checkbox
          checked={disabled}
          label={en ? "Disabled" : "禁用"}
          onChange={(event) => setDisabled(event.target.checked)}
        />
      </div>
      <div data-testid="editor-input">
        <RichTextEditor
          value={value}
          onChange={(next) => {
            setValue(next);
            setCopyStatus("");
          }}
          locale={en ? "en" : "zh"}
          label={en ? "Draft" : "草稿"}
          readOnly={readOnly}
          disabled={disabled}
        />
      </div>
      <div className="split editor-gallery__results">
        <Panel
          actions={
            <Button onClick={copyMarkdown} size="sm" variant="ghost">
              {en ? "Copy" : "复制"}
            </Button>
          }
          title="output.md"
        >
          <Textarea
            aria-label={en ? "Markdown output" : "Markdown 输出"}
            className="editor-gallery__output"
            data-testid="editor-markdown-output"
            readOnly
            spellCheck={false}
            value={value}
          />
          <p className="note" role="status">
            {copyStatus}
          </p>
        </Panel>
        <Panel title="preview">
          <Markdown content={value} data-testid="editor-preview" />
        </Panel>
      </div>
    </section>
  );
}
