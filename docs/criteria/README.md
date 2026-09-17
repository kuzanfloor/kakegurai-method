# The pre-registered criteria

One file per measurement. Each one names its question, its gates, and **what
result would make us abandon the direction** — and was committed before the
measurement it judges was run.

| criterion | question | verdict | published here |
|---|---|---|---|
| [`walk-forward.md`](walk-forward.md) | does a threshold chosen on the past still pay on a day it has not seen? | **HOLDS** since 2026-09-16, when the fourth gate became readable — and it authorises nothing | in full |
| [`capacity.md`](capacity.md) | at what trade size does the measured edge die? | **HOLDS**, and the capacity is small | in full |
| [`proportional-size.md`](proportional-size.md) | does sizing by a fraction of each pool beat one fixed size? | **HOLDS** | in full, minus the daily gross figures |
| the deployer-profit filter | does avoiding one class of launcher change the RETURN, or only a statistic? | run not finished | **withheld — see below** |

## What is withheld, and why

**The deployer-profit criterion is not published**, and this is the honest place
to say so rather than publishing half of it and letting the gap look like an
omission.

Its gates are harmless — five ways to kill it, all of them statistical. The part
that cannot be published is its **definition of a launch's return**: the offset
after which an entry counts, the horizon over which the exit is taken, the round
trip subtracted. On this chain those are not only a measurement convention. They
are the shape of an entry rule on the launchpad, and MEV bots buy within one
second of a launch. Publishing them hands over the one advantage the agent has,
and that is not a decision you can take back.

⚠️ **So it is weaker evidence than the other three, and you should treat it that
way.** A criterion you cannot read is a criterion you cannot check. Any result
that comes out of it will be reported with this same caveat attached, and it is
not counted as a claim this repository can back.

The same rule applies to anything else added here: **a criterion is published
whole or not at all.** Publishing everything except the part that would let a
reader disagree is worse than silence, because it looks like disclosure.

## What "written first" gets you, and what it does not

Each file carries the hash and UTC minute of the commit that introduced it and
of the commit that carried the result. **Those commits are in the closed
repository**, so from outside that pairing is an assertion, not a proof.

What you can check without trusting anyone:

- the criterion states its gates and its killers before it quotes any number;
- the numbers it quotes match the live API today — run `node verify/check.mjs`;
- the verdict the API reports is the verdict those gates demand given those
  numbers.

That is narrower than "the order is proven", and it is the claim that is true.
