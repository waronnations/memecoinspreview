// Canonical TON burn ("blackhole") address: workchain 0, all-zero account hash.
// Nobody holds a key for it, so jettons sent here are gone for good. Verified by
// parsing (checksum + zero hash) so a typo can never redirect burns to a real wallet.
import { Address } from "@ton/core";

export const TON_BURN_ADDRESS_RAW = `0:${"0".repeat(64)}`;
/** Non-bounceable mainnet form; parses back to TON_BURN_ADDRESS_RAW. */
export const TON_BURN_ADDRESS = "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ";

/** True only for the workchain-0, all-zero-hash account in any valid encoding. */
export function isCanonicalBurnAddress(addr: string): boolean {
  try {
    const a = Address.parse(addr.trim());
    return a.workChain === 0 && a.hash.length === 32 && a.hash.every((b) => b === 0);
  } catch {
    return false;
  }
}

/** Throws unless `addr` is the canonical burn address; call before any burn transfer. */
export function assertBurnAddress(addr: string = TON_BURN_ADDRESS): string {
  if (!isCanonicalBurnAddress(addr)) throw new Error("burn_address_invalid");
  return addr;
}
