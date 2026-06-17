import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const lanMode = process.argv.includes("--lan") || process.env.LAN === "1";
const host = process.env.HOST || (lanMode ? "0.0.0.0" : "127.0.0.1");
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
    const url = new URL(request.url || "/", `http://localhost:${port}`);
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
  console.log(`MoonViz is running locally at http://localhost:${port}/`);

  if (host === "0.0.0.0" || host === "::") {
    const lanUrls = getLanUrls(port);
    if (lanUrls.length > 0) {
      console.log("Network access:");
      for (const url of lanUrls) {
        console.log(`  ${url}`);
      }
    } else {
      console.log("Network access is enabled, but no LAN IPv4 address was detected.");
    }
  }
});

function getLanUrls(port) {
  const urls = [];
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const address of interfaces || []) {
      if (address.family === "IPv4" && !address.internal) {
        urls.push(`http://${address.address}:${port}/`);
      }
    }
  }

  return urls;
}
