#!/usr/bin/env bun

import { spawn } from "child_process";
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

    // Set up environment for vite
    const env = { ...process.env };
    if (contentDir) {
      // Resolve contentDir relative to the original working directory
      const resolvedContentDir = path.resolve(process.cwd(), contentDir);
      env.MIRASCOPE_CONTENT_DIR = resolvedContentDir;
      console.log(`Using content directory: ${resolvedContentDir}`);
    }

    // Set the docs viewer directory in environment for vite config
    env.DOCS_VIEWER_DIR = websiteDir;

    // Force Vite to use the same host address we checked
    // Run from current working directory where dependencies are installed
    const child = spawn(
      "bun",
      [
        "--bun",
        "vite",
        "--config",
        path.join(websiteDir, "vite.config.ts"),
        "--port",
        port,
        "--host",
        host,
      ],
      {
        stdio: ["inherit", "inherit", "pipe"], // Capture stderr for better error handling
        env,
        // Don't change cwd - run from where dependencies are available
      }
    );

    // Capture stderr to provide better error messages
    let errorOutput = "";
    if (child.stderr) {
      child.stderr.on("data", (data) => {
        const output = data.toString();
        errorOutput += output;
        process.stderr.write(output); // Still show errors in real-time
      });
    }

    // Improve error handling
    child.on("error", (error: Error) => {
      console.error(`Failed to start server: ${error.message}`);
      process.exit(1);
    });

    child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
      if (code !== 0) {
        console.error(`Server exited with code ${code}`);
        if (signal) {
          console.error(`Server killed with signal ${signal}`);
        }

        // Show captured error output for debugging
        if (errorOutput.trim()) {
          console.error("\n--- Detailed Error Output ---");
          console.error(errorOutput.trim());
          console.error("--- End Error Output ---\n");
        }

        // Provide helpful debugging information
        console.error("\nDebugging information:");
        console.error(`- Config file: ${path.join(websiteDir, "vite.config.ts")}`);
        console.error(`- Working directory: ${process.cwd()}`);
        console.error(`- Docs viewer directory: ${websiteDir}`);
        console.error(`- Content directory: ${env.MIRASCOPE_CONTENT_DIR || "not set"}`);
      }
    });
  }
}

start();
