import express from "express";
import cors from "cors";
import morgan from "morgan";
import compression from "compression";
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
import requestsRouter from "./src/routes/requestsRoutes.js";
import gisRouter from "./src/routes/gisRoute.js";
import counterRouter from "./src/routes/counterRoutes.js";
import redisRouter from "./src/routes/redisRoutes.js";
import monitoringRouter from "./src/routes/monitoringRoutes.js";
import systemManagementRouter from "./src/routes/systemManagementRoutes.js";
import openApiRouter from "./src/routes/openApiRoutes.js";
import apiKeyAdminRouter from "./src/routes/apiKeyAdminRoutes.js";
import ApiKeyModel from "./src/models/ApiKey.js";
import { errorHandler, notFoundHandler } from "./src/middlewares/error.js";
import { testRedisConnection } from "./src/config/redis.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
}));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Ensure api_keys table exists on startup (non-blocking)
ApiKeyModel.ensureTable().catch((e) => {
  console.error("Failed to ensure api_keys table:", e?.message);
});

// Serve the uploads folder at /uploads and /api/uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRouter);

// Mount Open API and API key admin routes under same parent
app.use("/api/openapi", openApiRouter);
app.use("/api/openapi", apiKeyAdminRouter);

// Other routers (may enforce JWT internally)
app.use("/api", municipalityRouter);
app.use("/api", userRouter);
app.use("/api", barangayRouter);
app.use("/api", residentRouter);
app.use("/api", householdRouter);
app.use("/api/logs", logsRouter);
app.use("/api/statistics", statisticsRouter);
app.use("/api", petsRouter);
app.use("/api", vaccineRouter);
app.use("/api", archivesRouter);
app.use("/api", inventoriesRouter);
app.use("/api", requestsRouter);
app.use("/api", gisRouter);
app.use("/api", counterRouter);
app.use("/api/redis", redisRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/system-management", systemManagementRouter);

app.use("/welcome", (req, res) => {
  res.status(200).send("Welcome to the API");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "Server is running"
  });
});

// Catch 404 routes
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

export default app;
