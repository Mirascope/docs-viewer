#!/usr/bin/env bun

import { createServer } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import http from "http";
import path from "path";

// Parse command line arguments
const args = process.argv.slice(2);
let port = "3000";
let contentDir: string | null = null;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--content-dir" && i + 1 < args.length) {
    contentDir = args[i + 1];
    i++; // Skip next argument since it's the value
  } else if (!args[i].startsWith("--")) {
    port = args[i]; // First non-flag argument is the port
  }
}

const host = "127.0.0.1"; // Explicitly use IPv4 localhost address

// Check if the port is in use by trying to bind to the specific address
function checkPort(port: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();

    server.on("error", (e: any) => {
      if (e.code === "EADDRINUSE") {
        console.error(`Error: Port ${port} is already in use. Please try another port.`);
        resolve(false);
      } else {
        console.error(`Error checking port: ${e.message}`);
        resolve(false);
      }
    });

    // Bind to the same address we'll use for Vite
    server.listen(parseInt(port), host, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

async function start() {
  console.log(`Checking if port ${port} is available on ${host}...`);
  const isAvailable = await checkPort(port);

  if (!isAvailable) {
    process.exit(1);
  } else {
    console.log(`Port ${port} is available. Starting server...`);

    // Get the website directory (parent of scripts directory)
    const websiteDir = path.dirname(__dirname);

    // Set up environment variables
    if (contentDir) {
      // Resolve contentDir relative to the original working directory
      const resolvedContentDir = path.resolve(process.cwd(), contentDir);
      process.env.MIRASCOPE_CONTENT_DIR = resolvedContentDir;
      console.log(`Using content directory: ${resolvedContentDir}`);
    }

    // Set the docs viewer directory in environment for vite config
    process.env.DOCS_VIEWER_DIR = websiteDir;

    try {
      // Create vite server with programmatic config
      const server = await createServer({
        configFile: false,
        root: websiteDir,
        plugins: [TanStackRouterVite({ autoCodeSplitting: true }), viteReact(), tailwindcss()],
        resolve: {
          alias: {
            "@": path.resolve(websiteDir, "./"),
          },
        },
        optimizeDeps: {
          esbuildOptions: {
            define: {
              global: "globalThis",
            },
          },
          exclude: ["content"],
        },
        server: {
          port: parseInt(port),
          host: host,
          fs: {
            strict: false,
          },
        },
        build: {
          assetsInlineLimit: 4096,
        },
      });

      await server.listen();
      console.log(`Server started on http://${host}:${port}`);

      // Handle shutdown gracefully
      process.on("SIGTERM", async () => {
        console.log("Shutting down server...");
        await server.close();
        process.exit(0);
      });

      process.on("SIGINT", async () => {
        console.log("Shutting down server...");
        await server.close();
        process.exit(0);
      });
    } catch (error) {
      console.error(`Failed to start server: ${error}`);
      console.error("\nDebugging information:");
      console.error(`- Working directory: ${process.cwd()}`);
      console.error(`- Docs viewer directory: ${websiteDir}`);
      console.error(`- Content directory: ${process.env.MIRASCOPE_CONTENT_DIR || "not set"}`);
      process.exit(1);
    }
  }
}

start();
