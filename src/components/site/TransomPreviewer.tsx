import { useEffect, useId, useRef, useState } from "react";
import { ImgSlot } from "./ImgSlot";
import {
  FINISH_OPTIONS,
  FONT_OPTIONS,
  type Finish,
  type FontKey,
  type PreviewConfig,
} from "./previewer-types";

type Props = {
  config: PreviewConfig;
  onChange: (next: PreviewConfig) => void;
  onQuote: () => void;
};

const BASE_IMG = "/images/transom-preview-base.jpg";
const PORT_FONT = '"Big Shoulders Display", sans-serif';

// Calibration of the lettering panel within transom-preview-base.jpg. x/y/width/
// height are fractions of the image; the rectangle is where cast acrylic letters
// would sit on the transom face. realWidthIn is how wide that panel is in the
// real world (inches) and is what drives px-per-inch. Tune visually by loading
// the page with ?calibrate=1 (draws the rectangle + values), then hard-code here.
const PANEL = {
  x: 0.24,
  y: 0.44,
  width: 0.52,
  height: 0.17,
  realWidthIn: 96,
};

const FONT_KEYS = FONT_OPTIONS.map((f) => f.key);
const FINISH_KEYS = FINISH_OPTIONS.map((f) => f.key);

// Width/cap-height ratios relative to font-size, used before the client-side
// canvas measurement runs (and during SSR, where canvas is unavailable).
const FALLBACK_RATIO = { width: 0.62, cap: 0.72 };
type Ratio = { width: number; cap: number };

let measureCanvas: HTMLCanvasElement | null = null;

// Measure a string's advance width and cap height for a given face, as fractions
// of the font-size. This replaces the old flat 0.55-per-letter guess: real glyph
// advances (and real spaces) are counted, per font, so the run length is defensible.
function measureRatios(text: string, fontFamily: string, fontWeight: number): Ratio {
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

function finishFill(
  ctx: CanvasRenderingContext2D,
  key: Finish,
  centerY: number,
  height: number,
): string | CanvasGradient {
  if (key === "gloss-black") return "#0a0d10";
  if (key === "gloss-white") return "#f6f7f8";
  if (key === "frosted") return "rgba(242,244,243,0.72)";
  const g = ctx.createLinearGradient(0, centerY - height / 2, 0, centerY + height / 2);
  if (key === "mirror-silver") {
    g.addColorStop(0, "#f4f6f8");
    g.addColorStop(0.4, "#b6bec5");
    g.addColorStop(0.6, "#6d7883");
    g.addColorStop(1, "#dfe4e8");
  } else {
    // mirror-gold
    g.addColorStop(0, "#f6e3a0");
    g.addColorStop(0.32, "#d4b23a");
    g.addColorStop(0.55, "#8a6a10");
    g.addColorStop(0.78, "#f0d886");
    g.addColorStop(1, "#b8892a");
  }
  return g;
}

function moveRadioFocus(el: HTMLElement, index: number) {
  const group = el.closest<HTMLElement>('[role="radiogroup"]');
  group?.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
}

function radioKeydown<T extends string>(
  e: React.KeyboardEvent<HTMLElement>,
  keys: readonly T[],
  current: T,
  onSelect: (k: T) => void,
) {
  const i = keys.indexOf(current);
  let ni = -1;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") ni = (i + 1) % keys.length;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ni = (i - 1 + keys.length) % keys.length;
  else if (e.key === "Home") ni = 0;
  else if (e.key === "End") ni = keys.length - 1;
  else return;
  e.preventDefault();
  onSelect(keys[ni]);
  moveRadioFocus(e.currentTarget, ni);
}

export function TransomPreviewer({ config, onChange, onQuote }: Props) {
  const font = FONT_OPTIONS.find((f) => f.key === config.font) ?? FONT_OPTIONS[0];
  const finish = FINISH_OPTIONS.find((f) => f.key === config.finish) ?? FINISH_OPTIONS[0];
  const uppercase = font.key !== "yacht-script";

  const displayName = config.name.trim() || "YOUR BOAT";
  const nameText = uppercase ? displayName.toUpperCase() : displayName;

  // Canvas width via ResizeObserver (client-only).
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setCanvasWidth(el.getBoundingClientRect().width);
    measure(); // initial size — the observer's first callback can lag/drop
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Per-font measurement of the current name (client-side; falls back on SSR).
  const [ratio, setRatio] = useState<Ratio>(FALLBACK_RATIO);
  useEffect(() => {
    setRatio(measureRatios(nameText, font.css, font.weight ?? 400));
  }, [nameText, font.css, font.weight]);

  // Dev calibration overlay via ?calibrate=1.
  const [calibrate, setCalibrate] = useState(false);
  useEffect(() => {
    setCalibrate(new URLSearchParams(window.location.search).get("calibrate") === "1");
  }, []);

  // Geometry derived from the calibration panel.
  const pxPerInch = canvasWidth > 0 ? (PANEL.width * canvasWidth) / PANEL.realWidthIn : 0;
  const panelPx = PANEL.width * canvasWidth;
  const letterHeightPx = config.size * pxPerInch; // desired cap height on screen
  const naturalFontPx = ratio.cap > 0 ? letterHeightPx / ratio.cap : letterHeightPx;
  const naturalRunPx = ratio.width * naturalFontPx;
  const runLengthIn = pxPerInch > 0 ? naturalRunPx / pxPerInch : 0;

  // Never clip: scale the displayed lettering to fit the panel, and surface the
  // real constraint instead (a sales conversation, per the brief).
  const overflow = panelPx > 0 && naturalRunPx > panelPx;
  const fitScale = overflow ? panelPx / naturalRunPx : 1;
  const displayFontPx = Math.max(naturalFontPx * fitScale, 6);
  const nameCapPx = displayFontPx * ratio.cap;
  const portFontPx = Math.max(nameCapPx * 0.32, 7);

  const runLabel = runLengthIn > 0 ? `${runLengthIn.toFixed(1)}"` : "—";
  const constraintMsg = overflow
    ? `At ${config.size}" letters, "${displayName}" runs about ${Math.round(runLengthIn)}" — wider than this ~${PANEL.realWidthIn}" panel. Shown scaled to fit; a shorter name or smaller letters sit true to size.`
    : "";
  const summary = `${displayName} in ${font.label}, ${finish.label} finish, ${config.size}-inch letters, about ${runLabel} long.${overflow ? " Exceeds the preview panel width." : ""}`;

  const [saving, setSaving] = useState(false);
  async function saveProof() {
    if (typeof document === "undefined") return;
    setSaving(true);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = BASE_IMG;
      await img.decode();
      if (document.fonts?.ready) await document.fonts.ready;

      const W = img.naturalWidth || 1600;
      const H = img.naturalHeight || 900;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, W, H);

      const panelW = PANEL.width * W;
      const pxPerIn = panelW / PANEL.realWidthIn;
      const letterPx = config.size * pxPerIn;
      const r = measureRatios(nameText, font.css, font.weight ?? 400);
      const natFont = r.cap > 0 ? letterPx / r.cap : letterPx;
      const natRun = r.width * natFont;
      const fit = natRun > panelW ? panelW / natRun : 1;
      const fontPx = natFont * fit;
      const cx = (PANEL.x + PANEL.width / 2) * W;
      const cy = (PANEL.y + PANEL.height / 2) * H;
      const capPx = fontPx * r.cap;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = Math.max(capPx * 0.05, 2);
      ctx.shadowOffsetX = capPx * 0.03;
      ctx.shadowOffsetY = capPx * 0.05;

      const hasPort = config.port.trim().length > 0;
      const portPx = Math.max(capPx * 0.32, 8);
      const nameCy = hasPort ? cy - portPx * 0.7 : cy;

      ctx.font = `${font.weight ?? 400} ${fontPx}px ${font.css}`;
      ctx.fillStyle = finishFill(ctx, finish.key, nameCy, capPx);
      ctx.fillText(nameText, cx, nameCy);

      if (hasPort) {
        const portCy = nameCy + capPx / 2 + portPx * 0.9;
        ctx.font = `700 ${portPx}px ${PORT_FONT}`;
        ctx.fillStyle = finishFill(ctx, finish.key, portCy, portPx);
        ctx.fillText(config.port.trim().toUpperCase(), cx, portCy);
      }

      const slug =
        config.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "boat";
      const link = document.createElement("a");
      link.download = `proof-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Proof render failed", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Preview canvas + proof */}
      <div>
        <div
          ref={canvasRef}
          className="relative overflow-hidden rounded-sm border border-[color:var(--wake)]/15 bg-black"
        >
          <div className="relative">
            <ImgSlot
              src={BASE_IMG}
              alt="Blank dark motoryacht transom used as the acrylic lettering preview base"
              ratio="16/9"
              eager
            />
            {/* Lettering anchored to the calibrated transom panel */}
            <div
              aria-hidden
              className="pointer-events-none absolute flex flex-col items-center justify-center overflow-visible text-center"
              style={{
                left: `${PANEL.x * 100}%`,
                top: `${PANEL.y * 100}%`,
                width: `${PANEL.width * 100}%`,
                height: `${PANEL.height * 100}%`,
              }}
            >
              <span
                className={`${finish.textClass} block leading-[0.95]`}
                style={{
                  fontFamily: font.css,
                  fontWeight: font.weight,
                  fontSize: `${displayFontPx}px`,
                  whiteSpace: "nowrap",
                  textTransform: uppercase ? "uppercase" : "none",
                }}
              >
                {displayName}
              </span>
              {config.port.trim() && (
                <span
                  className={`${finish.textClass} block leading-none tracking-[0.2em]`}
                  style={{
                    fontFamily: PORT_FONT,
                    fontWeight: 700,
                    fontSize: `${portFontPx}px`,
                    marginTop: `${portFontPx * 0.7}px`,
                    textTransform: "uppercase",
                  }}
                >
                  {config.port.trim()}
                </span>
              )}
            </div>
            {calibrate && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-[color:var(--polish)]"
                style={{
                  left: `${PANEL.x * 100}%`,
                  top: `${PANEL.y * 100}%`,
                  width: `${PANEL.width * 100}%`,
                  height: `${PANEL.height * 100}%`,
                }}
              >
                <span className="absolute -top-5 left-0 whitespace-nowrap bg-black/70 px-1 font-mono text-[9px] text-[color:var(--polish)]">
                  panel x{PANEL.x} y{PANEL.y} w{PANEL.width} h{PANEL.height} · {PANEL.realWidthIn}"
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-[color:var(--wake)]/15 bg-[color:var(--hull)] px-4 py-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            <span>PREVIEW · {finish.label.toUpperCase()}</span>
            <span>
              {config.size}" LETTERS · ≈{runLabel} RUN
            </span>
          </div>
        </div>

        {constraintMsg && (
          <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-widest text-[color:var(--polish)]">
            {constraintMsg}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={saveProof}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--wake)]/30 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--polish)] disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE THIS PROOF ↓"}
          </button>
          <span className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            PNG · SHAREABLE LINK IN URL
          </span>
        </div>

        {/* Screen-reader announcement of the current configuration */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {summary}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Boat name">
            <input
              type="text"
              value={config.name}
              maxLength={18}
              onChange={(e) => onChange({ ...config, name: e.target.value.slice(0, 18) })}
              className="w-full rounded-sm border border-[color:var(--wake)]/25 bg-[color:var(--hull)] px-3 py-2 text-[color:var(--gelcoat)] outline-none transition focus:border-[color:var(--polish)]"
              placeholder="Holy Ship"
            />
            <Hint>{config.name.length}/18</Hint>
          </Field>
          <Field label="Hailing port">
            <input
              type="text"
              value={config.port}
              maxLength={24}
              onChange={(e) => onChange({ ...config, port: e.target.value.slice(0, 24) })}
              className="w-full rounded-sm border border-[color:var(--wake)]/25 bg-[color:var(--hull)] px-3 py-2 text-[color:var(--gelcoat)] outline-none transition focus:border-[color:var(--polish)]"
              placeholder="Midland, ON"
            />
            <Hint>optional</Hint>
          </Field>
        </div>

        <RadioField label="Font" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FONT_OPTIONS.map((f) => {
            const active = f.key === config.font;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={f.label}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange({ ...config, font: f.key })}
                onKeyDown={(e) =>
                  radioKeydown(e, FONT_KEYS, config.font, (k: FontKey) =>
                    onChange({ ...config, font: k }),
                  )
                }
                className={`rounded-sm border px-3 py-3 text-left transition ${
                  active
                    ? "border-[color:var(--polish)] bg-[color:var(--polish)]/10"
                    : "border-[color:var(--wake)]/20 hover:border-[color:var(--wake)]/40"
                }`}
              >
                <span
                  className="block truncate text-lg text-[color:var(--gelcoat)]"
                  style={{ fontFamily: f.css, fontWeight: f.weight }}
                >
                  Aa Bb
                </span>
                <span className="mt-1 block font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
                  {f.label.toUpperCase()}
                </span>
              </button>
            );
          })}
        </RadioField>

        <RadioField label="Finish" className="grid grid-cols-5 gap-2">
          {FINISH_OPTIONS.map((f) => {
            const active = f.key === config.finish;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={f.label}
                tabIndex={active ? 0 : -1}
                onClick={() => onChange({ ...config, finish: f.key })}
                onKeyDown={(e) =>
                  radioKeydown(e, FINISH_KEYS, config.finish, (k: Finish) =>
                    onChange({ ...config, finish: k }),
                  )
                }
                title={f.label}
                className={`group flex flex-col items-center gap-2 rounded-sm border p-2 transition ${
                  active
                    ? "border-[color:var(--polish)]"
                    : "border-[color:var(--wake)]/20 hover:border-[color:var(--wake)]/40"
                }`}
              >
                <span
                  className={`grid h-8 w-full place-items-center rounded-sm text-sm font-bold ${f.textClass}`}
                  style={{ fontFamily: '"Yeseva One", serif', background: "#0a0d10" }}
                >
                  Aa
                </span>
                <span className="font-mono text-[9px] leading-tight tracking-widest text-[color:var(--wake)]">
                  {f.label.split(" ").map((w) => (
                    <span key={w} className="block">
                      {w.toUpperCase()}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </RadioField>

        <Field label={`Letter height — ${config.size}"`}>
          <input
            type="range"
            min={3}
            max={14}
            step={0.5}
            value={config.size}
            aria-label="Letter height in inches"
            aria-valuetext={`${config.size} inch letters`}
            onChange={(e) => onChange({ ...config, size: parseFloat(e.target.value) })}
            className="w-full accent-[color:var(--polish)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            <span>3"</span>
            <span>≈ {runLabel} TOTAL RUN</span>
            <span>14"</span>
          </div>
        </Field>

        <button
          type="button"
          onClick={onQuote}
          className="mt-2 inline-flex items-center justify-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
        >
          GET THIS QUOTED →
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1 block text-right font-mono text-[10px] text-[color:var(--wake)]">
      {children}
    </span>
  );
}

// A labeled radiogroup. The visible heading is the group's accessible name via
// aria-labelledby (not a <label> element, which would forward clicks to the
// first radio and select it).
function RadioField({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <span
        id={id}
        className="mb-2 block font-mono text-[10px] tracking-widest text-[color:var(--wake)]"
      >
        {label.toUpperCase()}
      </span>
      <div role="radiogroup" aria-labelledby={id} className={className}>
        {children}
      </div>
    </div>
  );
}
