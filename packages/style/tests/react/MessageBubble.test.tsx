import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageBubble,
  MessageQuote,
  MessageTyping,
} from "../../src/react/MessageBubble";

describe("MessageBubble family", () => {
  it("retains sender, footer and streaming contracts while composing new slots", () => {
    render(
      <MessageBubble
        author="Klee"
        variant="user"
        streaming
        footer="10:42"
        status="已发送"
        avatar="K"
        tone="soft"
        actions={<MessageAction>复制</MessageAction>}
      >
        Hello
      </MessageBubble>,
    );
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("article")).toHaveAttribute("data-author", "user");
    expect(screen.getByRole("article")).toHaveAttribute("data-tone", "soft");
    expect(screen.getByText("已发送")).toBeVisible();
    expect(screen.getByText("10:42")).toBeVisible();
    expect(screen.getByRole("button", { name: "复制" })).toBeVisible();
  });

  it("forwards native semantics without forcing a live region", () => {
    render(
      <MessageBubble aria-label="Reply" aria-busy="true" id="reply">
        0
      </MessageBubble>,
    );
    expect(screen.getByRole("article", { name: "Reply" })).toHaveAttribute("id", "reply");
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("article")).not.toHaveAttribute("aria-live");
  });

  it("renders zero-valued metadata and updates streaming state", () => {
    const { rerender } = render(
      <MessageBubble author={0} footer={0} streaming>
        Text
      </MessageBubble>,
    );
    expect(screen.getAllByText("0")).toHaveLength(2);
    rerender(<MessageBubble>Done</MessageBubble>);
    expect(screen.getByRole("article")).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("article")).not.toHaveClass("is-streaming");
  });

  it("announces one localized typing status and hides decorative dots", () => {
    render(<MessageTyping label="Klee is typing" />);
    expect(screen.getByRole("status")).toHaveTextContent("Klee is typing");
    expect(screen.getByRole("status").querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it("preserves native quote and attachment link attributes", () => {
    render(
      <MessageQuote author="Klee" cite="https://example.com/message">
        <MessageAttachment
          href="/paper.pdf"
          name="Paper.pdf"
          description="PDF · 240 KB"
          download
          icon={<span>icon</span>}
        />
      </MessageQuote>,
    );
    expect(screen.getByRole("blockquote")).toHaveAttribute("cite", "https://example.com/message");
    expect(screen.getByRole("link", { name: /Paper\.pdf\s*PDF · 240 KB/ })).toHaveAttribute(
      "href",
      "/paper.pdf",
    );
    expect(screen.getByRole("link")).toHaveAttribute("download");
  });

  it("uses native non-submitting buttons and honors disabled state", () => {
    const click = vi.fn();
    render(
      <MessageActions aria-label="Reply actions">
        <MessageAction onClick={click}>Copy</MessageAction>
        <MessageAction disabled onClick={click}>
          Retry
        </MessageAction>
      </MessageActions>,
    );
    expect(screen.getByRole("group", { name: "Reply actions" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy" })).toHaveAttribute("type", "button");
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(click).toHaveBeenCalledOnce();
  });
});
