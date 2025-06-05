import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { LLMPage } from "@/src/components/routes/llms";
import { environment } from "@/src/lib/content/environment";
import { ContentErrorHandler } from "@/src/components";
import { LLMContent } from "@/src/lib/content/llm-content";
import { loadDocRegistry } from "@/src/lib/content";
import DocsSidebar from "@/src/components/routes/docs/DocsSidebar";

/**
 * Loader for product-specific LLM document viewer routes
 * Handles routes like /docs/mirascope/llms, /docs/lilypad/llms
 */
async function llmDocLoader() {
  // Construct paths to both JSON and TXT files
  const jsonPath = `/static/content/docs/llms-full.json`;
  const txtPath = `/docs/llms-full.txt`;

  try {
    // Load registry
    const registry = await loadDocRegistry("/static/docs-spec.json");

    // Fetch the processed JSON data
    const response = await environment.fetch(jsonPath);

    if (!response.ok) {
      throw new Error(`LLM document not found: ${jsonPath}`);
    }

    const data = await response.json();
    const content = LLMContent.fromJSON(data);

    return {
      content,
      txtPath,
      viewerPath: `/docs/llms`,
      registry,
    };
  } catch (error) {
    console.error(`Error loading LLM doc: ${jsonPath}`, error);
    throw error;
  }
}

export const Route = createFileRoute("/docs/llms-full")({
  component: ProductLLMDocViewerPage,

  loader: llmDocLoader,

  pendingComponent: () => {
    return <div>Loading LLM document...</div>;
  },

  errorComponent: ({ error }) => {
    environment.onError(error);
    return (
      <ContentErrorHandler
        error={error instanceof Error ? error : new Error(String(error))}
        contentType="llm-docs"
      />
    );
  },
});

function ProductLLMDocViewerPage() {
  const data = useLoaderData({
    from: "/docs/llms-full",
    structuralSharing: false,
  });

  const { content, txtPath, registry } = data;

  return (
    <LLMPage
      content={content}
      txtPath={txtPath}
      leftSidebar={<DocsSidebar product={"mirascope"} registry={registry} />}
    />
  );
}
