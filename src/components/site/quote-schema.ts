import { z } from "zod";
import { type Finish, FINISH_OPTIONS, type FontKey, FONT_OPTIONS } from "./previewer-types";

const fontKeys = FONT_OPTIONS.map((f) => f.key) as [FontKey, ...FontKey[]];
const finishKeys = FINISH_OPTIONS.map((f) => f.key) as [Finish, ...Finish[]];

// FormData yields strings; treat "" as "not provided".
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalNumber = (schema: z.ZodType<number>) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

/**
 * Shared contract for a quote submission. Validated on the client (before the
 * request) and again on the server (never trust the client). Unknown keys —
 * honeypot, timing, source, preview_url, consent_text — are stripped here and
 * handled separately.
 */
export const quoteSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email: z
    .string()
    .trim()
    .min(1, "An email is required.")
    .email("That email address doesn't look right."),
  phone: optionalText(40),
  boat_model: optionalText(120),
  marina: optionalText(120),
  transom_width: optionalNumber(
    z.coerce.number().positive("Transom width must be a positive number.").max(600),
  ),
  boat_name: optionalText(18),
  hailing_port: optionalText(24),
  font: z.enum(fontKeys),
  finish: z.enum(finishKeys),
  letter_height: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce
      .number()
      .min(3, 'Letter height must be at least 3".')
      .max(14, 'Letter height caps at 14".'),
  ),
  notes: optionalText(2000),
  consent: z
    .string()
    .optional()
    .refine((v) => v === "on", {
      message: "Please confirm you're okay with us contacting you about this quote.",
    }),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

// Exact CASL consent wording the visitor agrees to. Sent with the submission and
// recorded server-side (with timestamp + IP) so consent is auditable.
export const CONSENT_TEXT =
  "I agree that A1 Marine Care may email or call me about this boat-name lettering quote. I can ask them to stop contacting me at any time.";

// Anti-bot: a hidden honeypot field that must stay empty, and a minimum time on
// the form before submitting. Both are enforced server-side.
export const HONEYPOT_FIELD = "company";
export const TIMING_FIELD = "started_at";
export const MIN_FILL_MS = 2500;
