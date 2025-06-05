import { LLMContent } from "@/src/lib/content/llm-content";
import { MIRASCOPE } from "@/src/lib/constants/site";

export const mirascopeContent = LLMContent.fromChildren({
  slug: "mirascope",
  title: "Mirascope",
  description: MIRASCOPE.tagline,
  route: "/docs/mirascope/llms-full",
  children: [],
});

export default mirascopeContent;
