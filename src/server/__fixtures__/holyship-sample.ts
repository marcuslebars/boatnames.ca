import type { HolyShipLead } from "../empirevu";

/**
 * Canonical sample used to generate + pin the Holy Ship golden fixture
 * (holyship-quote.json). Keep this and the fixture in lockstep: regenerate the
 * fixture from this input if the builder changes, and review the diff.
 */
export const SAMPLE_HOLYSHIP_LEAD: HolyShipLead = {
  name: "Marcus Reed",
  email: "marcus@example.com",
  phone: "705-555-0199",
  boatModel: "Meridian 408 Motoryacht",
  marina: "Bay Port Yachting Centre",
  boatName: "Holy Ship",
  hailingPort: "Midland, ON",
  font: "Transom Serif",
  finish: "Mirror Gold",
  letterHeightIn: 8,
  runLengthIn: 60,
  transomWidthIn: 168,
  notes: "Would love to have it done before the August long weekend.",
  photoUrl: "https://holyship.a1marinecare.ca/storage/quote-photos/example.jpg",
  previewUrl:
    "https://holyship.a1marinecare.ca/?name=Holy+Ship&port=Midland%2C+ON&font=transom-serif&finish=mirror-gold&size=8#previewer",
  utm: { utm_source: "google", utm_campaign: "acrylic-lettering" },
};

export const SAMPLE_RECEIVED_AT = "2026-07-25T15:00:00.000Z";
