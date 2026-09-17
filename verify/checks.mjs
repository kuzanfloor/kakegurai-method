/* The checks themselves, with no I/O in them.
 *
 * They live apart from `check.mjs` for one reason: a check that can only be
 * exercised by pointing it at the live site cannot be shown to REJECT anything.
 * Here every comparison is a pure function of (envelopes, page, clock), so
 * `checks.test.mjs` can feed each one a doctored page and prove it fails.
 *
 * A checker that has never rejected anything is not a checker.
 */

/** How old the published data may be before the tool calls it stale.
 *
 * The site is regenerated at the close of every trading day, 21:35 UTC, so a
 * healthy weekday reading is at most 24 h old and 26 h leaves two hours of
 * slack for a late run.
 *
 * ⚠️ It follows that over a weekend this tool WILL report stale — from Friday
 * evening to Monday evening the newest generation is up to ~72 h old. That is
 * not a false alarm and it is not tuned away: the numbers really are that old,
 * and weekend regeneration is unfinished work on the closed side. A threshold
 * chosen so that it never fires is not a threshold. */
export const ETA_MASSIMA_ORE = 26;

/** The three verdict words, and they are the ONLY three. Until API version 2
 *  this file carried a translation table from the Italian names the API used
 *  — which meant a third party had to know the house vocabulary to read a
 *  public endpoint, and the page and the API could drift into two words for
 *  one state. The API now emits these words itself; this list is what the page
 *  is allowed to print, nothing more.
 *
 *  ⚠️ A word outside this list is "could not look", never "fine". */
export const PAROLE_VERDETTO = ["HOLDS", "NOT YET PROVEN", "REJECTED"];

/* Four states, and the third and fourth are the point:
 *   ok        checked, and it agrees
 *   disagrees checked, and it does not
 *   stale     checked, agrees, and is too old to mean anything
 *   unknown   could not look
 *
 * "Could not look" is not "fine", and "old" is not "wrong". Collapsing any of
 * them into `ok` is the failure mode this whole project exists to avoid. */
const nota = (stato, testo) => ({ stato, testo });
const ok = (t) => nota("ok", t);
const no = (t) => nota("disagrees", t);
const vecchio = (t) => nota("stale", t);
const boh = (t) => nota("unknown", t);

/** The exit code is the worst single finding, and the ranking is deliberate:
 *  a measured defect outranks an absence. */
export function codiceUscita(esiti) {
  if (esiti.some((e) => e.stato === "disagrees")) return 1;
  if (esiti.some((e) => e.stato === "stale")) return 3;
  if (esiti.some((e) => e.stato === "unknown")) return 2;
  return 0;
}

/* ── the envelope says how old it is, and cannot claim what it cannot date ── */
export function controllaBusta(nome, b) {
  /* 🔴 The first version of this check failed `pons` for "data with no age",
   * and it was the CHECK that was wrong. An envelope can legitimately carry
   * data it cannot date — one ingredient of several had no timestamp — and it
   * marks that by reporting confidence "unknown". That is the honest state.
   *
   * The defect worth catching is the opposite one: an age nobody knows,
   * dressed up as a figure you can rely on. */
  if (typeof b?.generated !== "string") return no(`${nome}: no generation timestamp`);
  if (b.data !== null && typeof b.dataAgeSec !== "number" && b.confidence !== "unknown")
    return no(`${nome}: data with no age but confidence "${b.confidence}" — an undatable figure cannot earn confidence`);
  if (b.data === null && b.confidence !== "unknown")
    return no(`${nome}: no data but confidence is "${b.confidence}" — an unmeasured value cannot earn confidence`);
  if (b.data === null) return ok(`${nome}: declares it could not measure`);
  if (typeof b.dataAgeSec !== "number") return ok(`${nome}: data present, age unknown, and it says so`);
  return ok(`${nome}: age ${b.dataAgeSec}s at generation, confidence ${b.confidence}`);
}

/* ── and how old it is NOW, which is a different question ────────────────── */
export function controllaEta(nome, b, ora, oreMassime = ETA_MASSIMA_ORE) {
  /* 🔴 The reason this check exists: `dataAgeSec` is computed when the file is
   * WRITTEN, so it never grows. `status.json` reported "0 seconds old,
   * confidence high" on a file that had been sitting on the domain for
   * nineteen hours, and the first version of this tool passed 15/15 on it
   * because it never compared `generated` with a clock. A timestamp that
   * cannot age is a timestamp that cannot warn. */
  const t = Date.parse(b?.generated ?? "");
  if (!Number.isFinite(t)) return boh(`${nome}: generation timestamp unreadable, cannot age it`);
  const ore = (ora - t) / 3_600_000;
  if (ore < 0) return no(`${nome}: generated ${(-ore).toFixed(1)}h in the future`);
  if (ore > oreMassime)
    return vecchio(`${nome}: generated ${ore.toFixed(1)}h ago, over the ${oreMassime}h limit` +
      (typeof b.dataAgeSec === "number" ? ` — and it still reports age ${b.dataAgeSec}s, confidence ${b.confidence}` : ""));
  return ok(`${nome}: generated ${ore.toFixed(1)}h ago, within ${oreMassime}h`);
}

/* ── the walk-forward verdict matches the numbers it comes from ──────────── */
export function controllaWalkforward(busta) {
  const w = busta?.data;
  if (!w) return [boh("walk-forward: not published, nothing to re-derive")];
  if (!Array.isArray(w.arms) || w.arms.length === 0) return [boh("walk-forward: no arms published")];
  /* ⚠️ The interval is per ARM, not one per measurement: the first version of
   * this check looked for a single `ic` at the top and reported "nothing to
   * check the verdict against" on a payload that carries one interval per arm.
   * Before believing a verifier's complaint, read what the thing actually said. */
  return w.arms.map((b) => {
    const ic = b.ic95 ?? b.ic;
    const v = String(b.verdict ?? "").toUpperCase();
    if (!Array.isArray(ic) || ic.length !== 2) return boh(`walk-forward ${b.name}: no interval`);
    /* A verdict of HOLDS on an interval that crosses zero is a contradiction:
     * the interval is the thing the verdict is supposed to be about. */
    if (v === "HOLDS" && ic[0] <= 0 && ic[1] >= 0)
      return no(`walk-forward ${b.name}: says it holds, but [${ic[0].toFixed(4)}, ${ic[1].toFixed(4)}] crosses zero`);
    /* And the mean has to sit inside its own interval. If it does not, the two
     * were computed from different things, and at least one is not a measure. */
    if (typeof b.meanPct === "number" && (b.meanPct < ic[0] || b.meanPct > ic[1]))
      return no(`walk-forward ${b.name}: mean ${b.meanPct.toFixed(4)} sits outside its own interval`);
    return ok(`walk-forward ${b.name}: "${v}" · ${b.trades} ops · ` +
      `mean ${b.meanPct.toFixed(4)}% in [${ic[0].toFixed(4)}, ${ic[1].toFixed(4)}]`);
  });
}

/* ── the circuit never reports more burned than bought ───────────────────── */
export function controllaCircuito(busta) {
  const f = busta?.data;
  if (!f) return [boh("circuit: not published")];
  const esiti = [];
  /* ⚠️ `?? "0"` would turn an ABSENT field into a passing check: zero burned of
   * zero bought is exactly what a healthy circuit looks like today, so a
   * renamed or dropped field would read as good news forever. Absent is "could
   * not look", and it is a different sentence. */
  if (f.tokensBought === undefined || f.tokensBurned === undefined)
    return [boh("circuit: the API carries no bought/burned counters to compare")];
  const comprati = BigInt(f.tokensBought);
  const bruciati = BigInt(f.tokensBurned);
  esiti.push(bruciati > comprati
    ? no(`circuit: ${bruciati} burned but only ${comprati} bought`)
    : ok(`circuit: ${bruciati} burned of ${comprati} bought`));
  /* Allocated is not spent, and pending is not burned. Adding them would
   * publish a buyback that never happened. */
  if (f.allocatedEth === undefined || f.spentEth === undefined || f.pendingEth === undefined)
    return [...esiti, boh("circuit: the API carries no allocated/spent/pending figures to compare")];
  const alloc = Number(f.allocatedEth), spesi = Number(f.spentEth), sosp = Number(f.pendingEth);
  esiti.push(spesi + sosp > alloc + 1e-12
    ? no(`circuit: spent + pending (${spesi + sosp}) exceeds allocated (${alloc})`)
    : ok(`circuit: spent ${spesi} + pending ${sosp} within allocated ${alloc}`));
  return esiti;
}

/* ── reading the page ────────────────────────────────────────────────────── */

/** Every published figure sits in `<span data-numero="id">value</span>`. */
export function leggiAncore(html) {
  return [...String(html).matchAll(/data-numero="([^"]+)"[^>]*>([^<]*)</g)]
    .map(([, id, testo]) => ({ id, testo: testo.trim() }));
}

/** The page as prose: tags out, entities and whitespace normalised. Comparing
 *  against markup would break on a class name and pass on a missing sentence. */
export function testoPagina(html) {
  return String(html)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;|&ndash;/g, "—").replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** A rendered figure back to a number. `1.87`, `+0.7394%`, `0.017681 ETH`,
 *  `117,657` all mean a number; `—` and `n/a` mean nobody measured one, and
 *  that is NOT zero. */
export function numeroDaTesto(testo) {
  const pulito = String(testo).replace(/[\s,  ]/g, "").replace(/%$/, "").replace(/ETH$/i, "");
  if (!/^[+-]?\d*\.?\d+$/.test(pulito)) return null;
  return Number(pulito);
}

/* ── the anchored figures agree with the endpoint that sources them ──────── */
export function confrontaAncore(ancore, bustaFigure) {
  /* This is the promise the README makes in bold, and until 2026-09-14 the
   * tool COUNTED the anchors instead of comparing them: eight figures found,
   * eight figures unchecked, exit 0. The figures are cohort rates and curve
   * fees, and no endpoint carried them, so from outside the comparison was not
   * merely unwritten — it was impossible.
   *
   * Until `/api/figures.json` is served this reports "could not look" and the
   * tool exits 2. Fail closed on what you cannot read. */
  if (bustaFigure === undefined)
    return [boh("anchored figures: /api/figures.json not served — the numbers on the page have no source to be checked against")];
  const mappa = bustaFigure?.data;
  if (mappa === null) return [boh("anchored figures: /api/figures.json declares it could not measure")];
  if (!mappa || typeof mappa !== "object" || Array.isArray(mappa))
    return [no("anchored figures: /api/figures.json carries no map of figures — see docs/api.md for the contract")];
  if (ancore.length === 0)
    return [no("page: no anchored figures found — the page publishes numbers the tool cannot locate")];

  const esiti = [];
  const visti = new Set();
  for (const a of ancore) {
    visti.add(a.id);
    const atteso = mappa[a.id];
    if (!atteso) { esiti.push(no(`${a.id}: shown on the page as "${a.testo}", absent from /api/figures.json — a figure with no source`)); continue; }
    const unita = atteso.unit ?? "";
    const v = numeroDaTesto(a.testo);
    if (v === null) { esiti.push(boh(`${a.id}: the page shows "${a.testo}", which is not a number`)); continue; }
    if (typeof atteso.value !== "number" || !Number.isFinite(atteso.value)) {
      esiti.push(boh(`${a.id}: /api/figures.json carries no value to compare against`)); continue;
    }
    const tolleranza = Number(atteso.tolerance ?? 0);
    const scarto = Math.abs(v - atteso.value);
    esiti.push(scarto <= tolleranza
      ? ok(`${a.id}: page ${v}${unita} · source ${atteso.value}${unita} · off by ${scarto.toPrecision(2)}, within ${tolleranza}`)
      : no(`${a.id}: page says ${v}${unita}, source says ${atteso.value}${unita} — off by ${scarto.toPrecision(3)}, tolerance ${tolleranza}`));
  }
  /* The other direction, and it catches the build that succeeded while
   * silently dropping the block it was supposed to render. */
  for (const id of Object.keys(mappa))
    if (!visti.has(id)) esiti.push(no(`${id}: carried by /api/figures.json and anchored nowhere on the page`));
  return esiti;
}

/* ── the page prints the verdict the API reached ─────────────────────────── */
export function confrontaVerdetto(testo, bustaWalkforward) {
  const arms = bustaWalkforward?.data?.arms;
  if (!Array.isArray(arms) || arms.length === 0) return boh("page verdict: the API publishes no verdict to compare against");
  const attesi = [...new Set(arms.map((b) => String(b.verdict ?? "").toUpperCase()).filter((v) => PAROLE_VERDETTO.includes(v)))];
  if (attesi.length === 0) return boh(`page verdict: the API reports "${arms[0].verdict}", which is not one of the three verdict words`);
  const trovati = [...testo.matchAll(new RegExp(`\\bverdict\\b[^A-Za-z]{0,4}(${PAROLE_VERDETTO.join("|")})`, "gi"))]
    .map((m) => m[1].toUpperCase());
  /* A page that shows the number and drops the verdict is worse than a page
   * that shows neither: the figure is read as a result. */
  if (trovati.length === 0) return no(`page verdict: the API says "${attesi.join(" / ")}" and the page states no verdict at all`);
  const sbagliati = trovati.filter((t) => !attesi.includes(t));
  if (sbagliati.length > 0) return no(`page verdict: page says "${sbagliati[0]}", API says "${attesi.join(" / ")}"`);
  return ok(`page verdict: "${trovati[0]}", and the API agrees`);
}

/* ── the page's mode label matches the mode the agent is in ──────────────── */
export function confrontaModo(testo, bustaStatus) {
  const modo = bustaStatus?.data?.mode;
  if (typeof modo !== "string") return boh("page mode: the API publishes no mode to compare against");
  const dicePaper = /paper mode|no real funds|paper/i.test(testo);
  if (modo.toUpperCase() === "PAPER")
    /* If that label ever goes missing, every number above it reads as real money. */
    return dicePaper ? ok("page mode: PAPER, and the page says so") : no("page mode: the API says PAPER and the page carries no such label — a simulated result presented as real");
  if (dicePaper) return no(`page mode: the API says ${modo} and the page still says paper — a real position presented as a simulation`);
  return ok(`page mode: ${modo}, and the page does not contradict it`);
}

/* ── the page's declared buyback share matches the policy ────────────────── */
export function confrontaQuota(testo, bustaFlywheel) {
  const p = bustaFlywheel?.data?.policy;
  if (!p || typeof p.buybackBps !== "number") return boh("buyback share: the API publishes no policy to compare against");
  const atteso = p.buybackBps / 100;
  /* Basis points are the policy; the page prints a percentage. The two have
   * disagreed in writing before — a README said "half of the remainder" for a
   * policy that is half of the TOTAL, which is a different and smaller number.
   *
   * 🔴 The first version of this check read only the FIRST sentence mentioning
   * a buyback, and the live page mentions it three times: once without the
   * share, once with it, and once as "the split is not 100% buyback". It
   * reported a disagreement that did not exist, and a checker that cries wolf
   * gets switched off. So: every statement of the DECLARED form is read, and
   * only the declared form counts — a percentage attached to the claim, not
   * any percentage standing near the word.
   *
   * ⚠️ This is the one check tied to the page's wording rather than to an
   * anchor, which makes an innocent rewrite look like a defect. The fix
   * belongs on the other side: anchor the share as a `data-numero` and it
   * falls under the ordinary figure comparison. See docs/api.md. */
  const FORMA = /(\d{1,3}(?:\.\d+)?)\s*%\s*of\s+(?:it|that|this|every|each|the)\b[^.]{0,80}?\bbuys?\b[^.]{0,40}?\bback\b/gi;
  const dichiarate = [...new Set([...testo.matchAll(FORMA)].map((m) => Number(m[1])))];
  if (dichiarate.length === 0) {
    const parla = /buys? (?:it|the token) back|\bbuyback\b/i.test(testo);
    return no(`buyback share: the API declares ${atteso}% and the page ` +
      (parla ? "claims a buyback without stating the share as a number attached to the claim" : "says nothing about a buyback"));
  }
  const sbagliate = dichiarate.filter((d) => Math.abs(d - atteso) >= 1e-9);
  if (sbagliate.length > 0) return no(`buyback share: page says ${sbagliate[0]}%, policy says ${p.buybackBps} bps (${atteso}%)`);
  return ok(`buyback share: ${dichiarate[0]}%, and the policy says ${p.buybackBps} bps`);
}


/** Everything above, over one reading of the site. `buste` maps endpoint name
 *  to parsed envelope; a name absent from it was not served. */
export function controllaTutto({ buste, html, ora, oreMassime = ETA_MASSIMA_ORE }) {
  const esiti = [];
  for (const [nome, b] of Object.entries(buste)) {
    if (nome === "figures") continue;
    esiti.push(controllaBusta(nome, b));
    esiti.push(controllaEta(nome, b, ora, oreMassime));
  }
  esiti.push(...controllaWalkforward(buste.walkforward));
  esiti.push(...controllaCircuito(buste.flywheel));
  if (html === null || html === undefined) {
    esiti.push(boh("page: not served, nothing to compare the API against"));
    return esiti;
  }
  const testo = testoPagina(html);
  esiti.push(...confrontaAncore(leggiAncore(html), "figures" in buste ? buste.figures : undefined));
  esiti.push(confrontaVerdetto(testo, buste.walkforward));
  esiti.push(confrontaModo(testo, buste.status));
  esiti.push(confrontaQuota(testo, buste.flywheel));
  return esiti;
}
