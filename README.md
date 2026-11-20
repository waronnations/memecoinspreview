# WAR ON NATIONS

**A crypto-native memecoin war machine on TON.** Every TON memecoin is an army. Players
connect their wallet, drop real coins onto the Coin Board and send them into battle —
absorbing weaker coins into stronger ones through live DEX routes, paying War Tax, and
earning season points for their faction. Syndicates claim sectors of the War Map, hold
Citadels for bonus Glory, and race the Doomsday clock to survive the weekly Apocalypse.
$WARDOG is the money rail: pay with it for 20% off, and half of every in-game WARDOG spend
is burned while the other half refills the War Vault prize pool.

**Play now:** [t.me/waronmemecoinspreviewbot](https://t.me/waronmemecoinspreviewbot) (Telegram Mini App)

## Features

- **Coin Board & Top 100** — live TON memecoin board ranked by 24h volume (Apex / Frontline / Death Row tiers).
- **Battles** — absorb, total war, alliance and retreat moves, quoted live across DeDust and STON.fi and signed in-game with TonConnect. Points are only awarded after the transaction is confirmed on-chain.
- **Whale Radar** — live large trades from GeckoTerminal, no wallet addresses exposed.
- **War Map & Citadels** — 100×100 sector map; holding Citadel Dominance boosts a faction's season points.
- **Quick Swap** — whitelisted-only swaps routed through swap.coffee, re-quoted on the server and capped before you sign.
- **$WARDOG economy** — 20% discount when paying with WARDOG, 50% burn / 50% War Vault split on every spend (with an audit log), and holder tiers (1k / 10k / 50k WARDOG) that boost Battle Glory and Citadel Dominance.
- **Syndicates (Nations)** — join a cabal, donate to its vault, activate buffs and shields.
- **War Vault** — weekly prize pools paid out with signed claim vouchers.
- **Armory & Ops** — buy weapons, strike rival commanders, climb the kill feed.
- **Apocalypse & Bunker** — radiation, apex standings and the seven-day Doomsday lifecycle.
- **War Room & public API** — aggregated, non-personal battlefield intel at `/war-room`, `/api/public/agents` and an MCP endpoint.

Guests can browse the Coin Board, Top 100, Whale Radar and War Map without signing in. A TonConnect
wallet is only needed for actions that move balances.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions) on Vite, deployed to edge workers
- Tailwind CSS v4 with a shared HUD design system (`src/styles.css`)
- Lovable Cloud (PostgreSQL) for game state, via a service-role-only SQL bridge
- TON: `@ton/core`, TonConnect UI, ton_proof wallet verification, TonAPI, STON.fi, DeDust, swap.coffee, GeckoTerminal
- Telegram Mini App auth (signed `initData`)
- Vitest for unit tests

## Local development

Requires [Bun](https://bun.sh) (or Node.js 20+ with npm).

```sh
git clone <this-repository-url>
cd war-on-nations
bun install
# server secrets are listed in .env.example (set them as project secrets)
bun run dev            # http://localhost:8080
bun run test           # unit tests
```

Money paths (vault claims, top-ups, paid map sectors, promotions) stay off until
`MONEY_PATHS_ENABLED` and every required wallet/key is configured — the server refuses
rather than guessing. See `.env.example` and `AGENTS.md` for the full list and the
project's architecture rules.

## License

See [LICENSE](./LICENSE).
