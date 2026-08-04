type BoatnamesLogoProps = {
  /** Height utilities for the wordmark, e.g. "h-6 sm:h-7". */
  className?: string;
  /**
   * Visibility utilities for the "An A1 Company" tagline. Defaults to hidden
   * until the `lg` breakpoint so it never crowds a narrow masthead; pass
   * "block" to always show it (e.g. in the footer).
   */
  taglineClassName?: string;
};

/**
 * Primary brand lockup, as an inline component.
 *
 * The wordmark is the transparent gold mark (`boatnames-logo-mark.svg`, no
 * background rect) so it sits cleanly over the header's `backdrop-blur`; the
 * full official `boatnames-logo.svg` paints its own `--hull` background and
 * would show as an opaque rectangle there. The "An A1 Company" tagline is
 * HTML, not baked into the SVG, so it can be hidden below a width breakpoint
 * without shipping a second asset or juggling two viewBoxes.
 */
export function BoatnamesLogo({
  className = "h-6 sm:h-7",
  taglineClassName = "hidden lg:block",
}: BoatnamesLogoProps) {
  return (
    <span className="inline-flex flex-col items-start leading-none">
      <img
        src="/images/boatnames-logo-mark.svg"
        alt="boatnames.ca — An A1 Company"
        className={`${className} w-auto`}
      />
      <span
        aria-hidden="true"
        className={`mt-1 font-mono text-[9px] uppercase tracking-[0.34em] text-[color:var(--gelcoat)]/70 ${taglineClassName}`}
      >
        An A1 Company
      </span>
    </span>
  );
}
