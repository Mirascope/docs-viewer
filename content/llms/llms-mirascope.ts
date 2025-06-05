import { LLMContent } from "@/src/lib/content/llm-content";
import { include } from "@/src/lib/content/llm-includes";
import { MIRASCOPE } from "@/src/lib/constants/site";

export const mirascopeContent = LLMContent.fromChildren({
  slug: "mirascope",
  title: "Mirascope",
  description: MIRASCOPE.tagline,
  route: "/docs/mirascope/llms-full",
  children: include.directory("mirascope/"),
});

export default mirascopeContent;
