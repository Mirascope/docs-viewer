import fs from "fs";
import path from "path";
import { ContentPreprocessor } from "@/src/lib/content/preprocess";
import { DocRegistry } from "@/src/lib/content";
import { parseAndValidateDocsSpec } from "@/src/lib/content/json-meta";
import { LLMContent } from "@/src/lib/content/llm-content";
import { include } from "@/src/lib/content/llm-includes";
import { SITE_URL, getAllRoutes } from "@/src/lib/router-utils";
import type { BlogMeta } from "@/src/lib/content";
import { MIRASCOPE } from "@/src/lib/constants/site";

/**
 * Generate LLM content dynamically from the doc registry
 */
function generateLLMContent(registry: DocRegistry, contentDir: string): LLMContent[] {
  const mirascopeChildren = include.flatTree("", registry, path.join(contentDir, "docs"));

  const mirascopeContent = LLMContent.fromChildren({
    slug: "mirascope",
    title: "Mirascope",
    description: MIRASCOPE.tagline,
    route: "/docs/llms-full",
    children: mirascopeChildren,
  });

  return [mirascopeContent];
}

/**
 * Main processing function that generates static JSON files for all MDX content,
 * processes template files, and creates a sitemap.xml file
 */
export async function preprocessContent(
  options: { verbose?: boolean; contentDir?: string } = {}
): Promise<void> {
  const { verbose = true, contentDir = path.join(process.cwd(), "content") } = options;

  try {
    // Load the registry from the _meta.json file using fs
    const metaPath = path.join(contentDir, "docs", "_meta.json");
    const jsonData = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const validatedSpec = parseAndValidateDocsSpec(jsonData);
    const registry = new DocRegistry(validatedSpec);

    // Use DOCS_VIEWER_DIR if available, otherwise current working directory
    const baseDir = process.env.DOCS_VIEWER_DIR || process.cwd();
    const preprocessor = new ContentPreprocessor(baseDir, registry, contentDir, verbose);
    await preprocessor.processAllContent();

    if (verbose) console.log("Processing LLM documents...");
    const llmMeta = generateLLMContent(registry, contentDir);
    await writeLLMDocuments(llmMeta, verbose);

    await generateSitemap(preprocessor.getMetadataByType().blog, llmMeta, contentDir);
    return;
  } catch (error) {
    console.error("Error during preprocessing:", error);
    throw error; // Let the caller handle the error
  }
}

/**
 * Write LLM documents to disk as JSON and TXT files
 */
async function writeLLMDocuments(llmDocs: LLMContent[], verbose = true): Promise<void> {
  const publicDir = path.join(process.cwd(), "public");

  for (const doc of llmDocs) {
    const routePath = doc.route!;

    // Write JSON file for viewer consumption at public/static/content/{routePath}.json
    const jsonPath = path.join(publicDir, "static", "content", `${routePath}.json`);
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(doc.toJSON(), null, 2));

    // Write TXT file for direct LLM consumption at public/{routePath}.txt
    const txtPath = path.join(publicDir, `${routePath}.txt`);
    fs.mkdirSync(path.dirname(txtPath), { recursive: true });
    fs.writeFileSync(txtPath, doc.getContent());

    if (verbose) {
      console.log(`Generated LLM document: ${routePath} (${doc.tokenCount} tokens)`);
    }
  }
}

/**
 * Generate sitemap.xml file based on the processed content
 */
async function generateSitemap(
  blogPosts: BlogMeta[],
  llmDocs: LLMContent[],
  contentDir?: string
): Promise<void> {
  console.log("Generating sitemap.xml...");

  // Get all routes using our centralized utility
  const uniqueRoutes = getAllRoutes(false, contentDir).filter((route) => route !== "/404");

  // Use the blog posts metadata
  const postsList = blogPosts || [];

  // Current date for default lastmod
  const today = new Date().toISOString().split("T")[0];

  // Get the date of the latest blog post for the /blog route
  const latestBlogDate =
    postsList.length > 0 ? postsList[0].lastUpdated || postsList[0].date : today;

  // Generate sitemap XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add LLM document URLs to the sitemap
  llmDocs.forEach((llmDoc) => {
    // Add the .txt file
    xml += "  <url>\n";
    xml += `    <loc>${SITE_URL}${llmDoc.route}.txt</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += "    <changefreq>daily</changefreq>\n";
    xml += "  </url>\n";
  });

  // Add each URL
  uniqueRoutes.forEach((route) => {
    xml += "  <url>\n";
    xml += `    <loc>${SITE_URL}${route}</loc>\n`;

    // Set lastmod based on whether it's a blog post, blog index, or other page
    if (route === "/blog") {
      xml += `    <lastmod>${latestBlogDate}</lastmod>\n`;
      xml += "    <changefreq>daily</changefreq>\n";
    } else if (route.startsWith("/blog/")) {
      // Find the post to get its lastUpdated date
      const postSlug = route.replace("/blog/", "");
      const post = postsList.find((p) => p.slug === postSlug);
      if (post) {
        xml += `    <lastmod>${post.lastUpdated || post.date}</lastmod>\n`;
      } else {
        xml += `    <lastmod>${today}</lastmod>\n`;
      }
      xml += "    <changefreq>weekly</changefreq>\n";
    } else {
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += "    <changefreq>daily</changefreq>\n";
    }

    xml += "  </url>\n";
  });

  xml += "</urlset>";

  // Write to file
  const outFile = path.join(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outFile, xml);
}

// Vite server interface for TypeScript
interface ViteDevServer {
  httpServer?: {
    once(event: string, callback: () => void): void;
  };
  watcher: {
    add(path: string): void;
    on(event: string, callback: (path: string) => void): void;
  };
}

export function contentPreprocessPlugin(
  options: { verbose?: boolean; contentDir?: string } = { verbose: true, contentDir: undefined }
) {
  const { contentDir } = options;
  const baseContentDir = contentDir || path.join(process.cwd(), "content");

  // Get all content directories (docs includes LLM document templates)
  const contentDirs = ["docs"].map((type) => path.join(baseContentDir, type));

  return {
    name: "content-preprocess-plugin",
    // Only apply during development
    apply: "serve" as const,
    configureServer(server: ViteDevServer) {
      const { verbose } = options;

      // Run preprocessing when the server starts
      server.httpServer?.once("listening", async () => {
        if (verbose) console.log("Initial content preprocessing for development...");
        await preprocessContent({ verbose, contentDir: baseContentDir }).catch((error) => {
          console.error("Error preprocessing content:", error);
        });
      });

      // Create the base content directory if it doesn't exist
      if (!fs.existsSync(baseContentDir)) {
        fs.mkdirSync(baseContentDir, { recursive: true });
      }

      // Always watch the base content directory
      server.watcher.add(baseContentDir);

      // Set up watching on content directories
      contentDirs.forEach((dir) => {
        // Create the directory if it doesn't exist
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        if (verbose) console.log(`Watching directory for changes: ${dir}`);
        server.watcher.add(dir);
      });

      // React to content changes - these will work for any content directory
      server.watcher.on("change", async (filePath: string) => {
        if (
          (filePath.endsWith(".mdx") || filePath.endsWith(".ts")) &&
          filePath.includes("/content/")
        ) {
          if (verbose) console.log(`Content file changed: ${filePath}`);
          await preprocessContent({ verbose: false, contentDir: baseContentDir }).catch((error) => {
            console.error("Error preprocessing content after file change:", error);
          });
        }
      });

      server.watcher.on("add", async (filePath: string) => {
        if (
          (filePath.endsWith(".mdx") || filePath.endsWith(".ts")) &&
          filePath.includes("/content/")
        ) {
          if (verbose) console.log(`Content file added: ${filePath}`);
          await preprocessContent({ verbose: false, contentDir: baseContentDir }).catch((error) => {
            console.error("Error preprocessing content after file add:", error);
          });
        }
      });

      server.watcher.on("unlink", async (filePath: string) => {
        if (
          (filePath.endsWith(".mdx") || filePath.endsWith(".ts")) &&
          filePath.includes("/content/")
        ) {
          if (verbose) console.log(`Content file deleted: ${filePath}`);
          await preprocessContent({ verbose: false, contentDir: baseContentDir }).catch((error) => {
            console.error("Error preprocessing content after file delete:", error);
          });
        }
      });
    },
  };
}

// Run the preprocessing when this script is executed directly
if (import.meta.main) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const contentDirIndex = args.indexOf("--content-dir");
  const contentDir =
    contentDirIndex !== -1 && args[contentDirIndex + 1] ? args[contentDirIndex + 1] : undefined;

  preprocessContent({ contentDir }).catch((error) => {
    console.error("Fatal error during preprocessing:", error);
    process.exit(1);
  });
}
