import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  // Use DOCS_VIEWER_DIR if available, otherwise current directory
  root: process.env.DOCS_VIEWER_DIR || process.cwd(),
  plugins: [TanStackRouterVite({ autoCodeSplitting: true }), viteReact(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(process.env.DOCS_VIEWER_DIR || process.cwd(), "./"),
    },
  },
  // Add node-specific configuration for fs and path
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    exclude: ["content"],
  },
  server: {
    fs: {
      strict: false,
    },
  },

  // Keeping the default build configuration
  build: {
    assetsInlineLimit: 4096, // Default inline limit
  },
});
