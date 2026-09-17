import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getTaskEvents, subscribeTask } from "../task-service";
import { shutdownTaskWorker, startTaskWorker } from "../task-service";
import { completeGoogleAuthorization, createGoogleAuthorizationUrl } from "../google-calendar";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/google/connect", async (req, res) => {
    try { const context = await createContext({ req, res } as any); if (!context.user) { res.status(401).json({ error: "Sign in required" }); return; } const origin = typeof req.query.origin === "string" ? req.query.origin : ""; res.redirect(await createGoogleAuthorizationUrl({ userId: context.user.id, origin })); }
    catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Google OAuth unavailable" }); }
  });
  app.get("/api/google/callback", async (req, res) => {
    try { const code = typeof req.query.code === "string" ? req.query.code : ""; const state = typeof req.query.state === "string" ? req.query.state : ""; if (!code || !state) { res.status(400).json({ error: "Missing Google OAuth code or state" }); return; } res.redirect(await completeGoogleAuthorization({ code, state })); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Google OAuth callback failed" }); }
  });
  app.get("/api/tasks/:id/events", async (req, res) => {
    const taskId = Number(req.params.id);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      res.status(400).json({ error: "Invalid task id" });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const send = (event: unknown) => res.write(`event: task\ndata: ${JSON.stringify(event)}\n\n`);
    for (const event of await getTaskEvents(taskId)) send(event);
    const unsubscribe = subscribeTask(taskId, send);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15000);
    req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startTaskWorker();
  });
  const gracefulShutdown = async () => {
    await shutdownTaskWorker();
    server.close(() => process.exit(0));
  };
  process.once("SIGTERM", gracefulShutdown);
  process.once("SIGINT", gracefulShutdown);
}

startServer().catch(console.error);
