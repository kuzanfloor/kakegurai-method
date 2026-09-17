# Do the curve fees reach the deployer?

**The question.** On Pons, the bonding-curve launchpad on Robinhood Chain
(chain id 4663), does whoever launches a token collect the trading fees its
curve generates?

**The answer: no.** Not per trade, not at graduation, and the curve exposes no
collection function among those tried.

Measured **2026-09-17**, before launching anything from here.

---

## ⚠️ This one has no criterion written first, and that has to be said

Every other measurement behind this repository carries a criterion committed
*before* the run — that is what [`docs/criteria/`](criteria/) is. **This one does
not.** The question arose and was answered inside a single working session,
because it was blocking a launch decision already in motion.

Writing a criterion now and dating it "before" would be the worst thing this
document could do, so there is none. What stands in its place is the
**falsification, declared in advance** — written down before knowing whether
anyone would ever produce one:

> A single transaction in which a deployer receives the quote token from a curve
> it launched, or a collection selector in the curve's bytecode, overturns this
> conclusion. **One counterexample is enough.**

That is weaker evidence than a pre-registered criterion, and you should treat it
that way. It is published under the same rule as everything else here: the gap
is named rather than papered over.

## The six checks

| # | check | result |
|---|---|---|
| 1 | `feeBps()` on the curve | **100**, i.e. 1%, plus a `tax` of the same size |
| 2 | a real round trip, ERC-20 logs decoded | the fee is **never transferred out**: it stays inside the curve's own accounting |
| 3 | **two** graduation transactions, logs decoded | the factory moves **3,840.064684** of the quote token toward the pool. **The deployer does not appear in any log** |
| 4 | quote-token balance of the three deployers whose curves generated the most fees (590.82 · 415.72 · 400.90 ETH) | **0.000000** — all three |
| 5 | 21 selectors — `claimFees` `collect` `withdraw` `creatorFee` and the like — against the curve's bytecode | **no match** |
| 6 | the token itself: `taxRecipient` `setTax` `owner` `treasury` | **none of them.** A minimal ERC-20 of 3,248 bytes, with no owner |

Four independent probes point the same way and none points elsewhere.

## The scan that found nothing carries a control, and without it would be worth nothing

A selector scanner that finds nothing is indistinguishable from a broken scanner.
So the same scanner, in the same pass, also looks for `feeBps()` · `deployer()` ·
`graduated()` · `factory()` · `token()` — and **finds all five**. That is what
makes "no match" a measurement rather than a silence.

It is the same shape as the rest of this repository: a checker that has never
rejected anything is not a checker, and a probe that has never found anything is
not a probe.

## The limit, declared

The curve's bytecode contains **81 `PUSH4` constants**, of which **21 have been
identified**. The other 60 are **unknown, not absent**.

So the honest sentence is *"not found among those tried"*, not *"proven
impossible"*. The distance between those two is real and is not filed down here.

## And the prize was not there anyway

Fee generated **per curve**, over the entire life of the curve, across **292,840
curves with at least one trade** (17,585,608 trades, 119,366.75 ETH of fees in
total):

| | fees generated over the curve's whole life |
|---|---|
| **median launch** | **0.004476 ETH** |
| 90th percentile | 0.2852 ETH |
| 99th percentile | 7.2435 ETH |
| largest observed | 590.82 ETH |

Even if a collection path existed, the median launch would collect **four
thousandths of an ETH**. A desk funded by the fees of its own launch needs to
land in the **99th percentile** — which is to say, it needs the outcome it was
supposed to fund.

## 🔴 What you can check from here, and what you cannot

This matters more than the numbers, because the whole claim of this repository is
that you do not have to trust the claimant.

**Checkable by anyone, no trust required** — all of it is on chain:

- the two graduation transactions, by hash (below), and whether a deployer
  appears in their logs;
- `feeBps()` on any curve;
- the bytecode of a curve and of a token, and any selector you care to scan it
  for, including the 60 constants we did not identify;
- the quote-token balance of any deployer you can name.

**Not checkable from here:** the fee distribution over 292,840 curves comes from
an ingested history of the chain that this repository **does not publish**. Quoted
here, it is an assertion, not a proof. It can be rebuilt by anyone willing to
ingest the same logs — the aggregation is one `GROUP BY` and it is written out
below — but until you do that, it is our word, and it is listed here among the
things you cannot check rather than among the things you can.

## What followed from it

The plan was *"the agent trades on the fees of its own launch"*. It is not
implementable on this venue, so **it was not implemented**.

In its place the treasury records a **contribution of capital, confirmed
on-chain**, without pretending to know where the money came from. The source is a
**declared label, not a deduction** — which is also why that module is not called
`fee.ts`: the day some venue does pay creators, that flow arrives as a different
source and the circuit does not have to be rewritten.

This is the same distinction the token section of the [README](../README.md)
turns on: **contributed capital is never counted as profit**, or the buyback
would eat money the desk never earned.

## Reproduce it

The two graduation transactions, on the public RPC:

```bash
for h in \
  0x242ef98c82b555e7d1dbd492e66b9a49e73b861f1bccb775863e190f38cc7e0d \
  0xa96549ae16c0bd1918ac0f59e16523f98905205ce459670fc989fb04b2da1ffc
do
  curl -s https://rpc.mainnet.chain.robinhood.com \
    -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getTransactionReceipt\",\"params\":[\"$h\"]}" \
  | jq '.result | {status, blockNumber, logs: (.logs | length)}'
done
```

Decode the `Transfer` logs and look for the address that deployed the token. It is
not there.

The bytecode of the curve — take a curve address out of those receipts:

```bash
curl -s https://rpc.mainnet.chain.robinhood.com \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["0x<curve>","latest"]}' \
  | jq -r .result | grep -o '63[0-9a-f]\{8\}' | sort -u
```

Every `63xxxxxxxx` is a `PUSH4`, which is how a function selector is compared.
Scan them for the collection function you expect to find, and scan them for
`feeBps()` first so you know your scan works.

The distribution, if you have ingested the trades yourself:

```sql
CREATE TEMP TABLE p AS
  SELECT curve, SUM(CAST(fee AS REAL))/1e18 AS f FROM curve_trades GROUP BY curve;
SELECT 'median', ROUND(f, 6) FROM p
  ORDER BY f LIMIT 1 OFFSET (SELECT COUNT(*)/2 FROM p);
```
