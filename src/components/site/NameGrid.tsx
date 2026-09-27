import { FONT_OPTIONS, type FontKey } from "./previewer-types";
import { previewHref } from "@/content/boat-names";

export type GridName = { name: string; font: FontKey };

function fontStyle(font: FontKey) {
  const f = FONT_OPTIONS.find((o) => o.key === font) ?? FONT_OPTIONS[0];
  return { fontFamily: f.css, fontWeight: f.weight };
}

/**
 * A grid of boat names, each rendered in its letter style and linking straight
 * into the transom previewer with the name (and style) pre-filled. Plain <a> on
 * purpose: the previewer reads its design from the URL on page load.
 */
export function NameGrid({ names }: { names: GridName[] }) {
  return (
    <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-[color:var(--wake)]/15 bg-[color:var(--wake)]/15 sm:grid-cols-2 lg:grid-cols-3">
      {names.map(({ name, font }) => (
        <li key={name} className="bg-[color:var(--hull)]">
          <a
            href={previewHref(name, font)}
            className="group flex h-full items-center justify-between gap-4 px-5 py-4 transition hover:bg-[color:var(--bay)]/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--polish)]"
          >
            <span
              className="text-2xl leading-tight text-[color:var(--gelcoat)]"
              style={fontStyle(font)}
            >
              {name}
            </span>
            <span className="shrink-0 font-mono text-[10px] tracking-widest text-[color:var(--wake)] transition group-hover:text-[color:var(--polish)]">
              <span className="sr-only">Preview {name} on a transom</span>
              <span aria-hidden="true">PREVIEW →</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
