import { describe, expect, it } from "vitest";
import { Address } from "@ton/core";
import { TON_BURN_ADDRESS, TON_BURN_ADDRESS_RAW, assertBurnAddress, isCanonicalBurnAddress } from "./burn-address";

describe("TON burn address", () => {
  it("is the canonical all-zero blackhole", () => {
    expect(Address.parse(TON_BURN_ADDRESS).toRawString()).toBe(TON_BURN_ADDRESS_RAW);
    expect(isCanonicalBurnAddress(TON_BURN_ADDRESS)).toBe(true);
  });
  it("accepts the bounceable form of the same account", () =>
    expect(isCanonicalBurnAddress("EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c")).toBe(true));
  it("rejects a near-miss typo (bad checksum)", () =>
    expect(isCanonicalBurnAddress("UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ")).toBe(false));
  it("rejects a real wallet and the masterchain zero account", () => {
    expect(isCanonicalBurnAddress("EQAmjezmAjiXZ7XfoLGQbNIm4CIEcQwM9CNbpTZJgcN9LeVi")).toBe(false);
    expect(isCanonicalBurnAddress(`-1:${"0".repeat(64)}`)).toBe(false);
  });
  it("assert throws on anything else", () => {
    expect(assertBurnAddress()).toBe(TON_BURN_ADDRESS);
    expect(() => assertBurnAddress("EQAmjezmAjiXZ7XfoLGQbNIm4CIEcQwM9CNbpTZJgcN9LeVi")).toThrow("burn_address_invalid");
  });
});
