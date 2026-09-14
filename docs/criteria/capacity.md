# Capacity — the size at which the edge dies. The criterion, written FIRST

> Committed **2026-09-12 at 19:32:54 UTC** (`dfb6880`), **before** the
> measurement ran; the result landed at **21:15:06 UTC** (`ef1a634`). Second
> pre-registered criterion of that day. It exists because of reservation n° 1 in
> [`walk-forward.md`](walk-forward.md).
>
> ⚠️ Both commits are in the closed repository, so the order is an assertion you
> cannot audit from here. What you can audit: the gates below, and the payload
> at `https://kakegurai.xyz/api/capacita.json`, which carries every point of the
> ladder with its interval.

## The question

The walk-forward measured its return with a **flat 0.1% cost that does not
depend on size**. The least liquid instrument in the book had about **$48,000**
of liquidity at the time.

> **A return measured at a flat cost is not an executable return.** The question
> is not "does it hold?" but **"at what size does it stop holding?"**

The answer is a number — the **capacity** — and it is measured, not estimated.

## The cost model, stated in full

```
cost(size, liquidity) = fee + impact_out + impact_back
```

- **fee = 0.10%** — the same one the walk-forward used: a 0.05% pool, taken
  twice.
- **impact** = constant-product approximation. A trade of notional `S` against a
  reserve `R` moves the price by about `S/R`. With `liquidity` = total TVL, the
  reserve per side is `liquidity/2`, so `impact ≈ 2S/liquidity`, counted
  **twice** because the round trip goes out and comes back.

⚠️ **Which way it is wrong, and you need this before you read the result.**
Concentrated liquidity means that **inside** the active range the true impact is
*smaller* than constant-product on the same TVL, and **outside** it is much
worse. The tick distribution is not known here, so:

- for sizes small relative to the pool the model **overstates** cost, which makes
  the measurement **conservative** — an edge that survives here survives a
  fortiori;
- for large sizes it **understates**, because it never sees the range being left.

That asymmetry is why the number reads as *"no more than"* and never as *"up
to"*. **The capacity that comes out is a ceiling, not a guarantee.**

⚠️ Liquidity is the instrument's liquidity **at the moment of entry**, taken from
the sample, not a book average. Two instruments with the same dislocation and
different depth do not cost the same, and that is the whole point.

## Two modelling choices that make it conservative

1. **The set of operations does not change with size.** Cost is subtracted from
   the return; it does not enter the decision. A real strategy would skip trades
   whose expected margin does not cover the cost, so not modelling that means
   **keeping trades that would have been skipped** — an understatement of the
   best achievable.
2. **No order splitting.** A real order is broken up, and breaking it up reduces
   impact. Also conservative.

## The design

Identical to the walk-forward — **same days, same thresholds, same horizon, same
expanding window** — with exactly one difference: the cost. Changing anything
else would make the two results incomparable.

The size ladder, in dollars of notional per operation, is published point by
point in `capacita.json` and runs from $100 to $50,000.

## The criterion, falsifiable

| verdict | when |
|---|---|
| **REJECTED** | the 95% interval **touches zero already at the smallest size**. If it does not pay at a hundred dollars there is nothing to size, and the direction closes |
| **NOT YET PROVEN** | fewer than **30 out-of-sample operations** — inherited from the walk-forward, and invariant to size |
| **HOLDS** | the interval excludes zero at least at the smallest size, and the **capacity** is reported |

**Capacity** = the **largest** size on the ladder at which the 95% interval stays
entirely above zero. If even the largest passes, the capacity is
**"≥ the top of the ladder, not measured beyond"** — never "unlimited".

⚠️ **And a clause with the same standing as the one in the other criterion:** if
the capacity comes out smaller than the smallest useful size, **the cost model is
not re-parameterised to see whether another version makes it grow.** The model is
the one above, with its declared direction of error. It may be *replaced* by one
measured on real ticks — but that is new work, with a new criterion, written
first.

## What this switches on

Nothing, in any case. Capacity is information for a decision; the decision is not
the measurement's to take. Live mode stays off, and stays off even if the
capacity were excellent, because the missing condition is a different one.

---

# RUN — 2026-09-12, night

## The pre-registered verdict: **HOLDS**, and the capacity is small

The interval did not touch zero at the smallest size on either arm, so the gate
that would have closed the direction did not fire. Reading the ladder in
`capacita.json`:

> **Capacity: no more than $500 on arm A (the 10 seed tickers), no more than
> $250 on arm B (all 37).**

**The edge exists and is executable — at a small size.** Above that the same
measurement turns negative, and by the top of the ladder it is deeply so.

## ⚠️ Where the model stops being a measurement

At the top two rungs the numbers are not measurements: they are the model pushed
past its domain. The least liquid instrument in the book has tens of thousands of
dollars of liquidity, and an order of $50,000 against that pool is not a trade —
it is the end of the pool. Those rows say only "far below zero", and their
decimal places are fake precision.

## 🔴 One line of this criterion was false, and the numbers said so

The criterion claimed, among the conservative choices, that *"the set of
operations does not change with size … only the return changes, not the sample."*

**It is false.** The operation count moves by more than a factor of four across
the ladder. The reason: entry does not look at cost — that part was true — but
the **choice of threshold** does, because the walk-forward picks each day the
threshold with the best mean on the past, and the best one changes when the cost
changes.

⭐ **And the defect strengthens the conclusion rather than weakening it.** At
large sizes the walk-forward *searches* for a threshold that survives — it tries
lower ones, with four times as many operations — and finds them all deeply
negative. Even choosing the best available for that cost regime, it loses.

It is recorded anyway, because **a criterion written first is not a criterion
that is right**: its authority comes from having been written first, not from
being infallible.

## What it means, unsweetened

The edge is **real, out of sample, and small**. It is a thin margin on a thin
book, and liquidity is the binding constraint — not the cleverness of the
strategy.

**What would make it grow is not a better strategy: it is more liquidity.**
Capacity scales with pool depth, linearly. If the tokenised-equity book on this
chain gets ten times deeper, the capacity does too. If it stays as it is, so does
the capacity.

## Check it

```bash
curl -s https://kakegurai.xyz/api/capacita.json \
  | jq '.data | {commissionePct, modello, bracci: [.bracci[] | {nome, capacitaUsd, esito, perche}]}'
```
