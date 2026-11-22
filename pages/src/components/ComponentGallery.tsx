import {
  Accordion,
  AccordionItem,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Composer,
  DescriptionList,
  Dialog,
  EmptyState,
  Field,
  Grid,
  Icon,
  IconButton,
  type IconName,
  Input,
  Kbd,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageBubble,
  MessageQuote,
  MessageTyping,
  Motion,
  Notice,
  Panel,
  Progress,
  Radio,
  SegmentedControl,
  Select,
  Skeleton,
  Spinner,
  Stat,
  StatusDot,
  Switch,
  Table,
  Tabs,
  Textarea,
  Tooltip,
} from "@moesegfault/style/react";
import { iconGlyphs } from "@moesegfault/style";
import { type ReactNode, useState } from "react";
import { FrostedScene } from "./FrostedScene";

type Locale = "zh-CN" | "en";
type Translate = (zh: string, en: string) => string;

/** 展示区块；id 同时是目录锚点与测试锚点。Specimen section; its id serves the index and the tests. */
function Specimen({
  actions,
  children,
  id,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="specimen"
      data-testid={`specimen-${id}`}
      id={id}
    >
      <div className="specimen__head">
        <h2 id={`${id}-title`}>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ButtonSpecimen({ t }: { t: Translate }) {
  const [busy, setBusy] = useState(false);
  return (
    <Specimen id="buttons" title={t("按钮", "Button")}>
      <div className="stage">
        <div className="row">
          <Button>{t("部署", "Deploy")}</Button>
          <Button variant="contrast">{t("对比", "Contrast")}</Button>
          <Button variant="secondary">{t("次要", "Secondary")}</Button>
          <Button variant="ghost">{t("幽灵", "Ghost")}</Button>
          <Button variant="danger">{t("删除", "Delete")}</Button>
          <Button disabled>{t("禁用", "Disabled")}</Button>
        </div>
        <div className="row">
          <Button size="sm">{t("小号", "Small")}</Button>
          <Button>
            <Icon name="terminal" size={16} />
            {t("中号", "Medium")}
          </Button>
          <Button size="lg">
            {t("大号", "Large")}
            <Icon name="arrow-right" size={16} />
          </Button>
          <Button loading={busy} onClick={() => setBusy(true)} variant="secondary">
            {t("构建", "Build")}
          </Button>
          {busy && (
            <Button onClick={() => setBusy(false)} variant="ghost">
              {t("停止", "Stop")}
            </Button>
          )}
        </div>
        <div className="row">
          <ButtonGroup label={t("历史操作", "History")}>
            <IconButton label={t("撤销", "Undo")} variant="secondary">
              <Icon name="undo" size={16} />
            </IconButton>
            <IconButton label={t("重做", "Redo")} variant="secondary">
              <Icon name="redo" size={16} />
            </IconButton>
          </ButtonGroup>
          <IconButton label={t("设置", "Settings")}>
            <Icon name="settings" size={16} />
          </IconButton>
        </div>
      </div>
    </Specimen>
  );
}

function FormSpecimen({ t }: { t: Translate }) {
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  return (
    <Specimen id="forms" title={t("表单", "Forms")}>
      <div className="stage">
        <div className="form-grid">
          <Field
            hint={t("只能用小写字母与连字符。", "Lowercase letters and hyphens only.")}
            label={t("项目标识", "Project slug")}
            required
          >
            <Input defaultValue="moe-segfault" />
          </Field>
          <Field
            error={t("这个地址无法解析。", "This host does not resolve.")}
            label={t("主机", "Host")}
          >
            <Input defaultValue="style.moesegfalt.dev" />
          </Field>
          <Field label={t("区域", "Region")}>
            <Select defaultValue="sin">
              <option value="sin">Singapore (SIN)</option>
              <option value="nrt">Tokyo (NRT)</option>
              <option value="fra">Frankfurt (FRA)</option>
            </Select>
          </Field>
          <Field label={t("搜索", "Search")}>
            <Input icon={<Icon name="search" size={16} />} shortcut="/" type="search" />
          </Field>
        </div>
        <Field label={t("备注", "Notes")}>
          <Textarea rows={3} />
        </Field>
      </div>
      <div className="stage">
        <div className="form-grid">
          <div className="stack">
            <Checkbox defaultChecked label={t("视觉检查", "Visual checks")} />
            <Checkbox label={t("强制颜色", "Forced colors")} />
          </div>
          <div className="stack">
            <Radio defaultChecked label={t("固定版本", "Pinned")} name="channel" />
            <Radio label="latest" name="channel" />
          </div>
          <div className="stack">
            <Switch defaultChecked label={t("自动部署", "Auto deploy")} />
            <Switch disabled label={t("边缘预热", "Edge warm-up")} />
          </div>
        </div>
        <SegmentedControl
          label={t("时间范围", "Time range")}
          onValueChange={setRange}
          options={[
            { value: "day", label: t("日", "Day") },
            { value: "week", label: t("周", "Week") },
            { value: "month", label: t("月", "Month") },
          ]}
          value={range}
        />
      </div>
    </Specimen>
  );
}

function NavigationSpecimen({ t, base }: { t: Translate; base: string }) {
  return (
    <Specimen id="navigation" title={t("导航", "Navigation")}>
      <div className="stage">
        <Breadcrumbs
          items={[
            { href: `${base}/`, label: t("概览", "Overview") },
            { href: `${base}/components/`, label: t("组件", "Components") },
            { href: `${base}/components/#navigation`, label: t("导航", "Navigation") },
          ]}
          label={t("面包屑示例", "Breadcrumb example")}
        />
        <Tabs
          items={[
            {
              value: "overview",
              label: t("概览", "Overview"),
              content: <code>v0.2.0</code>,
            },
            {
              value: "tokens",
              label: t("令牌", "Tokens"),
              content: <code>--moe-action</code>,
            },
            {
              value: "archive",
              label: t("归档", "Archive"),
              content: "",
              disabled: true,
            },
          ]}
          label={t("标签页示例", "Tabs example")}
        />
        <Accordion>
          <AccordionItem
            name="faq"
            open
            title={t("会影响旧版本吗？", "Does it affect older versions?")}
          >
            {t(
              "不会。每个精确版本目录都不可变。",
              "No. Every exact-version directory is immutable.",
            )}
          </AccordionItem>
          <AccordionItem name="faq" title={t("必须用 React 吗？", "Is React required?")}>
            {t(
              "不必。CSS 与 Astro 组件可以单独使用。",
              "No. CSS and the Astro components work on their own.",
            )}
          </AccordionItem>
        </Accordion>
      </div>
    </Specimen>
  );
}

function DataSpecimen({ t }: { t: Translate }) {
  return (
    <Specimen id="data" title={t("数据", "Data")}>
      <div className="stage">
        <Grid min="10rem" ruled>
          <Stat label={t("请求", "Requests")} value="18,204" />
          <Stat detail="p95" label={t("延迟", "Latency")} tone="success" value="42 ms" />
          <Stat
            detail={t("超出预算", "over budget")}
            label={t("错误率", "Error rate")}
            tone="danger"
            value="1.8%"
          />
        </Grid>
        <Table label={t("部署示例", "Sample deployments")}>
          <thead>
            <tr>
              <th scope="col">{t("提交", "Commit")}</th>
              <th scope="col">{t("状态", "Status")}</th>
              <th scope="col">{t("作者", "Author")}</th>
              <th data-numeric scope="col">
                {t("耗时", "Duration")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["a41f09c", "online", t("已上线", "Live"), "2m 51s"],
                ["7be2d10", "busy", t("构建中", "Building"), "0m 38s"],
                ["c03a9f4", "error", t("失败", "Failed"), "1m 07s"],
              ] as const
            ).map(([commit, status, label, duration]) => (
              <tr key={commit}>
                <td>
                  <code>{commit}</code>
                </td>
                <td>
                  <span className="status-label">
                    <StatusDot aria-hidden label={label} status={status} />
                    {label}
                  </span>
                </td>
                <td>
                  <span className="status-label">
                    <Avatar aria-hidden name="Klee" size={22} />
                    Klee
                  </span>
                </td>
                <td data-numeric>{duration}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="split">
          <DescriptionList
            items={[
              { key: t("区域", "Region"), description: "SIN" },
              { key: t("运行时", "Runtime"), description: "Workers" },
              { key: t("快捷键", "Shortcut"), description: <Kbd>K</Kbd> },
            ]}
          />
          <div className="stack">
            <Progress label={t("示例进度", "Sample progress")} value={64} />
            <Progress label={t("成功进度", "Success progress")} tone="success" value={100} />
            <Progress label={t("警告进度", "Warning progress")} tone="warning" value={32} />
          </div>
        </div>
      </div>
    </Specimen>
  );
}

function FeedbackSpecimen({ t }: { t: Translate }) {
  return (
    <Specimen id="feedback" title={t("反馈", "Feedback")}>
      <div className="stage">
        <div className="row">
          <Badge>neutral</Badge>
          <Badge tone="accent">accent</Badge>
          <Badge tone="success">success</Badge>
          <Badge tone="warning">warning</Badge>
          <Badge tone="danger">danger</Badge>
          <span className="status-label">
            <StatusDot aria-hidden label="" status="online" />
            {t("服务在线", "Service online")}
          </span>
          <Spinner label={t("加载中", "Loading")} />
        </div>
        <div className="split">
          <Notice>{t("v0.2.0 可以固定使用。", "v0.2.0 is ready to pin.")}</Notice>
          <Notice tone="success">{t("清单与摘要一致。", "Manifest and digests match.")}</Notice>
          <Notice tone="warning">
            {t("latest 会随新版本变化。", "latest moves with each release.")}
          </Notice>
          <Notice role="status" tone="danger">
            {t("版本号不存在，请检查后重试。", "Unknown version. Check it and try again.")}
          </Notice>
        </div>
        <div className="split">
          <div
            aria-busy="true"
            aria-label={t("骨架示例", "Skeleton example")}
            className="stack"
            role="img"
          >
            <Skeleton style={{ height: "1.5rem", width: "45%" }} />
            <Skeleton />
            <Skeleton style={{ width: "80%" }} />
          </div>
          <EmptyState
            actions={
              <Button size="sm" variant="secondary">
                {t("新建草稿", "New draft")}
              </Button>
            }
            icon={<Icon name="folder" size={20} />}
            title={t("还没有草稿", "No drafts yet")}
          />
        </div>
      </div>
    </Specimen>
  );
}

function OverlaySpecimen({ t }: { t: Translate }) {
  const [open, setOpen] = useState(false);
  return (
    <Specimen id="overlays" title={t("浮层", "Overlays")}>
      <div className="stage">
        <div className="row">
          <Button onClick={() => setOpen(true)} variant="secondary">
            {t("打开对话框", "Open dialog")}
          </Button>
          <Tooltip content={<Kbd>⌘ K</Kbd>}>
            <Button variant="ghost">
              <Icon name="search" size={16} />
              {t("搜索", "Search")}
            </Button>
          </Tooltip>
        </div>
      </div>
      <Dialog
        closeLabel={t("关闭", "Close")}
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              {t("取消", "Cancel")}
            </Button>
            <Button onClick={() => setOpen(false)}>{t("固定版本", "Pin version")}</Button>
          </>
        }
        onOpenChange={setOpen}
        open={open}
        title={t("固定到 v0.2.0？", "Pin to v0.2.0?")}
      >
        <Field label={t("确认版本", "Confirm version")}>
          <Input defaultValue="0.2.0" />
        </Field>
      </Dialog>
    </Specimen>
  );
}

function SurfaceSpecimen({ t, locale }: { t: Translate; locale: Locale }) {
  return (
    <>
      <Specimen id="surfaces" title={t("表面", "Surfaces")}>
        <Grid gap="md" min="15rem">
          <Card interactive>
            <CardHeader>
              <CardTitle>
                <a href="#surfaces">Card</a>
              </CardTitle>
            </CardHeader>
            <CardFooter>
              <Icon name="arrow-right" size={16} />
            </CardFooter>
          </Card>
          <Card variant="muted">
            <CardHeader>
              <CardTitle>Muted</CardTitle>
            </CardHeader>
          </Card>
          <Panel title="panel.tsx">
            <Progress label={t("示例进度", "Sample progress")} value={64} />
          </Panel>
        </Grid>
      </Specimen>
      <Specimen id="glass" title={t("玻璃", "Glass")}>
        <FrostedScene locale={locale} />
      </Specimen>
    </>
  );
}

function MotionSpecimen({ t }: { t: Translate }) {
  const [replay, setReplay] = useState(0);
  return (
    <Specimen
      actions={
        <Button onClick={() => setReplay((value) => value + 1)} size="sm" variant="secondary">
          {t("重播", "Replay")}
        </Button>
      }
      id="motion"
      title={t("动效", "Motion")}
    >
      <Grid min="8rem" ruled>
        {(["fade", "rise", "scale", "slide"] as const).map((preset) => (
          <div className="motion-tile" key={preset}>
            <Motion duration={420} key={`${preset}-${replay}`} preset={preset}>
              <span className="motion-tile__mark">
                <Icon name="sparkle" size={20} />
              </span>
            </Motion>
            <code>{preset}</code>
          </div>
        ))}
      </Grid>
    </Specimen>
  );
}

function IconSpecimen({ t }: { t: Translate }) {
  const names = ["brand", "sparkle", ...Object.keys(iconGlyphs)] as IconName[];
  return (
    <Specimen id="icons" title={t("图标", "Icons")}>
      <ul className="icon-grid">
        {names.map((name) => (
          <li key={name}>
            <button className="icon-tile moe-draw" data-copy={name} type="button">
              <Icon name={name} size={20} />
              <code>{name}</code>
            </button>
          </li>
        ))}
      </ul>
    </Specimen>
  );
}

function MessageSpecimen({ t, base }: { t: Translate; base: string }) {
  const [helpful, setHelpful] = useState(false);
  const [sent, setSent] = useState("");
  return (
    <Specimen id="messages" title={t("对话", "Messages")}>
      <div className="stage">
        <div className="thread">
          <MessageBubble variant="system">{t("今天", "Today")}</MessageBubble>
          <MessageBubble author="Klee" status={t("已发送", "Sent")} tone="soft" variant="user">
            <p>
              {t(
                "先看视觉规范，再决定按钮层级。",
                "Read the foundations first, then settle button hierarchy.",
              )}
            </p>
            <MessageAttachment
              href={`${base}/foundations/`}
              icon={<Icon name="file" />}
              name={t("视觉基础", "Foundations")}
            />
          </MessageBubble>
          <MessageBubble
            actions={
              <MessageActions aria-label={t("消息操作", "Message actions")}>
                <MessageAction aria-pressed={helpful} onClick={() => setHelpful((value) => !value)}>
                  <Icon name="check" size={14} />
                  {helpful ? t("已标记有帮助", "Marked helpful") : t("有帮助", "Helpful")}
                </MessageAction>
              </MessageActions>
            }
            author="Moe"
            avatar={<Icon name="brand" />}
          >
            <MessageQuote author="Klee">
              {t("再决定按钮层级", "Then settle button hierarchy")}
            </MessageQuote>
            <p>
              {t(
                "一个主按钮负责推进，其余降为次要。危险操作单独放。",
                "One primary action moves things forward; the rest step back. Keep destructive actions apart.",
              )}
            </p>
          </MessageBubble>
          {sent && (
            <MessageBubble author="Klee" variant="user">
              {sent}
            </MessageBubble>
          )}
          <MessageTyping label={t("Moe 正在输入", "Moe is typing")} />
          <Composer
            aria-label={t("消息编辑器示例", "Example composer")}
            onSubmitMessage={setSent}
            placeholder={t("输入消息", "Write a message")}
            submitLabel={t("发送", "Send")}
            textareaProps={{ "aria-label": t("消息", "Message") }}
          />
        </div>
      </div>
    </Specimen>
  );
}

/** 只用公开 API 的双语组件展示。Bilingual gallery built only on public APIs. */
export function ComponentGallery({ locale = "zh-CN" }: { locale?: Locale }) {
  const en = locale === "en";
  const base = en ? "/en" : "";
  const t: Translate = (zh, english) => (en ? english : zh);
  return (
    <div className="component-gallery">
      <ButtonSpecimen t={t} />
      <FormSpecimen t={t} />
      <NavigationSpecimen base={base} t={t} />
      <DataSpecimen t={t} />
      <FeedbackSpecimen t={t} />
      <OverlaySpecimen t={t} />
      <SurfaceSpecimen locale={locale} t={t} />
      <MotionSpecimen t={t} />
      <IconSpecimen t={t} />
      <MessageSpecimen base={base} t={t} />
    </div>
  );
}
