# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/nafiznerob/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/nafiznerob/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks pre-token protocols by implied value, so a reader can see which protocol's token would be worth the most if it launched, and how to farm it before it does. It reads a frozen DefiLlama snapshot (758 protocols, 14 November 2026), covers all 40 protocols on the watchlist, adds 138 early pre-token protocols below the $50M floor, and scores 178 rows in all. Live-token protocols are set aside at their market caps, never mixed into the ranking.

## How implied value is computed (radar-2)

The category multiple is measured from the snapshot itself, not fixed: for each category, the median market-cap / TVL of its live-token protocols, blended half-and-half with the global median and clamped to 0.08–0.55. Then:

```
implied = round(tvl_usd × category_multiple
  × (1 + clamp(change_7d, -50, 150) / 100 × 0.6)
  × (0.65 + min(age_days, 1460) / 1460 × 0.35)
  × (1 + min(chains - 1, 5) × 0.015))
```

Age is the time since DefiLlama first listed the protocol — how long it has run with no token. No protocol name is special-cased; the same function scores every row. The dashboard recomputes each row from the same figures and checks the number `board.json` carries.

Top of the board: Steakhouse Financial ($385.0M implied), Gauntlet ($231.1M), USDD ($143.7M).

## The dashboard

A static page with no network: a sortable, filterable board (search, category, chain, watchlist-only), a top-three spotlight, a detail view for every protocol with its model breakdown and a seven-step farm plan, and a live-token view set aside at market value. Each farm plan is derived from the protocol's own category, chains, TVL and age — gas priced by chain, capital by TVL, the hold by age, the weekly action by category — with a cost and a time on every step.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the snapshot, writes the ranked board to `board.json`, the dashboard data to `data.js`, copies `dashboard/` and `screenshots/` to the output, and writes `dossier.json` with `buildDossier` from `vendor/makefun-board.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vcc24fc8&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
