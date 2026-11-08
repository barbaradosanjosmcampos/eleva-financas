// Local production fixture: lets the test publish a changed worker without
// modifying the build or making an external deployment.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
let revision = 0;
const root = resolve("dist");
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Cache-Control", "no-store");
  if (path === "/__test/update" && req.method === "POST") { revision++; res.end("updated"); return; }
  if (["/api/finances", "/auth/session", "/backup.json"].includes(path)) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ private: "must-never-be-cached" })); return;
  }
  const file = resolve(root, `.${path === "/" ? "/index.html" : path}`);
  if (!file.startsWith(root + "/")) { res.writeHead(403).end(); return; }
  try {
    let content = await readFile(file);
    if (path === "/sw.js") content = Buffer.from(content.toString().replace("const CACHE = 'eleva-static-", `const CACHE = 'eleva-static-test${revision}-`));
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.end(content);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(5175, "127.0.0.1");
