import { describe, expect, it } from "vitest";

import { resolveSiteUrl } from "./site";

describe("resolveSiteUrl", () => {
  it("falls back to the default when unset", () => {
    expect(resolveSiteUrl(undefined)).toBe("https://boatnames.ca");
  });

  it("falls back when the build arg is inlined as an empty string", () => {
    expect(resolveSiteUrl("")).toBe("https://boatnames.ca");
    expect(resolveSiteUrl("   ")).toBe("https://boatnames.ca");
  });

  it("keeps a configured origin and trims trailing slashes", () => {
    expect(resolveSiteUrl("https://staging.boatnames.ca/")).toBe("https://staging.boatnames.ca");
    expect(resolveSiteUrl("https://boatnames.ca//")).toBe("https://boatnames.ca");
  });
});
