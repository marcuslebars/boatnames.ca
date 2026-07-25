import { useCallback, useEffect, useRef, useState } from "react";
import { ImgSlot } from "./ImgSlot";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
};

export function BeforeAfterSlider({ beforeSrc, afterSrc, beforeAlt, afterAlt }: Props) {
  const [pos, setPos] = useState(52);
  const [wrapWidth, setWrapWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Track the wrapper's rendered width so the before-image (inside the clipped
  // overlay) keeps the full comparison width instead of collapsing. Reading
  // wrapRef.current.clientWidth during render is null on first paint and never
  // updates on resize — observe it instead.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWrapWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      setFromClientX(e.clientX);
    };
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [setFromClientX]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none overflow-hidden rounded-sm border border-[color:var(--wake)]/20"
      style={{ aspectRatio: "16/10" }}
      onPointerDown={(e) => {
        dragging.current = true;
        setFromClientX(e.clientX);
      }}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 4));
        if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 4));
      }}
    >
      <div className="absolute inset-0">
        <ImgSlot src={afterSrc} alt={afterAlt} ratio="16/10" className="h-full w-full" />
      </div>
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <div className="h-full" style={{ width: wrapWidth || "100%" }}>
          <ImgSlot src={beforeSrc} alt={beforeAlt} ratio="16/10" className="h-full w-full" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `calc(${pos}% - 1px)` }}
      >
        <div className="h-full w-[2px] bg-[color:var(--polish)]" />
      </div>
      <div
        className="absolute top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[color:var(--polish)] bg-[color:var(--hull)]/80 backdrop-blur"
        style={{ left: `${pos}%` }}
        aria-hidden
      >
        <span className="font-mono text-[10px] tracking-widest text-[color:var(--polish)]">↔</span>
      </div>
      <span className="absolute left-3 top-3 font-mono text-[10px] tracking-widest text-[color:var(--wake)]">
        BEFORE
      </span>
      <span className="absolute right-3 top-3 font-mono text-[10px] tracking-widest text-[color:var(--polish)]">
        AFTER
      </span>
    </div>
  );
}
