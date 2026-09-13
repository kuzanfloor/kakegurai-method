/* Checks what kakegurai.xyz publishes, against what it publishes it from.
 *
 * No dependencies and no build step on purpose: a verifier that needs an
 * install is a verifier most people will not run, and one nobody runs proves
 * nothing.
 *
 * Exit codes, and the middle one is the point:
 *   0  every claim checked out
 *   1  a published number disagrees with its source
 *   2  could not look — network, bad JSON, endpoint missing
 *
 * "Could not look" is not "fine". A checker that collapses those two states
 * reports success on a silence, which is the failure mode this whole project
 * exists to avoid.
 */

const BASE = process.argv[2] ?? "https://kakegurai.xyz";
const ENDPOINTS = ["status", "performance", "flywheel", "walkforward",
                   "capacita", "rwa", "pons", "decisioni", "salute"];

let falliti = 0, nonGuardati = 0;

const ok   = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const male = (m) => { falliti++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };
const boh  = (m) => { nonGuardati++; console.log(`  \x1b[33m?\x1b[0m ${m}`); };

async function json(nome) {
  const r = await fetch(`${BASE}/api/${nome}.json`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

console.log(`\n  KAKEGURAI — checking ${BASE}\n`);

/* ── 1. every endpoint answers, and says how old it is ───────────────────── */
const buste = {};
for (const n of ENDPOINTS) {
  try {
    const b = await json(n);
    buste[n] = b;
    /* 🔴 The first version of this check failed `pons` for "data with no age",
     * and it was the CHECK that was wrong. An envelope can legitimately carry
     * data it cannot date — one ingredient of several had no timestamp — and it
     * marks that by reporting confidence "unknown". That is the honest state.
     *
     * The defect worth catching is the opposite one: an age nobody knows,
     * dressed up as a figure you can rely on. */
    if (typeof b.generated !== "string") male(`${n}: no generation timestamp`);
    else if (b.data !== null && typeof b.dataAgeSec !== "number" && b.confidence !== "unknown")
      male(`${n}: data with no age but confidence "${b.confidence}" — an undatable figure cannot earn confidence`);
    else if (b.data === null) ok(`${n}: declares it could not measure`);
    else if (typeof b.dataAgeSec !== "number") ok(`${n}: data present, age unknown, and it says so`);
    else ok(`${n}: age ${b.dataAgeSec}s, confidence ${b.confidence}`);
  } catch (e) {
    boh(`${n}: ${e instanceof Error ? e.message : e}`);
  }
}

/* ── 2. null is never dressed up as zero ─────────────────────────────────── */
for (const [n, b] of Object.entries(buste)) {
  if (b.data === null && b.confidence !== "unknown") {
    male(`${n}: no data but confidence is "${b.confidence}" — an unmeasured value cannot earn confidence`);
  }
}

/* ── 3. the walk-forward verdict matches the numbers it comes from ───────── */
const w = buste.walkforward?.data;
if (!w) boh("walk-forward: not published, nothing to re-derive");
else if (!Array.isArray(w.bracci) || w.bracci.length === 0) boh("walk-forward: no arms published");
else {
  /* ⚠️ The interval is per ARM, not one per measurement: the first version of
   * this check looked for a single `ic` at the top and reported "nothing to
   * check the verdict against" on a payload that carries one interval per arm.
   * Before believing a verifier's complaint, read what the thing actually said. */
  for (const b of w.bracci) {
    const ic = b.ic95 ?? b.ic;
    const v = String(b.esito ?? "").toUpperCase();
    if (!Array.isArray(ic) || ic.length !== 2) { boh(`walk-forward ${b.nome}: no interval`); continue; }
    /* A verdict of HOLDS on an interval that crosses zero is a contradiction:
     * the interval is the thing the verdict is supposed to be about. */
    if (v === "REGGE" && ic[0] <= 0 && ic[1] >= 0)
      male(`walk-forward ${b.nome}: says it holds, but [${ic[0].toFixed(4)}, ${ic[1].toFixed(4)}] crosses zero`);
    /* And the mean has to sit inside its own interval. If it does not, the two
     * were computed from different things, and at least one is not a measure. */
    else if (typeof b.mediaPct === "number" && (b.mediaPct < ic[0] || b.mediaPct > ic[1]))
      male(`walk-forward ${b.nome}: mean ${b.mediaPct.toFixed(4)} sits outside its own interval`);
    else
      ok(`walk-forward ${b.nome}: "${v}" · ${b.operazioni} ops · mean ${b.mediaPct.toFixed(4)}% in [${ic[0].toFixed(4)}, ${ic[1].toFixed(4)}]`);
  }
}

/* ── 4. the circuit never reports more burned than bought ────────────────── */
const f = buste.flywheel?.data;
if (!f) boh("circuit: not published");
else {
  const comprati = BigInt(f.tokenComprati ?? "0");
  const bruciati = BigInt(f.tokenBruciati ?? "0");
  if (bruciati > comprati) male(`circuit: ${bruciati} burned but only ${comprati} bought`);
  else ok(`circuit: ${bruciati} burned of ${comprati} bought`);
  /* Allocated is not spent, and pending is not burned. Adding them would
   * publish a buyback that never happened. */
  const alloc = Number(f.allocatoEth ?? 0), spesi = Number(f.eseguitoEth ?? 0), sosp = Number(f.inSospesoEth ?? 0);
  if (spesi + sosp > alloc + 1e-12) male(`circuit: spent + pending (${spesi + sosp}) exceeds allocated (${alloc})`);
  else ok(`circuit: spent ${spesi} + pending ${sosp} within allocated ${alloc}`);
}

/* ── 5. the page and the API agree on the anchored numbers ───────────────── */
try {
  const html = await (await fetch(`${BASE}/`, { signal: AbortSignal.timeout(20_000) })).text();
  const ancore = [...html.matchAll(/data-numero="([^"]+)"[^>]*>([^<]+)</g)]
    .map(([, id, val]) => ({ id, val: val.trim() }));
  if (ancore.length === 0) male("page: no anchored figures found — the verifier has nothing to check");
  else ok(`page: ${ancore.length} anchored figures found` +
    (ancore.some((a) => a.val === "" || a.val === "0") ? " (some are zero — check they mean it)" : ""));
  /* A page that declares paper mode is a page whose numbers are simulated.
   * If that label ever goes missing, everything above reads as real money. */
  if (!/paper|no real funds/i.test(html)) male("page: no mode label — a simulated result presented as real");
  else ok("page: mode label present");
} catch (e) {
  boh(`page: ${e instanceof Error ? e.message : e}`);
}

console.log(`\n  ${falliti} disagreements · ${nonGuardati} could not look\n`);
process.exit(falliti > 0 ? 1 : nonGuardati > 0 ? 2 : 0);
