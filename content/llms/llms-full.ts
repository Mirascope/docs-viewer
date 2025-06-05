import { LLMContent } from "@/src/lib/content/llm-content";
import { mirascopeContent } from "./llms-mirascope";

// Create the full document with both sections
const fullContent = LLMContent.fromChildren({
  slug: "llms-full",
  title: "llms-full.txt",
  description: "Concatenated documentation for Mirascope.",
  route: "/llms-full",
  children: [mirascopeContent],
});

// Export content (ToC is generated dynamically in getContent())
export default fullContent;
