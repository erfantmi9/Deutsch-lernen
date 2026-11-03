import type { ReactNode } from "react";
import { parseBlocks } from "@/lib/miniMarkdown";
import type { InlineNode, Run } from "@/lib/miniMarkdown";

function renderRuns(runs: readonly Run[]): ReactNode {
  return runs.map((r, i) => (r.bold ? <strong key={i}>{r.text}</strong> : <span key={i}>{r.text}</span>));
}

function renderInline(nodes: readonly InlineNode[]): ReactNode {
  return nodes.map((n, i) =>
    n.kind === "de" ? (
      <bdi key={i} dir="ltr" lang="de" className="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold">
        {renderRuns(n.runs)}
      </bdi>
    ) : (
      <span key={i}>{renderRuns(n.runs)}</span>
    ),
  );
}

/** Renders lesson markdown (paragraphs, bullet lists, **bold**, `German`) without any raw HTML. */
export default function MiniMarkdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={"space-y-3 leading-relaxed " + (className ?? "")}>
      {blocks.map((b, i) =>
        b.kind === "paragraph" ? (
          <p key={i}>{renderInline(b.inline)}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1.5 ps-6 marker:text-primary">
            {b.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
