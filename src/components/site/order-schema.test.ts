import { describe, expect, it } from "vitest";

import { canTransition, type OrderStatus } from "./order-schema";

describe("order status ladder", () => {
  it("walks draft -> proofed -> invoiced -> paid -> shipped", () => {
    const walk: OrderStatus[] = ["draft", "proofed", "invoiced", "paid", "shipped"];
    for (let i = 0; i < walk.length - 1; i++) {
      expect(canTransition(walk[i], walk[i + 1])).toBe(true);
    }
  });

  it("rejects the illegal draft -> shipped jump", () => {
    expect(canTransition("draft", "shipped")).toBe(false);
  });

  it("rejects any transition out of a terminal state", () => {
    expect(canTransition("cancelled", "draft")).toBe(false);
    expect(canTransition("refunded", "paid")).toBe(false);
    expect(canTransition("completed", "shipped")).toBe(false);
  });

  it("allows cancellation from pre-fulfillment states and refund after", () => {
    expect(canTransition("draft", "cancelled")).toBe(true);
    expect(canTransition("invoiced", "cancelled")).toBe(true);
    expect(canTransition("paid", "refunded")).toBe(true);
    expect(canTransition("completed", "refunded")).toBe(true);
  });

  it("supports both fulfillment exits from paid/in_production", () => {
    expect(canTransition("paid", "install_scheduled")).toBe(true);
    expect(canTransition("in_production", "shipped")).toBe(true);
    expect(canTransition("in_production", "install_scheduled")).toBe(true);
  });
});
