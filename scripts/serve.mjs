import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../dist/", import.meta.url)).replace(/[\\/]$/, "");
const port = Number(process.env.PORT || 4174);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(file);
      res
        .writeHead(200, {
          "Content-Type":
            types[path.extname(file)] || "application/octet-stream",
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        })
        .end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .on("error", (error) => {
    console.error(error.code === "EADDRINUSE" ? `Port ${port} is already in use. Close the other preview or set PORT to another number.` : error.message);
    process.exitCode = 1;
  })
  .listen(port, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${port} — keep this window open; Ctrl+C stops the preview.`));
