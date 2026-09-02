import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/** @brief 每个测试后清理挂载的 React DOM。Clean up mounted React DOM after each test. */
afterEach(() => cleanup());
