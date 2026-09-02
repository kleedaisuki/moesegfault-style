/**
 * @brief 合并可选 CSS 类名。Merge optional CSS class names.
 * @param values 候选类名。Candidate class names.
 * @return 由空格连接的有效类名。Valid class names joined with spaces.
 */
export function mergeClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
