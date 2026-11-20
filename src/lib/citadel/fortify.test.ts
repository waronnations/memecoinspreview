import { describe, it, expect } from "vitest";
import { citadelPointsMult, nextCitadelCost, clampCitadelLevel } from "./fortify";
import { wardogPrice } from "@/lib/money/wardog-pricing";
describe("citadel fortify", () => {
  it("bonus per level", () => {
    expect(citadelPointsMult(0)).toBe(1);
    expect(citadelPointsMult(1)).toBeCloseTo(1.02);
    expect(citadelPointsMult(5)).toBeCloseTo(1.15);
    expect(citadelPointsMult(99)).toBeCloseTo(1.15);
    expect(citadelPointsMult("x")).toBe(1);
  });
  it("next cost and max", () => {
    expect(nextCitadelCost(0)).toBe(500);
    expect(nextCitadelCost(4)).toBe(25000);
    expect(nextCitadelCost(5)).toBeNull();
    expect(clampCitadelLevel(-3)).toBe(0);
  });
  it("WARDOG payment is 20% off", () => {
    expect(wardogPrice(nextCitadelCost(0)!)).toBe(400);
  });
});
