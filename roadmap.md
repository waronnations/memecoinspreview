# Roadmap — WAR ON NATIONS production build

Phases land in order; each must be green (all tests pass, clean build, no dead references) before the next.
Every feature: implemented, unit-tested, fails gracefully when chain/Telegram/APIs are down, styled only with
HUD classes + theme tokens, and adds no client-side secrets.

## Phase 0 — Foundation & going public
- [x] Rename package to `war-on-nations`; remove template leftovers (README, top bar title)
- [x] Real README (vision, features, stack, local setup)
- [x] README live link (Telegram bot)
- [x] Public by default: no beta/invite gates; guests browse Coin Board, Top 100, Whale Radar, War Map; wallet only for balance actions; server rate limits kept
- [x] Burn address verified against the canonical TON blackhole (`0:000…0`, `src/lib/onchain/burn-address.ts`, tested)

## Phase 1 — $WARDOG economic engine
- [x] Pure pricing module `src/lib/money/wardog-pricing.ts`: 20% off when paying with WARDOG
- [x] Armory charges the discounted WARDOG price (server-side) and shows it
- [ ] War Map sector claims payable in WARDOG — needs jetton-payment settlement (money paths are off)
- [ ] Citadel fortifications payable in WARDOG — the fortification mechanic doesn't exist yet
- [x] "Get $WARDOG (20% OFF)" shortcut opens Quick Swap with WARDOG pre-selected when a WARDOG purchase is short
- [x] 50% burn / 50% War Vault split on every in-game WARDOG spend (Armory, syndicate buffs/shields, AI art) with a `wardog_burns` audit row per spend
- [ ] Execute queued burns on-chain from the Claim Treasury to the burn address — needs treasury signing set up (money paths)
- [x] Holder tiers 1k / 10k / 50k (pure, tested at 999/1000, 9999/10000, 49999/50000); tier badge in HUD and battle preview with "checking…" state
- [x] Battle Glory (+10/20/30%) and Apex Citadel Dominance (+10%) applied at Coin Board battle settlement
- [ ] Recon speed (+10%) and War Map defense (+5%) perks — hidden until recon missions and map defense exist

## Phase 2+
- [ ] Later phases — to be added from the next part of the spec

---

## Earlier work (Meme Mayhem unified spec)
- [x] Collapsible command deck on home + Raid Squad share
- [x] 4-source coin logo lookup (TonAPI, STON.fi, DeDust, swap.coffee)
- [x] Top-100 / 50 USD₮ promo / 6h Death Clock rules (tested)
- [x] 60/25/15 vault split rules (tested)
- [x] Whale filter rules (tested)
- [x] Death Clock banner + promoted-slot payment screen
- [x] Live whale feed + vault split shown in HUD/Bunker
- [x] Syndicate rules: tiles, citadel, 60/40 fees, harvest, culling, survivor weight (tested)
- [x] Tactical War Map page (practice claims)
- [ ] Paid tile claims in GRAM via TonConnect — needs marketing wallet address
- [ ] TON/GRAM staking — needs a staking provider choice (Tonstakers/Hipo)
- [ ] AI harvest/culling execution — needs market price feed for RSI
- [x] War Map → Coin Board synergy: live Citadel Dominance boosts season points (tested)
- [x] Recon report on return, Rally-your-squad share, map tap/capture sounds
