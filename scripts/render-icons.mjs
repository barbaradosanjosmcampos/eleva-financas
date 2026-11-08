// Rebuild committed artwork with: node scripts/render-icons.mjs
import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../public/icons/eleva-mark.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
try {
  for (const [name, size, maskable] of [
    ["eleva-192", 192], ["eleva-512", 512], ["apple-touch-icon", 180], ["eleva-maskable-512", 512, true],
  ]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const svg = maskable
      ? source.replace("<path", '<g transform="translate(51.2 51.2) scale(.8)"><path').replace("</svg>", "</g></svg>")
      : source;
    await page.setContent(`<style>body{margin:0;background:#123e33}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    await page.screenshot({ path: new URL(`../public/icons/${name}.png`, import.meta.url).pathname });
    await page.close();
  }
} finally { await browser.close(); }
