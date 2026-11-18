# Token Radar, model radar-2

This note is the model's own record: what it computes, where every number
comes from, and what it deliberately does not do. The code in `lib/model.ts`
is the authority; this note explains it in words so a reader can check it.

## The question

A protocol's launch is the token it may issue one day. This radar asks
what that token would be worth if the protocol's record stayed as it is.
It does not predict whether or when a token is issued, and the implied
value is the entry's own claim, never one make.fun makes.

## The input

One frozen snapshot, fetched once from DefiLlama's public API on
14 November 2026: 758 protocols at or above $5,000,000 of TVL, each with
exactly ten fields (`slug`, `name`, `category`, `chains`, `tvl_usd`,
`change_7d`, `mcap_usd`, `listed_at`, `gecko_id`, `symbol`). The
snapshot carries no ranking, no implied value, no farm plan and no
airdrop flag. Deriving them is the entry's work.

The watchlist is the snapshot's own list of 40 protocols: TVL at or above
$50,000,000, no token on record, and not a wrapped, staked or bridged
product of a token that already trades. The board covers every one of
them, then adds 138 early pre-token protocols below the floor, for 178
rows in all.

## The model

```
categoryMultiple = clamp(0.5 * globalMedian + 0.5 * categoryMedian, 0.08, 0.55)
implied = round(tvl_usd × categoryMultiple
  × (1 + clamp(change_7d, -50, 150) / 100 × 0.6)
  × (0.65 + min(age_days, 1460) / 1460 × 0.35)
  × (1 + min(chains - 1, 5) × 0.015))
```

Each factor, in order:

- **Category multiple, measured, not fixed.** For each category, the
  median market-cap / TVL of the live-token protocols in that category,
  blended half-and-half with the global median. On this snapshot the
  global median is 0.205. A lending protocol is priced like lending
  protocols actually trade; a DEX like DEXes trade. A category with
  fewer than three live names falls back to the global median, so a thin
  category cannot set its own price. The multiple is clamped to
  0.08–0.55, and rounded to four decimals before it is used, so the
  dashboard's recomputation of a row gives the same number `board.json`
  carries.
- **Growth.** Seven-day TVL change, clamped to -50%…+150%, weighted
  0.6. A protocol growing fast is worth more than the same TVL standing
  still; a protocol shrinking is marked down, not ignored.
- **Maturity.** Age is the time since DefiLlama first listed the
  protocol: the best record of how long it has run with no token.
  Maturity runs 0.65 at listing to 1.00 after four years. An unreported
  listing date uses 365 days rather than a guess.
- **Chain breadth.** A small bonus only: 1.5% per extra chain, up to
  five, for a maximum of 1.075. Breadth reaches more farmers, but it
  never outruns TVL.

No protocol name is special-cased. The same function scores every row,
and the board is sorted by the implied value it produces.

## What is left out, on purpose

- **Wrapped, staked and bridged products** are not ranked as early
  rows: WBTC is Bitcoin on Ethereum, not a protocol waiting on a launch
  of its own. Neither are exchanges, versioned pools (`… V2`) or
  protocols whose token already trades. The watchlist itself is still
  covered in full, whatever its members are.
- **Market caps of live protocols** are never used as implied values.
  Live-token protocols are shown in their own view at the market's own
  value, set aside from the ranking.
- **No outside data.** The program runs with no network. Every number
  in the board follows from the snapshot's ten fields.

## The farm plan

Each row carries seven steps, derived from the protocol's own record:

- capital from its TVL ($50 at the small end, $250 for the largest);
- gas priced by its first chain (about $0.02 on Solana, $0.30 on the
  low-fee L2s, $6–$12 on Ethereum);
- the hold from its age (60 days under six months, 45 under a year,
  30 after that);
- the weekly action from its category (a borrow-and-repay for lending,
  a swap for a DEX, a restake for staking, and so on);
- a monthly points check, a claim-safety step that says never to pay
  to claim, and a farm log.

A step is an action with a cost and a time, never a slogan.

## The dashboard

`dashboard/` is a static page with no network: a sortable, filterable
board, a top-three spotlight, a detail view for every protocol with its
model breakdown and farm plan, and the live-token view. It recomputes
each row from the snapshot figures and checks the number `board.json`
carries, so the screenshots and the code agree.
