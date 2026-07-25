import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImgSlot } from "@/components/site/ImgSlot";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import { TransomPreviewer } from "@/components/site/TransomPreviewer";
import { QuoteForm } from "@/components/site/QuoteForm";
import {
  FINISH_OPTIONS,
  FONT_OPTIONS,
  type PreviewConfig,
} from "@/components/site/previewer-types";

const TITLE = "Custom Acrylic Boat Name Lettering | Georgian Bay | A1 Marine Care";
const DESCRIPTION =
  "Dimensional cast acrylic boat name lettering and marine ceramic detailing in Midland and across Georgian Bay. Featuring Holy Ship, a Meridian 408 Motoryacht.";
const OG_IMAGE = "/images/transom-hero.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "LocalBusiness",
              name: "A1 Marine Care",
              image: OG_IMAGE,
              telephone: "+1-705-000-0000",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Midland",
                addressRegion: "ON",
                addressCountry: "CA",
              },
              areaServed: ["Georgian Bay", "Muskoka", "Lake Simcoe", "Trent-Severn Waterway"],
              url: "https://holyship.a1marinecare.ca/",
            },
            {
              "@type": "Service",
              serviceType: "Custom acrylic boat name lettering",
              provider: { "@type": "LocalBusiness", name: "A1 Marine Care" },
              areaServed: "Georgian Bay, Ontario",
              description:
                'Laser-cut cast acrylic boat name lettering, 1/4" thick, VHB-mounted with template installation. Mirror gold, mirror silver, gloss, and frosted finishes.',
            },
          ],
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

  // The hero renders the boat name in the currently-selected acrylic face, so
  // it doubles as a live sample of the previewer's font choice.
  const heroFont = FONT_OPTIONS.find((f) => f.key === config.font) ?? FONT_OPTIONS[0];

  // Reveal-on-scroll for sections
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

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
      <Header showCta={showStickyCta} onQuote={() => scrollTo("quote")} />

      {/* HERO */}
      <section ref={heroRef} className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <ImgSlot
            src="/images/transom-hero.jpg"
            alt="Close-up of Holy Ship's dark transom with dimensional mirror-gold cast acrylic lettering"
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
              A1 MARINE CARE · REFERENCE JOB Nº 01
            </p>
            <h1
              className="anim-rise anim-delay-2 mt-6 text-6xl leading-[0.9] tracking-tight text-[color:var(--gelcoat)] sm:text-8xl md:text-9xl"
              style={{ fontFamily: heroFont.css, fontWeight: heroFont.weight }}
            >
              Holy <span className="finish-mirror-gold">Ship</span>
            </h1>
            <p className="anim-rise anim-delay-3 mt-6 max-w-xl text-lg text-[color:var(--gelcoat)]/85">
              A Meridian 408 Motoryacht on Georgian Bay. Detailed, ceramic coated, and finished with
              custom dimensional cast acrylic transom lettering.
            </p>
            <div className="anim-rise anim-delay-4 mt-10 flex flex-wrap gap-3">
              <button
                onClick={() => scrollTo("previewer")}
                className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
              >
                DESIGN YOUR BOAT NAME →
              </button>
              <button
                onClick={() => scrollTo("condition")}
                className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--gelcoat)]/25 px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
              >
                SEE THE DETAIL WORK
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* THE BOAT */}
      <Section id="boat" eyebrow="THE BOAT" title="Meridian 408 Motoryacht">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-[color:var(--gelcoat)]/80">
              Twin-inboard flybridge motoryacht built for extended weekends on the Bay. The owner
              keeps her at a private slip north of Midland and runs her regularly to the North
              Channel. When we took her on she was ten seasons of sun and dock-side spray past her
              last polish.
            </p>
            <dl className="dashed-rule mt-10 grid grid-cols-2 gap-y-4 border-b border-transparent pb-6 font-mono text-xs">
              {[
                ["LOA", `42' 8"`],
                ["BEAM", `13' 10"`],
                ["TYPE", "FLYBRIDGE MOTORYACHT"],
                ["POWER", "TWIN INBOARD"],
                ["HOME WATERS", "GEORGIAN BAY, ON"],
                ["HULL COLOUR", "MIDNIGHT / GRAPHITE"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <dt className="tracking-widest text-[color:var(--wake)]">{k}</dt>
                  <dd className="text-[color:var(--gelcoat)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ImgSlot
              src="/images/holyship-profile.jpg"
              alt="Meridian 408 Holy Ship at anchor, profile view"
              ratio="4/5"
              className="col-span-2 sm:col-span-1"
            />
            <div className="flex flex-col gap-3">
              <ImgSlot
                src="/images/holyship-flybridge.jpg"
                alt="Flybridge of Holy Ship with polished stainless and detailed canvas"
                ratio="4/3"
              />
              <ImgSlot
                src="/images/holyship-hull-side.jpg"
                alt="Ceramic-coated hull side of Holy Ship showing depth of gelcoat reflection"
                ratio="4/3"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* THE CONDITION */}
      <Section
        id="condition"
        eyebrow="THE CONDITION · WHAT A1 DID"
        title="Six passes, in order."
        tone="bay"
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr]">
          <ol className="space-y-6">
            {[
              [
                "01",
                "Wash and decontamination",
                "Two-bucket wash, iron and salt decontamination across every panel.",
              ],
              [
                "02",
                "Compound and cut",
                "Machine-cut on oxidized gelcoat to remove the chalked top layer.",
              ],
              [
                "03",
                "Polish",
                "Two-stage polish to bring the reflection back to a wet-look finish.",
              ],
              [
                "04",
                "Ceramic coating",
                "Marine-grade ceramic applied to hull, superstructure, and hard tops.",
              ],
              [
                "05",
                "Non-skid and vinyl detail",
                "Non-skid deep clean and vinyl protectant on rub rails and graphics.",
              ],
              [
                "06",
                "Stainless and canvas",
                "Rails polished and sealed, canvas cleaned and reproofed.",
              ],
            ].map(([n, title, desc]) => (
              <li
                key={n}
                className="grid grid-cols-[auto_1fr] gap-6 border-b border-[color:var(--wake)]/15 pb-6 last:border-0"
              >
                <span className="font-mono text-xs tracking-widest text-[color:var(--polish)]">
                  {n}
                </span>
                <div>
                  <h3 className="font-sans text-2xl font-bold uppercase tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm text-[color:var(--gelcoat)]/75">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div>
            <BeforeAfterSlider
              beforeSrc="/images/hull-before.jpg"
              afterSrc="/images/hull-after.jpg"
              beforeAlt="Hull side of Holy Ship before compound and polish, showing oxidation"
              afterAlt="Hull side of Holy Ship after ceramic coating, reflecting the sky"
            />
            <p className="mt-4 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
              DRAG THE HANDLE · STARBOARD HULL, MIDSHIPS
            </p>
          </div>
        </div>
      </Section>

      {/* THE NAME */}
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

      {/* PREVIEWER */}
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
              "Measure your transom",
              "Width in inches at the panel where the name will sit. A photo counts.",
            ],
            [
              "02",
              "Pick font and finish",
              "Use the previewer above or send us a reference. Five finishes, five faces.",
            ],
            [
              "03",
              "We template and proof",
              "You approve a full-size printed template and a proof before we cut.",
            ],
            [
              "04",
              "Mobile install",
              "We install at your marina across Georgian Bay, Simcoe, and the Trent-Severn.",
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
          BOAT IN THE WATER? WE CAN TEMPLATE FROM A SQUARE-ON PHOTO.
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

      <Footer />

      {/* Sticky CTA (mobile bottom bar helper via header state) */}
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

function Header({ showCta, onQuote }: { showCta: boolean; onQuote: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-[color:var(--wake)]/10 bg-[color:var(--hull)]/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-10">
        <a href="#top" className="flex items-center gap-3">
          <img src="/favicon.png" alt="A1 Marine Care" className="h-8 w-8 object-contain" />
          <span className="font-mono text-[11px] tracking-[0.2em] text-[color:var(--gelcoat)]">
            HOLY SHIP · A1 MARINE CARE
          </span>
        </a>
        <nav className="hidden items-center gap-6 font-sans text-[11px] tracking-widest text-[color:var(--wake)] md:flex">
          <a href="#boat" className="hover:text-[color:var(--gelcoat)]">
            THE BOAT
          </a>
          <a href="#condition" className="hover:text-[color:var(--gelcoat)]">
            THE WORK
          </a>
          <a href="#name" className="hover:text-[color:var(--gelcoat)]">
            THE NAME
          </a>
          <a href="#previewer" className="hover:text-[color:var(--gelcoat)]">
            PREVIEWER
          </a>
        </nav>
        <button
          onClick={onQuote}
          className={`hidden items-center gap-2 rounded-sm border border-[color:var(--polish)] px-3 py-2 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] transition lg:inline-flex ${
            showCta ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          GET A QUOTE →
        </button>
      </div>
    </header>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
  tone = "hull",
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  tone?: "hull" | "bay";
}) {
  return (
    <section
      id={id}
      className={`${
        tone === "bay" ? "bg-[color:var(--bay)]/12" : "bg-[color:var(--hull)]"
      } border-t border-[color:var(--wake)]/10`}
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="reveal">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-3xl font-sans text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
            {title}
          </h2>
        </div>
        <div className="reveal mt-12">{children}</div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[color:var(--wake)]/15 bg-[color:var(--hull)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="A1 Marine Care" className="h-9 w-9 object-contain" />
            <span className="font-sans text-xl font-bold uppercase tracking-tight text-[color:var(--gelcoat)]">
              A1 Marine Care
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm text-[color:var(--gelcoat)]/70">
            Marine detailing, ceramic coating, and custom cast acrylic lettering. Based in Midland,
            Ontario. Mobile service across Georgian Bay, Muskoka, Lake Simcoe, and the Trent-Severn.
          </p>
          <p className="mt-6 max-w-md text-xs text-[color:var(--wake)]">
            This page documents one customer boat, shared with the owner's permission.
          </p>
        </div>
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            CONTACT
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="tel:+17050000000" className="hover:text-[color:var(--polish)]">
                (705) 000-0000
              </a>
            </li>
            <li>
              <a href="mailto:hello@a1marinecare.ca" className="hover:text-[color:var(--polish)]">
                hello@a1marinecare.ca
              </a>
            </li>
            <li className="text-[color:var(--wake)]">Midland, Ontario</li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            ELSEWHERE
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="https://a1marinecare.ca" className="hover:text-[color:var(--polish)]">
                a1marinecare.ca
              </a>
            </li>
            <li>
              <a href="https://a1marinestorage.ca" className="hover:text-[color:var(--polish)]">
                a1marinestorage.ca
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--wake)]/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-6 font-mono text-[10px] tracking-widest text-[color:var(--wake)] sm:flex-row sm:items-center lg:px-10">
          <span>© {new Date().getFullYear()} A1 MARINE CARE</span>
          <span>HOLYSHIP.A1MARINECARE.CA</span>
        </div>
      </div>
    </footer>
  );
}
