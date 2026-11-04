import { generateScreenshotIndexes } from "./screenshot-index";

// Runs once after every `playwright test`: rebuilds e2e/screenshots/<module>/index.html from the images on disk.
export default function globalTeardown() {
  const modules = generateScreenshotIndexes();
  if (modules.length) console.log(`screenshot index: ${modules.map((m) => `e2e/screenshots/${m}/index.html`).join(", ")}`);
}
