# How a claim becomes a number here

Three rules. They are cheap, and they are the difference between a dashboard and
a claim.

## 1. The criterion is committed before the measurement runs

A threshold chosen after seeing the outcome is not a threshold. It is a
description of the outcome wearing a threshold's clothes, and it will approve
whatever it was fitted to.

So every measurement in this project starts with a file: the question, the
decision rule, the sample floor, and — most importantly — **what result would
make us abandon the direction**. That file is committed. The measurement runs
afterwards. The criteria are reproduced in [`criteria/`](criteria/), each with
the hash and the UTC minute of the commit that introduced it, and of the commit
that later carried the result.

⚠️ **Be clear about what you can check here and what you cannot.** Those commits
live in the closed repository, so the pair of timestamps is an *assertion* until
someone with access reads them — it is not proof, and calling it proof would be
the same move this document was written against. What a reader outside can check
without trusting anyone: that the criterion published here names its gates and
its killers *before* quoting any result, that the numbers it quotes match the
live API today, and that the verdict the API reports is the verdict the criterion
demands given those numbers. That is a narrower claim than "the order is proven",
and it is the true one.

It has cost us the answer more than once, which is the only evidence that it is
real: a test written on 5 September closed a whole direction on 12 September,
against the expectation of the person who wrote it.

### The exception that proves it

A criterion can be corrected after the fact **only if the correction does not
change the decision**. When a contaminated day was found in the walk-forward
sample, dropping it moved the result from +0.6916% to +0.7394% and moved the
verdict *further away* — from two more trading days needed to three. Both
directions were reported. A correction that improves your own number and shortens
your own wait is the one you should not be allowed to make.

## 2. `null` is never published as `0`

Every figure travels in an envelope:

```json
{ "generated": "...", "source": "...", "confidence": "high",
  "dataAgeSec": 37, "data": { ... }, "note": "..." }
```

- `data: null` means **we could not measure**. It is a different claim from a
  measurement of zero, and the two are never merged.
- `confidence` is **derived from age**, never declared. A figure nobody can date
  reports `unknown`, and an undatable figure cannot earn confidence.
- A cost that could not be measured is treated as **infinite**, not as free. This
  matters: the cheap mistake and the expensive one are not symmetric.

## 3. The verifier reads the rendered page, and compares what it can

Published figures sit in anchors:

```html
<span data-numero="diploma-1-lancio">1.87</span>
```

`verify/check.mjs` fetches the page **as served**, never the source. That catches
the failure source review cannot: a number that was correct when it was written
and has since gone stale, or a page that built successfully while silently
dropping the block it was supposed to contain. Both have happened here.

**What it compares, and against what.** Being exact about this is the point:
a tool that claims more than it does is the defect it exists to find.

| on the page | against | today |
|---|---|---|
| the eight anchored figures | `/api/numeri.json`, figure by figure, inside each one's declared tolerance | **could not look** — that endpoint is not served yet, so the tool exits 2 and does *not* pass. Contract in [`api.md`](api.md) |
| the out-of-sample verdict word | `walkforward.json .data.bracci[].esito` | compared |
| the mode label | `status.json .data.modo` | compared |
| the declared buyback share | `flywheel.json .data.politica.riacquistoBps` | compared |
| the age of every envelope | the clock on your machine | stale over 26 h, and that is a separate outcome from *disagrees* |

**What it does not compare.** Everything on the page that is prose, every figure
that is not anchored, and every claim about what the agent intends to do. The
tool checks that published numbers match their sources and are not old. It has
nothing to say about whether the page describes the system fairly.

🔴 **It used to claim more than that, and the claim was in bold.** Until
2026-09-14 the tool **counted** the anchors — "8 anchored figures found" — and
compared none of them, because no endpoint carried them. It passed 15 checks out
of 15 against a page that had been frozen on the domain for nineteen hours, since
it never compared `generated` with a clock. Both defects were in the verifier, on
the one promise a third party could check without trusting us, which is the one
that should have been kept first.

**So the rule this project now applies to its own tool:** a check that has never
rejected anything is not a check. Every comparison above lives in
`verify/checks.mjs` as a function of (envelopes, page, clock), and
`verify/checks.test.mjs` feeds each one a forged page and asserts that it fails.
Run it with `node --test verify/checks.test.mjs`.

## What this does not give you

It does not make the agent right. Every rule above is about whether a published
number means what it says — not about whether the strategy behind it makes money.
At the time of writing no strategy has proven an edge, and the site says so in
the same typeface as everything else.
