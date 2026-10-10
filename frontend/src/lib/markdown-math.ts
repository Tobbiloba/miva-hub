/**
 * Models often write LaTeX as \[ … \] (display) and \( … \) (inline), but
 * markdown treats those backslashes as escapes and shows plain brackets.
 * remark-math reads $$ … $$ and $ … $, so convert the delimiters first,
 * leaving fenced and inline code untouched.
 */
export function normalizeMathDelimiters(markdown: string): string {
  if (!markdown.includes("\\[") && !markdown.includes("\\(")) return markdown;
  // Split on code (fenced blocks and inline spans) and only touch prose
  return markdown
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk;
      return chunk
        .replace(
          /\\\[([\s\S]+?)\\\]/g,
          (_, body: string) => `\n$$\n${body.trim()}\n$$\n`,
        )
        .replace(
          /\\\(([\s\S]+?)\\\)/g,
          (_, body: string) => `$${body.trim()}$`,
        );
    })
    .join("");
}
