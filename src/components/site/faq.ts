// Homepage FAQ — one source for both the visible section and the FAQPage JSON-LD,
// so the structured data always matches what's on the page (Google requires it).
// Keep answers to facts the site already states: no invented prices, turnaround
// times, or warranties.

export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Should I choose cast acrylic or cut vinyl?",
    a: 'Cast acrylic is the premium tier: laser-cut letters 1/4" thick that stand off the hull, cast a shadow, stay colour-stable for 10+ years and come in mirror gold, mirror silver, gloss black, gloss white and frosted. Cut vinyl is the value tier: a flat, printed look in solid colours and printed metallics that lasts 3–5 years. Both start in the previewer, so you can compare them on your own transom.',
  },
  {
    q: "What size should my boat name letters be?",
    a: 'The previewer lets you set a letter height from 3" to 14" and shows the total run length as you type, so you can see whether the name fits your panel. Short names carry well at a distance; longer names usually want a smaller letter height so the run still fits the transom without crowding it.',
  },
  {
    q: "How do you make sure the lettering fits my transom?",
    a: "Send a clean, square-on photo of your transom with its width in inches. We template from that photo, you approve a full-size template and a proof, and we confirm dimensions before anything is cut.",
  },
  {
    q: "Can I install the lettering myself?",
    a: "Yes. Every shipped order comes with a step-by-step application guide and is templated to your transom from your photos, so it goes on straight the first time.",
  },
  {
    q: "Do you install boat names?",
    a: "Yes, within our service area. A1 Marine Care crews template, cut and install at your marina across Georgian Bay, Lake Simcoe and the Trent-Severn Waterway. Outside that area, we ship your lettering with an application guide instead.",
  },
  {
    q: "Where do you ship?",
    a: "Anywhere in Canada. Prices are in Canadian dollars.",
  },
  {
    q: "How much does custom boat name lettering cost?",
    a: "Price depends on the name, letter height, product line and finish. Design your name in the previewer and send it with your transom photo; we reply within one business day with a proof and a price in CAD.",
  },
  {
    q: "What if a letter gets damaged?",
    a: "Cast acrylic letters are individually replaceable, so a single damaged letter can be swapped out. Cut vinyl needs a full replacement.",
  },
  {
    q: "Is boat name lettering hard to remove later?",
    a: "Cast acrylic releases cleanly. Vinyl tends to leave adhesive residue and often needs heat to come off.",
  },
];

export function faqJsonLd(items: FaqItem[] = FAQ_ITEMS) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
