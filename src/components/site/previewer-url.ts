import {
  FONT_OPTIONS,
  defaultFinishFor,
  finishBelongsTo,
  type Finish,
  type FontKey,
  type PreviewConfig,
  type ProductLine,
} from "./previewer-types";

const FONT_KEYS = FONT_OPTIONS.map((f) => f.key) as string[];

export const SIZE_MIN = 3;
export const SIZE_MAX = 14;

export function clampSize(n: number): number {
  if (Number.isNaN(n)) return 8;
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, n));
}

/** Serialize a previewer config into URL query params (shareable design). */
export function configToSearchParams(config: PreviewConfig): URLSearchParams {
  const p = new URLSearchParams();
  if (config.name.trim()) p.set("name", config.name.trim());
  if (config.port.trim()) p.set("port", config.port.trim());
  p.set("line", config.line);
  p.set("font", config.font);
  p.set("finish", config.finish);
  p.set("size", String(config.size));
  return p;
}

/** Merge any recognized previewer params from a query string onto a base config. */
export function parseConfig(search: string, base: PreviewConfig): PreviewConfig {
  const p = new URLSearchParams(search);
  const next: PreviewConfig = { ...base };

  const name = p.get("name");
  if (name != null) next.name = name.slice(0, 18);

  const port = p.get("port");
  if (port != null) next.port = port.slice(0, 24);

  // Product line first — it decides which finish set is valid. Links without a
  // line (older shares) keep the base, which defaults to acrylic.
  const line = p.get("line");
  if (line === "vinyl" || line === "acrylic") next.line = line as ProductLine;

  const font = p.get("font");
  if (font && FONT_KEYS.includes(font)) next.font = font as FontKey;

  const finish = p.get("finish");
  if (finish && finishBelongsTo(finish, next.line)) next.finish = finish as Finish;
  // Guarantee the finish is valid for the resolved line (fixes a base/line
  // mismatch or a hand-edited URL that pairs, say, line=vinyl with mirror-gold).
  if (!finishBelongsTo(next.finish, next.line)) next.finish = defaultFinishFor(next.line);

  const size = p.get("size");
  if (size != null) next.size = clampSize(parseFloat(size));

  return next;
}

/** Absolute URL that reopens this exact design at the previewer. */
export function previewShareUrl(config: PreviewConfig, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/?${configToSearchParams(config).toString()}#previewer`;
}
