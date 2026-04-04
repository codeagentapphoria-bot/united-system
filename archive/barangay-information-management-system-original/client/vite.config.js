import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const config = {
    server: {
      host: "::",
      port: 5173,
      allowedHosts: ["kristen-unslowed-unnefariously.ngrok-free.app", "kristen-unslowed-unnefariously.ngrok-free.dev", ".ngrok-free.app", ".ngrok-free.dev"],
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("react-router-dom")) return "router";
            if (id.includes("react-dom") || id.includes("react")) return "react-vendor";
            if (id.includes("@tanstack")) return "react-query";
            if (id.includes("xlsx")) return "xlsx";
            if (id.includes("react-select")) return "react-select";
            if (id.includes("leaflet") || id.includes("react-leaflet")) return "leaflet";
            if (id.includes("recharts")) return "recharts";
            if (id.includes("zod")) return "zod";
            if (id.includes("@radix-ui")) return "radix";
          },
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
    },
  };

  // Only add HTTPS configuration in development mode
  if (mode === "development") {
    try {
      // Check if SSL certificates exist
      if (fs.existsSync('./localhost-key.pem') && fs.existsSync('./localhost.pem')) {
        config.server.https = {
          key: fs.readFileSync('./localhost-key.pem'),
          cert: fs.readFileSync('./localhost.pem'),
        };
      }
    } catch (error) {
      console.warn('SSL certificates not found, using HTTP for development');
    }
  }

  return config;
});
