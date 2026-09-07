import { Markdown as MarkdownExtension } from "@tiptap/markdown";
import { TableCell, TableHeader, TableKit } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { EditorView } from "@tiptap/pm/view";
import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from "react";
import { actions } from "../editor/actions.js";
import { isSafeEditorUrl, supportsVisualEditing } from "../editor/markdown.js";
import { Markdown } from "./Markdown.js";
import { mergeClassNames } from "./utils.js";

/** 编辑视图；源码切换不重写原文。Editing view; switching source views does not rewrite input. */
export type RichTextEditorMode = "visual" | "source" | "preview";
/** Markdown 是唯一外部数据模型。Markdown is the sole public data model. */
export interface RichTextEditorProps {
  /** 受控 Markdown；相同的回传值不重置光标。Controlled Markdown; matching echoes preserve selection. */
  value?: string;
  /** 非受控初始源码。Initial uncontrolled source. */
  defaultValue?: string;
  /** 用户修改后回传 Markdown，不在初始化或模式切换时触发。Emits user changes, never initialization or mode changes. */
  onChange?: (markdown: string) => void;
  /** 可访问的编辑器名称。Accessible editor name. */
  label?: string;
  /** 工具栏语言。Toolbar language. */
  locale?: "zh" | "en";
  /** 只读仍可选择、复制及预览。Read-only retains selection, copying, and preview. */
  readOnly?: boolean;
  /** 禁用所有修改且不参与表单提交。Disables mutation and excludes the field from form submission. */
  disabled?: boolean;
  /** 隐藏表单字段名；其值始终为 Markdown。Hidden form field name; its value is always Markdown. */
  name?: string;
  /** 初始视图；不支持的语法自动使用源码视图。Initial view; unsupported syntax falls back to source. */
  defaultMode?: RichTextEditorMode;
  /** 容器标识。Container identifier. */
  id?: string;
  /** 额外的容器样式。Additional container classes. */
  className?: string;
}

/** GFM 单元格只容纳一个段落；结构约束避免多段被规范化为 HTML。GFM cells contain one paragraph, preventing multi-block HTML serialization. */
const MarkdownCell = TableCell.extend({ content: "paragraph" });
/** 表头遵守相同的单段约束。Headers obey the same single-paragraph constraint. */
const MarkdownHeader = TableHeader.extend({ content: "paragraph" });
/** GFM 表格仅使用行内格式。GFM tables accept inline formatting only. */
const tableInlineActions = new Set([
  "Bold",
  "Italic",
  "Strikethrough",
  "Inline code",
  "Undo",
  "Redo",
]);

/** 只读祖先节点判断；不依赖 ProseMirror 私有路径。Inspect ancestors without relying on private ProseMirror paths. */
function insideTable(view: EditorView): boolean {
  const position = view.state.selection.$from;
  for (let depth = position.depth; depth > 0; depth -= 1) {
    if (position.node(depth).type.name === "table") return true;
  }
  return false;
}

/**
 * 暖色所见即所得编辑器，输出规范化 Markdown；TeX、HTML、图片、脚注及对齐表格保留源码编辑。
 * Warm WYSIWYG editor emitting normalized Markdown; TeX, HTML, images, footnotes, and aligned tables stay in source mode.
 * 仅首次实际视觉修改规范化标记和空白；富 HTML 粘贴降为纯文本，禁止外部拖放。
 * Only a real visual edit normalizes markup/whitespace; rich HTML paste becomes plain text and external drops are blocked.
 * 导入 editor.css、markdown.css、math.css、code.css。Import editor.css, markdown.css, math.css, code.css.
 * @example <RichTextEditor label="Notes" value={markdown} onChange={setMarkdown} name="body" />
 */
export function RichTextEditor({
  value,
  defaultValue = "",
  onChange,
  label,
  locale = "zh",
  readOnly = false,
  disabled = false,
  name,
  defaultMode = "visual",
  id,
  className,
}: RichTextEditorProps): ReactElement {
  const generatedId = useId();
  const baseId = id ?? `moe-editor-${generatedId}`;
  const title = label ?? (locale === "zh" ? "文稿编辑器" : "Document editor");
  const [local, setLocal] = useState(defaultValue);
  const source = value ?? local;
  const sourceRef = useRef(source);
  const visualSource = useRef(source);
  const [syncRevision, setSyncRevision] = useState(0);
  const onChangeRef = useRef(onChange);
  const blockedRef = useRef(disabled || readOnly);
  const [mode, setMode] = useState<RichTextEditorMode>(defaultMode);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState(false);
  const supported = useMemo(() => supportsVisualEditing(source), [source]);
  const view = mode === "visual" && !supported ? "source" : mode;
  const locked = disabled || readOnly;
  sourceRef.current = source;
  onChangeRef.current = onChange;
  blockedRef.current = locked;
  /** 原文只在真实输入时更新。Update source only for actual input. */
  const emit = (next: string): void => {
    if (blockedRef.current || next === sourceRef.current) return;
    sourceRef.current = next;
    setLocal(next);
    onChangeRef.current?.(next);
  };
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        underline: false,
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          isAllowedUri: isSafeEditorUrl,
        },
      }),
      TableKit.configure({ table: { resizable: false }, tableCell: false, tableHeader: false }),
      MarkdownCell,
      MarkdownHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      MarkdownExtension,
    ],
    content: supported ? source : "",
    contentType: "markdown",
    editable: !locked && supported,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": title,
        "aria-multiline": "true",
        class: "moe-editor__canvas moe-markdown",
      },
      handlePaste: (view, event) => {
        if (blockedRef.current) return true;
        const text = event.clipboardData?.getData("text/plain");
        if (text)
          view.dispatch(
            view.state.tr.insertText(insideTable(view) ? text.replace(/\r?\n/g, " ") : text),
          );
        return true;
      },
      handleKeyDown: (view, event) => {
        return event.key === "Enter" && insideTable(view);
      },
      handleDrop: () => true,
      handleDOMEvents: {
        compositionend: () => {
          // 等待 ProseMirror 完成组合提交，再接受外部值。Wait for ProseMirror to commit composition before external replacement.
          queueMicrotask(() => setSyncRevision((revision) => revision + 1));
          return false;
        },
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getMarkdown();
      visualSource.current = next;
      setSyncRevision((revision) => revision + 1);
      emit(next);
    },
  });
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!locked && supported, false);
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          role: "textbox",
          "aria-label": title,
          "aria-multiline": "true",
          "aria-readonly": String(readOnly),
          "aria-disabled": String(disabled),
          class: "moe-editor__canvas moe-markdown",
        },
      },
    });
  }, [editor, locked, supported, title, readOnly, disabled]);
  // 相同的受控回传绝不重设文档；保留选区与输入法组合。Matching controlled echoes never reset the document or IME.
  useEffect(() => {
    // 本地版本确保受控父级拒绝更新时也恢复权威源码。Local revision also restores authoritative source when a parent rejects an edit.
    void local;
    void syncRevision;
    if (!editor || !supported || editor.view.composing) return;
    if (source === visualSource.current) return;
    if (source !== editor.getMarkdown())
      editor.commands.setContent(source, { contentType: "markdown", emitUpdate: false });
    visualSource.current = source;
  }, [editor, source, supported, local, syncRevision]);
  const language = locale === "zh" ? 0 : 1;
  const modeNames =
    locale === "zh"
      ? { visual: "编辑", source: "源码", preview: "预览" }
      : { visual: "Edit", source: "Source", preview: "Preview" };
  return (
    <section
      id={baseId}
      className={mergeClassNames("moe-editor", className)}
      aria-label={title}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
    >
      <header className="moe-editor__header">
        <span className="moe-editor__label" id={`${baseId}-label`}>
          {title}
        </span>
        <fieldset
          className="moe-editor__modes"
          aria-label={locale === "zh" ? "编辑视图" : "Editor view"}
        >
          {(["visual", "source", "preview"] as const).map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={view === item}
              disabled={disabled || (item === "visual" && !supported)}
              onClick={() => {
                setMode(item);
                setLinkOpen(false);
              }}
            >
              {modeNames[item]}
            </button>
          ))}
        </fieldset>
      </header>
      {!supported && (
        <p className="moe-editor__notice" role="status">
          {locale === "zh"
            ? "这段文稿含有公式、HTML、图片、脚注、对齐表格或其他特殊语法，已保留在源码模式；预览仍可使用。"
            : "This document contains math, HTML, images, footnotes, aligned tables, or other special syntax. Source editing preserves it; preview remains available."}
        </p>
      )}
      {view === "visual" && (
        <>
          <fieldset
            className="moe-editor__toolbar"
            aria-label={locale === "zh" ? "文本格式" : "Text formatting"}
          >
            {actions.map((action) => (
              <button
                key={action.label[1]}
                type="button"
                title={action.label[language]}
                aria-label={action.label[language]}
                aria-pressed={
                  action.active
                    ? Boolean(
                        editor?.isActive(
                          action.active,
                          action.active === "heading" ? { level: 2 } : undefined,
                        ),
                      )
                    : undefined
                }
                disabled={
                  locked ||
                  !editor ||
                  (editor.isActive("table") && !tableInlineActions.has(action.label[1]))
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (editor && !locked) action.run(editor);
                }}
              >
                {action.text}
              </button>
            ))}
            <button
              type="button"
              aria-label={locale === "zh" ? "链接" : "Link"}
              aria-expanded={linkOpen}
              disabled={locked || !editor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setLink(String(editor?.getAttributes("link").href ?? ""));
                setLinkOpen(!linkOpen);
                setLinkError(false);
              }}
            >
              ↗
            </button>
          </fieldset>
          {linkOpen && (
            <div className="moe-editor__link">
              <label htmlFor={`${baseId}-url`}>{locale === "zh" ? "链接地址" : "Link URL"}</label>
              <input
                id={`${baseId}-url`}
                type="text"
                value={link}
                disabled={locked}
                aria-invalid={linkError}
                placeholder="https://…"
                onChange={(event) => {
                  setLink(event.target.value);
                  setLinkError(false);
                }}
              />
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (!editor || locked) return;
                  if (link && !isSafeEditorUrl(link)) {
                    setLinkError(true);
                    return;
                  }
                  const chain = editor.chain().focus().extendMarkRange("link");
                  if (link) chain.setLink({ href: link.trim() }).run();
                  else chain.unsetLink().run();
                  setLinkOpen(false);
                }}
              >
                {locale === "zh" ? "应用" : "Apply"}
              </button>
              {linkError && (
                <span role="alert">
                  {locale === "zh"
                    ? "请输入安全的网页、邮件或相对地址。"
                    : "Use a safe web, email, or relative URL."}
                </span>
              )}
            </div>
          )}
          <EditorContent editor={editor} />
          {!editor && <Markdown content={source} className="moe-editor__preview" />}
        </>
      )}
      {view === "source" && (
        <textarea
          className="moe-editor__source"
          aria-label={`${title} Markdown`}
          value={source}
          readOnly={readOnly}
          disabled={disabled}
          spellCheck={false}
          onChange={(event) => emit(event.target.value)}
        />
      )}
      {view === "preview" && (
        <Markdown
          content={source}
          className="moe-editor__preview"
          aria-label={locale === "zh" ? "文稿预览" : "Document preview"}
        />
      )}
      <footer className="moe-editor__footer">
        {locale === "zh"
          ? "以 Markdown 留存灵感 · 视觉编辑会规范化标记；表格单元格为单行，Tab 切换，多行粘贴合并为空格"
          : "Keep ideas in Markdown · Visual edits normalize formatting. Table cells are single-line; Tab navigates, pasted line breaks become spaces."}
      </footer>
      {name && <input type="hidden" name={name} value={source} disabled={disabled} />}
    </section>
  );
}
