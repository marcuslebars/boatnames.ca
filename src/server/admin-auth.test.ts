import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authorizeAdmin } from "./admin-auth";

const KEYS = ["CHECKOUT_ENABLED", "ADMIN_API_TOKEN"];
const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/admin/orders", { headers });

describe("authorizeAdmin — server-to-server gate", () => {
  const snapshot: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it("checkout seam off -> 404", () => {
    const r = authorizeAdmin(req());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });

  it("enabled but token env unset -> 403 (rejected even when enabled)", () => {
    process.env.CHECKOUT_ENABLED = "1";
    const r = authorizeAdmin(req());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("enabled + token set + no bearer -> 403", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "secret";
    const r = authorizeAdmin(req());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("enabled + token set + wrong bearer -> 403", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "secret";
    const r = authorizeAdmin(req({ authorization: "Bearer nope" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("enabled + token set + correct bearer -> ok", () => {
    process.env.CHECKOUT_ENABLED = "1";
    process.env.ADMIN_API_TOKEN = "secret";
    expect(authorizeAdmin(req({ authorization: "Bearer secret" }))).toEqual({ ok: true });
  });
});
