#!/usr/bin/env node

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

// Parse command line arguments
const args = process.argv.slice(2);
let port = "3000";
let contentDir = null;

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
function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();

    server.on("error", (e) => {
      if (e.code === "EADDRINUSE") {
        console.error(`Error: Port ${port} is already in use. Please try another port.`);
        resolve(false);
      } else {
        console.error(`Error checking port: ${e.message}`);
        resolve(false);
      }
    });

    // Bind to the same address we'll use for Vite
    server.listen(port, host, () => {
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

    // Force Vite to use the same host address we checked
    spawn("bun", ["--bun", "vite", "--port", port, "--host", host], {
      stdio: "inherit",
      env,
      cwd: websiteDir, // Run from the website directory
    });
  }
}

start();
