import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { NameCategoryNav } from "@/components/site/NameCategoryNav";
import { NameGrid } from "@/components/site/NameGrid";
import { SiteHeader, SiteFooter } from "@/components/site/Layout";
import { useRevealOnScroll } from "@/components/site/use-reveal";
import { CATEGORIES, allNames, getCategory } from "@/content/boat-names";
import { SITE_URL } from "@/lib/site";

const ALL = allNames();
const TITLE = `Boat Name Ideas — ${ALL.length} Names by Category | boatnames.ca`;
const DESCRIPTION = `${ALL.length} boat name ideas — funny, fishing, sailboat, pontoon, classic and Canadian. Tap any name to see it on a real transom in cut vinyl or cast acrylic.`;
const CANONICAL = `${SITE_URL}/names`;

const TIPS: [string, string][] = [
  [
    "Say it out loud",
    "You'll say the name over the VHF radio and to every marina on the phone. If it has to be spelled or explained every time, it's probably too clever.",
  ],
  [
    "Shorter carries farther",
    "Short names read at a distance and can go bigger on the transom. A long name needs a smaller letter height so the run still fits the panel.",
  ],
  [
    "Match the boat",
    "A script name suits a cruiser or sailboat; a bold, condensed face suits a wake boat or bass boat. Try both in the previewer before deciding.",
  ],
  [
    "Plan the hailing port",
    "Many owners add their home port or lake on a second, smaller line. Decide now so the name and port are laid out together.",
  ],
];

export const Route = createFileRoute("/names/")({
  component: NamesPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${CANONICAL}#page`,
              name: "Boat name ideas",
              url: CANONICAL,
              description: DESCRIPTION,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              hasPart: CATEGORIES.map((c) => ({
                "@type": "CollectionPage",
                name: c.heading,
                url: `${SITE_URL}/names/${c.slug}`,
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
                { "@type": "ListItem", position: 2, name: "Boat name ideas", item: CANONICAL },
              ],
            },
          ],
        }),
      },
    ],
  }),
});

function NamesPage() {
  useRevealOnScroll();
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? ALL.filter((e) => e.name.toLowerCase().includes(q)) : ALL;
    return list.map((e) => ({
      name: e.name,
      font: getCategory(e.categories[0])?.font ?? "transom-serif",
    }));
  }, [query]);

  return (
    <div className="min-h-screen bg-[color:var(--hull)] text-[color:var(--gelcoat)]">
      <SiteHeader />
      <section className="border-b border-[color:var(--wake)]/10">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-40 lg:px-10">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            BOAT NAME IDEAS · {ALL.length} NAMES
          </p>
          <h1 className="mt-6 max-w-3xl font-sans text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
            Naming your boat.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-[color:var(--gelcoat)]/85">
            The name is the fun part — clever, classic, or a little cheeky. Browse by category or
            search below, then tap any name to see it on a transom in the letter style that suits
            it. Change the font, finish and size in the previewer, and get a proof before you
            commit.
          </p>
          <div className="mt-10">
            <NameCategoryNav />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block w-full max-w-md">
              <span className="font-mono text-[11px] tracking-[0.2em] text-[color:var(--wake)]">
                SEARCH NAMES
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “reel”, “wind” or “lake”"
                className="mt-2 w-full rounded-sm border border-[color:var(--wake)]/30 bg-transparent px-4 py-3 text-base text-[color:var(--gelcoat)] placeholder:text-[color:var(--wake)] focus-visible:border-[color:var(--polish)] focus-visible:outline-none"
              />
            </label>
            <p
              className="font-mono text-[11px] tracking-widest text-[color:var(--wake)]"
              aria-live="polite"
            >
              {shown.length} {shown.length === 1 ? "NAME" : "NAMES"}
            </p>
          </div>

          <div className="mt-8">
            {shown.length > 0 ? (
              <NameGrid names={shown} />
            ) : (
              <div className="rounded-sm border border-[color:var(--wake)]/15 p-8">
                <p className="text-[color:var(--gelcoat)]/85">
                  No ideas match “{query.trim()}” — but it might be the one.
                </p>
                <a
                  href={`/?${new URLSearchParams({ name: query.trim().slice(0, 18) }).toString()}#previewer`}
                  className="mt-4 inline-flex font-mono text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] hover:underline"
                >
                  SEE “{query.trim().slice(0, 18).toUpperCase()}” ON A TRANSOM →
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--wake)]/10 bg-[color:var(--bay)]/12">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            CHOOSING A NAME
          </p>
          <h2 className="mt-4 max-w-3xl font-sans text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Four things to check.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {TIPS.map(([t, d]) => (
              <div key={t} className="border-t border-[color:var(--polish)]/40 pt-5">
                <h3 className="font-sans text-xl font-bold uppercase tracking-tight">{t}</h3>
                <p className="mt-2 text-sm text-[color:var(--gelcoat)]/75">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              to="/"
              hash="previewer"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
            >
              DESIGN YOUR OWN NAME →
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
