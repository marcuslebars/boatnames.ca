import { describe, expect, it } from "vitest";

import { canTransition, type OrderStatus } from "@/components/site/order-schema";

import { signProofToken, verifyProofToken } from "./checkout";

describe("Buy-now order ladder", () => {
  it("walks draft -> paid -> proofed -> in_production -> shipped", () => {
    const walk: OrderStatus[] = ["draft", "paid", "proofed", "in_production", "shipped"];
    for (let i = 0; i < walk.length - 1; i++) {
      expect(canTransition(walk[i], walk[i + 1])).toBe(true);
    }
  });

  it("still forbids draft -> shipped (the illegal-transition guard)", () => {
    expect(canTransition("draft", "shipped")).toBe(false);
  });

  it("refund is reachable from paid and shipped", () => {
    expect(canTransition("paid", "refunded")).toBe(true);
    expect(canTransition("shipped", "refunded")).toBe(true);
  });
});

describe("proof-approval token", () => {
  it("round-trips and rejects tampering / wrong order / bad length", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const token = signProofToken("order-123");
    expect(verifyProofToken("order-123", token)).toBe(true);
    expect(verifyProofToken("order-999", token)).toBe(false); // token bound to the order id
    expect(verifyProofToken("order-123", token.slice(0, -2) + "00")).toBe(false); // tampered
    expect(verifyProofToken("order-123", "short")).toBe(false); // length mismatch
  });
});
