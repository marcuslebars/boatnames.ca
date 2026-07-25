import { describe, expect, it } from "vitest";

import { extForImageType, sniffImageType } from "./magic-bytes";

const bytes = (...b: number[]) => new Uint8Array(b);

describe("sniffImageType", () => {
  it("detects JPEG", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00))).toBe("image/jpeg");
  });

  it("detects PNG", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe(
      "image/png",
    );
  });

  it("detects WEBP", () => {
    // "RIFF" .... "WEBP"
    expect(
      sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50)),
    ).toBe("image/webp");
  });

  it("detects HEIC by ftyp brand", () => {
    // .... "ftyp" "heic"
    expect(
      sniffImageType(bytes(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63)),
    ).toBe("image/heic");
  });

  it("rejects non-images (e.g. a PDF header) and truncated input", () => {
    expect(sniffImageType(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull(); // %PDF
    expect(sniffImageType(bytes(0xff, 0xd8))).toBeNull(); // too short for JPEG
  });

  it("maps types to extensions", () => {
    expect(extForImageType("image/jpeg")).toBe("jpg");
    expect(extForImageType("image/heic")).toBe("heic");
  });
});
