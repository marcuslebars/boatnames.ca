import type { PricingAdapter } from "./types";

/**
 * Launch pricing behaviour: there is none. A human prices every order in the
 * proof email, so the adapter always returns `unpriced`. The order's amount
 * fields stay null and the status-change writes an order_events row noting that
 * pricing was manual. This is production behaviour, not a placeholder.
 */
export const manualPricingAdapter: PricingAdapter = {
  name: "manual",
  price() {
    return { status: "unpriced", reason: "manual pricing (priced by a human in the proof email)" };
  },
};
