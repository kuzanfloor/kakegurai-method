# Size proportional to liquidity — the criterion, written FIRST

> Committed **2026-09-12 at 22:28:37 UTC** (`bd4ab63`), **before** the
> measurement ran; the result landed at **22:39:49 UTC** (`1829b9f`). Third
> pre-registered criterion of that day, after [`walk-forward.md`](walk-forward.md)
> (not yet proven) and [`capacity.md`](capacity.md) (holds, capacity small).
>
> ⚠️ Both commits are in the closed repository, so the order is an assertion you
> cannot audit from here.

## The question, and why it is not the previous one

The measured capacity was a **fixed** size across all thirty-seven instruments.
But the pools are not alike: the deepest in the book has millions of dollars of
liquidity and the shallowest has tens of thousands — a ratio of roughly **178×**.

A fixed size is therefore wrong twice at once: on the deep pool it is absurdly
small and leaves margin on the table, on the shallow one it is enormous and eats
the edge. **The aggregate figure is not the capacity of the strategy: it is the
average of two errors.**

> **The new question: if the size were a FRACTION of the pool instead of a fixed
> amount, how much capital could be moved in a day?**

## The property that makes the question clean

With size `S = k · L`, constant-product impact becomes

```
impact per side = 2S/L = 2k      →  independent of L
total cost      = 0.10% + 400·k  →  the SAME on every instrument
```

Cost stops depending on the instrument. So this is not a hunt for "which
combination passes": **one** variable changes, and the ladder of `k` is a ladder
of uniform costs. It is a different question, not a second attempt at the same
one.

## The design

Identical to the walk-forward and to the capacity measurement — **same days,
same thresholds, same horizon, same expanding window**. Only the cost
calculation changes. The ladder of `k` is in basis points of the pool.

**And the number that actually matters is not the mean percentage:** it is the
**capital deployed per day**, the sum of `k · Lᵢ` over a day's operations. A
percentage on a tiny size does not pay the bills.

## The criterion, falsifiable

| verdict | when |
|---|---|
| **REJECTED** | the 95% interval touches zero **already at the lowest `k`**, the cheapest rung of the ladder. If it does not pay there, proportional sizing solves nothing and the fixed size stands |
| **NOT YET PROVEN** | fewer than **30 out-of-sample operations** (inherited) |
| **HOLDS** | the interval excludes zero at least at the lowest `k`, and the **largest `k` that holds** is reported together with the capital per day at that `k` |

**The result is only useful if it beats the fixed size.** The comparison is
declared in advance: capital per day at the best `k` goes next to the day's
turnover under fixed sizing. If it does not beat it clearly, proportional sizing
is a complication with no gain, and that must be written.

## ⚠️ Three reservations, declared before and not after

1. **This is the third look at the same out-of-sample days.** Trying several
   sizing schemes on one sample **spends statistical power**: with enough
   schemes, something passes. The ladder is short and the design is one, but the
   reservation stands and no confidence interval cancels it.
2. **The model's direction of error does not change.** Constant-product
   overstates cost inside a v3 tick range and understates it outside. Every
   number is a **ceiling**.
3. **A fraction of a pool is not executable merely because it is small.** On the
   shallowest instrument the lowest rung is a few dollars of token, and a few
   dollars is not a trade: it is two transactions that cost more than they move.
   Capital per day has to be read together with the **median trade size**, and
   operations below a floor of sense have to be counted separately.

## What this switches on

Nothing, in any case, exactly as in the other two.

---

# RUN — 2026-09-12, late night

## Pre-registered verdict: **HOLDS**

The interval did not touch zero at the lowest rung, so the gate that would have
closed the question did not fire. It excluded zero up to a middle rung of the
ladder and turned negative above it, which is where the answer stops.

The declared comparison against fixed sizing was met clearly, so proportional
sizing is **not** a complication without gain.

## 🔴 But "capital per day" is TURNOVER, not the capital you need

The criterion asked for capital deployed per day, and that number is correct —
but it answers a question that is not *"how much money do I need"*. Positions
last **13 minutes at the median** (mean 53.5), so the same capital is reused
several times in the same day.

Measured properly, by summing the positions open **at the same instant**:

| | |
|---|---|
| operations | 324 over 7 trading days |
| median duration | **13.0 minutes** (mean 53.5) |
| turnover | about 4× the capital actually required |
| **peak capital committed** | **$14,052**, with **11 positions open at once** |

⭐ **It is several times better than fixed sizing, and the reason is not a better
strategy:** it is having stopped using the same size against a pool of $48,000
and a pool of $8.7 million.

**The gross return figures from this run are deliberately not reproduced here.**
They are a backtest at a modelled cost, and printing a dollars-per-day next to a
paper agent that has realised almost nothing invites exactly the reading the
number cannot support. The size and the capital are the measurement; the daily
gross is not.

## ⚠️ Five reservations, and the first is the one that counts

1. **Gross of gas.** 324 operations over 7 days is about 46 a day, so about 92
   transactions. On this L2 that is a few dollars a day — it does not change the
   order of magnitude, but it is not zero.
2. **The peak of 11 positions belongs to THIS sample.** A busier day wants more,
   and capital is sized on the peak, not the mean.
3. **Every number stays a CEILING.** Constant-product understates impact outside
   a tick range. At these fractions the trade is probably inside the range, so
   probably conservative — but "probably" is not a measurement.
4. **Third look at the same out-of-sample days.** It spends statistical power,
   and it was declared before looking.
5. **The capital figure holds the threshold fixed** across all seven days, while
   the walk-forward reselects it each day on the past. So the capital is a
   **description**, not the out-of-sample result — which remains the walk-forward
   mean.

## What changes, and what does not

It changes the order of magnitude of what this direction is worth, and it makes
one thing clear: the capital required is **tens of thousands of dollars, not
hundreds**.

It changes nothing about decisions. The walk-forward is still **NOT YET PROVEN**,
live mode is still off, and there is still no source of real realised profit.
None of the three criteria of that day switches anything on, and all three said
so before they were run.

## Check it

The measurement behind this one is not published as its own endpoint. What is
published, and what this criterion inherits, is the walk-forward and the capacity
ladder:

```bash
curl -s https://kakegurai.xyz/api/capacita.json   | jq '.data.bracci[] | {nome, capacitaUsd, esito}'
curl -s https://kakegurai.xyz/api/walkforward.json | jq '.data.bracci[] | {nome, operazioni, mediaPct, ic95, esito}'
```
