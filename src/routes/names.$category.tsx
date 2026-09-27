import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { NameCategoryNav } from "@/components/site/NameCategoryNav";
import { NameGrid } from "@/components/site/NameGrid";
import { SiteHeader, SiteFooter } from "@/components/site/Layout";
import { useRevealOnScroll } from "@/components/site/use-reveal";
import { FONT_OPTIONS } from "@/components/site/previewer-types";
import { getCategory } from "@/content/boat-names";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/names/$category")({
  loader: ({ params }) => {
    const cat = getCategory(params.category);
    if (!cat) throw notFound();
    return { slug: cat.slug };
  },
  component: CategoryPage,
  head: ({ loaderData }) => {
    const cat = loaderData ? getCategory(loaderData.slug) : undefined;
    if (!cat) return {};
    const url = `${SITE_URL}/names/${cat.slug}`;
    const title = `${cat.titleTopic} — ${cat.names.length} Ideas | boatnames.ca`;
    return {
      meta: [
        { title },
        { name: "description", content: cat.description },
        { property: "og:title", content: title },
        { property: "og:description", content: cat.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: cat.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "ItemList",
                name: cat.heading,
                url,
                numberOfItems: cat.names.length,
                itemListElement: cat.names.map((name, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name,
                })),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Boat name ideas",
                    item: `${SITE_URL}/names`,
                  },
                  { "@type": "ListItem", position: 3, name: cat.heading, item: url },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
});

function CategoryPage() {
  useRevealOnScroll();
  const { slug } = Route.useLoaderData();
  const cat = getCategory(slug);
  if (!cat) return null; // unreachable: the loader 404s unknown slugs
  const fontLabel = FONT_OPTIONS.find((f) => f.key === cat.font)?.label ?? "";

  return (
    <div className="min-h-screen bg-[color:var(--hull)] text-[color:var(--gelcoat)]">
      <SiteHeader />
      <section className="border-b border-[color:var(--wake)]/10">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-40 lg:px-10">
          <nav
            aria-label="Breadcrumb"
            className="font-mono text-[11px] tracking-[0.2em] text-[color:var(--wake)]"
          >
            <Link to="/names" className="hover:text-[color:var(--gelcoat)]">
              BOAT NAME IDEAS
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-[color:var(--polish)]">{cat.label.toUpperCase()}</span>
          </nav>
          <h1 className="mt-6 max-w-3xl font-sans text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
            {cat.heading}.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-[color:var(--gelcoat)]/85">{cat.intro}</p>
          <p className="mt-4 max-w-3xl text-[color:var(--gelcoat)]/70">
            {cat.names.length} ideas, shown in {fontLabel}. Tap any name to open it in the
            previewer, then change the font, finish and letter height to suit your boat.
          </p>
          <div className="mt-10">
            <NameCategoryNav current={cat.slug} />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <NameGrid names={cat.names.map((name) => ({ name, font: cat.font }))} />
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              to="/"
              hash="previewer"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
            >
              DESIGN YOUR OWN NAME →
            </Link>
            <Link
              to="/names"
              className="font-mono text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] hover:underline"
            >
              BROWSE ALL CATEGORIES →
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
