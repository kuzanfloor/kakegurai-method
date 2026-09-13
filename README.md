# KAKEGURAI — the method

**An autonomous agent trades on Robinhood Chain. This repository is how you check it.**

The agent itself is closed source, and the reason is not modesty: on this chain
MEV bots buy within one second of a launch and unload within ten. Publishing the
exact entry conditions would hand them the only advantage the agent has, and that
is not a decision you can take back.

What you get instead is everything needed to **verify the claims without trusting
the claimant**: the criteria that were written before each measurement, the
contract of the public API, and a tool that pulls the live numbers and checks them
against what the site says.

- Live surface — <https://kakegurai.xyz>
- Control room — <https://kakegurai.xyz/control.html>
- API — <https://kakegurai.xyz/api/status.json>
- The agent's own account — [@kakeguraiagent](https://x.com/kakeguraiagent)

---

## What the agent actually does

It watches two venues on Robinhood Chain (chain id 4663):

- **Pons**, a bonding-curve launchpad, where new tokens are born and die;
- a book of **37 tokenised equities**, each tracking the price of a real stock.

It wants to play all of them. What stops it is arithmetic. For every candidate it
computes what the position is worth, how much of the bankroll the measurement
justifies, and stakes exactly that. Three outcomes, and they are not the same:

| the measurement says | the agent stakes |
|---|---|
| there is an edge, proven out of sample | a real position, sized by fractional Kelly and discounted by how wide the confidence interval is |
| nobody knows yet | the smallest stake that buys one more sample — **this loses money on average, and it is a measurement cost, not a bet** |
| there is a negative edge | nothing. That arm is dead, not shy |

That last row is the one most systems get wrong. "No measured edge" and "a
measured negative edge" both produce a Kelly of zero, and treating them alike
means paying a 4% round trip to re-confirm a loss you already measured.

## Why any of this is checkable

Three rules, and they are the whole product:

**1. The criterion is written and committed before the measurement runs.**
A threshold chosen after seeing the outcome is not a threshold, it is a
description of the outcome. Every criterion in [`docs/criteria/`](docs/criteria/)
carries the timestamp of the commit that introduced it, and you can check that
commit predates the result it judges.

**2. A number that could not be measured is never published as zero.**
Every API envelope carries the age of the data inside it and a confidence derived
from that age — never declared, always computed. A panel that could not read its
source says so. `null` and `0` are different claims and are never merged.

**3. Published figures are anchored, and a verifier reads the rendered page.**
Each figure on the site sits in a `<span data-numero="...">`. A tool reads the
page as served and compares it to the API. A number can therefore go stale on the
site and be caught, instead of being believed because it is written in a nice
font.

## Check it yourself

```bash
git clone https://github.com/kuzanfloor/kakegurai-method
cd kakegurai-method
node verify/check.mjs
```

No dependencies, no build step, nothing installed. It fetches the live API,
recomputes what can be recomputed, and prints one line per claim. It exits
non-zero if a published number disagrees with its source — including when the
disagreement is ours.

To check a single thing by hand:

```bash
curl -s https://kakegurai.xyz/api/walkforward.json | jq .data
```

## Current status, stated plainly

At the time of writing the agent runs **in paper mode**. It places no real
orders, and every public surface says so on every post. One strategy of eight is
trading on paper and being scored on days it has never seen; the other seven are
switched off by measurements that are published with the number that switched
them off.

Nothing here has proven an edge yet. The out-of-sample verdict is **not yet
proven** — not *failed*, and not *passed* — and the criterion for deciding was
committed before the run. When it resolves, it resolves in public, in whichever
direction it goes.

## The token

There is a token, `$KAKEGURAI`, and a mechanism attached to it. It works like
this, and the share is declared rather than described:

1. the agent closes a position in profit;
2. only what sits above the high-water mark counts — recovering a loss earns
   nothing;
3. a declared **30%** of that buys the token back on the market, in slices;
4. the tokens bought are burned, and every burn traces back to the trades that
   funded it.

Half of the remainder stays in the bankroll, which is why the split is not 100%
buyback: a circuit that burns everything never grows the stake it plays with.

**As of now this has never run.** Nothing has been burned, because there is no
realised profit to spend and the circuit refuses simulated money by construction.
A buyback is something the protocol does. It is not something a holder is owed,
it is not a statement about price, and nothing in this repository is a forecast.

## Risk

KAKEGURAI is software that places bets. It runs in paper mode with no real funds
at risk, and if that ever changes it can lose its entire bankroll. Nothing here is
advice, an offer, or a solicitation. Past measurements describe the conditions
that produced them and nothing else. Tokenised equities are tokens that track a
reference price; they are not the underlying securities and this repository never
treats them as such.

## A note on the field names

Some identifiers in the API are Italian — `perche` (why), `esito` (verdict),
`bracci` (arms), `data-numero` on the page anchors. They are the real names of
real things in a running system, and renaming them to make a document tidier
would mean this repository documented something other than what is deployed.
Each one is glossed where it first appears.

## Layout

```
docs/method.md          how a claim becomes a number here
docs/criteria/          the pre-registered criteria, one file per measurement
docs/api.md             the contract of the nine public endpoints
verify/check.mjs        pulls the live API and checks it. Zero dependencies
```

## Licence

MIT — see [LICENSE](LICENSE). The method is meant to be copied. If you run an
agent that publishes numbers, the three rules above cost very little and are the
difference between a dashboard and a claim.
