import { z } from "zod";
import { environment } from "./environment";
import type { FullDocsSpec } from "./spec";
import { validateFullDocsSpec } from "./spec";

// Zod schema for ProductName
const ProductNameSchema = z.enum(["mirascope", "lilypad"]);

// Zod schema for DocSpec (recursive)
const DocSpecSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    slug: z.string(),
    label: z.string(),
    children: z.array(DocSpecSchema).optional(),
    weight: z.number().optional(),
  })
);

// Zod schema for SectionSpec
const SectionSpecSchema = z.object({
  slug: z.string(),
  label: z.string(),
  children: z.array(DocSpecSchema),
  weight: z.number().optional(),
});

// Zod schema for ProductSpec
const ProductSpecSchema = z.object({
  product: ProductNameSchema,
  sections: z.array(SectionSpecSchema),
  weight: z.number().optional(),
});

// Zod schema for FullDocsSpec
const FullDocsSpecSchema = z.array(ProductSpecSchema);

/**
 * Parse and validate raw JSON data into a FullDocsSpec
 * This can be used with data loaded from any source (fetch, fs, etc.)
 */
export function parseAndValidateDocsSpec(jsonData: unknown): FullDocsSpec {
  // Parse with Zod
  const parsed = FullDocsSpecSchema.parse(jsonData);

  // Additional validation using existing spec validators
  const validation = validateFullDocsSpec(parsed);
  if (!validation.isValid) {
    throw new Error(`Invalid docs specification: ${validation.errors.join(", ")}`);
  }

  return parsed as FullDocsSpec;
}

/**
 * Load and validate JSON metadata from a URL
 */
export async function loadJsonMeta(url: string): Promise<FullDocsSpec> {
  const response = await environment.fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch JSON metadata from ${url}: ${response.statusText}`);
  }

  const jsonData = await response.json();

  return parseAndValidateDocsSpec(jsonData);
}

/**
 * Load JSON metadata from static file (client-side)
 */
export async function loadJsonMetaFromStatic(): Promise<FullDocsSpec> {
  return loadJsonMeta("/static/docs-spec.json");
}
