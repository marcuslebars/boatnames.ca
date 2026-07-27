import { serverEnv } from "../env";
import { a1PricingEngineAdapter } from "./a1PricingEngineAdapter";
import { manualPricingAdapter } from "./manual";
import type { PricingAdapter } from "./types";

export type {
  PricingAdapter,
  PricingInput,
  PricingResult,
  PricedResult,
  UnpricedResult,
  PricingLineItem,
} from "./types";
export { manualPricingAdapter } from "./manual";

/**
 * Resolve the configured pricing adapter (PRICING_ADAPTER; default "manual").
 * "engine" selects the a1-pricing-engine stub, which also returns `unpriced` for
 * now. Called only from the gated admin order flow — never the visitor path.
 */
export function getPricingAdapter(): PricingAdapter {
  return serverEnv.pricingAdapter() === "engine" ? a1PricingEngineAdapter : manualPricingAdapter;
}
