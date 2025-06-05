/**
 * DocRegistry - A singleton service for efficient document information management
 *
 * This provides a canonical source for document information with efficient
 * lookups and hierarchical path management for sections and weights.
 */

import type { FullDocsSpec, DocInfo, ProductName, ProductSpec, SectionSpec, DocSpec } from "./spec";
import { getDocsFromSpec, processDocSpec } from "./spec";
import { loadJsonMeta } from "./json-meta";

/**
 * DocRegistry service - For efficient document information management
 */
export class DocRegistry {
  // List of all docs from the spec
  private readonly allDocs: DocInfo[];

  // Path lookup maps for efficient querying
  private readonly pathToDocInfo: Map<string, DocInfo>;
  private readonly routePathToDocInfo: Map<string, DocInfo>;

  // Product information
  private readonly products: Map<ProductName, ProductSpec>;

  constructor(spec: FullDocsSpec) {
    // Initialize lookups
    this.pathToDocInfo = new Map();
    this.routePathToDocInfo = new Map();
    this.products = new Map();

    // Process the full docs spec to generate all DocInfo objects
    this.allDocs = getDocsFromSpec(spec);

    // Store product specs for access
    spec.forEach((productSpec) => {
      this.products.set(productSpec.product, productSpec);
    });

    // Build lookup maps for efficient access
    this.buildLookupMaps();
  }

  /**
   * Builds efficient lookup maps for paths and route paths
   */
  private buildLookupMaps(): void {
    for (const docInfo of this.allDocs) {
      // Map content paths to DocInfo (for content loading)
      this.pathToDocInfo.set(docInfo.path, docInfo);

      // Map route paths to DocInfo (for URL routing)
      this.routePathToDocInfo.set(docInfo.routePath, docInfo);

      // Also add versions with and without trailing slashes for robustness
      if (docInfo.routePath.endsWith("/")) {
        this.routePathToDocInfo.set(docInfo.routePath.slice(0, -1), docInfo);
      } else {
        this.routePathToDocInfo.set(docInfo.routePath + "/", docInfo);
      }
    }
  }

  /**
   * Get all documents from the spec
   * Returns a defensive copy to prevent mutation of internal state
   */
  getAllDocs(): DocInfo[] {
    return [...this.allDocs]; // Return a shallow copy to prevent mutation
  }

  /**
   * Get DocInfo for a specific content path
   */
  getDocInfoByPath(path: string): DocInfo | undefined {
    return this.pathToDocInfo.get(path);
  }

  /**
   * Get DocInfo for a specific route path
   */
  getDocInfoByRoutePath(routePath: string): DocInfo | undefined {
    return this.routePathToDocInfo.get(routePath);
  }

  /**
   * Get all docs for a specific product
   */
  getDocsByProduct(product: ProductName): DocInfo[] {
    return this.allDocs.filter((doc) => doc.product === product);
  }

  /**
   * Get the raw product specification
   */
  getProductSpec(product: ProductName): ProductSpec | undefined {
    return this.products.get(product);
  }

  /**
   * Get all available product names
   */
  getProductNames(): ProductName[] {
    return Array.from(this.products.keys());
  }

  /**
   * Get all doc specs from a particular product and section
   */
  getDocsInSection(product: ProductName, sectionSlug: string): DocInfo[] {
    const productSpec = this.products.get(product);
    if (!productSpec) return [];

    const section = productSpec.sections.find((s) => s.slug === sectionSlug);
    if (!section) return [];

    const isDefaultSection = section.slug === "index";
    const sectionPathPrefix = isDefaultSection ? product : `${product}/${section.slug}`;

    // Flatten the section hierarchy
    const result: DocInfo[] = [];
    section.children.forEach((docSpec) => {
      const docItems = processDocSpec(docSpec, product, sectionPathPrefix);
      result.push(...docItems);
    });

    return result;
  }
}

/**
 * Load a DocRegistry from a JSON metadata file
 *
 * @param metaUrl - URL to the JSON metadata file
 * @returns Promise that resolves to a DocRegistry instance
 */
export async function loadDocRegistry(metaUrl: string): Promise<DocRegistry> {
  const spec = await loadJsonMeta(metaUrl);
  return new DocRegistry(spec);
}

// Re-export types for convenience
export type { DocInfo, ProductName, ProductSpec, SectionSpec, DocSpec };
