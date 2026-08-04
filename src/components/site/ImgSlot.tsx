import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  ratio?: string; // e.g. "4/3"
  className?: string;
  eager?: boolean;
};

/**
 * Renders an <img> at a known path. If the file isn't yet present, shows a
 * clearly labelled placeholder tile with the intended filename and alt text
 * so real photos can be dropped in without changing markup.
 */
export function ImgSlot({ src, alt, ratio = "4/3", className = "", eager }: Props) {
  const [failed, setFailed] = useState(false);
  // Every raster in public/images/ ships alongside .avif + .webp siblings (see
  // the WebP/AVIF sweep). Modern browsers take the smaller format; the <img>'s
  // original src is the fallback. NOTE: a new .jpg/.png added here MUST get its
  // .avif + .webp generated too, or the chosen source 404s -> onError placeholder.
  const base = /\.(jpe?g|png)$/i.test(src) ? src.replace(/\.(jpe?g|png)$/i, "") : null;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: ratio }}>
      {!failed ? (
        <picture>
          {base && <source srcSet={`${base}.avif`} type="image/avif" />}
          {base && <source srcSet={`${base}.webp`} type="image/webp" />}
          <img
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        </picture>
      ) : (
        <div className="placeholder-slot absolute inset-0">
          <div className="max-w-[80%]">
            <div className="text-[color:var(--polish)]/80">{src}</div>
            <div className="mt-2 opacity-70 normal-case">{alt}</div>
          </div>
        </div>
      )}
    </div>
  );
}
