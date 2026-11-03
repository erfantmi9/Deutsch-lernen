/**
 * Tiny, dependency-free markdown subset for lesson text. No HTML is ever produced:
 * the parser returns a plain data tree that React renders as elements.
 *
 * Supported: paragraphs (blank-line separated), "- " bullet lists,
 * **bold**, and `German text` (rendered left-to-right in the German font language).
 */

export interface Run {
  text: string;
  bold: boolean;
}

export type InlineNode =
  | { kind: "text"; runs: Run[] }
  | { kind: "de"; runs: Run[] };

export type Block =
  | { kind: "paragraph"; inline: InlineNode[] }
  | { kind: "list"; items: InlineNode[][] };

/** Splits `**bold**` markers into runs. Unbalanced markers stay literal. */
export function parseRuns(src: string): Run[] {
  const runs: Run[] = [];
  const re = /\*\*([^*]+)\*\*/gu;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) runs.push({ text: src.slice(last, start), bold: false });
    runs.push({ text: m[1], bold: true });
    last = start + m[0].length;
  }
  if (last < src.length) runs.push({ text: src.slice(last), bold: false });
  return runs;
}

/** Splits `` `German` `` spans out of a line; the rest is text in the reader's language. */
export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /`([^`]+)`/gu;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) nodes.push({ kind: "text", runs: parseRuns(src.slice(last, start)) });
    nodes.push({ kind: "de", runs: parseRuns(m[1]) });
    last = start + m[0].length;
  }
  if (last < src.length) nodes.push({ kind: "text", runs: parseRuns(src.slice(last)) });
  return nodes;
}

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;

  const flushPara = () => {
    if (para.length > 0) blocks.push({ kind: "paragraph", inline: parseInline(para.join(" ")) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ kind: "list", items: list.map(parseInline) });
    list = null;
  };

  for (const rawLine of src.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "") {
      flushPara();
      flushList();
    } else if (line.startsWith("- ")) {
      flushPara();
      (list ??= []).push(line.slice(2).trim());
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Text of a run list with all markers removed (used for tests and accessible labels). */
export function plainText(nodes: readonly InlineNode[]): string {
  return nodes.map((n) => n.runs.map((r) => r.text).join("")).join("");
}
