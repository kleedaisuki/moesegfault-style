import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Badge,
  BrandMark,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Cluster,
  Container,
  MessageBubble,
  Notice,
  Stack,
  StatusDot,
} from "../../src/react";

describe("基础 React 组件", () => {
  it("保留按钮和链接的原生语义与回调", () => {
    const onButtonClick = vi.fn();
    const onLinkClick = vi.fn();

    render(
      <>
        <Button onClick={onButtonClick} size="lg" variant="secondary">
          保存
        </Button>
        <Button
          as="a"
          href="/docs"
          onClick={(event) => {
            event.preventDefault();
            onLinkClick();
          }}
          variant="ghost"
        >
          文档
        </Button>
      </>,
    );

    const button = screen.getByRole("button", { name: "保存" });
    const link = screen.getByRole("link", { name: "文档" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("data-size")).toBe("lg");
    expect(button.getAttribute("data-variant")).toBe("secondary");
    expect(link.getAttribute("href")).toBe("/docs");

    fireEvent.click(button);
    fireEvent.click(link);
    expect(onButtonClick).toHaveBeenCalledOnce();
    expect(onLinkClick).toHaveBeenCalledOnce();
  });

  it("以可查询的文档语义组合卡片", () => {
    render(
      <Card aria-label="项目" variant="elevated">
        <CardHeader>
          <CardTitle>组件库</CardTitle>
          <CardDescription>跨框架视觉语言</CardDescription>
        </CardHeader>
        <CardContent>正文</CardContent>
      </Card>,
    );

    const card = screen.getByRole("article", { name: "项目" });
    expect(card.getAttribute("data-variant")).toBe("elevated");
    expect(screen.getByRole("heading", { level: 3, name: "组件库" })).toBeTruthy();
    expect(screen.getByText("正文").className).toContain("moe-card__body");
  });

  it("让紧凑品牌标记仍拥有无障碍名称", () => {
    const { rerender } = render(<BrandMark compact label="MoeSegfault" />);
    expect(screen.getByLabelText("MoeSegfault")).toBeTruthy();

    rerender(<BrandMark label="MoeSegfault" />);
    expect(screen.getByText("MoeSegfault")).toBeTruthy();
  });

  it("为通知、状态点和徽章暴露稳定状态契约", () => {
    render(
      <>
        <Badge tone="success">已发布</Badge>
        <Notice title="构建失败" tone="danger">
          请检查日志
        </Notice>
        <StatusDot label="已离线" status="offline" />
      </>,
    );

    expect(screen.getByText("已发布").getAttribute("data-tone")).toBe("success");
    expect(screen.getByRole("alert").textContent).toContain("请检查日志");
    const status = screen.getByRole("img", { name: "已离线" });
    expect(status.getAttribute("data-status")).toBe("offline");
  });

  it("表达消息作者、流式状态和元信息", () => {
    render(
      <MessageBubble author="Klee" footer="刚刚" streaming variant="user">
        你好
      </MessageBubble>,
    );

    const message = screen.getByRole("article");
    expect(message.getAttribute("data-author")).toBe("user");
    expect(message.getAttribute("aria-busy")).toBe("true");
    expect(screen.getAllByText(/Klee|刚刚/)).toHaveLength(2);
  });

  it("布局 primitive 保留原生属性并设置局部间距变量", () => {
    render(
      <Container aria-label="内容" size="wide">
        <Stack data-testid="stack" gap="lg">
          <Cluster data-testid="cluster" gap="sm" justify="between">
            <span>甲</span>
            <span>乙</span>
          </Cluster>
        </Stack>
      </Container>,
    );

    expect(screen.getByLabelText("内容").getAttribute("data-size")).toBe("wide");
    expect(screen.getByTestId("stack").getAttribute("style")).toContain("--moe-stack-space");
    expect(screen.getByTestId("cluster").getAttribute("data-justify")).toBe("between");
    expect(screen.getByTestId("cluster").getAttribute("style")).toContain("--moe-cluster-space");
  });
});
