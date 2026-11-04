import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Builds e2e/screenshots/<module>/index.html: one table per module, rows = state, columns = project x locale,
 * so every screenshot can be reviewed on one page. Files are named <project>__<locale>__<state>.png (see helpers.shot).
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const LOCALE_ORDER = ["en", "fa", "de"];

const STYLE = `
  body { font: 14px/1.4 system-ui, sans-serif; margin: 16px; background: #f8fafd; color: #1f2937; }
  h1 { font-size: 20px; } table { border-collapse: collapse; }
  th, td { border: 1px solid #dde5f0; padding: 6px; vertical-align: top; background: #fff; }
  th { background: #eef3fb; position: sticky; top: 0; z-index: 1; }
  th.row { text-align: left; white-space: nowrap; position: sticky; left: 0; }
  td img { display: block; max-width: 240px; height: auto; border: 1px solid #dde5f0; }
  td.desktop img { max-width: 360px; } .missing { color: #64748b; }
`;

function moduleIndex(dir: string, module: string): string | null {
  const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
  if (files.length === 0) return null;

  const parsed = files
    .map((file) => {
      const [project, locale, ...rest] = file.replace(/\.png$/, "").split("__");
      return { file, project, locale, state: rest.join("__") };
    })
    .filter((p) => p.project && p.locale && p.state);

  const states = [...new Set(parsed.map((p) => p.state))].sort();
  const columns = [...new Set(parsed.map((p) => `${p.project}__${p.locale}`))].sort((a, b) => {
    const [pa, la] = a.split("__");
    const [pb, lb] = b.split("__");
    return pa === pb ? LOCALE_ORDER.indexOf(la) - LOCALE_ORDER.indexOf(lb) : pa.localeCompare(pb);
  });

  const head = columns.map((c) => `<th>${esc(c.replace("__", " / "))}</th>`).join("");
  const rows = states
    .map((state) => {
      const cells = columns
        .map((c) => {
          const hit = parsed.find((p) => `${p.project}__${p.locale}` === c && p.state === state);
          if (!hit) return `<td class="missing">–</td>`;
          const cls = hit.project.startsWith("desktop") ? "desktop" : "mobile";
          return `<td class="${cls}"><a href="${esc(hit.file)}"><img loading="lazy" src="${esc(hit.file)}" alt="${esc(`${module} ${state} ${c}`)}"></a></td>`;
        })
        .join("");
      return `<tr><th class="row">${esc(state.replace(/^\d+-/, "").replace(/-/g, " "))}</th>${cells}</tr>`;
    })
    .join("\n");

  return `<!doctype html><meta charset="utf-8"><title>${esc(module)} screenshots</title><style>${STYLE}</style>
<h1>${esc(module)} <small>(click an image for full size)</small></h1>
<table><thead><tr><th></th>${head}</tr></thead><tbody>
${rows}
</tbody></table>`;
}

export function generateScreenshotIndexes(root = join(process.cwd(), "e2e", "screenshots")): string[] {
  if (!existsSync(root)) return [];
  const modules: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const html = moduleIndex(join(root, entry.name), entry.name);
    if (html) {
      writeFileSync(join(root, entry.name, "index.html"), html);
      modules.push(entry.name);
    }
  }
  if (modules.length) {
    const links = modules.sort().map((m) => `<li><a href="${esc(m)}/index.html">${esc(m)}</a></li>`).join("");
    writeFileSync(join(root, "index.html"), `<!doctype html><meta charset="utf-8"><title>Screenshots</title><style>${STYLE}</style><h1>Screenshots</h1><ul>${links}</ul>`);
  }
  return modules;
}
