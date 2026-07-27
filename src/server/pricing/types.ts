/**
 * Pricing adapter socket (Phase 8 checkout seam).
 *
 * The rebrand banned hardcoded prices and reserved pricing for the shared
 * a1-pricing-engine package. This is the socket it plugs into: a stable interface
 * the order flow calls, with swappable implementations behind the PRICING_ADAPTER
 * flag. At launch the only implementation returns `unpriced` (a human prices every
 * order in the proof email). No prices are ever computed on the visitor path.
 */

/** Input a pricing adapter needs to quote an order. All server-side. */
export interface PricingInput {
  productLine: string; // "vinyl" | "acrylic"
  fulfillment: string; // "ship" | "install" (may be "unsure" if the quote was undecided)
  design: {
    boatName?: string;
    hailingPort?: string;
    font?: string;
    finish?: string;
    letterHeightIn?: number;
    runLengthIn?: number;
  };
  destinationProvince?: string; // for a future tax computation; nullable now
}

export interface PricingLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number; // integer cents, never floats
}

/** A resolved price. Tax is a placeholder until a real engine computes it by province. */
export interface PricedResult {
  status: "priced";
  currency: string; // e.g. "CAD"
  lineItems: PricingLineItem[];
  subtotalCents: number;
  taxTreatment: "unresolved"; // placeholder — real engine resolves GST/HST/PST
}

/** No price — the caller leaves amounts null and records that pricing was manual. */
export interface UnpricedResult {
  status: "unpriced";
  reason: string;
}

export type PricingResult = PricedResult | UnpricedResult;

export interface PricingAdapter {
  readonly name: string;
  price(input: PricingInput): PricingResult | Promise<PricingResult>;
}
