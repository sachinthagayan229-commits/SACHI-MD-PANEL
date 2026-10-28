
import express from "express";
import helmet from "helmet";
import cors from "cors";
import os from "node:os";

const app = express();
const PORT = Number(process.env.PORT || 8080);
const logs = [];

function addLog(message) {
  const line = `${new Date().toISOString()} ${message}`;
  logs.push(line);
  if (logs.length > 100) logs.shift();
  console.log(line);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));

const origins = (
  process.env.ALLOWED_ORIGINS ||
  "https://sachinthagayan90-hue.github.io"
).split(",").map(x => x.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed"));
  }
}));

function safeEqual(a, b) {
  let result = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    result |= (a.charCodeAt(i) || 0) ^
      (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

function requireAuth(req, res, next) {
  const password = process.env.PANEL_PASSWORD;

  if (!password) {
    return res.status(503).json({
      error: "PANEL_PASSWORD is not configured"
    });
  }

  const header = req.get("authorization") || "";
  const supplied = header.startsWith("Bearer ")
    ? header.slice(7)
    : "";

  if (!safeEqual(supplied, password)) {
    return res.status(401).json({
      error: "Incorrect panel password"
    });
  }

  next();
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "SACHI-MD-PANEL"
  });
});

app.get("/api/status", requireAuth, (req, res) => {
  const memory = process.memoryUsage();

  res.json({
    connected: true,
    status: "ONLINE",
    mode: "Panel only - no bot connected",
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    processMemoryMB: Math.round(
      memory.rss / 1024 / 1024
    ),
    totalMemoryMB: Math.round(
      os.totalmem() / 1024 / 1024
    ),
    freeMemoryMB: Math.round(
      os.freemem() / 1024 / 1024
    )
  });
});

app.get("/api/logs", requireAuth, (req, res) => {
  res.json({ logs: logs.slice(-100) });
});

app.use((err, req, res, next) => {
  addLog(`Error: ${err.message || "Unknown error"}`);
  res.status(400).json({
    error: err.message || "Request error"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  addLog(`Panel API started on port ${PORT}`);
});
