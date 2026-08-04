import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/report-error";
import { SITE_URL } from "../lib/site";
import { BoatnamesLogo } from "../components/site/BoatnamesLogo";
const SITE_TITLE = "Custom Boat Name Lettering — Vinyl & Acrylic | boatnames.ca";
const SITE_DESCRIPTION =
  "Design your boat's name online and see it on the transom before you buy. Cut vinyl and dimensional cast acrylic boat name lettering and decals, shipped across Canada. An A1 company.";
const OG_IMAGE = `${SITE_URL}/images/og-boatnames.jpg`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--hull)] px-6 text-center">
      <BoatnamesLogo className="h-8" taglineClassName="block" />
      <p className="mt-12 font-mono text-[11px] tracking-[0.3em] text-[color:var(--polish)]">
        ERROR 404
      </p>
      <h1 className="mt-4 font-sans text-5xl font-bold uppercase tracking-tight text-[color:var(--gelcoat)] sm:text-6xl">
        Off the chart
      </h1>
      <p className="mt-4 max-w-md text-sm text-[color:var(--gelcoat)]/70">
        This page has slipped its mooring — it doesn't exist or has moved. Let's get you back to
        open water.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-sm border border-[color:var(--polish)] px-4 py-2 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] transition hover:bg-[color:var(--polish)]/10"
      >
        BACK TO HOME →
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--hull)] px-6 text-center">
      <BoatnamesLogo className="h-8" taglineClassName="block" />
      <p className="mt-12 font-mono text-[11px] tracking-[0.3em] text-[color:var(--polish)]">
        SOMETHING WENT WRONG
      </p>
      <h1 className="mt-4 font-sans text-4xl font-bold uppercase tracking-tight text-[color:var(--gelcoat)] sm:text-5xl">
        This page didn't load
      </h1>
      <p className="mt-4 max-w-md text-sm text-[color:var(--gelcoat)]/70">
        Something went wrong on our end. Try refreshing, or head back home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex items-center gap-2 rounded-sm bg-[color:var(--polish)] px-4 py-2 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:opacity-90"
        >
          TRY AGAIN
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--wake)]/40 px-4 py-2 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]"
        >
          GO HOME
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#141A20" },
      { name: "author", content: "boatnames.ca" },
      { property: "og:site_name", content: "boatnames.ca" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: SITE_TITLE },
      { property: "og:title", content: SITE_TITLE },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:description", content: SITE_DESCRIPTION },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "boatnames.ca — custom boat name lettering" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/images/boatnames-avatar.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "48x48" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Alex+Brush&family=Bebas+Neue&family=Big+Shoulders+Display:wght@700;800&family=JetBrains+Mono:wght@400&family=Playfair+Display:ital,wght@1,800&family=Poppins:wght@400;500;600;700&family=Yeseva+One&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
