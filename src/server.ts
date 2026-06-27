import { createServer, type IncomingMessage } from "node:http";
import { handleRequest } from "./index.js";
import { Sqlite3Storage } from "./storage/sqlite.js";

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || "./data/likes.db";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;

const storage = new Sqlite3Storage(DB_PATH);

const server = createServer(async (req: IncomingMessage, res) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf-8");
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const headers = new Headers(req.headers as Record<string, string>);

    const ip = req.socket.remoteAddress || "unknown";
    headers.set("CF-Connecting-IP", ip);

    const request = new Request(url, {
      method: req.method || "GET",
      headers,
      body: ["GET", "HEAD"].includes(req.method || "") ? undefined : rawBody,
    });

    const response = await handleRequest(request, storage, {
      allowedOrigins: ALLOWED_ORIGINS,
    });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    res.end(responseBody);
  } catch (err) {
    console.error("Unhandled error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`simplelikes server running on http://localhost:${PORT}`);
});
