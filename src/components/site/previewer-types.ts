export type ProductLine = "vinyl" | "acrylic";

// Cast acrylic finishes — dimensional, rendered with a standoff drop-shadow.
export type AcrylicFinish =
  | "mirror-gold"
  | "mirror-silver"
  | "gloss-black"
  | "gloss-white"
  | "frosted";
// Cut vinyl finishes — flat solids + printed metallics, rendered with NO
// standoff shadow. The missing bevel vs. acrylic is the visible upsell.
export type VinylFinish =
  | "vinyl-white"
  | "vinyl-black"
  | "vinyl-navy"
  | "vinyl-red"
  | "vinyl-gold"
  | "vinyl-silver";
export type Finish = AcrylicFinish | VinylFinish;

export type FontKey =
  | "transom-serif"
  | "deck-sans"
  | "commodore"
  | "commodore-italic"
  | "yacht-script";

export type PreviewConfig = {
  name: string;
  port: string;
  line: ProductLine;
  font: FontKey;
  finish: Finish;
  size: number; // letter height in inches
};

export const FONT_OPTIONS: { key: FontKey; label: string; css: string; weight?: number }[] = [
  { key: "transom-serif", label: "Transom Serif", css: '"Yeseva One", serif', weight: 400 },
  { key: "deck-sans", label: "Deck Sans", css: '"Big Shoulders Display", sans-serif', weight: 800 },
  { key: "commodore", label: "Commodore", css: '"Bebas Neue", sans-serif', weight: 400 },
  {
    key: "commodore-italic",
    label: "Commodore Italic",
    css: '"Playfair Display", serif',
    weight: 800,
  },
  { key: "yacht-script", label: "Yacht Script", css: '"Alex Brush", cursive', weight: 400 },
];

export type FinishOption = { key: Finish; label: string; textClass: string };

export const ACRYLIC_FINISHES: FinishOption[] = [
  { key: "mirror-gold", label: "Mirror Gold", textClass: "finish-mirror-gold" },
  { key: "mirror-silver", label: "Mirror Silver", textClass: "finish-mirror-silver" },
  { key: "gloss-black", label: "Gloss Black", textClass: "finish-gloss-black" },
  { key: "gloss-white", label: "Gloss White", textClass: "finish-gloss-white" },
  { key: "frosted", label: "Frosted", textClass: "finish-frosted" },
];

export const VINYL_FINISHES: FinishOption[] = [
  { key: "vinyl-white", label: "White", textClass: "vinyl-white" },
  { key: "vinyl-black", label: "Black", textClass: "vinyl-black" },
  { key: "vinyl-navy", label: "Navy", textClass: "vinyl-navy" },
  { key: "vinyl-red", label: "Red", textClass: "vinyl-red" },
  { key: "vinyl-gold", label: "Metallic Gold", textClass: "vinyl-gold" },
  { key: "vinyl-silver", label: "Metallic Silver", textClass: "vinyl-silver" },
];

export const ALL_FINISHES: FinishOption[] = [...ACRYLIC_FINISHES, ...VINYL_FINISHES];

/**
 * Acrylic height bands for the size selector. These MUST mirror the pricing rate
 * card (src/server/pricing/rate-card.ts) — the engine's golden fixtures guard the
 * pricing side; this is the input side, chosen so a buyable acrylic config always
 * lands in a priced band (no between-band gaps). `repIn` is the height stored in
 * config.size when a band is chosen (drives the run-length estimate + the quote).
 */
export const ACRYLIC_HEIGHT_BANDS = [
  { key: "s", label: '4–6"', repIn: 6, minIn: 4, maxIn: 6 },
  { key: "m", label: '7–10"', repIn: 8, minIn: 7, maxIn: 10 },
  { key: "l", label: '11–14"', repIn: 12, minIn: 11, maxIn: 14 },
] as const;

/** Cut vinyl is priced up to this height; the previewer caps its slider here. */
export const VINYL_MAX_HEIGHT_IN = 12;

/** The band a given height falls in, or null (between bands / out of range). */
export function acrylicBandOf(sizeIn: number) {
  return ACRYLIC_HEIGHT_BANDS.find((b) => sizeIn >= b.minIn && sizeIn <= b.maxIn) ?? null;
}

/** The finish set offered for a product line. */
export function finishOptionsFor(line: ProductLine): FinishOption[] {
  return line === "vinyl" ? VINYL_FINISHES : ACRYLIC_FINISHES;
}

/** Default finish when a line is (re)selected. */
export function defaultFinishFor(line: ProductLine): Finish {
  return line === "vinyl" ? "vinyl-white" : "mirror-gold";
}

/** True when `finish` is valid for `line` (used to sanitize URL/state). */
export function finishBelongsTo(finish: string, line: ProductLine): boolean {
  return finishOptionsFor(line).some((f) => f.key === finish);
}
