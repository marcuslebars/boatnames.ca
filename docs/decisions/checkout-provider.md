# Decision record — checkout provider

**Status:** deferred (quote-only at launch). **Date:** 2026-07. **Scope:** boatnames.ca
direct checkout for the vinyl ship-anywhere tier.

## Launch state: quote-only, and why

boatnames.ca launches without a payment provider. Every order is priced by a human
in the proof email and settled off-platform; the manual admin path
(`/api/admin/orders`) walks an order `draft → … → completed` by hand. This avoids
committing to a provider, a tax integration, and a checkout UI before there is
demand data — while the **order model, the pricing adapter seam, and the config
flags** are already in place, so adding checkout later touches a pricing adapter,
one API route, and a webhook handler — not the schema, the quote flow, or the
envelope builder.

## Lead candidate: Stripe Checkout

- **Pricing** plugs into the existing `PricingAdapter` seam (swap `manual` for the
  a1-pricing-engine adapter; no visitor-facing price logic moves).
- **Tax**: Stripe Tax computes GST/HST/PST by province — the exact Canadian tax
  surface, without us maintaining rate tables.
- **System of record**: orders land natively in the **owned stack** (the `orders`
  table) and forward to **EmpireVu** through the existing lead envelope. One system
  of record; the customer/order data already speaks our schema.
- **Cost**: per-transaction fees; we build our own shipping-label / returns flow.

## Alternative: headless Shopify

- **Buys** shipping labels, tax, and returns machinery out of the box.
- **Cost**: a **second customer/order system of record** that does _not_ speak the
  lead envelope — reconciling Shopify orders back into EmpireVu is ongoing glue, and
  the CRM stops being the single source of truth. Heavier to operate for a
  single-product, made-to-order line.

## Trigger to revisit

Sustained **vinyl ship-anywhere demand at stable pricing** — enough repeat quote→sale
volume that manual pricing/settlement is the bottleneck, and the price model is
steady enough to encode in the adapter. Until then, quote-only wins.

## Note

This choice sets precedent for **Marine Mecca**'s eventual stack. If Stripe Checkout
proves out here (adapter seam + Stripe Tax + single owned system of record), it is the
default recommendation there rather than a second Shopify system of record.
