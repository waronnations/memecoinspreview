import { describe, expect, it } from "vitest";
import { WARDOG_ASSET, canClaim } from "./vault";
import { WARDOG_CA } from "@/lib/tokens";

describe("War Vault WARDOG asset", () => {
  it("is a 9-decimal jetton keyed by the WARDOG master", () => {
    expect(WARDOG_ASSET.key).toBe(WARDOG_CA);
    expect(WARDOG_ASSET.kind).toBe("jetton");
    expect(WARDOG_ASSET.decimals).toBe(9);
  });
  it("needs at least 1 WARDOG to claim", () => {
    expect(canClaim(0.5, WARDOG_ASSET).ok).toBe(false);
    expect(canClaim(1, WARDOG_ASSET).ok).toBe(true);
  });
});
