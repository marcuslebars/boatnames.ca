/**
 * boatnames.ca pricing rate card — v1.0.0 (authoritative, CAD, integer cents).
 *
 * ONE SOURCE OF TRUTH. No price is hardcoded in components or endpoints; they all
 * read the engine, which reads this card. A rate change is a DELIBERATE, versioned
 * event: bump PRICING_VERSION, update this card, and update the golden fixtures in
 * engine.test.ts — the tests will fail until the anchors are re-derived. Structured
 * so the whole card + engine can later be lifted into the shared a1-pricing-engine
 * package unchanged.
 *
 * Do NOT round, "improve", or extend these numbers here — they are the owner's
 * committed v1.0.0 model. Undefined cases (e.g. vinyl above its max height, acrylic
 * outside its bands) are returned `unpriced` by the engine, never guessed.
 */

export const PRICING_VERSION = "1.0.0";

export const RATE_CARD = {
  version: PRICING_VERSION,
  currency: "CAD" as const,

  /** Every base price covers design, proofing, template, application guide, and
   *  this many countable characters. Extra characters bill per the line's rate. */
  includedCharacters: 6,

  /** Order floor. Vinyl base already equals this, so it only ever documents intent. */
  minimumOrderCents: 9500,

  vinyl: {
    /** One colour, any height up to maxHeightIn. */
    baseCents: 9500, // $95
    maxHeightIn: 12,
    perExtraCharacterCents: 900, // $9, flat regardless of height (<= max)
    metallicSurchargeCents: 2500, // $25 flat per order (vinyl-gold / vinyl-silver)
  },

  acrylic: {
    /** Base assumes the 4–6" band. Taller bands add an uplift on EVERY character. */
    baseCents: 24900, // $249
    bands: [
      { key: "s", minIn: 4, maxIn: 6, perExtraCharacterCents: 2800, upliftPerCharacterCents: 0 },
      {
        key: "m",
        minIn: 7,
        maxIn: 10,
        perExtraCharacterCents: 3800,
        upliftPerCharacterCents: 1000,
      },
      {
        key: "l",
        minIn: 11,
        maxIn: 14,
        perExtraCharacterCents: 5200,
        upliftPerCharacterCents: 2400,
      },
    ],
    /** Mirror gold / mirror silver — per character, every character. */
    mirrorPerCharacterCents: 600, // $6
  },

  /** Flat add-on: one line, standard height, cut vinyl regardless of the main line. */
  hailingPortCents: 7500, // $75

  shipping: {
    standardCents: 3500, // $35 Canada-wide
    territoriesCents: 6500, // $65 YT / NT / NU
    freeOverSubtotalCents: 40000, // free when the pre-shipping subtotal >= $400
    territoryProvinces: ["YT", "NT", "NU"] as const,
  },
} as const;

/** Finish keys that carry the flat metallic surcharge on the vinyl line. */
export const METALLIC_VINYL_FINISHES = new Set(["vinyl-gold", "vinyl-silver"]);
/** Finish keys that carry the per-character mirror premium on the acrylic line. */
export const MIRROR_ACRYLIC_FINISHES = new Set(["mirror-gold", "mirror-silver"]);
