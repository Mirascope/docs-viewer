import type { ProductSpec, SectionSpec } from "@/src/lib/content/spec";
import api from "./api/_meta";

const docsSection: SectionSpec = {
  label: "Docs",
  slug: "index",
  weight: 2,
  children: [
    {
      slug: "index",
      label: "Welcome",
    },
    {
      slug: "learn",
      label: "Learn",
      weight: 2,
      children: [
        {
          slug: "index",
          label: "Overview",
        },
        {
          slug: "prompts",
          label: "Prompts",
        },
        {
          slug: "calls",
          label: "Calls",
        },
        {
          slug: "streams",
          label: "Streams",
        },
        {
          slug: "chaining",
          label: "Chaining",
        },
        {
          slug: "response_models",
          label: "Response Models",
        },
        {
          slug: "json_mode",
          label: "JSON Mode",
        },
        {
          slug: "output_parsers",
          label: "Output Parsers",
        },
        {
          slug: "tools",
          label: "Tools",
        },
        {
          slug: "agents",
          label: "Agents",
        },
        {
          slug: "evals",
          label: "Evals",
        },
        {
          slug: "async",
          label: "Async",
        },
        {
          slug: "retries",
          label: "Retries",
        },
        {
          slug: "local_models",
          label: "Local Models",
        },
      ],
    },
  ],
};

/**
 * Documentation structure for mirascope in new DocSpec format
 */
const mirascopeSpec: ProductSpec = {
  product: "mirascope",
  sections: [docsSection, api],
};
export default mirascopeSpec;
