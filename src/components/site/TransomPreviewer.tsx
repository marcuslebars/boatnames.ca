import { useEffect, useId, useRef, useState } from "react";
import { ImgSlot } from "./ImgSlot";
import { FALLBACK_RATIO, measureRatios, type Ratio } from "./previewer-measure";
import {
  ACRYLIC_HEIGHT_BANDS,
  FONT_OPTIONS,
  VINYL_MAX_HEIGHT_IN,
  acrylicBandOf,
  defaultFinishFor,
  finishOptionsFor,
  type Finish,
  type FontKey,
  type PreviewConfig,
  type ProductLine,
} from "./previewer-types";
import { loadTransomPhoto, ACCEPTED_TYPES, type LoadedPhoto } from "./image-intake";
import {
  CustomPhotoStage,
  DEFAULT_PLACEMENT,
  SCALE_MIN,
  SCALE_MAX,
  type Placement,
} from "./CustomPhotoStage";

type Props = {
  config: PreviewConfig;
  onChange: (next: PreviewConfig) => void;
  onQuote: () => void;
  // Phase 2: hand the composited proof (customer photo + lettering) up so the
  // quote form can attach it through the EXISTING photo field. Passed null on
  // the stock transom — there the visitor uploads their own raw photo instead.
  onProof?: (file: File | null) => void;
};

const BASE_IMG = "/images/transom-preview-base.jpg";
const PORT_FONT = '"Big Shoulders Display", sans-serif';

// Custom-photo lettering size at scale=1, as a fraction of the stage width.
// Applied identically to the on-screen stage and the full-res composite so the
// two match exactly regardless of the photo's pixel dimensions.
const BASE_FONT_FRAC = 0.11;

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

function finishFill(
  ctx: CanvasRenderingContext2D,
  key: Finish,
  centerY: number,
  height: number,
): string | CanvasGradient {
  // Solid fills — acrylic gloss/frosted, plus the flat vinyl colours.
  if (key === "gloss-black") return "#0a0d10";
  if (key === "gloss-white") return "#f6f7f8";
  if (key === "frosted") return "rgba(242,244,243,0.72)";
  if (key === "vinyl-white") return "#f4f6f5";
  if (key === "vinyl-black") return "#14181c";
  if (key === "vinyl-navy") return "#1f2c47";
  if (key === "vinyl-red") return "#b22028";
  const g = ctx.createLinearGradient(0, centerY - height / 2, 0, centerY + height / 2);
  if (key === "mirror-silver") {
    g.addColorStop(0, "#f4f6f8");
    g.addColorStop(0.4, "#b6bec5");
    g.addColorStop(0.6, "#6d7883");
    g.addColorStop(1, "#dfe4e8");
  } else if (key === "vinyl-gold") {
    // Printed metallic — a plain two-stop gradient, no acrylic depth.
    g.addColorStop(0, "#e7c766");
    g.addColorStop(1, "#c99a2e");
  } else if (key === "vinyl-silver") {
    g.addColorStop(0, "#d9dee2");
    g.addColorStop(1, "#9aa4ab");
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

/** Shared lettering — used by the stock panel overlay and the custom-photo
 *  overlay so they render identically. Port sits under the name. */
function Lettering({
  text,
  port,
  fontCss,
  fontWeight,
  finishClass,
  uppercase,
  fontPx,
  portPx,
}: {
  text: string;
  port: string;
  fontCss: string;
  fontWeight: number;
  finishClass: string;
  uppercase: boolean;
  fontPx: number;
  portPx: number;
}) {
  return (
    <>
      <span
        className={`${finishClass} block leading-[0.95]`}
        style={{
          fontFamily: fontCss,
          fontWeight,
          fontSize: `${fontPx}px`,
          whiteSpace: "nowrap",
          textTransform: uppercase ? "uppercase" : "none",
        }}
      >
        {text}
      </span>
      {port && (
        <span
          className={`${finishClass} block leading-none tracking-[0.2em]`}
          style={{
            fontFamily: PORT_FONT,
            fontWeight: 700,
            fontSize: `${portPx}px`,
            marginTop: `${portPx * 0.7}px`,
            textTransform: "uppercase",
          }}
        >
          {port}
        </span>
      )}
    </>
  );
}

/** Branded spec strip along the bottom of a proof — boatnames.ca + the design
 *  summary. No price (pricing returns with the quote). Auto-shrinks the spec. */
function drawSpecStrip(ctx: CanvasRenderingContext2D, W: number, H: number, spec: string) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  const stripH = Math.max(H * 0.075, 42);
  ctx.fillStyle = "rgba(10,13,16,0.85)";
  ctx.fillRect(0, H - stripH, W, stripH);
  const midY = H - stripH / 2;
  const brandFont = Math.max(stripH * 0.32, 12);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `600 ${brandFont}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.fillStyle = "#C9A227"; // mirrors --polish (brand gold = logo gradient mid-stop)
  ctx.fillText("boatnames.ca", W * 0.03, midY);
  const brandW = ctx.measureText("boatnames.ca").width;

  let specFont = brandFont;
  const maxSpecW = W * 0.94 - brandW;
  ctx.font = `400 ${specFont}px "JetBrains Mono", ui-monospace, monospace`;
  while (specFont > 9 && ctx.measureText(spec).width > maxSpecW) {
    specFont -= 1;
    ctx.font = `400 ${specFont}px "JetBrains Mono", ui-monospace, monospace`;
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "#e6e9ea";
  ctx.fillText(spec, W * 0.97, midY);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Response from /api/price. `disabled` until CHECKOUT_ENABLED=1. */
type PriceResp =
  | {
      status: "priced";
      currency: string;
      subtotalCents: number;
      shippingCents: number;
      totalCents: number;
      pricingVersion?: string;
    }
  | { status: "unpriced"; reason: string }
  | { status: "disabled" }
  | { status: "error"; error?: string };

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

/** Keep the size valid for the line when switching: vinyl caps at its max height,
 *  acrylic snaps to a priced band if the current height is between bands. */
function snapSizeForLine(line: ProductLine, size: number): number {
  if (line === "vinyl") return Math.min(size, VINYL_MAX_HEIGHT_IN);
  return acrylicBandOf(size) ? size : ACRYLIC_HEIGHT_BANDS[0].repIn;
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

export function TransomPreviewer({ config, onChange, onQuote, onProof }: Props) {
  const font = FONT_OPTIONS.find((f) => f.key === config.font) ?? FONT_OPTIONS[0];
  const finishes = finishOptionsFor(config.line);
  const finish = finishes.find((f) => f.key === config.finish) ?? finishes[0];
  const finishKeys = finishes.map((f) => f.key);
  const isAcrylic = config.line === "acrylic";
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

  // ---- Phase 2: custom transom photo (memory-only) ----
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const customMode = photo !== null;

  // Geometry derived from the stock calibration panel (stock mode only).
  const pxPerInch = canvasWidth > 0 ? (PANEL.width * canvasWidth) / PANEL.realWidthIn : 0;
  const panelPx = PANEL.width * canvasWidth;
  const letterHeightPx = config.size * pxPerInch; // desired cap height on screen
  const naturalFontPx = ratio.cap > 0 ? letterHeightPx / ratio.cap : letterHeightPx;
  const naturalRunPx = ratio.width * naturalFontPx;
  // Run length is pure font metrics × requested height — it cancels px-per-inch,
  // so it stays valid on a custom photo that has no calibration.
  const runLengthIn = ratio.cap > 0 ? (ratio.width * config.size) / ratio.cap : 0;

  // Never clip on the stock panel: scale the lettering to fit and surface the
  // real constraint instead. A custom photo has no panel, so no overflow there.
  const overflow = !customMode && panelPx > 0 && naturalRunPx > panelPx;
  const fitScale = overflow ? panelPx / naturalRunPx : 1;
  const displayFontPx = Math.max(naturalFontPx * fitScale, 6);
  const nameCapPx = displayFontPx * ratio.cap;
  const portFontPx = Math.max(nameCapPx * 0.32, 7);

  const runLabel = runLengthIn > 0 ? `${runLengthIn.toFixed(1)}"` : "—";
  const constraintMsg = overflow
    ? `At ${config.size}" letters, "${displayName}" runs about ${Math.round(runLengthIn)}" — wider than this ~${PANEL.realWidthIn}" panel. Shown scaled to fit; a shorter name or smaller letters sit true to size.`
    : "";
  const summary = customMode
    ? `${displayName} in ${font.label}, ${finish.label} finish, placed on your transom photo. Requested ${config.size}-inch letters, about ${runLabel} long — on-screen size is for placement only.`
    : `${displayName} in ${font.label}, ${finish.label} finish, ${config.size}-inch letters, about ${runLabel} long.${overflow ? " Exceeds the preview panel width." : ""}`;

  // Custom-photo lettering sizes.
  const baseFontPx = canvasWidth * BASE_FONT_FRAC;
  const customPortPx = (px: number) => px * 0.28;
  function renderLettering(px: number) {
    return (
      <Lettering
        text={displayName}
        port={config.port.trim()}
        fontCss={font.css}
        fontWeight={font.weight ?? 400}
        finishClass={finish.textClass}
        uppercase={uppercase}
        fontPx={px}
        portPx={customPortPx(px)}
      />
    );
  }

  async function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setPhotoError("");
    setPhotoBusy(true);
    try {
      const loaded = await loadTransomPhoto(file);
      setPhoto(loaded);
      setPlacement(DEFAULT_PLACEMENT);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "We couldn't load that photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function useStockTransom() {
    setPhoto(null);
    setPhotoError("");
    onProof?.(null);
  }

  // ---- Proof composite (shared by the download button and the quote handoff) ----
  async function renderCompositeBlob(): Promise<Blob | null> {
    if (typeof document === "undefined") return null;
    if (document.fonts?.ready) await document.fonts.ready;
    const r = measureRatios(nameText, font.css, font.weight ?? 400);
    const runIn = r.cap > 0 ? (r.width * config.size) / r.cap : 0;
    const spec = [
      displayName,
      font.label,
      finish.label,
      `${config.size}"`,
      runIn > 0 ? `~${Math.round(runIn)}" run` : "",
      isAcrylic ? "CAST ACRYLIC" : "CUT VINYL",
    ]
      .filter(Boolean)
      .join("  ·  ");

    return photo ? renderCustomComposite(photo, r, spec) : renderStockComposite(r, spec);
  }

  async function renderStockComposite(r: Ratio, spec: string): Promise<Blob | null> {
    const img = new Image();
    img.decoding = "async";
    img.src = BASE_IMG;
    await img.decode();

    const W = img.naturalWidth || 1600;
    const H = img.naturalHeight || 900;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);

    const panelW = PANEL.width * W;
    const pxPerIn = panelW / PANEL.realWidthIn;
    const letterPx = config.size * pxPerIn;
    const natFont = r.cap > 0 ? letterPx / r.cap : letterPx;
    const natRun = r.width * natFont;
    const fit = natRun > panelW ? panelW / natRun : 1;
    const fontPx = natFont * fit;
    const cx = (PANEL.x + PANEL.width / 2) * W;
    const cy = (PANEL.y + PANEL.height / 2) * H;
    const capPx = fontPx * r.cap;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isAcrylic) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = Math.max(capPx * 0.05, 2);
      ctx.shadowOffsetX = capPx * 0.03;
      ctx.shadowOffsetY = capPx * 0.05;
    }
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
    drawSpecStrip(ctx, W, H, spec);
    return toBlob(canvas);
  }

  async function renderCustomComposite(
    ph: LoadedPhoto,
    r: Ratio,
    spec: string,
  ): Promise<Blob | null> {
    const img = new Image();
    img.decoding = "async";
    img.src = ph.url;
    await img.decode();

    const W = ph.width;
    const H = ph.height;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);

    // Same fractions as the on-screen stage → the composite matches what they saw.
    const fontPx = W * BASE_FONT_FRAC * placement.scale;
    const capPx = fontPx * r.cap;
    const portPx = customPortPx(fontPx);
    const hasPort = config.port.trim().length > 0;

    ctx.save();
    ctx.translate(placement.cx * W, placement.cy * H);
    ctx.rotate((placement.rot * Math.PI) / 180);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (isAcrylic) {
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = Math.max(capPx * 0.05, 2);
      ctx.shadowOffsetX = capPx * 0.03;
      ctx.shadowOffsetY = capPx * 0.05;
    }
    const nameCy = hasPort ? -portPx * 0.55 : 0;
    ctx.font = `${font.weight ?? 400} ${fontPx}px ${font.css}`;
    ctx.fillStyle = finishFill(ctx, finish.key, nameCy, capPx);
    ctx.fillText(nameText, 0, nameCy);
    if (hasPort) {
      const portCy = nameCy + capPx / 2 + portPx * 0.9;
      ctx.font = `700 ${portPx}px ${PORT_FONT}`;
      ctx.fillStyle = finishFill(ctx, finish.key, portCy, portPx);
      ctx.fillText(config.port.trim().toUpperCase(), 0, portCy);
    }
    ctx.restore();
    drawSpecStrip(ctx, W, H, spec);
    return toBlob(canvas);
  }

  function slugName() {
    return (
      config.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "boat"
    );
  }

  const [saving, setSaving] = useState(false);
  async function downloadProof() {
    setSaving(true);
    try {
      const blob = await renderCompositeBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `proof-${slugName()}.png`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Proof render failed", err);
    } finally {
      setSaving(false);
    }
  }

  const [preparing, setPreparing] = useState(false);
  async function handleQuote() {
    // On a custom photo, composite it now and hand it to the quote form through
    // the existing photo field. On the stock transom there's nothing of theirs
    // to attach — they upload their own raw photo in the form.
    if (customMode && onProof) {
      setPreparing(true);
      try {
        const blob = await renderCompositeBlob();
        if (blob) onProof(new File([blob], `proof-${slugName()}.png`, { type: "image/png" }));
      } catch (err) {
        console.error("Composite for quote failed", err);
      } finally {
        setPreparing(false);
      }
    } else {
      onProof?.(null);
    }
    onQuote();
  }

  // Live server-authoritative price (dark until CHECKOUT_ENABLED=1: the endpoint
  // returns `disabled`, so nothing price-related renders). Debounced; the client
  // never computes or trusts a price — it only displays what the server returns.
  const [price, setPrice] = useState<PriceResp | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line: config.line,
          name: config.name,
          port: config.port,
          finish: config.finish,
          size: config.size,
        }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<PriceResp>) : null))
        .then((data) => setPrice(data))
        .catch(() => {
          /* aborted or offline — keep the last price shown */
        });
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [config.line, config.name, config.port, config.finish, config.size]);

  const priced = price?.status === "priced" ? price : null;
  const quoteOnly = price?.status === "unpriced";
  // Everything Phase 3+ stays dark until the endpoint stops returning `disabled`
  // (i.e. until CHECKOUT_ENABLED=1). Until then the previewer is byte-identical to
  // before: free 3–14" slider, no bands, no price.
  const checkoutOn = price != null && price.status !== "disabled";
  const useBandSelector = isAcrylic && checkoutOn;
  const sliderMax = checkoutOn && !isAcrylic ? VINYL_MAX_HEIGHT_IN : 14;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Preview canvas + proof */}
      <div>
        <div
          ref={canvasRef}
          className="relative overflow-hidden rounded-sm border border-[color:var(--wake)]/15 bg-black"
        >
          {customMode && photo ? (
            <CustomPhotoStage
              photoUrl={photo.url}
              photoRatio={photo.width / photo.height}
              placement={placement}
              onPlacement={(fn) => setPlacement((p) => fn(p))}
              baseFontPx={baseFontPx}
              renderLettering={renderLettering}
            />
          ) : (
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
                <Lettering
                  text={displayName}
                  port={config.port.trim()}
                  fontCss={font.css}
                  fontWeight={font.weight ?? 400}
                  finishClass={finish.textClass}
                  uppercase={uppercase}
                  fontPx={displayFontPx}
                  portPx={portFontPx}
                />
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
                    panel x{PANEL.x} y{PANEL.y} w{PANEL.width} h{PANEL.height} · {PANEL.realWidthIn}
                    "
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[color:var(--wake)]/15 bg-[color:var(--hull)] px-4 py-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            <span>
              {customMode ? "YOUR PHOTO" : "PREVIEW"} · {finish.label.toUpperCase()}
            </span>
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

        {/* Custom photo intake — reuses the quote form's photo path on submit. */}
        <div className="mt-3 rounded-sm border border-[color:var(--wake)]/15 bg-[color:var(--hull)] p-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-[color:var(--wake)]/30 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.2em] text-[color:var(--gelcoat)] transition hover:border-[color:var(--polish)]">
              {photoBusy ? "LOADING…" : customMode ? "REPLACE PHOTO" : "USE YOUR OWN PHOTO ↑"}
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={onPhotoPick}
                disabled={photoBusy}
                className="sr-only"
              />
            </label>
            {customMode && (
              <button
                type="button"
                onClick={useStockTransom}
                className="inline-flex items-center gap-2 rounded-sm border border-[color:var(--wake)]/20 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.2em] text-[color:var(--wake)] transition hover:border-[color:var(--wake)]/45 hover:text-[color:var(--gelcoat)]"
              >
                USE STOCK TRANSOM
              </button>
            )}
          </div>
          <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-widest text-[color:var(--wake)]">
            YOUR PHOTO STAYS ON YOUR DEVICE UNTIL YOU SEND US A QUOTE.
          </p>
          {photoError && (
            <p
              className="mt-2 font-mono text-[10px] leading-relaxed tracking-widest text-red-400"
              role="alert"
            >
              {photoError}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={downloadProof}
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
        {/* Product line — the entry/premium toggle. Switching resets the finish
            to that line's default so the two finish sets never cross. */}
        <div>
          <span className="mb-2 block font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            PRODUCT LINE
          </span>
          <div role="radiogroup" aria-label="Product line" className="grid grid-cols-2 gap-2">
            {(["vinyl", "acrylic"] as ProductLine[]).map((ln) => {
              const active = config.line === ln;
              return (
                <button
                  key={ln}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() =>
                    onChange({
                      ...config,
                      line: ln,
                      finish: defaultFinishFor(ln),
                      size: checkoutOn ? snapSizeForLine(ln, config.size) : config.size,
                    })
                  }
                  className={`rounded-sm border px-3 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                    active
                      ? "border-[color:var(--polish)] bg-[color:var(--polish)]/10 text-[color:var(--gelcoat)]"
                      : "border-[color:var(--wake)]/20 text-[color:var(--wake)] hover:border-[color:var(--wake)]/40"
                  }`}
                >
                  {ln === "vinyl" ? "Cut Vinyl" : "Cast Acrylic"}
                </button>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            {isAcrylic ? "DIMENSIONAL · 10+ YR · CASTS A SHADOW" : "FLAT · 3–5 YR · PRINTED"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Boat name">
            <input
              type="text"
              value={config.name}
              maxLength={18}
              onChange={(e) => onChange({ ...config, name: e.target.value.slice(0, 18) })}
              className="w-full rounded-sm border border-[color:var(--wake)]/25 bg-[color:var(--hull)] px-3 py-2 text-[color:var(--gelcoat)] outline-none transition focus:border-[color:var(--polish)]"
              placeholder="Your boat name"
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
              placeholder="City, Province"
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

        <RadioField label="Finish" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {finishes.map((f) => {
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
                  radioKeydown(e, finishKeys, config.finish, (k: Finish) =>
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

        <Field
          label={`${customMode ? "Requested letter height" : "Letter height"}${
            useBandSelector ? " band" : ` — ${config.size}"`
          }`}
        >
          {useBandSelector ? (
            <div
              role="radiogroup"
              aria-label="Letter height band"
              className="grid grid-cols-3 gap-2"
            >
              {ACRYLIC_HEIGHT_BANDS.map((b) => {
                const active = acrylicBandOf(config.size)?.key === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ ...config, size: b.repIn })}
                    className={`rounded-sm border px-2 py-2.5 font-mono text-[11px] tracking-widest transition ${
                      active
                        ? "border-[color:var(--polish)] bg-[color:var(--polish)]/10 text-[color:var(--gelcoat)]"
                        : "border-[color:var(--wake)]/20 text-[color:var(--wake)] hover:border-[color:var(--wake)]/40"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              type="range"
              min={3}
              max={sliderMax}
              step={0.5}
              value={config.size}
              aria-label="Letter height in inches"
              aria-valuetext={`${config.size} inch letters`}
              onChange={(e) => onChange({ ...config, size: parseFloat(e.target.value) })}
              className="w-full accent-[color:var(--polish)]"
            />
          )}
          <div className="mt-1 flex justify-between font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            <span>{useBandSelector ? "" : '3"'}</span>
            <span>≈ {runLabel} TOTAL RUN</span>
            <span>{useBandSelector ? "" : `${sliderMax}"`}</span>
          </div>
          {customMode && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed tracking-widest text-[color:var(--polish)]">
              SHOWN FOR PLACEMENT — FINAL SIZING CONFIRMED AT PROOF.
            </p>
          )}
        </Field>

        {/* Placement sliders — keyboard/desktop parity with drag + pinch. */}
        {customMode && (
          <div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`On-screen size — ${Math.round(placement.scale * 100)}%`}>
                <input
                  type="range"
                  min={SCALE_MIN}
                  max={SCALE_MAX}
                  step={0.05}
                  value={placement.scale}
                  aria-label="On-screen lettering size for placement"
                  onChange={(e) =>
                    setPlacement((p) => ({ ...p, scale: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-[color:var(--polish)]"
                />
              </Field>
              <Field label={`Rotation — ${Math.round(placement.rot)}°`}>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={Math.max(-30, Math.min(30, placement.rot))}
                  aria-label="Lettering rotation in degrees"
                  onChange={(e) => setPlacement((p) => ({ ...p, rot: parseFloat(e.target.value) }))}
                  className="w-full accent-[color:var(--polish)]"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => setPlacement(DEFAULT_PLACEMENT)}
              className="mt-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)] underline underline-offset-4 hover:text-[color:var(--gelcoat)]"
            >
              RESET PLACEMENT
            </button>
          </div>
        )}

        {(priced || quoteOnly) && (
          <div className="rounded-sm border border-[color:var(--wake)]/20 bg-[color:var(--hull)] p-4">
            {priced ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
                    PRICE · {priced.currency}
                  </span>
                  <span className="font-sans text-3xl font-bold text-[color:var(--gelcoat)]">
                    {fmtCents(priced.subtotalCents)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] leading-relaxed tracking-widest text-[color:var(--wake)]">
                  INCLUDES DESIGN, PROOF, TEMPLATE &amp; APPLICATION GUIDE.
                </p>
                <div className="mt-3 space-y-1 border-t border-[color:var(--wake)]/15 pt-3 font-mono text-[11px] text-[color:var(--gelcoat)]/80">
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>
                      {priced.shippingCents === 0
                        ? "FREE (over $400)"
                        : fmtCents(priced.shippingCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[color:var(--gelcoat)]">
                    <span>Total before tax</span>
                    <span>{fmtCents(priced.totalCents)}</span>
                  </div>
                </div>
                <p className="mt-2 font-mono text-[9px] tracking-widest text-[color:var(--wake)]">
                  TAX ADDED AT CHECKOUT · SHIPPING FINALISED FROM YOUR ADDRESS
                </p>
              </>
            ) : (
              <p className="font-mono text-[10px] leading-relaxed tracking-widest text-[color:var(--wake)]">
                THIS SIZE IS QUOTE-ONLY — SEND A QUOTE BELOW AND WE'LL PRICE IT BY HAND.
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleQuote}
          disabled={preparing}
          className="mt-2 inline-flex items-center justify-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90 disabled:opacity-60"
        >
          {preparing ? "PREPARING…" : "GET THIS QUOTED →"}
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
