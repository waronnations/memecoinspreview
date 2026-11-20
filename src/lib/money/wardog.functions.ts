// $WARDOG holder tier + burn totals. Both are public: the tier comes from an on-chain balance
// anyone can read, and burn totals are aggregates. Rate-limited because they are open to guests.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertRateLimit } from "@/lib/rate-limit.server";

const addr = z.string().trim().min(40).max(70).regex(/^[A-Za-z0-9_\-:]+$/);

export const getWardogTierFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ owner: addr }).parse(d))
  .handler(async ({ data }) => {
    assertRateLimit("wardog:tier:all", 600, 60_000);
    assertRateLimit(`wardog:tier:${data.owner}`, 20, 60_000);
    const { getWardogBalance } = await import("./wardog-holdings.server");
    const balance = await getWardogBalance(data.owner);
    return { balance, checkedAt: Date.now() };
  });

export const getWardogBurnTotalsFn = createServerFn({ method: "GET" }).handler(async () => {
  assertRateLimit("wardog:burns:all", 300, 60_000);
  try {
    const { hasDatabase, ensureSchema } = await import("@/lib/db.server");
    if (!hasDatabase()) return { available: false as const, burned: 0, toVault: 0, events: 0 };
    await ensureSchema();
    const { wardogBurnTotals } = await import("./wardog-spend.server");
    return { available: true as const, ...(await wardogBurnTotals()) };
  } catch {
    return { available: false as const, burned: 0, toVault: 0, events: 0 };
  }
});
