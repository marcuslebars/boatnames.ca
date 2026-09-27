import { describe, expect, it } from "vitest";

import { FONT_OPTIONS } from "@/components/site/previewer-types";

import { CATEGORIES, NAME_MAX_LENGTH, allNames, getCategory, previewHref } from "./boat-names";

describe("boat-name library", () => {
  it("every name fits the previewer's name field", () => {
    const tooLong = CATEGORIES.flatMap((c) => c.names).filter((n) => n.length > NAME_MAX_LENGTH);
    expect(tooLong).toEqual([]);
  });

  it("has no blank names and no duplicates within a category", () => {
    for (const cat of CATEGORIES) {
      expect(cat.names.every((n) => n.trim() === n && n.length > 0)).toBe(true);
      expect(new Set(cat.names).size).toBe(cat.names.length);
    }
  });

  it("gives every category a real list and a valid letter style", () => {
    const fonts = FONT_OPTIONS.map((f) => f.key);
    for (const cat of CATEGORIES) {
      expect(cat.names.length).toBeGreaterThanOrEqual(40);
      expect(fonts).toContain(cat.font);
    }
  });

  it("has unique category slugs that resolve", () => {
    const slugs = CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(getCategory(slug)?.slug).toBe(slug);
    expect(getCategory("nope")).toBeUndefined();
  });

  it("merges names shared by several categories", () => {
    const entries = allNames();
    expect(new Set(entries.map((e) => e.name)).size).toBe(entries.length);
    const trueNorth = entries.find((e) => e.name === "True North");
    expect(trueNorth?.categories).toEqual(expect.arrayContaining(["sailboat", "canadian"]));
  });

  it("builds a previewer link the previewer can parse", () => {
    expect(previewHref("Fair Winds", "yacht-script")).toBe(
      "/?name=Fair+Winds&font=yacht-script#previewer",
    );
  });
});
