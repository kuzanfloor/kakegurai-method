# The public API

Nine static JSON files, regenerated whenever the underlying data changes. No
server, no rate limit, no key.

```
https://kakegurai.xyz/api/<name>.json
```

| name | what it carries |
|---|---|
| `status` | mode, chain head, how many strategies exist and how many run |
| `performance` | closed paper positions, aggregated |
| `walkforward` | the out-of-sample result, per arm, with the criterion that judges it |
| `capacita` | the trade size at which the measured edge dies |
| `rwa` | dislocation across the tokenised-equity book |
| `pons` | recent launches on the bonding-curve launchpad |
| `decisioni` | the journal: what the agent decided and why, refusals included |
| `flywheel` | realised profit, the declared buyback share, what was bought and burned |
| `salute` | whether the samplers are still writing |

## The envelope

Every file has the same shape, and the fields that matter are the ones about
doubt:

```jsonc
{
  "generated": "2026-09-13T12:52:21.367Z",  // when this file was written
  "version": "1",
  "source": "paper_positions + treasury_settlements",
  "confidence": "high" | "medium" | "low" | "unknown",
  "dataAgeSec": 37,        // age of the OLDEST ingredient, or null
  "data": { } | null,      // null = could not measure. Never {} , never 0
  "note": "..."
}
```

**`dataAgeSec` is the maximum, not the average.** An envelope is exactly as fresh
as its stalest ingredient, and averaging would let one current number hide four
stale ones.

**`confidence` is computed from age**, never asserted. If you see `unknown`, the
file is telling you it could not date itself — which is a legitimate state, not a
bug, and is why `verify/check.mjs` accepts data with no age *only* when
confidence says so.

## Reading it honestly

```bash
# the verdict and the interval it rests on
curl -s https://kakegurai.xyz/api/walkforward.json \
  | jq '.data.bracci[] | {nome, operazioni, mediaPct, ic95, esito}'

# what the circuit has actually done
curl -s https://kakegurai.xyz/api/flywheel.json | jq '.data | {politica, eseguitoEth, tokenBruciati}'
```

If a field you expect is missing, check `data` for `null` before assuming a bug:
the absence is usually the answer.
