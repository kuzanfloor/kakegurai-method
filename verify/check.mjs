/* Checks what kakegurai.xyz publishes, against what it publishes it from.
 *
 * No dependencies and no build step on purpose: a verifier that needs an
 * install is a verifier most people will not run, and one nobody runs proves
 * nothing.
 *
 *   node verify/check.mjs [base url]
 *
 * Exit codes, and only the first one means the site is fine:
 *   0  every claim checked out
 *   1  a published number disagrees with its source
 *   2  could not look — network, bad JSON, endpoint missing
 *   3  the published data is older than the limit, whatever it says
 *
 * The code is the WORST single finding, ranked 1 > 3 > 2 > 0: a measured
 * defect outranks an absence. "Could not look" is not "fine" and "old" is not
 * "wrong" — a checker that collapses those into success reports a pass on a
 * silence, which is the failure mode this whole project exists to avoid.
 *
 * 🔴 This tool passed 15/15 on 2026-09-14 against a page that had been frozen
 * on the domain for nineteen hours, and against eight published figures it
 * never compared to anything. Both defects were in HERE, not on the site. What
 * changed: it now dates every envelope against a clock, and it compares the
 * anchored figures with `/api/numeri.json` — and says "could not look" instead
 * of passing while that endpoint is missing. The comparisons live in
 * `checks.mjs` so that `checks.test.mjs` can prove each one can fail.
 */

import { controllaTutto, codiceUscita, ETA_MASSIMA_ORE } from "./checks.mjs";

const BASE = process.argv[2] ?? "https://kakegurai.xyz";
const ENDPOINTS = ["status", "performance", "flywheel", "walkforward", "capacita",
                   "rwa", "pons", "decisioni", "salute", "numeri"];

const COLORI = { ok: ["\x1b[32m", "✓"], disagrees: ["\x1b[31m", "✗"], stale: ["\x1b[35m", "⌛"], unknown: ["\x1b[33m", "?"] };

async function json(nome) {
  const r = await fetch(`${BASE}/api/${nome}.json`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

console.log(`\n  KAKEGURAI — checking ${BASE}\n`);

const buste = {};
const mancanti = [];
for (const n of ENDPOINTS) {
  try { buste[n] = await json(n); }
  /* `numeri` is not listed here when it fails: the anchored-figure check names
   * it and says what its absence costs, and counting one silence twice makes a
   * site look worse than it is. */
  catch (e) { if (n !== "numeri") mancanti.push(`${n}: ${e instanceof Error ? e.message : e}`); }
}

let html = null;
let errorePagina = null;
try { html = await (await fetch(`${BASE}/`, { signal: AbortSignal.timeout(20_000) })).text(); }
catch (e) { errorePagina = e instanceof Error ? e.message : String(e); }

const esiti = controllaTutto({ buste, html, ora: Date.now() });
/* An endpoint that did not answer is a thing we could not look at, and it has
 * to be counted — otherwise a site that stops serving half its API gets a
 * cleaner report than one that serves it and disagrees. */
for (const m of mancanti) esiti.push({ stato: "unknown", testo: m });
if (errorePagina) esiti.push({ stato: "unknown", testo: `page: ${errorePagina}` });

for (const e of esiti) {
  const [colore, segno] = COLORI[e.stato] ?? ["", "·"];
  console.log(`  ${colore}${segno}\x1b[0m ${e.testo}`);
}

const conta = (s) => esiti.filter((e) => e.stato === s).length;
console.log(`\n  ${conta("disagrees")} disagree · ${conta("stale")} stale (over ${ETA_MASSIMA_ORE}h) · ${conta("unknown")} could not look · ${conta("ok")} checked out\n`);
process.exit(codiceUscita(esiti));
