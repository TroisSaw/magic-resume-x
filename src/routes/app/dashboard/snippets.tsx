import { createFileRoute } from "@tanstack/react-router";
import SnippetsPage from "@/app/app/dashboard/snippets/page";

export const Route = createFileRoute("/app/dashboard/snippets")({
  component: SnippetsPage
});
