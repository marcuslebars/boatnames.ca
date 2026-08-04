import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { BoatnamesLogo } from "./BoatnamesLogo";

// Cross-page nav. Homepage sections use `to:"/" hash:...` so they resolve from
// any page. A1 stays out of the masthead by design — it lives in the footer.
const NAV = [
  { label: "DESIGN", to: "/", hash: "previewer" },
  { label: "PRODUCTS", to: "/", hash: "products" },
  { label: "INSTALL", to: "/install", hash: undefined },
  { label: "GALLERY", to: "/gallery/holy-ship", hash: undefined },
] as const;

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-[color:var(--wake)]/10 bg-[color:var(--hull)]/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-10">
        <Link to="/" className="flex items-center" aria-label="boatnames.ca — home">
          <BoatnamesLogo className="h-6 sm:h-7" />
        </Link>
        <nav className="hidden items-center gap-6 font-sans text-[11px] tracking-widest text-[color:var(--wake)] md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              hash={item.hash}
              className="transition hover:text-[color:var(--gelcoat)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/"
          hash="quote"
          className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--polish)] px-3 py-2 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] transition hover:bg-[color:var(--polish)]/10"
        >
          GET A QUOTE →
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--wake)]/15 bg-[color:var(--hull)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2">
          <div className="flex items-center">
            <BoatnamesLogo className="h-9" taglineClassName="hidden" />
          </div>
          <p className="mt-4 max-w-md text-sm text-[color:var(--gelcoat)]/70">
            Custom boat name lettering — cut vinyl and dimensional cast acrylic — designed online
            and shipped across Canada with an application guide. White-glove mobile install by A1
            Marine Care on Georgian Bay, Lake Simcoe, and the Trent-Severn.
          </p>
          <p className="mt-6 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            AN A1 COMPANY · PRICES IN CAD · SHIPPING CANADA-WIDE
          </p>
          <Link
            to="/names"
            className="mt-4 inline-block font-mono text-[10px] tracking-widest text-[color:var(--polish)] transition hover:underline"
          >
            BOAT NAME IDEAS →
          </Link>
        </div>
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            CONTACT
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="mailto:hello@boatnames.ca" className="hover:text-[color:var(--polish)]">
                hello@boatnames.ca
              </a>
            </li>
            <li>
              <a href="tel:+17059962001" className="hover:text-[color:var(--polish)]">
                (705) 996-2001
              </a>
            </li>
            <li className="text-[color:var(--wake)]">Ships Canada-wide · Install in Ontario</li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            THE A1 FAMILY
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="https://a1marinecare.ca" className="hover:text-[color:var(--polish)]">
                A1 Marine Care
              </a>
            </li>
            <li>
              <a href="https://a1marinestorage.ca" className="hover:text-[color:var(--polish)]">
                A1 Marine Storage
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color:var(--wake)]/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-6 font-mono text-[10px] tracking-widest text-[color:var(--wake)] sm:flex-row sm:items-center lg:px-10">
          <span>© {new Date().getFullYear()} BOATNAMES.CA — AN A1 COMPANY</span>
          <span>BOATNAMES.CA</span>
        </div>
      </div>
    </footer>
  );
}

/** Standard section wrapper: mono eyebrow + big title + revealed content. */
export function Section({
  id,
  eyebrow,
  title,
  children,
  tone = "hull",
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
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
