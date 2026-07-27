import { useEffect } from "react";

/**
 * Reveal-on-scroll: fade in any `.reveal` element as it enters the viewport.
 * Shared by every page. Reduced-motion is handled in CSS (see styles.css) — the
 * element text is always in the DOM (opacity only), so it stays crawlable.
 */
export function useRevealOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
