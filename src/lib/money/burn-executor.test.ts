import { describe, expect, it } from "vitest";
import { Address } from "@ton/core";
import { buildBurnTransferBody, JETTON_TRANSFER_OP, planBurnBatch, toJettonUnits } from "./burn-executor";
import { TON_BURN_ADDRESS_RAW } from "@/lib/onchain/burn-address";

describe("WARDOG burn executor rules", () => {
  it("never plans a batch larger than the treasury balance", () => {
    const p = planBurnBatch([{ id: 1, burnAmount: 40 }, { id: 2, burnAmount: 50 }, { id: 3, burnAmount: 5 }], 60);
    expect(p?.rows.map((r) => r.id)).toEqual([1]);
    expect(p?.total).toBe(40);
  });
  it("fails closed when nothing fits", () => {
    expect(planBurnBatch([{ id: 1, burnAmount: 10 }], 5)).toBeNull();
    expect(planBurnBatch([], 100)).toBeNull();
  });
  it("converts to 9-decimal units without rounding up", () => {
    expect(toJettonUnits(1.5)).toBe(1_500_000_000n);
    expect(toJettonUnits(0)).toBe(0n);
  });
  it("transfer body targets only the canonical burn address", () => {
    const resp = Address.parse(`0:${"1".repeat(64)}`).toString();
    const s = buildBurnTransferBody(100n, resp, "abc").beginParse();
    expect(s.loadUint(32)).toBe(JETTON_TRANSFER_OP);
    s.loadUint(64);
    expect(s.loadCoins()).toBe(100n);
    expect(s.loadAddress().toRawString()).toBe(TON_BURN_ADDRESS_RAW);
  });
});
