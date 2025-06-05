import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getProductRoute } from "@/src/lib/routes";
import { environment } from "@/src/lib/content/environment";
import { ContentErrorHandler } from "@/src/components/";

export const Route = createFileRoute("/")({
  component: RootIndexPage,
  errorComponent: ({ error }) => {
    environment.onError(error);
    return (
      <ContentErrorHandler
        error={error instanceof Error ? error : new Error(String(error))}
        contentType="docs"
      />
    );
  },
});

function RootIndexPage() {
  return <Navigate to={getProductRoute("mirascope")} />;
}
