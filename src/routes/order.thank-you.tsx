import { createFileRoute, Link } from "@tanstack/react-router";

import { BoatnamesLogo } from "@/components/site/BoatnamesLogo";

/**
 * Stripe success_url lands here after payment. The order is already paid via the
 * webhook (source of truth) — this page is just the human "you're set" confirmation.
 */
export const Route = createFileRoute("/order/thank-you")({
  head: () => ({
    meta: [{ title: "Thank you — boatnames.ca" }, { name: "robots", content: "noindex" }],
  }),
  component: ThankYou,
});

function ThankYou() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--hull)] px-6 text-center">
      <BoatnamesLogo className="h-8" taglineClassName="block" />
      <p className="mt-12 font-mono text-[11px] tracking-[0.3em] text-[color:var(--polish)]">
        PAYMENT RECEIVED
      </p>
      <h1 className="mt-4 font-sans text-4xl font-bold uppercase tracking-tight text-[color:var(--gelcoat)] sm:text-5xl">
        Thank you — you're all set.
      </h1>
      <p className="mt-4 max-w-md text-sm text-[color:var(--gelcoat)]/70">
        Your receipt is on its way by email. We'll send a proof within one business day — production
        starts the moment you approve it.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-sm border border-[color:var(--polish)] px-4 py-2 font-sans text-[11px] font-semibold tracking-[0.2em] text-[color:var(--polish)] transition hover:bg-[color:var(--polish)]/10"
      >
        BACK TO BOATNAMES.CA →
      </Link>
    </div>
  );
}
