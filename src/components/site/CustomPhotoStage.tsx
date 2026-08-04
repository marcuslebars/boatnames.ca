import { useRef, type ReactNode } from "react";

/** Manual placement of the lettering on a customer photo. Fractions of the
 *  stage for position; a relative scale + rotation in degrees. Memory-only —
 *  it lives and dies with the uploaded photo. */
export type Placement = { cx: number; cy: number; scale: number; rot: number };
export const DEFAULT_PLACEMENT: Placement = { cx: 0.5, cy: 0.54, scale: 1, rot: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const SCALE_MIN = 0.25;
export const SCALE_MAX = 4;

type Props = {
  photoUrl: string;
  /** width / height of the loaded photo, to hold layout before it decodes. */
  photoRatio: number;
  placement: Placement;
  onPlacement: (updater: (p: Placement) => Placement) => void;
  /** Font size (px) at scale=1, relative to the stage width; parent supplies it. */
  baseFontPx: number;
  /** Renders the lettering given a font size; owns finish/font styling. */
  renderLettering: (fontPx: number) => ReactNode;
};

/**
 * The photo plus a directly-manipulable lettering overlay. The overlay is the
 * only `touch-action: none` surface, so a one-finger drag moves the name while
 * the page still scrolls when the touch starts off the letters; two fingers on
 * the name pinch-scale and twist it. Position/scale/rotation are also driven by
 * sliders in the parent for desktop and keyboard users.
 */
export function CustomPhotoStage({
  photoUrl,
  photoRatio,
  placement,
  onPlacement,
  baseFontPx,
  renderLettering,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // Baseline for the current gesture frame (distance, angle, centroid).
  const last = useRef<{ d: number; a: number; x: number; y: number } | null>(null);

  function rebaseline() {
    last.current = null;
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    rebaseline();
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pts = [...pointers.current.values()];

    if (pts.length === 1) {
      const p = pts[0];
      const cur = { d: 0, a: 0, x: p.x, y: p.y };
      if (last.current) {
        const dx = (cur.x - last.current.x) / rect.width;
        const dy = (cur.y - last.current.y) / rect.height;
        onPlacement((pl) => ({ ...pl, cx: clamp(pl.cx + dx, 0, 1), cy: clamp(pl.cy + dy, 0, 1) }));
      }
      last.current = cur;
    } else {
      const [a, b] = pts;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const cur = { d, a: ang, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (last.current && last.current.d > 0) {
        const ds = cur.d / last.current.d;
        let dr = cur.a - last.current.a;
        if (dr > 180) dr -= 360;
        else if (dr < -180) dr += 360;
        const dx = (cur.x - last.current.x) / rect.width;
        const dy = (cur.y - last.current.y) / rect.height;
        onPlacement((pl) => ({
          cx: clamp(pl.cx + dx, 0, 1),
          cy: clamp(pl.cy + dy, 0, 1),
          scale: clamp(pl.scale * ds, SCALE_MIN, SCALE_MAX),
          rot: pl.rot + dr,
        }));
      }
      last.current = cur;
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    rebaseline(); // remaining fingers re-baseline so there's no jump
  }

  const fontPx = baseFontPx * placement.scale;

  return (
    <div
      ref={stageRef}
      className="relative select-none"
      style={{ aspectRatio: String(photoRatio) }}
    >
      <img
        src={photoUrl}
        alt="Your transom, with your name placed on it for the preview"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute flex cursor-move flex-col items-center justify-center rounded-[2px] p-3 text-center ring-1 ring-[color:var(--polish)]/40"
        style={{
          left: `${placement.cx * 100}%`,
          top: `${placement.cy * 100}%`,
          transform: `translate(-50%, -50%) rotate(${placement.rot}deg)`,
          transformOrigin: "center",
          touchAction: "none",
          whiteSpace: "nowrap",
        }}
      >
        {renderLettering(fontPx)}
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[9px] tracking-widest text-[color:var(--gelcoat)]/70 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        DRAG TO MOVE · PINCH TO SIZE · TWIST TO ROTATE
      </p>
    </div>
  );
}
