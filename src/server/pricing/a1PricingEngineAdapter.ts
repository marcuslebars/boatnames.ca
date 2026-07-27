import type { PricingAdapter, PricingInput, PricingResult } from "./types";

/**
 * STUB — typed shell only. No implementation, and NO dependency added in this
 * phase (the shared a1-pricing-engine package is not installed here).
 *
 * When the shared `@a1/pricing-engine` package is wired in (same git-dep rule as
 * the Care/Storage pricing work), this adapter maps its concepts onto the
 * PricingAdapter socket:
 *
 *   a1-pricing-engine concept       ->  PricingAdapter here
 *   ------------------------------      -----------------------------------------
 *   product / SKU catalogue         ->  PricingInput.productLine + design.finish
 *   dimension inputs (size, run)    ->  design.letterHeightIn + design.runLengthIn
 *   fulfillment / shipping rates    ->  PricingInput.fulfillment + destinationProvince
 *   tax engine (GST / HST / PST)    ->  PricedResult.taxTreatment (placeholder now)
 *   computed quote / total          ->  PricedResult.lineItems + subtotalCents (cents)
 *
 * The engine's REAL interface type names could not be verified from this repo —
 * the package is not a dependency here, so the mapping above uses placeholder
 * concept names. Reconcile against the package's actual exports before
 * implementing (flagged in the phase summary).
 *
 * Until implemented it returns `unpriced`, so setting PRICING_ADAPTER=engine can
 * never crash or invent a price. (.env.example says do not set it this phase.)
 */
export const a1PricingEngineAdapter: PricingAdapter = {
  name: "a1-pricing-engine",
  price(_input: PricingInput): PricingResult {
    return { status: "unpriced", reason: "a1-pricing-engine adapter not implemented (stub)" };
  },
};
