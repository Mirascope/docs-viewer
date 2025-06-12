#!/usr/bin/env bun

import { build } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { contentPreprocessPlugin } from "./preprocess-content.ts";
import path from "path";
import fs from "fs";

// Parse command line arguments
const args = process.argv.slice(2);
let contentDir = "./content";
let outputDir = "./dist";

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--content-dir" && i + 1 < args.length) {
    contentDir = args[i + 1];
    i++; // Skip next argument since it's the value
  } else if (args[i] === "--output-dir" && i + 1 < args.length) {
    outputDir = args[i + 1];
    i++; // Skip next argument since it's the value
  }
}

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

// Setup output directory by wiping and recreating it
function setupOutputDirectory(outputDir: string): void {
  const resolvedOutputDir = path.resolve(outputDir);

  // Remove existing directory if it exists
  if (fs.existsSync(resolvedOutputDir)) {
    fs.rmSync(resolvedOutputDir, { recursive: true, force: true });
  }

  // Create fresh directory
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  // Validate we can write to it
  validateDirectory(resolvedOutputDir, fs.constants.W_OK, "Output directory");

  console.log(`Output directory setup: ${resolvedOutputDir}`);
}

// Copy static assets from docs-viewer to output directory
function copyStaticAssets(docsViewerDir: string, outputDir: string): void {
  const resolvedOutputDir = path.resolve(outputDir);

  // Copy src directory
  const srcSrc = path.join(docsViewerDir, "src");
  const srcDest = path.join(resolvedOutputDir, "src");
  if (fs.existsSync(srcSrc)) {
    fs.cpSync(srcSrc, srcDest, { recursive: true });
    console.log(`Copied src directory: ${srcSrc} -> ${srcDest}`);
  }

  // Copy mirascope-ui directory
  const uiSrc = path.join(docsViewerDir, "mirascope-ui");
  const uiDest = path.join(resolvedOutputDir, "mirascope-ui");
  if (fs.existsSync(uiSrc)) {
    fs.cpSync(uiSrc, uiDest, { recursive: true });
    console.log(`Copied mirascope-ui directory: ${uiSrc} -> ${uiDest}`);
  }

  // Copy public directory if it exists
  const publicSrc = path.join(docsViewerDir, "public");
  const publicDest = path.join(resolvedOutputDir, "public");
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log(`Copied public assets: ${publicSrc} -> ${publicDest}`);
  }

  // Copy index.html if it exists
  const indexSrc = path.join(docsViewerDir, "index.html");
  const indexDest = path.join(resolvedOutputDir, "index.html");
  if (fs.existsSync(indexSrc)) {
    fs.copyFileSync(indexSrc, indexDest);
    console.log(`Copied index.html: ${indexSrc} -> ${indexDest}`);
  }
}

async function buildStatic() {
  // Get the docs viewer directory (parent of scripts directory)
  const docsViewerDir = path.dirname(__dirname);

  // Resolve directories relative to the original working directory
  const resolvedContentDir = path.resolve(process.cwd(), contentDir);
  const resolvedOutputDir = path.resolve(process.cwd(), outputDir);

  // Validate directories
  validateDirectory(docsViewerDir, fs.constants.R_OK, "Docs viewer directory");
  validateDirectory(resolvedContentDir, fs.constants.R_OK, "Content directory");

  // Setup output directory and copy assets
  setupOutputDirectory(resolvedOutputDir);
  copyStaticAssets(docsViewerDir, resolvedOutputDir);

  console.log(`Using content directory: ${resolvedContentDir}`);
  console.log(`Building to output directory: ${resolvedOutputDir}`);

  // Run content preprocessing before building
  const { preprocessContent } = await import("./preprocess-content.ts");
  await preprocessContent({
    contentDir: resolvedContentDir,
    workingDir: resolvedOutputDir,
  });

  try {
    // Build static site with programmatic config
    await build({
      configFile: false,
      root: resolvedOutputDir,
      build: {
        outDir: ".",
        assetsInlineLimit: 4096,
        emptyOutDir: false,
      },
      plugins: [
        TanStackRouterVite({ autoCodeSplitting: true }),
        viteReact(),
        tailwindcss(),
        contentPreprocessPlugin({
          contentDir: resolvedContentDir,
          workingDir: resolvedOutputDir,
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
    });

    console.log(`Static build completed successfully!`);
    console.log(`Output directory: ${resolvedOutputDir}`);
  } catch (error) {
    console.error(`Failed to build: ${error}`);
    console.error("\nDebugging information:");
    console.error(`- Original working directory: ${process.cwd()}`);
    console.error(`- Docs viewer directory: ${docsViewerDir}`);
    console.error(`- Content directory: ${resolvedContentDir}`);
    console.error(`- Output directory: ${resolvedOutputDir}`);
    process.exit(1);
  }
}

buildStatic();
