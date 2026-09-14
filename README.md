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

It wants to play all of them. What stops it is arithmetic. The design has three
outcomes, and they are not the same:

| the measurement says | the design stakes |
|---|---|
| there is an edge, proven out of sample | a real position, sized by fractional Kelly and discounted by how wide the confidence interval is |
| nobody knows yet | the smallest stake that buys one more sample — **this loses money on average, and it is a measurement cost, not a bet** |
| there is a negative edge | nothing. That arm is dead, not shy |

That last row is the one most systems get wrong. "No measured edge" and "a
measured negative edge" both produce a Kelly of zero, and treating them alike
means paying a 4% round trip to re-confirm a loss you already measured.

🔴 **Today only the middle row runs, and the table above is a design rather than
a description.** Every stake the running session has placed is the exploration
minimum — 0.02 ETH, a constant — by construction, because no edge is proven and
the middle row is exactly what "nobody knows yet" costs. **The sizer exists, it
is tested, and the running session has never called it**: fractional Kelly lives
in the backtest and in the design, not in any stake that has been placed. Until
the first row fires, saying "the agent sizes each hand from measured edge" would
describe a branch that has never executed — and the distance between a plan and
a behaviour is the kind of thing this repository is supposed to state rather than
blur.

## Why any of this is checkable

Three rules, and they are the whole product:

**1. The criterion is written and committed before the measurement runs.**
A threshold chosen after seeing the outcome is not a threshold, it is a
description of the outcome. Every criterion in [`docs/criteria/`](docs/criteria/)
carries the hash and the UTC minute of the commit that introduced it and of the
commit that carried the result — and says plainly that those commits live in the
closed repository, so from outside the pairing is an assertion rather than a
proof. What you *can* check from outside is that the gates were stated before any
number was quoted, and that the verdict follows from the numbers the API serves
today.

Three of the four criteria behind the published numbers are in that directory in
full. **The fourth is withheld**, and saying so here is the point: its definition
of a launch's return is also the shape of an entry rule on the launchpad, and on
a chain where bots buy within one second, publishing it would hand over the
advantage. A criterion goes up whole or not at all — publishing everything except
the part that would let a reader disagree is worse than silence, because it looks
like disclosure. The reasoning is in
[`docs/criteria/README.md`](docs/criteria/README.md).

**2. A number that could not be measured is never published as zero.**
Every API envelope carries the age of the data inside it and a confidence derived
from that age — never declared, always computed. A panel that could not read its
source says so. `null` and `0` are different claims and are never merged.

**3. Published figures are anchored, and a verifier reads the rendered page.**
Each figure on the site sits in a `<span data-numero="...">`. A tool reads the
page **as served** — never the source — and checks four things against the API:
the anchored figures against [`/api/numeri.json`](docs/api.md), the out-of-sample
verdict word against `walkforward.json`, the mode label against `status.json`,
and the declared buyback share against `flywheel.json`. It also dates every
envelope against your own clock, because a number can be correct and useless at
the same time.

🔴 **Until 2026-09-14 that paragraph was a promise this repository was not
keeping.** The tool *counted* the anchors — "8 anchored figures found" — and
compared none of them, because no endpoint carried them; and it passed fifteen
checks out of fifteen against a page that had been frozen on the domain for
nineteen hours, because it never compared `generated` with a clock. Both defects
were in the verifier, on the one promise a third party can check without trusting
us. It is fixed, and `/api/numeri.json` does not exist yet — so **the tool now
reports "could not look" and exits 2 instead of passing.** Failing closed on what
it cannot read is the whole point.

## Check it yourself

```bash
git clone https://github.com/kuzanfloor/kakegurai-method
cd kakegurai-method
node verify/check.mjs
```

No dependencies, no build step, nothing installed. It fetches the live API and
the page as served, and prints one line per claim. Four outcomes, and only the
first means the site is fine:

| exit | meaning |
|---|---|
| `0` | every claim checked out |
| `1` | a published number disagrees with its source — **including when the disagreement is ours** |
| `2` | could not look: network, bad JSON, or an endpoint that is not served |
| `3` | the published data is older than 26 hours, whatever it says about itself |

The code is the worst single finding, ranked `1 > 3 > 2 > 0`: a measured defect
outranks an absence. **"Could not look" is not "fine" and "old" is not "wrong"**
— a checker that folds those into success reports a pass on a silence.

**About the 26 hours.** The site is regenerated at the close of each trading day,
21:35 UTC, so a healthy weekday reading is at most a day old and 26 hours leaves
slack for a late run. It follows that **over a weekend this tool will report
stale**, because from Friday evening to Monday evening the newest generation is
up to about 72 hours old. That is not a false alarm and it is not tuned away: the
numbers really are that old, and weekend regeneration is unfinished work on the
closed side. A threshold chosen so that it never fires is not a threshold.

To prove the tool can reject rather than nod:

```bash
node --test verify/checks.test.mjs
```

Every comparison is a pure function of (envelopes, page, clock), and the suite
feeds each one a forged page and asserts that it fails. A checker that has never
rejected anything is not a checker.

To check a single thing by hand:

```bash
curl -s https://kakegurai.xyz/api/walkforward.json | jq .data
```

## Current status, stated plainly

At the time of writing the agent runs **in paper mode**. It places no real
orders, and every public surface says so on every post. One strategy of eight is
trading on paper and being scored on days it has never seen.

The other seven are not off for one reason, and summarising them as one would be
the convenient sentence rather than the true one: **three were measured to lose**
— each published with the number that decided it — and **four never got enough
data to decide anything**, having fired too few times, or no times at all, to
produce a measurement. "Measured to lose" and "never sampled" both stop a
strategy, and merging them is the same mistake as merging `0` with `null`, one
level up.

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
3. the realised profit is split three ways, and the split is declared in basis
   points rather than described: **30% buys the token back** on the market, in
   slices · **50% stays in the bankroll** · **20% is operating**;
4. the tokens bought are burned, and every burn traces back to the trades that
   funded it.

So **half of every realised profit stays in the bankroll** — half of the whole,
not half of what is left after the buyback — which is why the split is not 100%
buyback: a circuit that burns everything never grows the stake it plays with.

The source is the policy itself, and `verify/check.mjs` compares it against the
share the site prints:

```bash
curl -s https://kakegurai.xyz/api/flywheel.json | jq '.data.politica'
# { "riacquistoBps": 3000, "bancaBps": 5000, "operativoBps": 2000, ... }
```

⚠️ This paragraph said *"half of the remainder"* until 2026-09-14. Half of the
remainder would be 35% of the profit, not 50% — a number this repository had
never measured, published in the section where it makes the biggest difference.

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
docs/criteria/          the pre-registered criteria, one file per measurement,
                        plus what is withheld and why
docs/api.md             the contract of the public endpoints, including the one
                        that does not exist yet and what the verifier expects
verify/check.mjs        pulls the live API and the page, and reports. Zero deps
verify/checks.mjs       the comparisons, as pure functions of (API, page, clock)
verify/checks.test.mjs  a forged page per comparison, proving each one can fail
```

## Licence

MIT — see [LICENSE](LICENSE). The method is meant to be copied. If you run an
agent that publishes numbers, the three rules above cost very little and are the
difference between a dashboard and a claim.
