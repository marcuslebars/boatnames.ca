import { priceDesign, type ProductLineKey } from "./engine";
import { PRICING_VERSION } from "./rate-card";
import type { PricingAdapter, PricingInput, PricingResult } from "./types";

/**
 * The boatnames.ca pricing engine plugged into the PricingAdapter socket.
 *
 * Selected by PRICING_ADAPTER=engine. Maps the socket's PricingInput onto the
 * pure engine (rate-card.ts + engine.ts) and back onto PricedResult. Tax is left
 * "unresolved" — Stripe Tax computes GST/HST/PST at checkout. Shipping is not in
 * the product subtotal (address-dependent; see engine.shippingCents).
 *
 * The engine + rate card are structured to lift into the shared a1-pricing-engine
 * package unchanged; this adapter is the only boatnames-specific glue.
 */
export const a1PricingEngineAdapter: PricingAdapter = {
  name: "a1-pricing-engine",
  price(input: PricingInput): PricingResult {
    const line: ProductLineKey | null =
      input.productLine === "acrylic" ? "acrylic" : input.productLine === "vinyl" ? "vinyl" : null;
    if (!line) {
      return { status: "unpriced", reason: `Unknown product line "${String(input.productLine)}".` };
    }

    const result = priceDesign({
      line,
      name: input.design.boatName ?? "",
      finish: input.design.finish ?? "",
      heightIn: input.design.letterHeightIn ?? 0,
      hasPort: Boolean(input.design.hailingPort && input.design.hailingPort.trim()),
    });

    if (result.status === "unpriced") return result;

    return {
      status: "priced",
      currency: result.currency,
      lineItems: result.lines,
      subtotalCents: result.subtotalCents,
      taxTreatment: "unresolved",
      pricingVersion: PRICING_VERSION,
    };
  },
};
