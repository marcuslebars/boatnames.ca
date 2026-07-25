import { useEffect, useMemo, useRef, useState } from "react";
import { ImgSlot } from "./ImgSlot";
import { FINISH_OPTIONS, FONT_OPTIONS, type PreviewConfig } from "./previewer-types";

type Props = {
  config: PreviewConfig;
  onChange: (next: PreviewConfig) => void;
  onQuote: () => void;
};

const AVG_LETTER_WIDTH_RATIO = 0.55; // rough width per letter as fraction of letter height

export function TransomPreviewer({ config, onChange, onQuote }: Props) {
  const font = FONT_OPTIONS.find((f) => f.key === config.font)!;
  const finish = FINISH_OPTIONS.find((f) => f.key === config.finish)!;

  const runLength = useMemo(() => {
    const chars = config.name.trim().length || 0;
    return (chars * config.size * AVG_LETTER_WIDTH_RATIO).toFixed(1);
  }, [config.name, config.size]);

  // Map letter height (inches) to on-screen font-size relative to a nominal
  // transom width. We assume the pictured transom is ~ 168" (14 ft) wide and
  // fills the image width — pixel per inch derived from the measured canvas.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pxPerInch = canvasWidth / 168;
  const nameFontPx = Math.max(config.size * pxPerInch, 12);
  const portFontPx = Math.max(nameFontPx * 0.22, 8);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Preview canvas */}
      <div
        ref={canvasRef}
        className="relative overflow-hidden rounded-sm border border-[color:var(--wake)]/15 bg-black"
      >
        <div className="relative">
          <ImgSlot
            src="/images/transom-preview-base.jpg"
            alt="Blank dark motoryacht transom used as the acrylic lettering preview base"
            ratio="16/9"
            eager
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[6%] text-center"
          >
            <span
              className={`${finish.textClass} block leading-[0.95] tracking-[0.02em]`}
              style={{
                fontFamily: font.css,
                fontWeight: font.weight,
                fontSize: `${nameFontPx}px`,
                whiteSpace: "nowrap",
                textTransform: font.key === "yacht-script" ? "none" : "uppercase",
              }}
            >
              {config.name.trim() || "YOUR BOAT"}
            </span>
            {config.port.trim() && (
              <span
                className={`${finish.textClass} block leading-none tracking-[0.25em]`}
                style={{
                  fontFamily: '"Big Shoulders Display", sans-serif',
                  fontWeight: 700,
                  fontSize: `${portFontPx}px`,
                  marginTop: `${portFontPx * 0.6}px`,
                  textTransform: "uppercase",
                }}
              >
                {config.port.trim()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[color:var(--wake)]/15 bg-[color:var(--hull)] px-4 py-2 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
          <span>PREVIEW · {finish.label.toUpperCase()}</span>
          <span>
            {config.size}" HEIGHT · ≈{runLength}" RUN
          </span>
        </div>
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

        <Field label="Font">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FONT_OPTIONS.map((f) => {
              const active = f.key === config.font;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onChange({ ...config, font: f.key })}
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
          </div>
        </Field>

        <Field label="Finish">
          <div className="grid grid-cols-5 gap-2">
            {FINISH_OPTIONS.map((f) => {
              const active = f.key === config.finish;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onChange({ ...config, finish: f.key })}
                  aria-pressed={active}
                  title={f.label}
                  className={`group flex flex-col items-center gap-2 rounded-sm border p-2 transition ${
                    active
                      ? "border-[color:var(--polish)]"
                      : "border-[color:var(--wake)]/20 hover:border-[color:var(--wake)]/40"
                  }`}
                >
                  <span
                    className={`grid h-8 w-full place-items-center rounded-sm text-sm font-bold ${f.textClass}`}
                    style={{
                      fontFamily: '"Yeseva One", serif',
                      background: "#0a0d10",
                    }}
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
          </div>
        </Field>

        <Field label={`Letter height — ${config.size}"`}>
          <input
            type="range"
            min={3}
            max={14}
            step={0.5}
            value={config.size}
            onChange={(e) => onChange({ ...config, size: parseFloat(e.target.value) })}
            className="w-full accent-[color:var(--polish)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
            <span>3"</span>
            <span>≈ {runLength}" TOTAL RUN</span>
            <span>14"</span>
          </div>
        </Field>

        <button
          type="button"
          onClick={onQuote}
          className="mt-2 inline-flex items-center justify-center gap-3 rounded-sm border border-[color:var(--polish)] bg-[color:var(--polish)] px-5 py-3 font-mono text-[11px] font-semibold tracking-[0.2em] text-[color:var(--hull)] transition hover:bg-[color:var(--polish)]/90"
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
