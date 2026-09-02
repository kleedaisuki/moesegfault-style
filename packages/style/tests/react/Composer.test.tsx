import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "../../src/react";

describe("Composer", () => {
  it("使用 Enter 提交、清空非受控文本并调用变化回调", () => {
    const onSubmitMessage = vi.fn();
    const onValueChange = vi.fn();
    render(<Composer onSubmitMessage={onSubmitMessage} onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "消息" }) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "你好，世界" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSubmitMessage).toHaveBeenCalledOnce();
    expect(onSubmitMessage.mock.calls[0]?.[0]).toBe("你好，世界");
    expect(input.value).toBe("");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("Shift+Enter 和输入法组合期间不提交", () => {
    const onSubmitMessage = vi.fn();
    render(<Composer defaultValue="草稿" onSubmitMessage={onSubmitMessage} />);

    const input = screen.getByRole("textbox", { name: "消息" });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(input, { isComposing: true, key: "Enter" });

    expect(onSubmitMessage).not.toHaveBeenCalled();
  });

  it("支持按钮提交和受控模式，不在本地清空受控值", () => {
    const onSubmitMessage = vi.fn();
    const onValueChange = vi.fn();
    render(
      <Composer
        onSubmitMessage={onSubmitMessage}
        onValueChange={onValueChange}
        submitLabel="发送消息"
        value="受控内容"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "发送消息" }));
    expect(onSubmitMessage.mock.calls[0]?.[0]).toBe("受控内容");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("受控内容");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("空白消息不能提交", () => {
    const onSubmitMessage = vi.fn();
    render(<Composer defaultValue="   " onSubmitMessage={onSubmitMessage} />);

    const submit = screen.getByRole("button", { name: "发送" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.submit(submit.closest("form") as HTMLFormElement);
    expect(onSubmitMessage).not.toHaveBeenCalled();
  });
});
