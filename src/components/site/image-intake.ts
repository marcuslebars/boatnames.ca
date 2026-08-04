// Client-side transom-photo intake for the previewer.
//
// The photo NEVER leaves the browser here: we decode it, correct EXIF
// orientation, downscale to a sane working size, and hand back a memory-only
// data URL. It only travels to the server later, through the quote form's
// existing multipart photo field, when the visitor submits.

export type LoadedPhoto = {
  /** Memory-only data URL (downscaled, EXIF-corrected) for <img> + canvas. */
  url: string;
  width: number;
  height: number;
};

/** Long-edge cap for the working image — keeps memory + the composite sane. */
const MAX_EDGE = 2000;
const MAX_BYTES = 10 * 1024 * 1024; // mirrors the quote form's stated 10 MB limit

export const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/**
 * Decode → EXIF-orient → downscale → data URL. Throws a human-readable Error
 * on anything the browser can't handle (notably HEIC outside Safari).
 */
export async function loadTransomPhoto(file: File): Promise<LoadedPhoto> {
  if (file.size > MAX_BYTES) {
    throw new Error("That photo is over 10 MB — try a smaller one, or a JPG from your phone.");
  }

  const bitmap = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Your browser couldn't process that image. Try another photo.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // JPEG keeps the working image small; it's a preview/proof, not an archival master.
  const url = canvas.toDataURL("image/jpeg", 0.9);
  return { url, width, height };
}

/**
 * `createImageBitmap` honours EXIF orientation with `imageOrientation:
 * "from-image"` in Chromium/Firefox; Safari applies it by default and may
 * reject the options bag, so fall back to the no-options form.
 */
async function decode(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== "function") {
    throw new Error(
      "Your browser can't preview photos here — try a recent Chrome, Safari, or Firefox.",
    );
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error(
        "We couldn't read that image. HEIC photos may only work in Safari — try a JPG or PNG.",
      );
    }
  }
}
