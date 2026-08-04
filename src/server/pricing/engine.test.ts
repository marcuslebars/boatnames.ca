import { describe, expect, it } from "vitest";

import { countCharacters, priceDesign, shippingCents, type EngineInput } from "./engine";
import { PRICING_VERSION } from "./rate-card";

/** Assert a design prices and return the priced result (fails loudly otherwise). */
function priced(input: EngineInput) {
  const r = priceDesign(input);
  expect(r.status).toBe("priced");
  if (r.status !== "priced") throw new Error(`expected priced, got: ${r.reason}`);
  return r;
}

describe("pricing engine v1.0.0", () => {
  it("exports version 1.0.0", () => {
    expect(PRICING_VERSION).toBe("1.0.0");
  });

  describe("countCharacters", () => {
    it("letters and digits count 1, spaces are free", () => {
      expect(countCharacters("SEA WOLF")).toBe(7); // 7 letters, space free
      expect(countCharacters("HULL 7")).toBe(5); // 4 letters + digit, space free
    });
    it("punctuation/symbols count 0.5, total rounds up", () => {
      expect(countCharacters("O'ELEVENSEAS")).toBe(12); // 11 letters + apostrophe(0.5) = 11.5 -> 12
      expect(countCharacters("A&B")).toBe(3); // 1 + 0.5 + 1 = 2.5 -> 3
    });
  });

  // The four authoritative anchors from the pricing model — must reproduce EXACTLY.
  // If any of these fails, the rate card changed and the model was NOT re-derived.
  describe("golden anchors", () => {
    it("1 — vinyl, 8 chars, solid, no port -> 113 + 35 ship = 148", () => {
      const r = priced({
        line: "vinyl",
        name: "EIGHTLTR",
        finish: "vinyl-white",
        heightIn: 10,
        hasPort: false,
      });
      expect(r.characters).toBe(8);
      expect(r.subtotalCents).toBe(11300);
      expect(shippingCents(r.subtotalCents)).toBe(3500);
      expect(r.subtotalCents + shippingCents(r.subtotalCents)).toBe(14800);
    });

    it('2 — acrylic, 9 chars, 7-10", mirror gold, no port -> 507, free ship', () => {
      const r = priced({
        line: "acrylic",
        name: "NINECHARS",
        finish: "mirror-gold",
        heightIn: 8,
        hasPort: false,
      });
      expect(r.characters).toBe(9);
      expect(r.subtotalCents).toBe(50700);
      expect(shippingCents(r.subtotalCents)).toBe(0);
    });

    it('3 — acrylic, 6 chars, 4-6", gloss black, +port -> 324 + 35 = 359', () => {
      const r = priced({
        line: "acrylic",
        name: "SIXLTR",
        finish: "gloss-black",
        heightIn: 5,
        hasPort: true,
      });
      expect(r.characters).toBe(6);
      expect(r.subtotalCents).toBe(32400);
      expect(r.subtotalCents + shippingCents(r.subtotalCents)).toBe(35900);
    });

    it("4 — vinyl, 12 countable (apostrophe), metallic, +port -> 249 + 35 = 284", () => {
      const r = priced({
        line: "vinyl",
        name: "O'ELEVENSEAS",
        finish: "vinyl-gold",
        heightIn: 8,
        hasPort: true,
      });
      expect(r.characters).toBe(12);
      expect(r.subtotalCents).toBe(24900);
      expect(r.subtotalCents + shippingCents(r.subtotalCents)).toBe(28400);
    });
  });

  describe("undefined cases return unpriced (never guessed)", () => {
    it('vinyl above 12"', () => {
      expect(
        priceDesign({
          line: "vinyl",
          name: "SEA",
          finish: "vinyl-white",
          heightIn: 13,
          hasPort: false,
        }).status,
      ).toBe("unpriced");
    });
    it('acrylic below 4"', () => {
      expect(
        priceDesign({
          line: "acrylic",
          name: "SEA",
          finish: "gloss-black",
          heightIn: 3.5,
          hasPort: false,
        }).status,
      ).toBe("unpriced");
    });
    it('acrylic in a between-band gap (6.5", 10.5")', () => {
      expect(
        priceDesign({
          line: "acrylic",
          name: "SEA",
          finish: "gloss-black",
          heightIn: 6.5,
          hasPort: false,
        }).status,
      ).toBe("unpriced");
      expect(
        priceDesign({
          line: "acrylic",
          name: "SEA",
          finish: "gloss-black",
          heightIn: 10.5,
          hasPort: false,
        }).status,
      ).toBe("unpriced");
    });
  });

  describe("shipping", () => {
    it("standard $35 under the free threshold", () => expect(shippingCents(11300)).toBe(3500));
    it("free at/over $400 subtotal", () => {
      expect(shippingCents(40000)).toBe(0);
      expect(shippingCents(50700)).toBe(0);
    });
    it("territories pay $65 even above the free threshold", () => {
      expect(shippingCents(50700, "NU")).toBe(6500);
      expect(shippingCents(11300, "yt")).toBe(6500);
    });
  });

  describe("base coverage + version stamp", () => {
    it("a 6-character vinyl order is exactly the base", () => {
      expect(
        priced({
          line: "vinyl",
          name: "SIXLTR",
          finish: "vinyl-white",
          heightIn: 6,
          hasPort: false,
        }).subtotalCents,
      ).toBe(9500);
    });
    it("stamps the rate-card version onto every priced result", () => {
      expect(
        priced({ line: "vinyl", name: "SEA", finish: "vinyl-white", heightIn: 6, hasPort: false })
          .version,
      ).toBe("1.0.0");
    });
  });
});
