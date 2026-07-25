import { z } from "zod";

/**
 * The canonical lead envelope, schemaVersion 1 — copied VERBATIM from
 * syncoree/src/server/services/lead-intake/envelope.ts (the intake's source of
 * truth). Kept here only to guard drift locally: the fixture test asserts our
 * builder's output survives this schema WITHOUT losing keys (a plain z.object
 * strips unknowns, so an over-eager field would be silently dropped by the intake
 * — the exact failure mode we must never ship). If the canonical schema changes
 * upstream, re-copy this file and re-run the tests.
 */
export const LEAD_SCHEMA_VERSION = 1 as const;

export const leadLineItemSchema = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number(),
  unitPriceCents: z.number().int(),
});

export const leadEnvelopeSchema = z.object({
  schemaVersion: z.literal(LEAD_SCHEMA_VERSION),
  source: z.string().min(1).max(120),
  sourceSite: z.string().min(1).max(80),
  formType: z.enum(["quote", "contact", "booking"]),
  receivedAt: z.string().datetime(),
  contact: z
    .object({
      name: z.string().max(200).optional(),
      email: z.string().email().max(320).optional(),
      phone: z.string().max(64).optional(),
    })
    .refine((c) => Boolean((c.email && c.email.trim()) || (c.phone && c.phone.trim())), {
      message: "contact requires at least one of email or phone",
    }),
  message: z.string().max(10000).optional(),
  lineItems: z.array(leadLineItemSchema).max(100).optional(),
  asset: z
    .object({
      makeModel: z.string().max(200).optional(),
      lengthFt: z.number().optional(),
      type: z.string().max(120).optional(),
      marina: z.string().max(200).optional(),
    })
    .optional(),
  meta: z
    .object({
      site: z.string().max(200).optional(),
      page: z.string().max(300).optional(),
      preferredDate: z.string().max(40).optional(),
      preferredTime: z.string().max(40).optional(),
      utm: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type LeadEnvelopeSchemaType = z.infer<typeof leadEnvelopeSchema>;
