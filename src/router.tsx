import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Plain query-string search params (no JSON encoding). TanStack Router's default
// serializer JSON-stringifies any value that parses as JSON, so a string "8"
// becomes size="8" in the URL — which previewer-url.ts then reads back as NaN.
// The only route with search is "/", whose design params (name/port/font/finish/
// size) are all plain strings, so URLSearchParams round-trips them exactly and
// keeps shared/bookmarked design links clean (size=8, matching previewShareUrl).
function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(search)) {
    const val = search[key];
    if (val == null) continue;
    params.set(key, typeof val === "string" ? val : String(val));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

function parseSearch(search: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(search));
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    parseSearch,
    stringifySearch,
  });

  return router;
};
