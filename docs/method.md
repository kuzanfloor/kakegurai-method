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
afterwards. You can check the order in the git history of the private repo, and
the criteria themselves are reproduced in [`criteria/`](criteria/).

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

## 3. The verifier reads the rendered page, not the source

Published figures sit in anchors:

```html
<span data-numero="walkforward-mean">+0.7394%</span>
```

A tool fetches the page **as served** and compares each anchor to the API. This
catches the failure that source review cannot: a number that was correct when it
was written and has since gone stale, or a page that built successfully while
silently dropping the block it was supposed to contain.

Both have happened here. Both were caught this way and not by reading the code.

## What this does not give you

It does not make the agent right. Every rule above is about whether a published
number means what it says — not about whether the strategy behind it makes money.
At the time of writing no strategy has proven an edge, and the site says so in
the same typeface as everything else.
