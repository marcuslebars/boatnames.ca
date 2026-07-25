// Shared canvas text measurement for the previewer and the quote form. Measures
// a face's advance width and cap height (as fractions of the font-size), so the
// run length is per-font — not the old flat 0.55/letter guess. Real glyph
// advances and real spaces are counted.

export const FALLBACK_RATIO = { width: 0.62, cap: 0.72 };
export type Ratio = { width: number; cap: number };

let measureCanvas: HTMLCanvasElement | null = null;

export function measureRatios(text: string, fontFamily: string, fontWeight: number): Ratio {
  if (typeof document === "undefined") return FALLBACK_RATIO;
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return FALLBACK_RATIO;
  const REF = 100;
  ctx.font = `${fontWeight} ${REF}px ${fontFamily}`;
  const m = ctx.measureText(text || "");
  const width = m.width / REF;
  const cap = (m.actualBoundingBoxAscent || REF * FALLBACK_RATIO.cap) / REF;
  return {
    width: width > 0 ? width : FALLBACK_RATIO.width,
    cap: cap > 0 ? cap : FALLBACK_RATIO.cap,
  };
}

/**
 * Real-world run length (inches) of `text` at a given cap height — independent of
 * any canvas dimensions: (advance width / cap height) * letter height. This is
 * the number that feeds the quote, so it must be defensible.
 */
export function estimateRunLengthIn(
  text: string,
  fontFamily: string,
  fontWeight: number,
  letterHeightIn: number,
): number {
  const r = measureRatios(text, fontFamily, fontWeight);
  return Math.round((r.width / r.cap) * letterHeightIn * 10) / 10;
}
