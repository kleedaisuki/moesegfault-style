import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  Accordion,
  AccordionItem,
  Avatar,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Checkbox,
  DescriptionList,
  Dialog,
  EmptyState,
  Field,
  Grid,
  Icon,
  IconButton,
  Input,
  Notice,
  Panel,
  Progress,
  SegmentedControl,
  Select,
  Spinner,
  Stat,
  Switch,
  Table,
  Tabs,
  Textarea,
  Tooltip,
} from "../../src/react";

beforeAll(() => {
  // jsdom 未实现模态对话框；只模拟 open 属性与 close 事件。jsdom lacks modal dialogs; emulate the open attribute and close event only.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

function Harness({ onChange }: { onChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const change = (next: boolean) => {
    onChange(next);
    setOpen(next);
  };
  return (
    <>
      <Button onClick={() => change(true)}>Open</Button>
      <Dialog closeLabel="Close" description="Why" onOpenChange={change} open={open} title="Title">
        Body
      </Dialog>
    </>
  );
}

describe("actions", () => {
  it("blocks repeat activation while loading and keeps its name", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Deploy
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Deploy" });
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("names icon buttons and groups", () => {
    render(
      <ButtonGroup label="History">
        <IconButton label="Undo">
          <Icon name="undo" />
        </IconButton>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "History" });
    expect(within(group).getByRole("button", { name: "Undo" })).toHaveAttribute("data-icon-only");
  });
});

describe("form controls", () => {
  it("wires label, hint and error to every control kind", () => {
    render(
      <>
        <Field error="Too short" hint="Public" label="Name" required>
          <Input />
        </Field>
        <Field label="Bio">
          <Textarea />
        </Field>
        <Field label="Region">
          <Select>
            <option>SIN</option>
          </Select>
        </Field>
      </>,
    );
    const name = screen.getByRole("textbox", { name: /Name/ });
    expect(name).toBeRequired();
    expect(name).toBeInvalid();
    expect(name).toHaveAccessibleDescription("Public Too short");
    expect(screen.getByRole("textbox", { name: "Bio" })).toBeValid();
    expect(screen.getByRole("combobox", { name: "Region" })).toBeVisible();
  });

  it("leaves standalone inputs unannotated", () => {
    render(<Input aria-label="Search" icon={<Icon name="search" />} shortcut="/" />);
    const input = screen.getByRole("textbox", { name: "Search" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("keeps descriptions out of the accessible name", () => {
    render(
      <>
        <Checkbox description="Weekly" label="Digest" />
        <Switch defaultChecked label="Live" />
      </>,
    );
    expect(screen.getByRole("checkbox", { name: "Digest" })).toHaveAccessibleDescription("Weekly");
    expect(screen.getByRole("switch", { name: "Live" })).toBeChecked();
  });

  it("supports controlled and uncontrolled segments", () => {
    const onValueChange = vi.fn();
    const options = [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
    ] as const;
    const { rerender } = render(
      <SegmentedControl
        defaultValue="day"
        label="Range"
        onValueChange={onValueChange}
        options={options}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(onValueChange).toHaveBeenCalledWith("week");
    expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
    rerender(<SegmentedControl key="c" label="Range" options={options} value="day" />);
    fireEvent.click(screen.getByRole("radio", { name: "Week" }));
    expect(screen.getByRole("radio", { name: "Day" })).toBeChecked();
  });
});

describe("navigation", () => {
  it("moves selection and focus with arrow keys and skips disabled tabs", () => {
    render(
      <Tabs
        items={[
          { value: "a", label: "A", content: "Panel A" },
          { value: "b", label: "B", content: "Panel B", disabled: true },
          { value: "c", label: "C", content: "Panel C" },
        ]}
        label="Views"
      />,
    );
    const first = screen.getByRole("tab", { name: "A" });
    expect(first).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const third = screen.getByRole("tab", { name: "C" });
    expect(third).toHaveFocus();
    expect(third).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "C" })).toHaveTextContent("Panel C");
    fireEvent.keyDown(third, { key: "ArrowRight" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "End" });
    expect(third).toHaveFocus();
  });

  it("marks the last breadcrumb as current and groups accordion items natively", () => {
    render(
      <>
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/a/", label: "A" },
          ]}
        />
        <Accordion>
          <AccordionItem name="faq" title="Why">
            Because
          </AccordionItem>
        </Accordion>
      </>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Because").closest("details")).toHaveAttribute("name", "faq");
  });
});

describe("overlays", () => {
  it("opens, closes from each route, and reports each change once", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const open = () => fireEvent.click(screen.getByRole("button", { name: "Open" }));
    open();
    const dialog = screen.getByRole("dialog", { name: "Title" });
    expect(dialog).toHaveAccessibleDescription("Why");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onChange.mock.calls.map(([value]) => value)).toEqual([
      true,
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it("describes its trigger and can be dismissed with Escape", () => {
    render(
      <Tooltip content="Copies the URL">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Copy" });
    expect(trigger).toHaveAccessibleDescription("Copies the URL");
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.parentElement).toHaveAttribute("data-dismissed", "true");
    fireEvent.blur(trigger);
    expect(trigger.parentElement).not.toHaveAttribute("data-dismissed");
  });
});

describe("data display", () => {
  it("exposes names and native semantics", () => {
    render(
      <>
        <Panel title="Runs">content</Panel>
        <Table label="Releases">
          <tbody>
            <tr>
              <td>v0.2.0</td>
            </tr>
          </tbody>
        </Table>
        <Progress label="Build" value={40} />
        <Spinner label="Working" />
        <Avatar name="Klee" />
        <Stat detail="+2" label="Tokens" tone="success" value="90" />
        <DescriptionList items={[{ key: "Region", description: "SIN" }]} />
        <EmptyState description="Create one" title="No runs" />
        <Notice title="Heads up">Read</Notice>
      </>,
    );
    expect(screen.getByRole("region", { name: "Runs" })).toHaveTextContent("content");
    expect(screen.getByRole("region", { name: "Releases" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("progressbar", { name: "Build" })).toHaveAttribute("max", "100");
    expect(screen.getByRole("status", { name: "Working" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Klee" })).toHaveTextContent("K");
    expect(screen.getByText("+2").parentElement).toHaveAttribute("data-tone", "success");
    expect(screen.getByRole("term")).toHaveTextContent("Region");
    expect(screen.getByText("No runs")).toBeVisible();
  });

  it("passes grid options as custom properties", () => {
    render(<Grid data-testid="grid" gap="sm" min="20rem" ruled />);
    const grid = screen.getByTestId("grid");
    expect(grid.style.getPropertyValue("--moe-grid-min")).toBe("20rem");
    expect(grid.style.getPropertyValue("--moe-grid-space")).toBe("var(--moe-space-sm)");
    expect(grid).toHaveAttribute("data-ruled", "true");
  });

  it("renders interface glyphs as strokes", () => {
    const { container } = render(<Icon name="terminal" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
