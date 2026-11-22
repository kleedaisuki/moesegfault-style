import {
  Badge,
  Button,
  Card,
  CardContent,
  Composer,
  Field,
  Icon,
  IconButton,
  Input,
  MessageBubble,
  Panel,
  Progress,
  SegmentedControl,
  Select,
  Switch,
  Table,
} from "@moesegfault/style/react";
import { useState } from "react";

/** 由发布清单得到的真实版本数据。Real release data from the published manifests. */
export interface ReleaseRow {
  version: string;
  files: number;
  bytes: number;
}

type Density = "all" | "latest";

/** 首页工作台：全部由公开组件组成。Home workbench composed only of public components. */
export function Workbench({
  locale = "zh-CN",
  releases,
}: {
  locale?: "zh-CN" | "en";
  releases: readonly ReleaseRow[];
}) {
  const en = locale === "en";
  const [scope, setScope] = useState<Density>("all");
  const [sent, setSent] = useState<string[]>([]);
  const latest = releases[0];
  const rows = scope === "all" ? releases : releases.slice(0, 1);
  const largest = Math.max(...releases.map((release) => release.bytes));

  return (
    <div className="workbench">
      <div className="workbench__column">
        <Panel
          actions={
            <SegmentedControl
              label={en ? "Release scope" : "版本范围"}
              onValueChange={setScope}
              options={[
                { value: "all", label: en ? "All" : "全部" },
                { value: "latest", label: en ? "Latest" : "最新" },
              ]}
              value={scope}
            />
          }
          flush
          title="manifest.json"
        >
          <Table label={en ? "Published releases" : "已发布版本"}>
            <thead>
              <tr>
                <th scope="col">{en ? "Version" : "版本"}</th>
                <th className="workbench__meter" scope="col">
                  <span className="moe-visually-hidden">
                    {en ? "Share of largest" : "相对体积"}
                  </span>
                </th>
                <th data-numeric scope="col">
                  {en ? "Files" : "文件"}
                </th>
                <th data-numeric scope="col">
                  {en ? "Size" : "大小"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((release) => (
                <tr key={release.version}>
                  <td>
                    <span className="row">
                      <code>v{release.version}</code>
                      {release === latest && <Badge tone="success">latest</Badge>}
                    </span>
                  </td>
                  <td>
                    <Progress
                      label={`v${release.version}`}
                      max={largest}
                      tone={release === latest ? "accent" : "neutral"}
                      value={release.bytes}
                    />
                  </td>
                  <td data-numeric>{release.files}</td>
                  <td data-numeric>{(release.bytes / 1024).toFixed(0)} KB</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel
          actions={
            <IconButton
              label={en ? "Clear messages" : "清空消息"}
              onClick={() => setSent([])}
              size="sm"
            >
              <Icon name="x" size={16} />
            </IconButton>
          }
          title="thread"
        >
          <div className="thread">
            <MessageBubble author="Klee" tone="soft" variant="user">
              {en ? "Colors are yours too. Make it Klee." : "配色也交给你啦，Klee 色系就行。"}
            </MessageBubble>
            <MessageBubble author="Moe" avatar={<Icon name="brand" />}>
              <p>
                {en
                  ? "Crimson acts, honey glows, clover says all clear."
                  : "绯红行动，蜜金高光，四叶草报平安。"}
              </p>
            </MessageBubble>
            {sent.map((message, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 只追加或整体清空，索引稳定。Append-only or cleared as a whole, so indexes are stable.
              <MessageBubble author="Klee" key={index} variant="user">
                {message}
              </MessageBubble>
            ))}
            <Composer
              onSubmitMessage={(message) => setSent((current) => [...current, message])}
              placeholder={en ? "Write a message" : "输入消息"}
              submitLabel={en ? "Send" : "发送"}
              textareaProps={{ "aria-label": en ? "Message" : "消息" }}
            />
          </div>
        </Panel>
      </div>
      <div className="workbench__column">
        <Panel title="deploy.config">
          <div className="form-grid">
            <Field label={en ? "Channel" : "分发通道"}>
              <Select defaultValue="pinned">
                <option value="pinned">{en ? "Pinned version" : "固定版本"}</option>
                <option value="latest">latest</option>
              </Select>
            </Field>
            <Field label={en ? "Entry point" : "入口文件"}>
              <Input defaultValue="css/all.css" icon={<Icon name="file" size={16} />} />
            </Field>
          </div>
          <div className="stack" style={{ marginBlock: "var(--moe-space-5)" }}>
            <Switch defaultChecked label={en ? "Follow system theme" : "跟随系统主题"} />
            <Switch label={en ? "Self-host fonts" : "自托管字体"} />
          </div>
          <div className="row">
            <Button>{en ? "Apply" : "应用"}</Button>
            <Button variant="secondary">{en ? "Reset" : "重置"}</Button>
          </div>
        </Panel>
        <Card>
          <CardContent>
            <div className="stack">
              <div className="row">
                <Button size="sm">{en ? "Primary" : "主要"}</Button>
                <Button size="sm" variant="contrast">
                  {en ? "Contrast" : "对比"}
                </Button>
                <Button size="sm" variant="secondary">
                  {en ? "Secondary" : "次要"}
                </Button>
                <Button size="sm" variant="ghost">
                  {en ? "Ghost" : "幽灵"}
                </Button>
              </div>
              <div className="row">
                <Badge tone="accent">accent</Badge>
                <Badge tone="success">success</Badge>
                <Badge tone="warning">warning</Badge>
                <Badge tone="danger">danger</Badge>
              </div>
              <Field
                error={
                  en ? "Version must be exact, such as 0.2.0." : "需要精确版本号，例如 0.2.0。"
                }
                label={en ? "Version" : "版本号"}
              >
                <Input defaultValue="0.x" />
              </Field>
              <Progress label={en ? "Build progress" : "构建进度"} value={72} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
