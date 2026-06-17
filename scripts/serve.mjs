import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const host = process.env.HOST || "127.0.0.1";
const urlHost = host === "127.0.0.1" ? "localhost" : host;
const port = Number(process.env.PORT || 8123);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${urlHost}:${port}`);
    const decodedPath = decodeURIComponent(url.pathname);
    const relativePath = normalize(decodedPath === "/" ? "index.html" : decodedPath.slice(1));

    if (relativePath.startsWith("..") || relativePath.includes(`${sep}..${sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const filePath = join(root, relativePath);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Length": fileStat.size,
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Try PORT=${port + 1} npm run serve.`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`MoonViz is running at http://${urlHost}:${port}/`);
});
