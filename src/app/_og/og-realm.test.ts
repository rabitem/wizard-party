import { describe, expect, it } from "vitest";
import { DEFAULT_OG_REALM, ogImageQuery, ogRealm } from "./og-realm";

describe("ogRealm", () => {
  it("keeps a realm we have a room for", () => {
    expect(ogRealm("neon")).toBe("neon");
  });

  it.each([null, undefined, "", "atlantis", "../../etc/passwd"])("falls back to Classic for %j", (requested) => {
    expect(ogRealm(requested)).toBe(DEFAULT_OG_REALM);
  });
});

describe("ogImageQuery", () => {
  it("passes the realm on to the image, encoding every value", () => {
    expect(ogImageQuery({ d: "a+b/c=" }, "winter")).toBe("?d=a%2Bb%2Fc%3D&realm=winter");
  });

  it("leaves Classic and unknown realms out", () => {
    expect(ogImageQuery({ room: "K7QX" }, DEFAULT_OG_REALM)).toBe("?room=K7QX");
    expect(ogImageQuery({ room: "K7QX" }, "atlantis")).toBe("?room=K7QX");
  });

  it("is empty when there is nothing to pass", () => {
    expect(ogImageQuery({ d: undefined }, null)).toBe("");
  });
});
