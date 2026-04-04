import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import authRouter from "./src/routes/auth.js";
import municipalityRouter from "./src/routes/municipalityRoutes.js";
import barangayRouter from "./src/routes/barangayRoutes.js";
import residentRouter from "./src/routes/residentRoutes.js";
import userRouter from "./src/routes/userRoutes.js";
import householdRouter from "./src/routes/householdRoutes.js";
import logsRouter from "./src/routes/logsRoute.js";
import statisticsRouter from "./src/routes/statisticsRoutes.js";
import petsRouter from "./src/routes/petsRoutes.js";
import vaccineRouter from "./src/routes/vaccineRoutes.js";
import archivesRouter from "./src/routes/archivesRoutes.js";
import inventoriesRouter from "./src/routes/inventoriesRoutes.js";
import requestRouter from "./src/routes/requestRoutes.js";
import gisRouter from "./src/routes/gisRoute.js";
import counterRouter from "./src/routes/counterRoutes.js";
import redisRouter from "./src/routes/redisRoutes.js";
import monitoringRouter from "./src/routes/monitoringRoutes.js";
import systemManagementRouter from "./src/routes/systemManagementRoutes.js";
import openApiRouter from "./src/routes/openApiRoutes.js";
import apiKeyAdminRouter from "./src/routes/apiKeyAdminRoutes.js";
// New routes for v2 architecture
import setupRouter from "./src/routes/setupRoutes.js";
import portalHouseholdRouter from "./src/routes/portalHouseholdRoutes.js";
import certificateRouter from "./src/routes/certificateRoutes.js";
// Registration approval workflow (C1 fix — BIMS handles directly via shared DB)
import registrationRouter from "./src/routes/registrationRoutes.js";
import ApiKeyModel from "./src/models/ApiKey.js";
import { errorHandler, notFoundHandler } from "./src/middlewares/error.js";
import { rateLimiter } from "./src/middlewares/rateLimiter.js";
import { testRedisConnection } from "./src/config/redis.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(compression({
  level: 6,
  threshold: 1024,
}));
// CORS — supports comma-separated list of origins in CORS_ORIGIN env var.
// Both the BIMS frontend (5173) and the E-Services portal (5174) may call
// BIMS backend endpoints (e.g. portal household routes use credentials).
const _allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return cb(null, true);
    if (_allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Ensure api_keys table exists on startup (non-blocking)
ApiKeyModel.ensureTable().catch((e) => {
  console.error("Failed to ensure api_keys table:", e?.message);
});

// Serve the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// =============================================================================
// Routes
// =============================================================================

// Rate limiting
const authRateLimiter = rateLimiter({ 
  windowMs: 15 * 60 * 1000, 
  maxRequests: 100, 
  message: 'Too many login attempts. Please try again later.',
  keyGenerator: (req) => `${req.ip}:${req.path}`
});
const apiRateLimiter  = rateLimiter({ 
  windowMs: 15 * 60 * 1000, 
  maxRequests: 100,
  keyGenerator: (req) => `${req.ip}:${req.path}`
});

// Apply API rate limiter globally to all /api routes (auth gets additional stricter limiter below)
app.use("/api", apiRateLimiter);

app.use("/api/auth", authRateLimiter, authRouter);

// Open API routes
app.use("/api/openapi", openApiRouter);
app.use("/api/openapi", apiKeyAdminRouter);

// Setup routes (municipality GeoJSON setup + bulk ID download)
app.use("/api/setup", setupRouter);

// Portal household self-registration (resident portal → BIMS DB)
app.use("/api/portal/household", portalHouseholdRouter);

// Certificate template management + PDF generation (AC4)
app.use("/api/certificates", certificateRouter);

// Portal registration review (approve/reject/under-review/request-docs)
app.use("/api/portal-registration", registrationRouter);

// Core BIMS routes
app.use("/api", municipalityRouter);
app.use("/api", userRouter);
app.use("/api", barangayRouter);
app.use("/api", residentRouter);      // READ-ONLY + classifications
app.use("/api", householdRouter);     // READ-ONLY (portal registers households)
app.use("/api/logs", logsRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api", petsRouter);
app.use("/api", vaccineRouter);
app.use("/api", archivesRouter);
app.use("/api", inventoriesRouter);
app.use("/api", requestRouter);
app.use("/api", gisRouter);
app.use("/api", counterRouter);
app.use("/api/redis", redisRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/system-management", systemManagementRouter);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "BIMS Server is running",
    version: "2.0.0",
  });
});

app.use("/welcome", (req, res) => {
  res.status(200).send("Welcome to the BIMS API v2");
});

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
