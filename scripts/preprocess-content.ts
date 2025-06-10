import fs from "fs";
import path from "path";
import { ContentPreprocessor } from "@/src/lib/content/preprocess";
import { DocRegistry } from "@/src/lib/content";
import { parseAndValidateDocsSpec } from "@/src/lib/content/json-meta";
import { LLMContent } from "@/src/lib/content/llm-content";
import { SITE_URL, getAllRoutes } from "@/src/lib/router-utils";
import type { BlogMeta } from "@/src/lib/content";

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

    await generateSitemap(
      preprocessor.getMetadataByType().blog,
      preprocessor.getLLMContent(),
      contentDir
    );
    return;
  } catch (error) {
    console.error("Error during preprocessing:", error);
    throw error; // Let the caller handle the error
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

// Import proper Vite types
import type { ViteDevServer } from "vite";

export function contentPreprocessPlugin(
  options: { verbose?: boolean; contentDir?: string } = { verbose: true, contentDir: undefined }
) {
  const { verbose = true, contentDir } = options;
  const baseContentDir = contentDir || path.join(process.cwd(), "content");

  return {
    name: "content-preprocess-plugin",
    apply: "serve" as const,

    // Run initial preprocessing when plugin loads
    buildStart() {
      preprocessContent({ verbose, contentDir: baseContentDir }).catch((error) => {
        console.error("Error preprocessing content:", error);
      });
    },

    configureServer(server: ViteDevServer) {
      // Watch content directory for changes
      server.watcher.add(baseContentDir);

      // Re-run preprocessing when content files change
      server.watcher.on("change", (filePath: string) => {
        if (filePath.endsWith(".mdx") && filePath.includes("/content/")) {
          console.log(`Content file changed: ${path.relative(process.cwd(), filePath)}`);
          preprocessContent({ verbose: false, contentDir: baseContentDir }).catch((error) => {
            console.error("Error preprocessing content after change:", error);
          });
        }
      });

      server.watcher.on("add", (filePath: string) => {
        if (filePath.endsWith(".mdx") && filePath.includes("/content/")) {
          console.log(`Content file added: ${path.relative(process.cwd(), filePath)}`);
          preprocessContent({ verbose: false, contentDir: baseContentDir }).catch((error) => {
            console.error("Error preprocessing content after add:", error);
          });
        }
      });

      server.watcher.on("unlink", (filePath: string) => {
        if (filePath.endsWith(".mdx") && filePath.includes("/content/")) {
          console.log(`Content file deleted: ${path.relative(process.cwd(), filePath)}`);
          preprocessContent({ verbose: false, contentDir: baseContentDir }).catch((error) => {
            console.error("Error preprocessing content after delete:", error);
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
