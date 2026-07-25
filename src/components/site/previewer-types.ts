export type Finish = "mirror-gold" | "mirror-silver" | "gloss-black" | "gloss-white" | "frosted";
export type FontKey = "transom-serif" | "deck-sans" | "commodore" | "commodore-italic" | "yacht-script";

export type PreviewConfig = {
  name: string;
  port: string;
  font: FontKey;
  finish: Finish;
  size: number; // letter height in inches
};

export const FONT_OPTIONS: { key: FontKey; label: string; css: string; weight?: number }[] = [
  { key: "transom-serif", label: "Transom Serif", css: '"Yeseva One", serif', weight: 400 },
  { key: "deck-sans", label: "Deck Sans", css: '"Big Shoulders Display", sans-serif', weight: 800 },
  { key: "commodore", label: "Commodore", css: '"Bebas Neue", sans-serif', weight: 400 },
  { key: "commodore-italic", label: "Commodore Italic", css: '"Playfair Display", serif', weight: 800 },
  { key: "yacht-script", label: "Yacht Script", css: '"Alex Brush", cursive', weight: 400 },
];

export const FINISH_OPTIONS: { key: Finish; label: string; textClass: string }[] = [
  { key: "mirror-gold", label: "Mirror Gold", textClass: "finish-mirror-gold" },
  { key: "mirror-silver", label: "Mirror Silver", textClass: "finish-mirror-silver" },
  { key: "gloss-black", label: "Gloss Black", textClass: "finish-gloss-black" },
  { key: "gloss-white", label: "Gloss White", textClass: "finish-gloss-white" },
  { key: "frosted", label: "Frosted", textClass: "finish-frosted" },
];