import { createFileRoute, Link } from "@tanstack/react-router";
import { ImgSlot } from "@/components/site/ImgSlot";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import { SiteHeader, SiteFooter, Section } from "@/components/site/Layout";
import { useRevealOnScroll } from "@/components/site/use-reveal";
import { SITE_URL } from "@/lib/site";

const TITLE = "Holy Ship — Meridian 408 Case Study | boatnames.ca";
const DESCRIPTION =
  "A weathered Meridian 408 transom taken from flat vinyl to dimensional mirror-chrome cast acrylic — detailed and re-lettered by A1 Marine Care on Georgian Bay.";
const OG_IMAGE = `${SITE_URL}/images/holyship-hero.jpg`;
const CANONICAL = `${SITE_URL}/gallery/holy-ship`;

export const Route = createFileRoute("/gallery/holy-ship")({
  component: HolyShipCaseStudy,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function HolyShipCaseStudy() {
  useRevealOnScroll();

  return (
    <div className="min-h-screen bg-[color:var(--hull)] text-[color:var(--gelcoat)]">
      <SiteHeader />

      {/* CASE-STUDY HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <ImgSlot
            src="/images/holyship-hero.jpg"
            alt="HOLY SHIP! in mirror-chrome dimensional cast acrylic on a Meridian 408 transom, reflecting a Georgian Bay sunset"
            ratio="21/9"
            eager
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--hull)] via-[color:var(--hull)]/60 to-[color:var(--hull)]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--hull)]/85 via-transparent to-transparent" />
        </div>

        <div className="mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-end px-6 pb-16 pt-40 sm:pb-24 lg:px-10">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
              CASE STUDY · A1 MARINE CARE
            </p>
            <h1 className="mt-6 font-sans text-5xl font-bold leading-[0.95] tracking-tight text-[color:var(--gelcoat)] sm:text-7xl">
              Holy Ship
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[color:var(--gelcoat)]/85">
              A Meridian 408 motoryacht on Georgian Bay — wet-sanded, compounded, polished, and
              polymer-sealed, then re-lettered from flat vinyl to dimensional cast acrylic.
            </p>
          </div>
        </div>
      </section>

      {/* THE BOAT */}
      <Section id="boat" eyebrow="THE BOAT" title="Meridian 408 Motoryacht">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            {/* TODO(content): unverified claims about a real customer's boat/owner — the private
                slip north of Midland, the regular North Channel runs, and "ten seasons" since the
                last polish were AI-invented. This is now public commercial proof — verify before launch. */}
            <p className="text-[color:var(--gelcoat)]/80">
              Twin-inboard flybridge motoryacht built for extended weekends on the Bay. The owner
              keeps her at a private slip north of Midland and runs her regularly to the North
              Channel. When we took her on she was ten seasons of sun and dock-side spray past her
              last polish.
            </p>
            {/* TODO(content): spec values are Meridian 408 model-line approximations — verify LOA,
                beam, power, and hull colour against the actual hull. */}
            <dl className="dashed-rule mt-10 grid grid-cols-2 gap-y-4 border-b border-transparent pb-6 font-mono text-xs">
              {[
                ["LOA", `42' 8"`],
                ["BEAM", `13' 10"`],
                ["TYPE", "FLYBRIDGE MOTORYACHT"],
                ["POWER", "TWIN INBOARD"],
                ["HOME WATERS", "GEORGIAN BAY, ON"],
                ["HULL COLOUR", "GELCOAT WHITE"],
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
              src="/images/holyship-gallery1.jpg"
              alt="Transom of Holy Ship with HOLY SHIP! in dimensional mirror-chrome cast acrylic over a glossy white hull"
              ratio="21/9"
              className="col-span-2"
            />
            <ImgSlot
              src="/images/holyship-hull-side.jpg"
              alt="Detailed white hull side of Holy Ship with the Meridian badge and polished stainless rub rail"
              ratio="4/3"
            />
            <ImgSlot
              src="/images/holyship-408-badge.jpg"
              alt="Meridian 408 model badge on Holy Ship's freshly detailed hull"
              ratio="4/3"
            />
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
                "Wet sand",
                "Wet-sanded by hand to level oxidation and the old vinyl adhesive lines before cutting.",
              ],
              [
                "03",
                "Compound and cut",
                "Machine-cut on oxidized gelcoat to remove the chalked top layer.",
              ],
              [
                "04",
                "Polish",
                "Two-stage polish to bring the reflection back to a wet-look finish.",
              ],
              [
                "05",
                "Polymer sealant",
                "Marine polymer sealant hand-applied to the hull and superstructure for a durable, UV-resistant gloss.",
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
              beforeSrc="/images/holyship-before.jpg"
              afterSrc="/images/holyship-gallery1.jpg"
              beforeAlt="Holy Ship's transom before — the old flat navy vinyl name on weathered gelcoat"
              afterAlt="Holy Ship's transom after — polished glossy with HOLY SHIP! in dimensional mirror-chrome cast acrylic"
            />
            <p className="mt-4 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
              DRAG THE HANDLE · FLAT VINYL → CAST ACRYLIC
            </p>
          </div>
        </div>
      </Section>

      {/* CTA back into the product */}
      <section className="border-t border-[color:var(--wake)]/15 bg-[color:var(--hull)]">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center lg:px-10 lg:py-32">
          <p className="font-mono text-[11px] tracking-[0.28em] text-[color:var(--polish)]">
            YOUR BOAT NEXT
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl font-sans text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Design your own name.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[color:var(--gelcoat)]/75">
            Vinyl or cast acrylic, shipped Canada-wide or installed locally. See it on a transom
            before you buy.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/"
              hash="previewer"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
            >
              OPEN THE PREVIEWER →
            </Link>
            <Link
              to="/"
              hash="quote"
              className="inline-flex items-center gap-3 rounded-sm border border-[color:var(--gelcoat)]/25 px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--gelcoat)]/60"
            >
              GET A QUOTE
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
