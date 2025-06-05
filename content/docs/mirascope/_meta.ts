import type { ProductSpec, SectionSpec } from "@/src/lib/content/spec";
import api from "./api/_meta";

const docsSection: SectionSpec = {
  label: "Docs",
  slug: "index",
  weight: 2,
  children: [
    {
      slug: "index",
      label: "Mirascope V2",
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
      slug: "async",
      label: "Async",
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
