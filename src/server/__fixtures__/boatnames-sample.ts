import type { BoatnamesLead, BoatnamesOrder } from "../empirevu";

/**
 * Canonical samples used to generate + pin the boatnames golden fixtures. Keep
 * these and the fixtures in lockstep: if the builder changes, regenerate the
 * fixtures from these inputs and review the diff. Two cases cover both product
 * lines and both fulfillment tiers (ship+acrylic, install+vinyl). `finish` is the
 * human label the API route resolves before building (e.g. "Mirror Gold").
 */
export const SAMPLE_SHIP_ACRYLIC: BoatnamesLead = {
  name: "Marcus Reed",
  email: "marcus@example.com",
  phone: "705-555-0199",
  boatModel: "Meridian 408 Motoryacht",
  marina: "Bay Port Yachting Centre",
  boatName: "Second Wind",
  hailingPort: "Midland, ON",
  line: "acrylic",
  fulfillment: "ship",
  font: "Transom Serif",
  finish: "Mirror Gold",
  letterHeightIn: 8,
  runLengthIn: 60,
  transomWidthIn: 168,
  notes: "Would love to have it done before the August long weekend.",
  photoUrl: "https://boatnames.ca/storage/quote-photos/example.jpg",
  previewUrl:
    "https://boatnames.ca/?name=Second+Wind&line=acrylic&font=transom-serif&finish=mirror-gold&size=8#previewer",
  utm: { utm_source: "google", utm_campaign: "boat-lettering" },
};

export const SAMPLE_INSTALL_VINYL: BoatnamesLead = {
  name: "Dana Lowe",
  email: "dana@example.com",
  phone: "705-555-0142",
  boatModel: "Sea Ray 320 Sundancer",
  marina: "Wye Heritage Marina",
  boatName: "Knot Working",
  hailingPort: "Penetanguishene, ON",
  line: "vinyl",
  fulfillment: "install",
  font: "Deck Sans",
  finish: "Metallic Gold",
  letterHeightIn: 6,
  runLengthIn: 44,
  transomWidthIn: 132,
  notes: "Would like it installed before the season opener.",
  photoUrl: "https://boatnames.ca/storage/quote-photos/example2.jpg",
  previewUrl:
    "https://boatnames.ca/?name=Knot+Working&line=vinyl&font=deck-sans&finish=vinyl-gold&size=6#previewer",
  utm: { utm_source: "instagram", utm_campaign: "install" },
};

/** A paid order used to pin the boatnames_order_paid envelope fixture. */
export const SAMPLE_ORDER: BoatnamesOrder = {
  orderId: "ord_test_0001",
  name: "Marcus Reed",
  email: "marcus@example.com",
  boatName: "Second Wind",
  hailingPort: "Midland, ON",
  font: "Transom Serif",
  finish: "Mirror Gold",
  line: "acrylic",
  letterHeightIn: 8,
  totalCents: 50700,
  currency: "CAD",
  shipCity: "Midland",
  shipProvince: "ON",
};

export const SAMPLE_RECEIVED_AT = "2026-07-25T15:00:00.000Z";
