import { describe, expect, it } from "vitest";
import {
  WARDOG_DISCOUNT, wardogPrice, wardogPriceFromQuote, splitWardogSpend,
  wardogTier, tierGloryMult, tierCitadelBoost, tierPerkLines, nextTier,
} from "./wardog-pricing";

describe("WARDOG discount", () => {
  it("is 20%", () => expect(WARDOG_DISCOUNT).toBe(0.2));
  it("Armory item listed at 10 costs 8 WARDOG", () => expect(wardogPrice(10)).toBe(8));
  it("keeps 4 decimals", () => expect(wardogPrice(3.3333)).toBe(2.6666));
  it("invalid prices cost nothing and never go negative", () => {
    expect(wardogPrice(-5)).toBe(0);
    expect(wardogPrice(Number.NaN)).toBe(0);
  });
  it("10 GRAM at $5 with WARDOG at $0.01 → 4000 WARDOG (20% off $50)", () =>
    expect(wardogPriceFromQuote(10, 5, 0.01)).toBe(4000));
  it("no WARDOG price when a market price is unknown", () => {
    expect(wardogPriceFromQuote(10, null, 0.01)).toBeNull();
    expect(wardogPriceFromQuote(10, 5, 0)).toBeNull();
  });
});

describe("burn / War Vault split", () => {
  it("splits 50/50", () => expect(splitWardogSpend(100)).toEqual({ spent: 100, burn: 50, vault: 50 }));
  it("odd amounts never lose or create tokens", () => {
    const s = splitWardogSpend(0.0003);
    expect(s.burn).toBe(0.0001);
    expect(s.vault).toBe(0.0002);
    expect(s.burn + s.vault).toBeCloseTo(s.spent, 10);
  });
  it("nothing spent → nothing burned", () => expect(splitWardogSpend(0)).toEqual({ spent: 0, burn: 0, vault: 0 }));
});

describe("holder tiers", () => {
  it.each([
    [999, "none"], [1000, "dog_soldier"],
    [9999, "dog_soldier"], [10000, "pack_leader"],
    [49999, "pack_leader"], [50000, "apex_warlord"],
  ])("%d WARDOG → %s", (bal, id) => expect(wardogTier(bal).id).toBe(id));
  it("unknown balance never grants a tier", () => expect(wardogTier(null).id).toBe("none"));
  it("Battle Glory +10/+20/+30%", () => {
    expect(tierGloryMult(wardogTier(1000))).toBe(1.1);
    expect(tierGloryMult(wardogTier(10000))).toBe(1.2);
    expect(tierGloryMult(wardogTier(50000))).toBe(1.3);
    expect(tierGloryMult(wardogTier(999))).toBe(1);
  });
  it("only Apex gets +10% Citadel Dominance", () => {
    expect(tierCitadelBoost(wardogTier(50000))).toBe(0.1);
    expect(tierCitadelBoost(wardogTier(10000))).toBe(0);
  });
  it("UI lists only perks the server applies", () => {
    expect(tierPerkLines(wardogTier(1000))).toEqual(["+10% Battle Glory"]);
    expect(tierPerkLines(wardogTier(10000))).toEqual(["+20% Battle Glory"]);
    expect(tierPerkLines(wardogTier(50000))).toEqual(["+30% Battle Glory", "+10% Citadel Dominance"]);
  });
  it("next tier shows what's missing", () => {
    expect(nextTier(999)).toEqual({ tier: wardogTier(1000), needed: 1 });
    expect(nextTier(60000)).toBeNull();
  });
});
