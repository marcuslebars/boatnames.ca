import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/Layout";
import { useRevealOnScroll } from "@/components/site/use-reveal";
import { SITE_URL } from "@/lib/site";

const TITLE = "Boat Name Ideas | boatnames.ca";
const DESCRIPTION =
  "Boat name ideas and inspiration — then see your favourite on a real transom in cut vinyl or cast acrylic. Custom boat name lettering shipped across Canada.";
const CANONICAL = `${SITE_URL}/names`;

export const Route = createFileRoute("/names")({
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
  }),
});

function NamesPage() {
  useRevealOnScroll();
  return (
    <div className="min-h-screen bg-[color:var(--hull)] text-[color:var(--gelcoat)]">
      <SiteHeader />
      <section className="border-b border-[color:var(--wake)]/10">
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-40 lg:px-10">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            BOAT NAME IDEAS
          </p>
          <h1 className="mt-6 font-sans text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
            Naming your boat.
          </h1>
          <p className="mt-6 text-lg text-[color:var(--gelcoat)]/85">
            The name is the fun part — clever, classic, or a little cheeky. A good boat name reads
            well from the dock and fits the transom without crowding it. Short names carry at a
            distance; longer ones want a smaller letter height so the run still fits the panel.
          </p>
          <p className="mt-4 text-[color:var(--gelcoat)]/75">
            Once you've settled on a name, the best way to judge it is to see it on the boat. Type
            it into the previewer, try a font and finish, and get a proof before you commit — in cut
            vinyl or dimensional cast acrylic, shipped across Canada or installed locally.
          </p>
          <div className="mt-10">
            <Link
              to="/"
              hash="previewer"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
            >
              SEE YOUR NAME ON A TRANSOM →
            </Link>
          </div>
          {/* Growth seam: a curated boat-name-ideas library is a later project.
              Keep this a lean, crawlable landing — do NOT generate name lists here. */}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
