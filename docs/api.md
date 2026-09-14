# The public API

Static JSON files, regenerated whenever the underlying data changes. No server,
no rate limit, no key.

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
| `numeri` | the figures anchored on the page, with the tolerance inside which each is still true — **not served yet**, see below |

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

🔴 **`dataAgeSec` is frozen at generation, so it does not grow.** `status.json`
reports `dataAgeSec: 0, confidence: "high"` for as long as that file sits on the
domain — which on 2026-09-14 was nineteen hours. **The only field that ages is
`generated`**, so work out the real age yourself:

```bash
curl -s https://kakegurai.xyz/api/status.json \
  | jq -r '"generated \(.generated) · claims \(.dataAgeSec)s old"' \
  && date -u +"now       %Y-%m-%dT%H:%M:%SZ"
```

`verify/check.mjs` does exactly this for every envelope and calls anything over
26 hours **stale** — a separate outcome from *disagrees*, with its own exit code.

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

### What `walkforward` does not publish, on purpose

The endpoint carries **how many** candidate thresholds the selection had to
choose from, and the fact that the choice is remade for every day out of sample.
**It does not carry the values.** Entry thresholds are not published: bots on
this chain buy within a second of a launch, and a threshold is the one thing that
turns a description of the method into an instruction for copying it.

If you are holding an older copy of this file that still lists them, they were
removed deliberately. Nothing here depends on them: `verify/check.mjs` reads only
`nome`, `operazioni`, `mediaPct`, `ic95` and `esito` from each arm, and the
criteria in [`criteria/`](criteria/) describe how a threshold is chosen without
ever naming one. **What you lose is the ability to re-run the selection
yourself; what you keep is the ability to check that the verdict follows from
the interval** — which is the claim this repository actually makes.

## `numeri` — the contract, written before the endpoint exists

Every figure on the page sits in `<span data-numero="id">value</span>`. Until
this endpoint is served **nothing outside the project can check those figures**:
they are cohort rates and curve fees, and no other endpoint carries them. That
is why `verify/check.mjs` reports *could not look* and exits 2 rather than
passing — the comparison is not merely unwritten, from outside it is impossible.

This is the shape it expects. It is written here first so that whoever builds it
and whoever checks it are reading the same document.

```jsonc
{
  "generated": "2026-09-14T21:35:04.118Z",
  "version": "1",
  "source": "kakegurai.db — re-measured, not copied from the page",
  "confidence": "high",
  "dataAgeSec": 0,
  "data": {
    "diploma-1-lancio":  { "valore": 1.87,     "unita": "%",    "tolleranza": 0.3   },
    "diploma-2-4":       { "valore": 1.45,     "unita": "%",    "tolleranza": 0.3   },
    "diploma-5-oltre":   { "valore": 1.18,     "unita": "%",    "tolleranza": 0.35  },
    "tassa-1-lancio":    { "valore": 0.017681, "unita": " ETH", "tolleranza": 0.002 },
    "tassa-2-4":         { "valore": 0.016307, "unita": " ETH", "tolleranza": 0.003 },
    "tassa-5-oltre":     { "valore": 0.012199, "unita": " ETH", "tolleranza": 0.004 },
    "corpus-maturi":     { "valore": 117657,   "unita": "",     "tolleranza": 0     },
    "scambi-recuperati": { "valore": 2988036,  "unita": "",     "tolleranza": 0     }
  },
  "note": "..."
}
```

**`data` is the map itself**, not a wrapper around one. Seven rules, and each
exists because breaking it makes the check pass when it should not:

1. **The key is exactly the `data-numero` attribute** the page renders. Nothing
   else joins the two sides.
2. **The two sides must cover each other exactly.** A figure anchored on the
   page and missing from the map is a published number with no source; a figure
   in the map and anchored nowhere is a build that succeeded while dropping the
   block it was supposed to render. Both are reported as disagreements, and the
   second is the one source review cannot catch.
3. **`valore` is re-measured at generation time, never copied from the page.**
   Copying makes the comparison agree with itself: it would still catch a hand
   edit or a dropped block, but never a figure that has drifted away from what
   the data now says. If for some figure it must be copied, say so in `note` —
   the reader is owed the difference between *checked* and *echoed*.
4. **`unita` is the exact suffix the page prints after the digits** — `"%"`,
   `" ETH"` with its leading space, or `""`. It is used to strip the rendering,
   nothing more.
5. **`tolleranza` is absolute, in the same unit, and never negative.** `0` means
   exact equality and is only right for a figure that cannot move between two
   generations; a growing count published with a zero tolerance raises an alarm
   every evening, and an alarm that always fires is one nobody reads.
6. **`data: null` when the re-measurement could not run.** Never `{}`, never a
   map of zeros. The tool then reports *could not look* — which is the truth —
   instead of *everything agrees*, which is not.
7. **A figure the page renders as `—` or `n/a` is not zero.** The tool reports
   it as could-not-look, and the endpoint should carry it as `null` too.

⚠️ **One check has no anchor and should get one.** The buyback share is compared
against `flywheel.json .data.politica.riacquistoBps`, and the tool has to find
it by reading the sentence that claims it — so an innocent rewrite of that
sentence looks like a defect. Anchoring the share as a `data-numero` would move
it into the ordinary figure comparison and let that heuristic be deleted.
