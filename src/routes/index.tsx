import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImgSlot } from "@/components/site/ImgSlot";
import { TransomPreviewer } from "@/components/site/TransomPreviewer";
import { QuoteForm } from "@/components/site/QuoteForm";
import { SiteHeader, SiteFooter, Section } from "@/components/site/Layout";
import { useRevealOnScroll } from "@/components/site/use-reveal";
import { FINISH_OPTIONS, type PreviewConfig } from "@/components/site/previewer-types";
import { parseConfig } from "@/components/site/previewer-url";
import { SITE_URL } from "@/lib/site";

const TITLE = "Custom Boat Name Lettering — Vinyl & Acrylic | boatnames.ca";
const DESCRIPTION =
  "Design your boat's name online and see it on the transom before you buy. Cut vinyl and dimensional cast acrylic boat name lettering and decals, shipped across Canada. An A1 company.";
// Absolute URLs — social scrapers and canonical tags need the full origin.
const OG_IMAGE = `${SITE_URL}/images/holyship-hero.jpg`;
const CANONICAL = `${SITE_URL}/`;

// Old single-page anchors whose sections moved to the case study. Deep links to
// these are redirected client-side so they don't land on a section that's gone.
const MOVED_ANCHORS: Record<string, string> = {
  "#boat": "/gallery/holy-ship",
  "#condition": "/gallery/holy-ship",
};

// Invented example names (no real customer boats) so the previewer never loads
// empty; a fresh one is seeded on each clean (no-design) visit.
const EXAMPLE_NAMES = [
  "Second Wind",
  "Knot Working",
  "Reel Therapy",
  "Serenity",
  "Fair Winds",
  "Blue Horizon",
];

export const Route = createFileRoute("/")({
  component: Index,
  // Pass query params through untouched (shareable design keys + utm_* campaign
  // tags) so the previewer's navigate() can update the design in the URL without
  // stripping anything the quote form later reads.
  validateSearch: (search: Record<string, unknown>): Record<string, unknown> => search,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    // Lean Organization node for now; Phase 6 expands this with Product entries
    // (vinyl + acrylic) and moves LocalBusiness to /install.
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "boatnames.ca",
          url: CANONICAL,
          parentOrganization: { "@type": "Organization", name: "A1 Marine Care" },
        }),
      },
    ],
  }),
});

function Index() {
  const [config, setConfig] = useState<PreviewConfig>({
    name: EXAMPLE_NAMES[0],
    port: "",
    font: "transom-serif",
    finish: "mirror-gold",
    size: 8,
  });
  const navigate = Route.useNavigate();

  // Redirect deep links to moved sections, then read a shared/bookmarked design
  // from the URL on mount.
  useEffect(() => {
    const dest = MOVED_ANCHORS[window.location.hash];
    if (dest) {
      void navigate({ to: dest, replace: true });
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const hasSharedDesign = ["name", "font", "finish", "size"].some((k) => params.has(k));
    if (hasSharedDesign) {
      setConfig((c) => parseConfig(window.location.search, c));
    } else {
      // No shared design in the URL — seed a fresh invented example name.
      setConfig((c) => ({
        ...c,
        name: EXAMPLE_NAMES[Math.floor(Math.random() * EXAMPLE_NAMES.length)],
      }));
    }
  }, [navigate]);

  // Mirror config to the URL (debounced) so a design is shareable and the quote
  // email can link back to the exact preview. Use the router's navigate with
  // resetScroll:false — a raw history.replaceState is intercepted by TanStack
  // Router's patched history and triggers scroll restoration, jerking the page
  // back to the top mid-edit. The function form of `search` merges onto prev so
  // campaign params (utm_*) survive; keys set to undefined drop out of the URL.
  useEffect(() => {
    const id = setTimeout(() => {
      void navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          name: config.name.trim() || undefined,
          port: config.port.trim() || undefined,
          font: config.font,
          finish: config.finish,
          size: String(config.size),
        }),
        replace: true,
        resetScroll: false,
      });
    }, 400);
    return () => clearTimeout(id);
  }, [config, navigate]);

  useRevealOnScroll();

  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowStickyCta(!e.isIntersecting), {
      rootMargin: "-120px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[color:var(--hull)] text-[color:var(--gelcoat)]">
      <SiteHeader />

      {/* HERO = THE PREVIEWER. The product is the first thing you touch. */}
      <section id="previewer" ref={heroRef} className="border-b border-[color:var(--wake)]/10">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-28 sm:pt-32 lg:px-10">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            CUSTOM BOAT NAME LETTERING · VINYL &amp; ACRYLIC · SHIPPED CANADA-WIDE
          </p>
          <h1 className="mt-4 max-w-3xl font-sans text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
            Design your boat's name.{" "}
            <span className="text-[color:var(--gelcoat)]/55">
              See it on the transom before you buy.
            </span>
          </h1>

          <div className="mt-10">
            <TransomPreviewer
              config={config}
              onChange={setConfig}
              onQuote={() => scrollTo("quote")}
            />
          </div>

          {/* Trust strip */}
          <dl className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-[color:var(--wake)]/15 bg-[color:var(--wake)]/15 sm:grid-cols-3">
            {[
              [
                "Canada-wide shipping",
                "Cut, proofed, and shipped with a step-by-step application guide.",
              ],
              [
                "10+ year cast acrylic",
                "Dimensional letters — colour-stable, with a clean release.",
              ],
              [
                "Installed locally by A1",
                "White-glove mobile install on Georgian Bay, Simcoe & the Trent-Severn.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="bg-[color:var(--hull)] p-5">
                <dt className="font-sans text-sm font-bold uppercase tracking-tight text-[color:var(--gelcoat)]">
                  {t}
                </dt>
                <dd className="mt-1 text-sm text-[color:var(--gelcoat)]/70">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* PRODUCT LADDER — vinyl (entry) vs acrylic (premium) */}
      <Section id="products" eyebrow="TWO PRODUCT LINES" title="Which is right for your boat?">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Vinyl — entry */}
          <div className="flex flex-col rounded-sm border border-[color:var(--wake)]/20 p-8">
            <p className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
              ENTRY TIER
            </p>
            <h3 className="mt-3 font-sans text-3xl font-bold uppercase tracking-tight">
              Cut Vinyl
            </h3>
            <p className="mt-3 text-[color:var(--gelcoat)]/75">
              Solid colours and printed metallics, cut to your name. The value way to letter a boat
              — clean, quick, and shippable anywhere.
            </p>
            <ul className="mt-6 space-y-2 font-mono text-[11px] tracking-widest text-[color:var(--wake)]">
              <li>3–5 YEAR LIFESPAN</li>
              <li>FLAT, PRINTED LOOK</li>
              <li>SOLID &amp; METALLIC-PRINT COLOURS</li>
            </ul>
            {/* Phase 3 preselects the vinyl product line from this CTA. */}
            <button
              type="button"
              onClick={() => scrollTo("previewer")}
              className="mt-8 inline-flex items-center justify-center gap-2 self-start rounded-sm border border-[color:var(--gelcoat)]/25 px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
            >
              DESIGN IN VINYL →
            </button>
          </div>

          {/* Acrylic — premium */}
          <div className="flex flex-col rounded-sm border border-[color:var(--polish)]/50 bg-[color:var(--polish)]/[0.04] p-8">
            <p className="font-mono text-[10px] tracking-widest text-[color:var(--polish)]">
              PREMIUM TIER
            </p>
            <h3 className="mt-3 font-sans text-3xl font-bold uppercase tracking-tight">
              Cast Acrylic
            </h3>
            <p className="mt-3 text-[color:var(--gelcoat)]/80">
              Dimensional laser-cut letters, 1/4" thick, that stand off the hull and catch the
              light. Mirror, gloss, and frosted finishes that last.
            </p>
            <ul className="mt-6 space-y-2 font-mono text-[11px] tracking-widest text-[color:var(--wake)]">
              <li>10+ YEAR, COLOUR-STABLE</li>
              <li>DIMENSIONAL — CASTS A SHADOW</li>
              <li>MIRROR GOLD/SILVER, GLOSS, FROSTED</li>
              <li>LETTERS INDIVIDUALLY REPLACEABLE</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollTo("previewer")}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
              >
                DESIGN IN ACRYLIC →
              </button>
              <button
                type="button"
                onClick={() => scrollTo("acrylic-finishes")}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-[color:var(--gelcoat)]/25 px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
              >
                SEE FINISHES ↓
              </button>
            </div>
          </div>
        </div>

        {/* Comparison — reframed as a ladder, not a takedown */}
        <p className="mt-12 max-w-2xl text-[color:var(--gelcoat)]/80">
          Both letter your boat, and both start in the previewer above. Cast acrylic is the premium
          upgrade; vinyl is the value tier. Here's how they compare so you can pick what's right for
          your boat.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse font-sans text-sm">
            <thead>
              <tr className="border-b border-[color:var(--wake)]/25">
                <th className="py-4 text-left font-mono text-[10px] tracking-widest text-[color:var(--wake)]"></th>
                <th className="py-4 text-left font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
                  CUT VINYL
                </th>
                <th className="py-4 text-left font-mono text-[10px] tracking-widest text-[color:var(--polish)]">
                  CAST ACRYLIC
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Look", "Flat, printed", "Dimensional, casts a shadow"],
                ["Lifespan", "3–5 years", "10+ years, colour-stable"],
                [
                  "Finish options",
                  "Solid colours, printed metallics",
                  "True mirror gold, mirror silver, gloss, frosted",
                ],
                ["Repair", "Full replacement", "Individual letters replaceable"],
                ["Removal", "Adhesive residue, often needs heat", "Clean release"],
                ["Best for", "Value, quick refresh", "A premium, permanent statement"],
              ].map(([row, a, b]) => (
                <tr key={row} className="border-b border-[color:var(--wake)]/10 align-top">
                  <td className="py-4 pr-6 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
                    {row.toUpperCase()}
                  </td>
                  <td className="py-4 pr-6 text-[color:var(--gelcoat)]/70">{a}</td>
                  <td className="py-4 text-[color:var(--gelcoat)]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Acrylic finish library. Phase 3 adds the vinyl colour set + gallery. */}
        <div id="acrylic-finishes" className="mt-16 scroll-mt-24">
          <h3 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            CAST ACRYLIC FINISHES
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FINISH_OPTIONS.map((f) => (
              <figure key={f.key} className="group">
                <ImgSlot
                  src={`/images/finish-${f.key}.jpg`}
                  alt={`Sample of ${f.label} cast acrylic finish under marina light`}
                  ratio="4/5"
                  className="rounded-sm border border-[color:var(--wake)]/15"
                />
                <figcaption className="mt-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
                  {f.label.toUpperCase()}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      {/* FULFILLMENT — ship anywhere vs white-glove install */}
      <Section id="fulfillment" eyebrow="SHIP OR INSTALL" title="Two ways to get it." tone="bay">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-sm border border-[color:var(--wake)]/20 bg-[color:var(--hull)] p-8">
            <h3 className="font-sans text-2xl font-bold uppercase tracking-tight">
              Ship anywhere in Canada
            </h3>
            <p className="mt-3 text-[color:var(--gelcoat)]/75">
              We template from your photos, cut your lettering, and ship it with a step-by-step
              application guide. You apply it yourself — templated to your transom so it goes on
              straight the first time.
            </p>
            <button
              type="button"
              onClick={() => scrollTo("previewer")}
              className="mt-8 inline-flex items-center gap-2 self-start rounded-sm border border-[color:var(--gelcoat)]/25 px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
            >
              DESIGN A SHIP-ANYWHERE ORDER →
            </button>
          </div>
          <div className="flex flex-col rounded-sm border border-[color:var(--polish)]/50 bg-[color:var(--hull)] p-8">
            <h3 className="font-sans text-2xl font-bold uppercase tracking-tight">
              White-glove install
            </h3>
            <p className="mt-3 text-[color:var(--gelcoat)]/80">
              A1 Marine Care crews template, cut, and install at your marina — aligned, finished, no
              guesswork. Georgian Bay, Lake Simcoe, and the Trent-Severn.
            </p>
            <Link
              to="/install"
              className="mt-8 inline-flex items-center gap-2 self-start rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-4 py-2.5 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
            >
              SEE THE INSTALL TIER →
            </Link>
          </div>
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section id="how" eyebrow="HOW IT WORKS" title="Four steps.">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "01",
              "Photograph your transom",
              "A square-on photo with the width in inches. This is what we template from.",
            ],
            [
              "02",
              "Design in the previewer",
              "Type the name, pick a product line, font, finish, and size. See it before you buy.",
            ],
            [
              "03",
              "We proof and cut",
              "You approve a full-size template and a proof, then we cut and confirm dimensions.",
            ],
            [
              "04",
              "Apply it or we install",
              "Apply it yourself with our guide, or book a mobile install (Ontario service area).",
            ],
          ].map(([n, t, d]) => (
            <div key={n} className="border-t border-[color:var(--polish)]/40 pt-5">
              <span className="font-mono text-xs tracking-widest text-[color:var(--polish)]">
                {n}
              </span>
              <h3 className="mt-3 font-sans text-2xl font-bold uppercase tracking-tight">{t}</h3>
              <p className="mt-2 text-sm text-[color:var(--gelcoat)]/75">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-2xl font-mono text-xs tracking-widest text-[color:var(--wake)]">
          WE TEMPLATE FROM YOUR PHOTOS AND CONFIRM DIMENSIONS BEFORE CUTTING.
        </p>
      </Section>

      {/* PROOF — case study teaser */}
      <Section id="proof" eyebrow="PROOF" title="A real transom." tone="bay">
        <Link
          to="/gallery/holy-ship"
          className="group grid grid-cols-1 overflow-hidden rounded-sm border border-[color:var(--wake)]/20 bg-[color:var(--hull)] transition hover:border-[color:var(--polish)]/60 lg:grid-cols-[1.4fr_1fr]"
        >
          <ImgSlot
            src="/images/holyship-gallery1.jpg"
            alt="Holy Ship's transom with the name in dimensional mirror-chrome cast acrylic over a glossy white hull"
            ratio="21/9"
            className="h-full w-full"
          />
          <div className="flex flex-col justify-center p-8">
            <p className="font-mono text-[10px] tracking-widest text-[color:var(--polish)]">
              CASE STUDY · MERIDIAN 408
            </p>
            <h3 className="mt-3 font-sans text-3xl font-bold uppercase tracking-tight">
              Holy Ship
            </h3>
            <p className="mt-3 text-[color:var(--gelcoat)]/75">
              From flat navy vinyl to dimensional mirror-chrome cast acrylic — detailed and
              re-lettered on Georgian Bay.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] group-hover:underline">
              SEE THE CASE STUDY →
            </span>
          </div>
        </Link>
      </Section>

      {/* QUOTE */}
      <section id="quote" className="border-t border-[color:var(--wake)]/15">
        <div className="mx-auto max-w-5xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="reveal">
            <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
              QUOTE
            </p>
            <h2 className="mt-4 max-w-3xl font-sans text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Send us your transom.
            </h2>
            <p className="mt-4 max-w-xl text-[color:var(--gelcoat)]/75">
              We reply within one business day with a proof and a price. If you configured a design
              above, it's already filled in.
            </p>
          </div>
          <div className="reveal mt-12">
            <QuoteForm prefill={config} />
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Sticky CTA (mobile) */}
      {showStickyCta && (
        <button
          onClick={() => scrollTo("quote")}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-4 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] shadow-lg lg:hidden"
        >
          GET A QUOTE →
        </button>
      )}
    </div>
  );
}
