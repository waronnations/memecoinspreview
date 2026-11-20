import { describe, expect, it } from "vitest";
import { citadelCardState } from "./CitadelCard";

describe("Citadel card gating", () => {
  it("next upgrade from L0 costs 400 WARDOG (500 list, 20% off)", () => {
    const s = citadelCardState(0, 1000, "leader");
    expect(s.list).toBe(500);
    expect(s.cost).toBe(400);
    expect(s.canFortify).toBe(true);
  });
  it("members cannot fortify even with enough vault", () => {
    expect(citadelCardState(0, 1000, "member").canFortify).toBe(false);
  });
  it("officers with a short vault see insufficient", () => {
    const s = citadelCardState(1, 100, "officer");
    expect(s.cost).toBe(1200);
    expect(s.short).toBe(true);
    expect(s.canFortify).toBe(false);
  });
  it("L5 is maxed", () => {
    expect(citadelCardState(5, 1e9, "leader").cost).toBeNull();
  });
});
