import { Link } from "@tanstack/react-router";

import { CATEGORIES, type CategorySlug } from "@/content/boat-names";

/** Chips linking to every category hub; the current one is marked. */
export function NameCategoryNav({ current }: { current?: CategorySlug }) {
  return (
    <nav aria-label="Boat name categories">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            to="/names"
            aria-current={current ? undefined : "page"}
            className={chipClass(!current)}
          >
            All names
          </Link>
        </li>
        {CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link
              to="/names/$category"
              params={{ category: c.slug }}
              aria-current={current === c.slug ? "page" : undefined}
              className={chipClass(current === c.slug)}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function chipClass(active: boolean) {
  return `inline-flex rounded-sm border px-3 py-1.5 font-mono text-[11px] tracking-widest transition ${
    active
      ? "border-[color:var(--polish)] bg-[color:var(--polish)]/10 text-[color:var(--polish)]"
      : "border-[color:var(--wake)]/30 text-[color:var(--gelcoat)]/80 hover:border-[color:var(--gelcoat)]"
  }`;
}
