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
    name: "Holy Ship",
    port: "Midland, ON",
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
    setConfig((c) => parseConfig(window.location.search, c));
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
      rootMargin: "-80px 0px 0px 0px",
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

      {/* HERO — Phase 2 replaces this with the previewer itself as the hero. */}
      <section ref={heroRef} className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <ImgSlot
            src="/images/holyship-hero.jpg"
            alt="A boat name in mirror-chrome dimensional cast acrylic on a transom, reflecting a Georgian Bay sunset"
            ratio="21/9"
            eager
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--hull)] via-[color:var(--hull)]/60 to-[color:var(--hull)]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--hull)]/85 via-transparent to-transparent" />
        </div>

        <div className="mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-6 pb-16 pt-40 sm:pb-24 lg:px-10">
          <div className="max-w-3xl">
            <p className="anim-rise anim-delay-1 font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
              CUSTOM BOAT NAME LETTERING · SHIPPED CANADA-WIDE
            </p>
            <h1 className="sr-only">
              Custom boat name lettering — cut vinyl and dimensional cast acrylic, shipped across
              Canada. boatnames.ca, an A1 company.
            </h1>
            <p className="anim-rise anim-delay-2 mt-6 max-w-xl font-sans text-4xl font-bold leading-[1.05] tracking-tight text-[color:var(--gelcoat)] sm:text-5xl">
              Design your boat's name.
              <br />
              See it in <span className="finish-mirror-cyan">cast acrylic</span>.
            </p>
            <p className="anim-rise anim-delay-3 mt-6 max-w-xl text-lg text-[color:var(--gelcoat)]/85">
              Cut vinyl or dimensional cast acrylic, designed online and shipped across Canada with
              an application guide — or installed for you across Georgian Bay, Lake Simcoe, and the
              Trent-Severn.
            </p>
            <div className="anim-rise anim-delay-4 mt-10 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("previewer")}
                className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
              >
                DESIGN YOUR NAME →
              </button>
              <Link
                to="/gallery/holy-ship"
                className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--gelcoat)]/25 px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
              >
                SEE A REAL JOB
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THE NAME — Phase 2 reworks this into the two-tier product ladder. */}
      <Section id="name" eyebrow="THE NAME" title="Acrylic versus vinyl.">
        <p className="max-w-2xl text-[color:var(--gelcoat)]/80">
          Laser-cut cast acrylic letters, 1/4" thick, mounted with marine-grade VHB and installed
          off a printed transfer template so the alignment is exact the first time. The letters sit
          off the hull, catch the light, and cast a small shadow. Vinyl is printed and flat.
        </p>

        <div className="mt-12 overflow-x-auto">
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
                ["Lifespan", "3–5 years, fades and lifts at edges", "10+ years, colour-stable"],
                [
                  "Finish options",
                  "Solid colours, printed metallics",
                  "True mirror gold, mirror silver, gloss, frosted",
                ],
                ["Repair", "Full replacement", "Individual letters replaceable"],
                ["Removal", "Adhesive residue, often needs heat", "Clean release"],
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

        <div className="mt-16">
          <h3 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            FINISH LIBRARY
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

      {/* PREVIEWER — Phase 2 promotes this to the hero. */}
      <section
        id="previewer"
        className="relative border-y border-[color:var(--wake)]/15 bg-[color:var(--hull)]"
      >
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="reveal">
            <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
              THE PREVIEWER
            </p>
            <h2 className="mt-4 max-w-3xl font-sans text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Type your name. See it on a transom.
            </h2>
            <p className="mt-4 max-w-xl text-[color:var(--gelcoat)]/75">
              A live preview, not a mock-up. What you configure here carries directly into the quote
              form below.
            </p>
          </div>
          <div className="reveal mt-12">
            <TransomPreviewer
              config={config}
              onChange={setConfig}
              onQuote={() => scrollTo("quote")}
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <Section id="how" eyebrow="HOW IT WORKS" title="Four steps." tone="bay">
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
              "Type the name, pick a font, finish, and size. Five finishes, five faces.",
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
