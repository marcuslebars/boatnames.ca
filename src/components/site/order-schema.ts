import { z } from "zod";

/**
 * Order-domain contract (Phase 8 checkout seam). Lives beside the lead schemas
 * (quote-schema.ts) and is shared client/server. Nothing here touches the visitor
 * path yet — the manual admin flow is the only consumer. No payment-provider
 * identifiers appear in this file, so it is safe if it ever reaches the client.
 */

// Lifecycle ladder, incl. the quote-era manual path. Mirrors the enum in
// 20260728000000_orders_domain.sql.
export const ORDER_STATUSES = [
  "draft",
  "proofed",
  "invoiced",
  "paid",
  "in_production",
  "shipped",
  "install_scheduled",
  "completed",
  "cancelled",
  "refunded",
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const orderPaymentProviderSchema = z.enum(["stripe", "shopify", "manual"]);
export type OrderPaymentProvider = z.infer<typeof orderPaymentProviderSchema>;

export const orderEventActorSchema = z.enum(["system", "admin", "webhook"]);
export type OrderEventActor = z.infer<typeof orderEventActorSchema>;

/**
 * Legal status transitions. Two lifecycles share this ladder:
 *   - Buy-now (checkout):  draft -> paid -> proofed -> in_production -> shipped
 *   - Manual quote path:   draft -> proofed -> invoiced -> paid -> ...
 * `cancelled` and `refunded` are terminal. There is still NO draft -> shipped
 * (the illegal-transition guard the DoD checks). The Buy-now edges (draft->paid,
 * paid->proofed, proofed->in_production) are additive — every quote-path edge is
 * unchanged.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["paid", "proofed", "cancelled"],
  proofed: ["invoiced", "in_production", "cancelled"],
  invoiced: ["paid", "cancelled"],
  paid: ["proofed", "in_production", "shipped", "install_scheduled", "refunded"],
  in_production: ["shipped", "install_scheduled", "cancelled"],
  shipped: ["completed", "refunded"],
  install_scheduled: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// The design config carried onto an order (same shape the previewer serializes).
export const orderDesignSchema = z.object({
  boat_name: z.string().max(18).optional(),
  hailing_port: z.string().max(24).optional(),
  font: z.string().max(60).optional(),
  finish: z.string().max(60).optional(),
  letter_height_in: z.number().optional(),
  run_length_in: z.number().optional(),
});
export type OrderDesign = z.infer<typeof orderDesignSchema>;

// Admin POST /api/admin/orders input — promote an existing quote into an order.
export const createOrderInputSchema = z.object({
  quote_request_id: z.string().uuid(),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Admin PATCH /api/admin/orders/:id/status input.
export const orderStatusPatchSchema = z.object({
  status: orderStatusSchema,
  // Shipment tracking — only applied on the `shipped` transition.
  tracking_number: z.string().max(120).optional(),
  carrier: z.string().max(60).optional(),
});
export type OrderStatusPatch = z.infer<typeof orderStatusPatchSchema>;
