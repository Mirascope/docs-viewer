import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { LLMPage } from "@/src/components/routes/llms";
import { environment } from "@/src/lib/content/environment";
import { ContentErrorHandler } from "@/src/components";
import { LLMContent } from "@/src/lib/content/llm-content";
import { loadDocRegistry } from "@/src/lib/content";
import DocsSidebar from "@/src/components/routes/docs/DocsSidebar";
import type { ProductName } from "@/src/lib/content/spec";

/**
 * Loader for product-specific LLM document viewer routes
 * Handles routes like /docs/mirascope/llms, /docs/lilypad/llms
 */
async function productLlmDocLoader({ params }: { params: { product: ProductName } }) {
  const { product } = params;

  // Validate product
  if (product !== "mirascope" && product !== "lilypad") {
    throw new Error(`Invalid product: ${product}`);
  }

  // Construct paths to both JSON and TXT files
  const jsonPath = `/static/content/docs/${product}/llms-full.json`;
  const txtPath = `/docs/${product}/llms-full.txt`;

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
      viewerPath: `/docs/${product}/llms`,
      product,
      registry,
    };
  } catch (error) {
    console.error(`Error loading LLM doc: ${jsonPath}`, error);
    throw error;
  }
}

export const Route = createFileRoute("/docs/$product/llms-full")({
  component: ProductLLMDocViewerPage,

  loader: productLlmDocLoader,

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
    from: "/docs/$product/llms-full",
    structuralSharing: false,
  });

  const { content, txtPath, product, registry } = data;

  return (
    <LLMPage
      content={content}
      txtPath={txtPath}
      leftSidebar={<DocsSidebar product={product} registry={registry} />}
    />
  );
}
