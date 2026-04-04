// server.js
import app from "./app.js";
import { connectDB, closePool } from "./src/config/db.js";
import logger from "./src/utils/logger.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    await closePool();
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION 💥 Shutting down...");
  logger.error("Error:", err);
  process.exit(1);
});

startServer();
