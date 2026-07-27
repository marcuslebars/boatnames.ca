import { createFileRoute, Link } from "@tanstack/react-router";
import { QuoteForm } from "@/components/site/QuoteForm";
import { type PreviewConfig } from "@/components/site/previewer-types";
import { SiteHeader, SiteFooter, Section } from "@/components/site/Layout";
import { useRevealOnScroll } from "@/components/site/use-reveal";
import { SITE_URL } from "@/lib/site";

const TITLE = "White-Glove Boat Name Install — Georgian Bay to Trent-Severn | boatnames.ca";
const DESCRIPTION =
  "Mobile boat name lettering install by A1 Marine Care crews across Georgian Bay, Lake Simcoe, and the Trent-Severn. We template, cut, and install at your marina. Outside the area, we ship Canada-wide.";
const CANONICAL = `${SITE_URL}/install`;

// Phase 6 adds LocalBusiness JSON-LD here, scoped to the real service area with
// the verified A1 NAP (still carrying the unresolved real-phone/address flag).
const SERVICE_AREA = ["Georgian Bay", "Lake Simcoe", "Trent-Severn Waterway"];

// The install page has no previewer, so the embedded quote form starts from a
// neutral acrylic design; the visitor fills in the details.
const INSTALL_PREFILL: PreviewConfig = {
  name: "",
  port: "",
  line: "acrylic",
  font: "transom-serif",
  finish: "mirror-gold",
  size: 8,
};

export const Route = createFileRoute("/install")({
  component: InstallPage,
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
          "@type": "LocalBusiness",
          name: "boatnames.ca — installed by A1 Marine Care",
          url: CANONICAL,
          // TODO(NAP): placeholder — replace with A1 Marine Care's real phone/address before launch.
          telephone: "+1-705-000-0000",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Midland",
            addressRegion: "ON",
            addressCountry: "CA",
          },
          areaServed: SERVICE_AREA,
          parentOrganization: { "@type": "Organization", name: "A1 Marine Care" },
        }),
      },
    ],
  }),
});

function InstallPage() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-[color:var(--hull)] text-[color:var(--gelcoat)]">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b border-[color:var(--wake)]/10">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-40 lg:px-10">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            WHITE-GLOVE INSTALL · BY A1 MARINE CARE
          </p>
          <h1 className="mt-6 max-w-3xl font-sans text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
            We come to your boat.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[color:var(--gelcoat)]/85">
            Prefer not to apply it yourself? A1 Marine Care crews template, cut, and install your
            new name at your marina — perfectly aligned, no bubbles, no guesswork. Local to
            Ontario's central lakes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/install"
              hash="install-quote"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
            >
              REQUEST AN INSTALL QUOTE →
            </Link>
            <Link
              to="/"
              hash="previewer"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--gelcoat)]/25 px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
            >
              DESIGN YOUR NAME FIRST
            </Link>
          </div>
        </div>
      </section>

      {/* SERVICE AREA */}
      <Section id="area" eyebrow="SERVICE AREA" title="Where we install.">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="max-w-xl text-[color:var(--gelcoat)]/80">
              Mobile install is available across Ontario's central boating waters. We work marina to
              marina through the season.
            </p>
            <ul className="mt-8 space-y-3">
              {SERVICE_AREA.map((area) => (
                <li
                  key={area}
                  className="flex items-center gap-3 border-b border-[color:var(--wake)]/15 pb-3 font-sans text-xl font-semibold uppercase tracking-tight"
                >
                  <span className="font-mono text-xs text-[color:var(--polish)]">→</span>
                  {area}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-sm border border-[color:var(--wake)]/20 bg-[color:var(--bay)]/12 p-8">
            <h3 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
              OUTSIDE THE AREA?
            </h3>
            <p className="mt-3 text-[color:var(--gelcoat)]/85">
              Not on one of these lakes? No problem — we ship anywhere in Canada. You get the same
              cut lettering with a step-by-step application guide, templated from your photos so it
              goes on straight the first time.
            </p>
            <Link
              to="/"
              hash="previewer"
              className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] hover:underline"
            >
              DESIGN A SHIP-ANYWHERE ORDER →
            </Link>
          </div>
        </div>
      </Section>

      {/* HOW INSTALL WORKS */}
      <Section id="how-install" eyebrow="HOW IT WORKS" title="Template, cut, install." tone="bay">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            [
              "01",
              "Template",
              "We measure and template your transom on-site (or from your photos) so the layout fits the panel exactly.",
            ],
            [
              "02",
              "Cut",
              "Your name is cut in your chosen product line and finish — cut vinyl or dimensional cast acrylic.",
            ],
            [
              "03",
              "Install",
              "A crew installs it at your boat, aligned and finished, and confirms an install window with you first.",
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
        <p className="mt-10 max-w-2xl text-sm text-[color:var(--gelcoat)]/70">
          Installed by <span className="text-[color:var(--gelcoat)]">A1 Marine Care</span> — the
          same crews that detail and maintain boats across the region. See a real job in the{" "}
          <Link to="/gallery/holy-ship" className="text-[color:var(--polish)] hover:underline">
            Holy Ship case study
          </Link>
          .
        </p>
      </Section>

      {/* QUOTE — the shared tier-aware form, preselected to the install tier. */}
      <section id="install-quote" className="border-t border-[color:var(--wake)]/15">
        <div className="mx-auto max-w-5xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="reveal">
            <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
              INSTALL QUOTE
            </p>
            <h2 className="mt-4 max-w-3xl font-sans text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Book your install.
            </h2>
            <p className="mt-4 max-w-xl text-[color:var(--gelcoat)]/75">
              Tell us your boat, your marina, and the name. We'll reply within one business day with
              a proof, a price, and an install window.
            </p>
          </div>
          <div className="reveal mt-12">
            <QuoteForm prefill={INSTALL_PREFILL} defaultFulfillment="install" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
