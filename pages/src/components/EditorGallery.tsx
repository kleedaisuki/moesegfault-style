import { useId, useState } from "react";
import { RichTextEditor } from "@moesegfault/style/react/editor";
import { Markdown } from "@moesegfault/style/react/rich-text";
import "../styles/editor-gallery.css";

/** 展示页语言。 / Language of the local editing specimen. */
interface EditorGalleryProps {
  /** 默认中文，与站点路径一致。 / Defaults to Chinese; follows the site route. */
  locale?: "zh-CN" | "en";
}

/** 可直接编辑的示例；不预放公式，以免进入源码保护模式。 / Start with visually editable syntax, without source-protected math. */
function initialDraft(en: boolean): string {
  return en
    ? "## A thought, still warm\n\nLeave **a little room** for the next idea.\n\n- Make a small observation\n- Write it in your own words\n\n```ts\nconst note = 'keep exploring';\n```\n"
    : "## 趁想法还温热\n\n给下一句话，留**一点空白**。\n\n- 记下一个小小的发现\n- 用自己的话再说一遍\n\n```ts\nconst note = 'keep exploring';\n```\n";
}

/**
 * 本地受控编辑 → Markdown → 安全预览；不包含保存或同步。
 * Local controlled editing → Markdown → safe preview; no persistence or synchronization.
 */
export function EditorGallery({ locale = "zh-CN" }: EditorGalleryProps) {
  const en = locale === "en";
  const outputId = useId();
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
          ? "## A small proof\n\nKeep $e^{i\\pi}+1=0$ beside the words.\n\n$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$\n"
          : "## 一小段推导\n\n让 $e^{i\\pi}+1=0$ 坐在文字旁边。\n\n$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$\n"
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
      <div className="specimen-heading">
        <div>
          <p className="eyebrow">08 / A page of your own</p>
          <h2 id="editor-title">{en ? "Let the next line be yours." : "下一行，轮到你来写。"}</h2>
        </div>
      </div>
      <p>
        {en
          ? "Give an idea a heading, a little emphasis, or a few lines of code. The editor returns Markdown: plain text you can take with you, not a page locked inside a tool."
          : "给想法起个标题，把重点轻轻加粗，再放进几行代码。编辑器交回的是 Markdown：可以带走的纯文本，而不是锁在工具里的一页纸。"}
      </p>
      <div className="editor-gallery__samples">
        <span>{en ? "Replace this draft with a sample:" : "用示例替换当前草稿："}</span>
        <button type="button" onClick={() => loadSample(false)}>
          {en ? "A fresh note" : "一页随记"}
        </button>
        <button type="button" onClick={() => loadSample(true)}>
          {en ? "Try a formula" : "试写一条公式"}
        </button>
      </div>
      <div className="editor-gallery__samples">
        <label>
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(event) => setReadOnly(event.target.checked)}
          />{" "}
          {en ? "Read only" : "只读"}
        </label>
        <label>
          <input
            type="checkbox"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
          />{" "}
          {en ? "Disabled" : "禁用"}
        </label>
      </div>
      <div data-testid="editor-input">
        <RichTextEditor
          value={value}
          onChange={(next) => {
            setValue(next);
            setCopyStatus("");
          }}
          locale={en ? "en" : "zh"}
          label={en ? "Your working draft" : "你的试写草稿"}
          readOnly={readOnly}
          disabled={disabled}
        />
      </div>
      <p className="material-caption">
        {en
          ? "Math and unsupported syntax stay in source mode so their meaning is not lost. Use Preview to read the rendered result. This is a local demo: edits disappear on reload, with no autosave or background sync."
          : "公式与暂不支持的语法保留在源码模式，避免转换时丢失含义；切换预览即可阅读渲染结果。这里只是本地试写：刷新后修改会消失，没有自动保存或后台同步。"}
      </p>
      <div className="editor-gallery__results">
        <div className="editor-gallery__result">
          <div className="editor-gallery__result-heading">
            <label htmlFor={outputId}>
              {en ? "01 / Markdown to take away" : "01 / 可以带走的 Markdown"}
            </label>
            <button type="button" onClick={copyMarkdown}>
              {en ? "Copy Markdown" : "复制 Markdown"}
            </button>
          </div>
          <textarea
            id={outputId}
            value={value}
            readOnly
            spellCheck={false}
            data-testid="editor-markdown-output"
          />
          <p className="editor-gallery__status" role="status">
            {copyStatus}
          </p>
        </div>
        <section
          className="editor-gallery__result"
          aria-label={en ? "Live rendered preview" : "实时渲染预览"}
        >
          <h3 className="editor-gallery__preview-title">
            {en ? "02 / The same words, on paper" : "02 / 同一段文字，落在纸上"}
          </h3>
          <Markdown content={value} data-testid="editor-preview" />
        </section>
      </div>
    </section>
  );
}
