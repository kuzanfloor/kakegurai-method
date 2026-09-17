# Walk-forward on tokenised equities — the criterion, written FIRST

> Committed **2026-09-12 at 19:00:08 UTC** (`1b77216`), **before** the
> measurement ran; the result landed eleven minutes later, at **19:11:30 UTC**
> (`dd702ed`). That order is the only thing that makes the result a measurement
> rather than a confirmation: a criterion written after seeing the outcome is
> fitted to it and approves anything.
>
> ⚠️ Both commits are in the closed repository, so that pair of times is an
> assertion you cannot audit from here. What you can audit is below and in
> `walkforward.json`: the gates, the killers, and whether the verdict follows
> from the numbers.

## The question

On 3 September the direction produced **+0.329% per operation over 59
operations** on the long side, with a 95% interval excluding zero at every fixed
threshold tried. But it came from **2.28 hours of a single trading day**.

**The question that number cannot answer:** does a threshold chosen by looking at
the past still pay on a future it has not seen?

## The design

Expanding window, one step per trading day. For each day *d*:

1. choose the entry threshold using **only** days before *d*;
2. apply it to day *d* unchanged;
3. record what it made, out of sample.

No threshold is ever chosen on the day it is scored. Days before the first with
enough in-sample operations are skipped rather than scored on a guess.

## The four gates, and none of them moves

A result **HOLDS** only if all four pass. Written before the run:

| gate | value | why this and not another |
|---|---|---|
| out-of-sample operations | **≥ 30** | below this the bootstrap interval is wider than any effect worth acting on |
| lower bound of the 95% interval | **> 0** | an interval that crosses zero has not separated the effect from the noise |
| concentration of gross gain | **best day ≤ 50%** | one lucky session is not an edge |
| days to half the gain | **≥ 3** | and it needs **≥ 7 trading days** to be readable at all — below that the floor measures the number of days, not the concentration |

Bootstrap: 2000 resamples, fixed seed, so the interval is reproducible.

## What would make us abandon the direction

Stated before the run, because this is the half people leave out:

- a mean at or below zero out of sample;
- an interval whose lower bound sits below zero;
- more than half the gross gain coming from a single day;
- costs that make the measured mean unreachable at any size worth trading.

## What the result was

**Not yet proven** — `NOT YET PROVEN`, which is neither pass nor fail.

| arm | out-of-sample ops | mean | 95% interval | positive days |
|---|---|---|---|---|
| the 10 seed tickers | 50 | +0.5863% | [0.3489, 0.8784] | 4 of 4 |
| all 37 instruments | 266 | +0.7394% | [0.5985, 0.8355] | 4 of 4 |

Three of four gates pass. The fourth — concentration — **cannot be read** with
only 4 out-of-sample days, because at uniform contribution the days-to-half is
`ceil(N/2)`, so below 7 days the floor of 3 is measuring *N* and not
concentration. Three more trading days are needed.

⚠️ Reporting this as a pass would have been the easy mistake: everything that
*could* be checked did pass. A gate that cannot be evaluated has not been
satisfied, and saying so costs three days.

## The correction, and why it was allowed

After the run, one of the five scored days turned out to be a public holiday: the
US market was shut, the sampler wrote 345 readings per instrument against a
reference frozen at Friday's close, and the code believed it had watched a full
session.

Dropping that day moved the result from +0.6916% to +0.7394% and moved the
verdict **further away** — from two more trading days to three.

A correction made after seeing the result is normally forbidden here. This one was
allowed under a rule stated in advance: **a correction is admissible only if it
does not change the decision.** It did not — the verdict was `NOT YET PROVEN` before
and after — and it made our own wait longer rather than shorter. A correction that
improves your number *and* shortens your wait is the one you must not be allowed
to make.

The fix is not a calendar of holidays. A calendar is maintained by hand and would
still miss a stalled feed, a rate limit, a half-day close. The thing to measure is
the thing itself: **is the reference moving?** On a real session it takes about
250 distinct values in a day. On that day it took one. A frozen reference is not
*no deviation* — it is *no answer*, and those are different sentences.

## Resolved — 2026-09-16

The fourth gate became readable at the seventh out-of-sample day, and with all
four readable the verdict is **HOLDS**: positive on every out-of-sample day, on a
book of days the threshold selection had never seen.

🔴 **It authorises nothing, and that was written above before the run.** Passing
makes the direction a *candidate*. The criterion asks for the measurement to be
repeated after **five more trading days** from that date before promotion is even
discussed, so the agent stays on paper and `0` of `8` strategies are switched on.

The day count and the trade count keep growing, so they are not quoted here —
read them from the endpoint below, and check the verdict follows from them.

## Reproduce it

```bash
curl -s https://kakegurai.xyz/api/walkforward.json \
  | jq '.data.arms[] | {name, outOfSampleDays, trades, meanPct, ic95, verdict, why}'
```

The `why` field carries the gate that is holding, in the agent's own words.
