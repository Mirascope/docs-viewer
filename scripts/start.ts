#!/usr/bin/env bun

import { createServer } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { json404Middleware } from "./json-404-middleware.ts";
import { contentPreprocessPlugin } from "./preprocess-content.ts";
import http from "http";
import path from "path";
import fs from "fs";

// Parse command line arguments
const args = process.argv.slice(2);
let port = "3000";
let contentDir = "./content";
let workingDir = "./dist";

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--content-dir" && i + 1 < args.length) {
    contentDir = args[i + 1];
    i++; // Skip next argument since it's the value
  } else if (args[i] === "--working-dir" && i + 1 < args.length) {
    workingDir = args[i + 1];
    i++; // Skip next argument since it's the value
  } else if (!args[i].startsWith("--")) {
    port = args[i]; // First non-flag argument is the port
  }
}

const host = "127.0.0.1"; // Explicitly use IPv4 localhost address

// Validate that a directory exists and has the required permissions
function validateDirectory(dir: string, permissions: number, description: string): void {
  if (!fs.existsSync(dir)) {
    throw new Error(`${description} does not exist: ${dir}`);
  }

  try {
    fs.accessSync(dir, permissions);
  } catch (error) {
    const permStr = permissions === fs.constants.R_OK ? "readable" : "writable";
    throw new Error(`${description} is not ${permStr}: ${dir}`);
  }
}

// Setup working directory by wiping and recreating it
function setupWorkingDirectory(workingDir: string): void {
  const resolvedWorkingDir = path.resolve(workingDir);

  // Remove existing directory if it exists
  if (fs.existsSync(resolvedWorkingDir)) {
    fs.rmSync(resolvedWorkingDir, { recursive: true, force: true });
  }

  // Create fresh directory
  fs.mkdirSync(resolvedWorkingDir, { recursive: true });

  // Validate we can write to it
  validateDirectory(resolvedWorkingDir, fs.constants.W_OK, "Working directory");

  console.log(`Working directory setup: ${resolvedWorkingDir}`);
}

// Copy static assets from docs-viewer to working directory
function copyStaticAssets(docsViewerDir: string, workingDir: string): void {
  const resolvedWorkingDir = path.resolve(workingDir);

  // Copy src directory
  const srcSrc = path.join(docsViewerDir, "src");
  const srcDest = path.join(resolvedWorkingDir, "src");
  if (fs.existsSync(srcSrc)) {
    fs.cpSync(srcSrc, srcDest, { recursive: true });
    console.log(`Copied src directory: ${srcSrc} -> ${srcDest}`);
  }

  // Copy mirascope-ui directory
  const uiSrc = path.join(docsViewerDir, "mirascope-ui");
  const uiDest = path.join(resolvedWorkingDir, "mirascope-ui");
  if (fs.existsSync(uiSrc)) {
    fs.cpSync(uiSrc, uiDest, { recursive: true });
    console.log(`Copied mirascope-ui directory: ${uiSrc} -> ${uiDest}`);
  }

  // Copy public directory if it exists
  const publicSrc = path.join(docsViewerDir, "public");
  const publicDest = path.join(resolvedWorkingDir, "public");
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log(`Copied public assets: ${publicSrc} -> ${publicDest}`);
  }

  // Copy index.html if it exists
  const indexSrc = path.join(docsViewerDir, "index.html");
  const indexDest = path.join(resolvedWorkingDir, "index.html");
  if (fs.existsSync(indexSrc)) {
    fs.copyFileSync(indexSrc, indexDest);
    console.log(`Copied index.html: ${indexSrc} -> ${indexDest}`);
  }
}

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

    // Get the docs viewer directory (parent of scripts directory)
    const docsViewerDir = path.dirname(__dirname);

    // Resolve directories relative to the original working directory
    const resolvedContentDir = path.resolve(process.cwd(), contentDir);
    const resolvedWorkingDir = path.resolve(process.cwd(), workingDir);

    // Validate directories
    validateDirectory(docsViewerDir, fs.constants.R_OK, "Docs viewer directory");
    validateDirectory(resolvedContentDir, fs.constants.R_OK, "Content directory");

    // Setup working directory and copy assets
    setupWorkingDirectory(resolvedWorkingDir);
    copyStaticAssets(docsViewerDir, resolvedWorkingDir);

    console.log(`Using content directory: ${resolvedContentDir}`);
    console.log(`Using working directory: ${resolvedWorkingDir}`);

    try {
      // Create vite server with programmatic config
      const server = await createServer({
        configFile: false,
        root: resolvedWorkingDir,
        plugins: [
          TanStackRouterVite({ autoCodeSplitting: true }),
          viteReact(),
          tailwindcss(),
          json404Middleware(),
          contentPreprocessPlugin({
            contentDir: resolvedContentDir,
            workingDir: resolvedWorkingDir,
          }),
        ],
        resolve: {
          alias: {
            "@": path.resolve(docsViewerDir, "./"),
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
      console.error(`- Original working directory: ${process.cwd()}`);
      console.error(`- Docs viewer directory: ${docsViewerDir}`);
      console.error(`- Content directory: ${resolvedContentDir}`);
      console.error(`- Working directory: ${resolvedWorkingDir}`);
      process.exit(1);
    }
  }
}

start();
