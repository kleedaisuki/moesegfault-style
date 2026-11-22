import { burst } from "./burst";

const CONFIRMATION = 1400;

/** 全页共用一个监听器；`data-copy` 就是要复制的文字。One listener per page; `data-copy` holds the text to copy. */
export function bindCopy(): void {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element && event.target.closest("[data-copy]");
    if (target instanceof HTMLElement) void copy(target);
  });
}

async function copy(target: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(target.dataset.copy ?? "");
  } catch {
    /* 无剪贴板权限时文字仍可手动选择。Without clipboard access the text stays selectable. */
    return;
  }
  const status = document.querySelector<HTMLElement>("[data-copy-status]");
  if (status) status.textContent = status.dataset.copyStatus ?? "";
  target.dataset.copied = "";
  burst(target);
  setTimeout(() => {
    delete target.dataset.copied;
    if (status) status.textContent = "";
  }, CONFIRMATION);
}
