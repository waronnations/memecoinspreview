# Phase 1.5 + Phase 2: Citadel UI, money rails, Armory and Telegram Stars

Work lands in the order below. Each step must finish green (tests pass, clean build) before the next starts. Every money path stays fail-closed behind the existing `MONEY_PATHS_ENABLED` switch.

## Phase 1.5 — Citadel UI and on-chain money rails

**1. Citadel Fortification card (Syndicates tab)**
- New card on the Syndicates view. It shows the level (L0–L5), the current season-point boost, the next upgrade cost in WARDOG with the 20% discount tag, and a progress bar for the syndicate vault balance against that cost.
- The "Fortify Citadel" button is active only for Leaders and Officers, and only when the syndicate vault holds enough WARDOG. When it is short, the card says "Insufficient Vault $WARDOG" and opens the existing donate/top-up flow.
- The server re-checks role, balance and max level, deducts from the vault atomically, raises `citadel_level`, and logs the WARDOG burn/vault split.

**2. On-chain WARDOG burn execution**
- A protected server route processes pending `wardog_burns` rows in batches. It sends the WARDOG jetton transfer from the Claim Treasury to the canonical burn address, then marks each row settled with the TON transaction hash.
- It refuses to run and leaves rows pending when the signer key, the treasury address or enough treasury WARDOG is missing. It also never runs the same row twice: each row is claimed before sending, and a stuck claim is checked on-chain before any retry.
- It runs on a schedule (proposed: hourly) and can also be triggered by an admin.

**3. War Vault WARDOG claim vouchers**
- Add WARDOG as a third vault asset next to GRAM and USD₮, with its own precision and minimum claim.
- Reuse the existing signed-voucher flow and the "one open voucher per player per asset" rule unchanged.

**4. Holder tier perks**
- When Recon Drones ship (step 2 of Phase 2), apply +10% Recon speed for the 1k+ tier.
- When EMP Jammer sector defense ships, apply +5% War Map defense for the 10k+ tier.
- Switch each perk to "honored" only when the server actually applies it, so the UI never promises a bonus that doesn't exist.

## Phase 2 — Syndicate Armory and Telegram Stars

**1. Retire the merge-era shop**
- Remove Energy Pack, Merge Glory and the nation-listing marketplace from the shop and its server actions.
- Remove every dead reference to them. Fields in old saves stay so they still load.

**2. Four tactical utilities (new Armory)**
- **Recon Drone**: reveals hidden radar signals and opponent defense multipliers for 60 minutes.
- **Citadel EMP Jammer**: shields one sector the player owns from conquest for 2 hours, enforced server-side at conquest time.
- **Bunker Overdrive**: +25% USD₮ staking points while a radiation surge is active.
- **War Supply Crates (Recon / Tactical / Cabal Apex)**: tiered loot of Glory bundles, WARDOG reserves and rare boosters. The server rolls the loot from fixed odds tables. The crate opens in an animated TacticalModal with sound.
- Each effect is stored with an expiry and checked by the server. The client never decides an effect.

**3. Dual payment rail (WARDOG or Telegram Stars)**
- Every utility has a WARDOG price with the 20% discount and a Stars price.
- Inside Telegram: the server creates the invoice and the app opens it with `openInvoice`.
- Outside Telegram: pay with the connected wallet or in-game balance through the existing WARDOG spend path.
- Items are granted only when the Telegram bot webhook receives `successful_payment` for that exact invoice. The webhook is verified with a secret token, and each payment can be credited only once. The in-app "paid" callback only refreshes the screen.

## Technical details
- Citadel: a new `fortifyCitadelFn` uses the role check in `nations/vault.server.ts` and the pure rules in `lib/citadel/fortify.ts`. The card lives in the Syndicates detail view (`components/nations/detail`).
- Burns: today `wardog_burns.status` allows only `pending | sent | void`. Add `settled` plus `claimed_at`, `tx_hash` and `error` columns in the additive bootstrap. The route goes under `/api/public/jobs/wardog-burns`, authorized with `authenticateCronRequest` and a managed HTTP schedule.
- Vault: a new `WARDOG_ASSET` in `lib/vault/vault.ts`. The voucher path in `vault.server.ts` is keyed by the asset.
- Perks: flip `HONORED_PERKS.recon` and `HONORED_PERKS.mapDefense` in `money/wardog-pricing.ts` in the same change that applies them.
- Armory: new `armory_effects` and `stars_invoices` tables in the game bootstrap. `/api/public/telegram/webhook` checks `X-Telegram-Bot-Api-Secret-Token`, answers `pre_checkout_query`, and settles on `successful_payment` with a unique `telegram_payment_charge_id`.
- Tests: Citadel gating and cost, the burn fail-closed and no-double-send rules, WARDOG voucher limits, crate odds, effect expiry, and idempotent Stars settlement.

## What I'll need from you (secure form, when each step is reached)
- `TONAPI_KEY`, `CLAIM_TREASURY_ADDRESS`, the treasury signer key, and `MONEY_PATHS_ENABLED` for burns and WARDOG claims.
- A webhook secret for Telegram Stars payments. I'll register the webhook with your bot.
