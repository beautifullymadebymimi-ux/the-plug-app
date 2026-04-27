import bcrypt from "bcryptjs";
import * as db from "../db";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "./cookies";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
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

// Enable CORS for all routes - reflect the request origin to support credentials
// Enable CORS for all routes - reflect the request origin to support credentials
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }


    const user = await db.getUserByEmail(String(email).toLowerCase());

    console.log("[LOGIN] email:", email);
    console.log("[LOGIN] found user:", !!user);
    console.log("[LOGIN] has passwordHash:", !!user?.passwordHash);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(String(password), user.passwordHash);
    console.log("[LOGIN] password valid:", isValid);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });


    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || "",
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

    return res.json({ user, sessionToken });
  } catch (error) {
    console.error("[Auth Login Error]", error);
    return res.status(500).json({ error: "Login failed." });
  }
});

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });
app.get("/make-me-admin", async (_req, res) => {
  try {
    await db.updateUserRole("mcole@thecharlottechurch.org", "admin");
    res.send("You are now admin.");
  } catch (error) {
    console.error("[Admin Setup Error]", error);
    res.status(500).send("Failed to update role.");
  }
});
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Serve Expo web export — try multiple paths to find web-build
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    process.env.WEB_DIR,
    path.resolve(process.cwd(), "web-build"),
    path.resolve(__dirname, "..", "web-build"),
    path.resolve(__dirname, "..", "..", "web-build"),
    path.resolve("/usr/src/app", "web-build"),
  ].filter(Boolean) as string[];

  let webDir: string | null = null;
  for (const candidate of candidates) {
    console.log(`[web] Checking: ${candidate}`);
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      webDir = candidate;
      break;
    }
  }

  // Redirect /api without trailing slash to /api/ for proper static file serving
  app.get("/api", (_req, res) => {
    res.redirect("/api/");
  });

  if (webDir) {
    console.log(`[web] Serving static files from: ${webDir}`);
    // Mount static files under /api so the gateway routes them to Express
    app.use("/api", express.static(webDir));
    // Also serve at root for local dev
    app.use(express.static(webDir));
    // SPA fallback: serve index.html for /api/* routes (gateway-routed)
    app.get("/api/*", (_req, res) => {
      res.sendFile(path.join(webDir!, "index.html"));
    });
    // SPA fallback for root (local dev)
    app.get("*", (_req, res) => {
      res.sendFile(path.join(webDir!, "index.html"));
    });
  } else {
    console.log(`[web] web-build not found in any candidate path`);
    console.log(`[web] cwd: ${process.cwd()}, __dirname: ${__dirname}`);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
