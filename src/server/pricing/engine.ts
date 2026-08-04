/**
 * Pure pricing engine for boatnames.ca — server-authoritative, integer cents.
 *
 * No I/O, no env, no randomness: a deterministic function of the design + the
 * rate card, so the same inputs always reproduce the same price (that's what the
 * checkout recompute and the golden fixtures rely on). Reads ONLY rate-card.ts.
 */

import {
  MIRROR_ACRYLIC_FINISHES,
  METALLIC_VINYL_FINISHES,
  PRICING_VERSION,
  RATE_CARD,
} from "./rate-card";

export type ProductLineKey = "vinyl" | "acrylic";

export interface EngineInput {
  line: ProductLineKey;
  /** Boat name — drives the countable-character count. */
  name: string;
  finish: string;
  /** Requested letter height in inches. */
  heightIn: number;
  hasPort: boolean;
}

export interface EngineLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface EnginePriced {
  status: "priced";
  version: string;
  currency: "CAD";
  characters: number;
  lines: EngineLine[];
  subtotalCents: number; // after all premiums, BEFORE shipping
}

export interface EngineUnpriced {
  status: "unpriced";
  reason: string;
}

export type EngineResult = EnginePriced | EngineUnpriced;

/**
 * Countable characters: spaces are free; letters and digits count as 1;
 * punctuation and symbols count as 0.5; the total rounds UP to a whole number.
 * The hailing port is never counted here — it's a flat add-on.
 *
 * NOTE: digits are treated as full characters (they are neither punctuation nor
 * symbols per the model). Flagged in the phase summary.
 */
export function countCharacters(name: string): number {
  let n = 0;
  for (const ch of name.trim()) {
    if (/\s/.test(ch)) continue; // spaces are free
    n += /[a-z0-9]/i.test(ch) ? 1 : 0.5; // alphanumeric = 1, punctuation/symbol = 0.5
  }
  return Math.ceil(n);
}

function acrylicBand(heightIn: number) {
  return RATE_CARD.acrylic.bands.find((b) => heightIn >= b.minIn && heightIn <= b.maxIn) ?? null;
}

/** Price a single design. Undefined cases return `unpriced` — never a guess. */
export function priceDesign(input: EngineInput): EngineResult {
  const characters = countCharacters(input.name);
  const extra = Math.max(0, characters - RATE_CARD.includedCharacters);
  const lines: EngineLine[] = [];

  if (input.line === "vinyl") {
    const v = RATE_CARD.vinyl;
    if (input.heightIn > v.maxHeightIn) {
      return {
        status: "unpriced",
        reason: `Cut vinyl is priced up to ${v.maxHeightIn}" tall — request a quote for taller lettering.`,
      };
    }
    lines.push({
      description: `Cut vinyl base — includes ${RATE_CARD.includedCharacters} characters, design, proof, template & application guide`,
      quantity: 1,
      unitPriceCents: v.baseCents,
    });
    if (extra > 0) {
      lines.push({
        description: `Additional characters`,
        quantity: extra,
        unitPriceCents: v.perExtraCharacterCents,
      });
    }
    if (METALLIC_VINYL_FINISHES.has(input.finish)) {
      lines.push({
        description: `Metallic vinyl finish`,
        quantity: 1,
        unitPriceCents: v.metallicSurchargeCents,
      });
    }
  } else if (input.line === "acrylic") {
    const a = RATE_CARD.acrylic;
    const band = acrylicBand(input.heightIn);
    if (!band) {
      return {
        status: "unpriced",
        reason: `Cast acrylic is priced in 4–6", 7–10" and 11–14" height bands — request a quote for ${input.heightIn}" lettering.`,
      };
    }
    lines.push({
      description: `Cast acrylic base — includes ${RATE_CARD.includedCharacters} characters at 4–6", design, proof, template & application guide`,
      quantity: 1,
      unitPriceCents: a.baseCents,
    });
    if (extra > 0) {
      lines.push({
        description: `Additional characters at ${band.minIn}–${band.maxIn}"`,
        quantity: extra,
        unitPriceCents: band.perExtraCharacterCents,
      });
    }
    if (band.upliftPerCharacterCents > 0) {
      lines.push({
        description: `${band.minIn}–${band.maxIn}" height uplift — all ${characters} characters`,
        quantity: characters,
        unitPriceCents: band.upliftPerCharacterCents,
      });
    }
    if (MIRROR_ACRYLIC_FINISHES.has(input.finish)) {
      lines.push({
        description: `Mirror finish — all ${characters} characters`,
        quantity: characters,
        unitPriceCents: a.mirrorPerCharacterCents,
      });
    }
  } else {
    return { status: "unpriced", reason: `Unknown product line "${String(input.line)}".` };
  }

  if (input.hasPort) {
    lines.push({
      description: `Hailing port line`,
      quantity: 1,
      unitPriceCents: RATE_CARD.hailingPortCents,
    });
  }

  const raw = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
  const subtotalCents = Math.max(raw, RATE_CARD.minimumOrderCents);

  return {
    status: "priced",
    version: PRICING_VERSION,
    currency: "CAD",
    characters,
    lines,
    subtotalCents,
  };
}

/**
 * Shipping is address-dependent, so it is computed SEPARATELY from the product
 * subtotal (Stripe collects the address at checkout). Territories/remote pay the
 * surcharge even above the free-shipping threshold — [MARCUS DECIDES]: flip this
 * if free-over-$400 should also waive the $65 territory surcharge.
 */
export function shippingCents(subtotalCents: number, province?: string): number {
  const s = RATE_CARD.shipping;
  const isTerritory = province
    ? (s.territoryProvinces as readonly string[]).includes(province.trim().toUpperCase())
    : false;
  if (isTerritory) return s.territoriesCents;
  if (subtotalCents >= s.freeOverSubtotalCents) return 0;
  return s.standardCents;
}
