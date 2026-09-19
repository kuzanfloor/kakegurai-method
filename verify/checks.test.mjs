/* Proves every comparison can REJECT something.
 *
 *   node --test verify/
 *
 * Node's own test runner, no dependencies, no config. The page below is a
 * forgery: each test breaks exactly one thing in it and asserts the tool
 * notices. The reason the tests are written this way is the defect that
 * produced them — the previous verifier passed 15/15 on a stale page with
 * eight unchecked figures, and nothing in the suite could have caught that,
 * because the tool was only ever run against a site that agreed with itself.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  controllaBusta, controllaEta, controllaWalkforward, controllaCircuito,
  confrontaAncore, confrontaVerdetto, confrontaModo, confrontaQuota,
  leggiAncore, numeroDaTesto, testoPagina, controllaTutto, codiceUscita,
  ETA_MASSIMA_ORE, PAROLE_VERDETTO,
} from "./checks.mjs";

const ORA = Date.parse("2026-09-14T12:00:00.000Z");
const RECENTE = "2026-09-14T06:00:00.000Z";   // 6 h old
const VECCHIO = "2026-09-11T21:35:00.000Z";   // ~62 h old, a Friday close read on Monday

const busta = (extra = {}) => ({ generated: RECENTE, version: "1", source: "test",
  confidence: "high", dataAgeSec: 12, data: {}, ...extra });

/* ⚠️ La busta porta ANCHE `deployedRule`, e non e' arredamento del fixture:
 * dal 19/09 l'API lo pubblica e i documenti lo affermano, quindi una busta che
 * lo omette e' una busta vecchia — e `controllaRegolaDistribuita` la boccia di
 * proposito. Aggiungerlo qui e' stato il modo in cui ho scoperto che i tre test
 * di `controllaTutto` misuravano un payload che non esiste piu'. */
const walkforward = (verdict = "NOT YET PROVEN") => busta({ data: {
  arms: [{ name: "B — all 37", trades: 266, meanPct: 0.7394, ic95: [0.5985, 0.8355], verdict }],
  deployedRule: { arms: [
    { name: "B — all 37", trades: 1839, meanPct: 0.3485, ci95: [0.3123, 0.3773], verdict: "SUPPORTED" },
  ] },
} });

const flywheel = (policy = { buybackBps: 3000, bankrollBps: 5000, operatingBps: 2000 }) => busta({ data: {
  mode: "PAPER", tokensBought: "0", tokensBurned: "0",
  allocatedEth: 0, spentEth: 0, pendingEth: 0, policy } });

const numeri = (mappa) => busta({ data: mappa ?? {
  "graduation-rate-1-launch": { value: 1.87, unit: "%", tolerance: 0.3 },
  "curve-tax-1-launch": { value: 0.017681, unit: " ETH", tolerance: 0.002 },
} });

const status = (mode = "PAPER") => busta({ data: { mode, totalStrategies: 8 } });

function pagina({ ancore = { "graduation-rate-1-launch": "1.87", "curve-tax-1-launch": "0.017681" },
                  verdetto = "NOT YET PROVEN", modo = "It runs in paper mode with no real funds at risk.",
                  quota = "A declared share — 30% of it buys the token back." } = {}) {
  const righe = Object.entries(ancore).map(([id, v]) => `<span data-numero="${id}">${v}</span>`).join("\n");
  return `<html><body><h1>KAKEGURAI</h1>
    ${righe}
    <p>Tonight the fixed-threshold test says <b>HOLDS</b>, which is not the test that decides.</p>
    ${verdetto ? `<p>Verdict <strong>${verdetto}</strong>: the criterion was written before the run.</p>` : ""}
    <p>${modo}</p>
    <p>${quota}</p>
  </body></html>`;
}

const stati = (esiti) => esiti.map((e) => e.stato);
const uno = (e) => e.stato;

/* ── the reading helpers ─────────────────────────────────────────────────── */

test("anchors are read with their id and rendered text", () => {
  const a = leggiAncore('<span class="x" data-numero="corpus-maturi">117657</span>');
  assert.deepEqual(a, [{ id: "corpus-maturi", testo: "117657" }]);
});

test("a rendered figure becomes a number, and a dash does not become zero", () => {
  assert.equal(numeroDaTesto("+0.7394%"), 0.7394);
  assert.equal(numeroDaTesto("0.017681 ETH"), 0.017681);
  assert.equal(numeroDaTesto("117,657"), 117657);
  assert.equal(numeroDaTesto("—"), null);
  assert.equal(numeroDaTesto("n/a"), null);
});

test("markup does not leak into the prose the tool reads", () => {
  assert.equal(testoPagina('<p class="a">one</p><script>var x="two"</script><p>three</p>'), "one three");
});

/* ── envelopes ───────────────────────────────────────────────────────────── */

test("an envelope with no generation timestamp is a disagreement", () => {
  assert.equal(uno(controllaBusta("status", { data: {}, confidence: "high" })), "disagrees");
});

test("data present, no age, and confidence anyway — MUST FAIL", () => {
  assert.equal(uno(controllaBusta("pons", busta({ dataAgeSec: null, confidence: "high" }))), "disagrees");
});

test("data present, no age, confidence unknown — is the honest state", () => {
  assert.equal(uno(controllaBusta("pons", busta({ dataAgeSec: null, confidence: "unknown" }))), "ok");
});

test("no data but confidence anyway — MUST FAIL", () => {
  assert.equal(uno(controllaBusta("rwa", busta({ data: null, confidence: "medium" }))), "disagrees");
});

/* ── age, which is the check that was missing ────────────────────────────── */

test("a fresh envelope is not stale", () => {
  assert.equal(uno(controllaEta("status", busta(), ORA)), "ok");
});

test("an envelope older than the limit is stale — MUST FAIL", () => {
  const e = controllaEta("status", busta({ generated: VECCHIO }), ORA);
  assert.equal(e.stato, "stale");
  assert.match(e.testo, /62\.\dh ago/);
});

test("stale is reported even when the envelope insists it is seconds old", () => {
  /* The exact shape of the nineteen-hour failure: dataAgeSec is frozen at
   * generation, so the file says "0s, high" forever. */
  const e = controllaEta("status", busta({ generated: VECCHIO, dataAgeSec: 0, confidence: "high" }), ORA);
  assert.equal(e.stato, "stale");
  assert.match(e.testo, /still reports age 0s/);
});

test("a timestamp in the future is a disagreement, not staleness", () => {
  assert.equal(uno(controllaEta("status", busta({ generated: "2026-09-20T00:00:00Z" }), ORA)), "disagrees");
});

test("an unreadable timestamp is could-not-look, never ok", () => {
  assert.equal(uno(controllaEta("status", busta({ generated: "yesterday" }), ORA)), "unknown");
});

test("the limit is 26 hours, and a weekend reading exceeds it on purpose", () => {
  assert.equal(ETA_MASSIMA_ORE, 26);
  assert.equal(uno(controllaEta("status", busta({ generated: VECCHIO }), ORA, ETA_MASSIMA_ORE)), "stale");
});

/* ── walk-forward ────────────────────────────────────────────────────────── */

test("HOLDS on an interval that crosses zero — MUST FAIL", () => {
  const b = busta({ data: { arms: [{ name: "A", trades: 50, meanPct: 0.2, ic95: [-0.1, 0.5], verdict: "HOLDS" }] } });
  assert.equal(uno(controllaWalkforward(b)[0]), "disagrees");
});

test("a mean outside its own interval — MUST FAIL", () => {
  const b = busta({ data: { arms: [{ name: "A", trades: 50, meanPct: 9, ic95: [0.1, 0.5], verdict: "NOT YET PROVEN" }] } });
  assert.equal(uno(controllaWalkforward(b)[0]), "disagrees");
});

test("an arm with no interval is could-not-look", () => {
  const b = busta({ data: { arms: [{ name: "A", trades: 50, meanPct: 0.2, verdict: "NOT YET PROVEN" }] } });
  assert.equal(uno(controllaWalkforward(b)[0]), "unknown");
});

/* ── the circuit ─────────────────────────────────────────────────────────── */

test("more burned than bought — MUST FAIL", () => {
  const b = flywheel(); b.data.tokensBurned = "0"; b.data.tokensBought = "0";
  assert.equal(uno(controllaCircuito(b)[0]), "ok");
  const c = flywheel(); c.data.tokensBurned = "10"; c.data.tokensBought = "3";
  assert.equal(uno(controllaCircuito(c)[0]), "disagrees");
});

test("spent plus pending over allocated — MUST FAIL", () => {
  const c = flywheel(); c.data.allocatedEth = 1; c.data.spentEth = 0.8; c.data.pendingEth = 0.5;
  assert.equal(uno(controllaCircuito(c)[1]), "disagrees");
});

/* ── the anchored figures, which is the promise that was not being kept ──── */

test("no /api/figures.json served: could not look, and NEVER ok", () => {
  const e = confrontaAncore(leggiAncore(pagina()), undefined);
  assert.equal(uno(e[0]), "unknown");
  assert.match(e[0].testo, /not served/);
  assert.equal(codiceUscita(e), 2);
});

test("page figure outside the tolerance of its source — MUST FAIL", () => {
  const html = pagina({ ancore: { "graduation-rate-1-launch": "4.10", "curve-tax-1-launch": "0.017681" } });
  const e = confrontaAncore(leggiAncore(html), numeri());
  assert.equal(codiceUscita(e), 1);
  assert.match(e.find((x) => x.stato === "disagrees").testo, /page says 4\.1%, source says 1\.87%/);
});

test("page figure inside the tolerance agrees", () => {
  const html = pagina({ ancore: { "graduation-rate-1-launch": "1.95", "curve-tax-1-launch": "0.017681" } });
  assert.deepEqual(stati(confrontaAncore(leggiAncore(html), numeri())), ["ok", "ok"]);
});

test("a figure on the page with no entry in the endpoint — MUST FAIL", () => {
  const html = pagina({ ancore: { "graduation-rate-1-launch": "1.87", "curve-tax-1-launch": "0.017681", "inventato": "99" } });
  const e = confrontaAncore(leggiAncore(html), numeri());
  assert.equal(codiceUscita(e), 1);
  assert.match(e.find((x) => x.stato === "disagrees").testo, /absent from \/api\/figures\.json/);
});

test("a figure in the endpoint anchored nowhere on the page — MUST FAIL", () => {
  /* The build that succeeded while silently dropping the block it should have
   * rendered. Counting anchors could never see this. */
  const html = pagina({ ancore: { "graduation-rate-1-launch": "1.87" } });
  const e = confrontaAncore(leggiAncore(html), numeri());
  assert.equal(codiceUscita(e), 1);
  assert.match(e.find((x) => x.stato === "disagrees").testo, /anchored nowhere on the page/);
});

test("a page with no anchors at all — MUST FAIL", () => {
  assert.equal(uno(confrontaAncore([], numeri())[0]), "disagrees");
});

test("an anchor rendering a dash is could-not-look, not zero", () => {
  const html = pagina({ ancore: { "graduation-rate-1-launch": "—", "curve-tax-1-launch": "0.017681" } });
  const e = confrontaAncore(leggiAncore(html), numeri());
  assert.ok(e.some((x) => x.stato === "unknown"));
  assert.ok(!e.some((x) => x.stato === "disagrees"));
});

/* ── the verdict, the mode label, the declared share ─────────────────────── */

test("the page's verdict contradicts the API's — MUST FAIL", () => {
  const e = confrontaVerdetto(testoPagina(pagina({ verdetto: "HOLDS" })), walkforward("NOT YET PROVEN"));
  assert.equal(e.stato, "disagrees");
  assert.match(e.testo, /page says "HOLDS", API says "NOT YET PROVEN"/);
});

test("the page states no verdict at all — MUST FAIL", () => {
  assert.equal(uno(confrontaVerdetto(testoPagina(pagina({ verdetto: "" })), walkforward())), "disagrees");
});

test("a HOLDS elsewhere on the page is not mistaken for the verdict", () => {
  /* The live page really does print HOLDS for the fixed-threshold test, which
   * is not the test that decides. Only the word after "Verdict" is the claim. */
  assert.equal(uno(confrontaVerdetto(testoPagina(pagina()), walkforward("NOT YET PROVEN"))), "ok");
  assert.ok(PAROLE_VERDETTO.includes("NOT YET PROVEN"));
});

test("PAPER in the API, no paper label on the page — MUST FAIL", () => {
  const e = confrontaModo(testoPagina(pagina({ modo: "It trades the book every day." })), status("PAPER"));
  assert.equal(e.stato, "disagrees");
  assert.match(e.testo, /presented as real/);
});

test("LIVE in the API, paper label still on the page — MUST FAIL", () => {
  assert.equal(uno(confrontaModo(testoPagina(pagina()), status("LIVE"))), "disagrees");
});

test("the declared share on the page contradicts the policy — MUST FAIL", () => {
  const e = confrontaQuota(testoPagina(pagina({ quota: "A declared share — 50% of it buys the token back." })), flywheel());
  assert.equal(e.stato, "disagrees");
  assert.match(e.testo, /page says 50%, policy says 3000 bps/);
});

test("the page states the buyback without a share — MUST FAIL", () => {
  const e = confrontaQuota(testoPagina(pagina({ quota: "Some of it buys the token back." })), flywheel());
  assert.equal(e.stato, "disagrees");
  assert.match(e.testo, /without stating the share/);
});

test("the page says nothing about a buyback at all — MUST FAIL", () => {
  assert.equal(uno(confrontaQuota(testoPagina(pagina({ quota: "" })), flywheel())), "disagrees");
});

test("30 percent against 3000 bps agrees", () => {
  assert.equal(uno(confrontaQuota(testoPagina(pagina()), flywheel())), "ok");
});

test("a percentage standing near the word is not the declared share", () => {
  /* The live page says it three times: once without the share, once with it,
   * and once as "the split is not 100% buyback". The first version of this
   * check read only the first sentence and cried wolf. */
  const t = testoPagina(`<p>A declared share of it buys the token back and burns it.</p>
    <p>A declared share &mdash; 30% of it buys the token back.</p>
    <p>That is the whole reason the split is not 100% buyback.</p>`);
  assert.equal(uno(confrontaQuota(t, flywheel())), "ok");
});

test("two different shares declared on one page — MUST FAIL", () => {
  const t = testoPagina("<p>30% of it buys the token back.</p><p>Elsewhere: 45% of it buys the token back.</p>");
  assert.equal(uno(confrontaQuota(t, flywheel())), "disagrees");
});

/* ── the whole run, and the ranking of its exit codes ────────────────────── */

const sito = (extra = {}) => ({
  buste: { status: status(), walkforward: walkforward(), flywheel: flywheel(), figures: numeri(), ...extra },
  html: pagina(), ora: ORA,
});

test("a site that agrees with itself exits 0", () => {
  const e = controllaTutto(sito());
  assert.deepEqual(e.filter((x) => x.stato !== "ok"), []);
  assert.equal(codiceUscita(e), 0);
});

test("a site that is merely old exits 3, not 0", () => {
  const e = controllaTutto({ ...sito(), ora: Date.parse("2026-09-17T12:00:00Z") });
  assert.equal(codiceUscita(e), 3);
});

test("a missing page is could-not-look, not a pass", () => {
  const e = controllaTutto({ ...sito(), html: null });
  assert.equal(codiceUscita(e), 2);
});

test("a disagreement outranks both staleness and silence", () => {
  const e = controllaTutto({ buste: { status: status(), walkforward: walkforward("HOLDS"), flywheel: flywheel(), figures: numeri() },
    html: pagina({ ancore: { "graduation-rate-1-launch": "9.99", "curve-tax-1-launch": "0.017681" } }),
    ora: Date.parse("2026-09-17T12:00:00Z") });
  assert.equal(codiceUscita(e), 1);
});

test("the whole tool, sabotaged three ways at once, rejects", () => {
  /* Mode label removed, verdict flipped, share rewritten. Three out of three. */
  const e = controllaTutto({ ...sito(),
    html: pagina({ verdetto: "HOLDS", modo: "It trades every day.", quota: "A declared share — 70% of it buys the token back." }) });
  const rotti = e.filter((x) => x.stato === "disagrees");
  assert.equal(rotti.length, 3);
  assert.equal(codiceUscita(e), 1);
});

/* ── the deployed rule ───────────────────────────────────────────────────── */
{
  const { controllaRegolaDistribuita } = await import("./checks.mjs");
  const sel = { name: "B — all 37", trades: 558, meanPct: 0.7464, ic95: [0.6538, 0.8317], verdict: "HOLDS" };
  const busta = (dep) => ({ data: { arms: [sel], ...(dep ? { deployedRule: { arms: [dep] } } : {}) } });
  const esiti = (b) => controllaRegolaDistribuita(b).map((e) => e.stato ?? e.esito ?? e.kind ?? JSON.stringify(e));

  // il caso vero: fisso a circa metà del selezionato
  const buono = { name: "B — all 37", trades: 1839, meanPct: 0.3485, ci95: [0.3123, 0.3773], verdict: "SUPPORTED" };
  assert.ok(JSON.stringify(controllaRegolaDistribuita(busta(buono))).includes("1839"),
    "il controllo deve nominare le operazioni della regola distribuita");

  // ⛔ il claim c'è nei docs e l'API non lo pubblica: deve BOCCIARE
  assert.ok(JSON.stringify(controllaRegolaDistribuita(busta(null))).toLowerCase().includes("does not publish"),
    "senza deployedRule il verificatore deve bocciare, non passare");

  // ⛔ il fisso non può superare il selezionato
  const troppo = { ...buono, meanPct: 0.9 , ci95: [0.8, 1.0] };
  assert.ok(JSON.stringify(controllaRegolaDistribuita(busta(troppo))).includes("cannot out-pay"),
    "un fisso maggiore del selezionato deve essere bocciato");

  // ⛔ media fuori dal proprio intervallo
  const incoerente = { ...buono, meanPct: 0.9 };
  assert.ok(JSON.stringify(controllaRegolaDistribuita(busta(incoerente))).includes("outside its own interval"),
    "una media fuori dal suo intervallo deve essere bocciata");

  console.log("  ok  deployed rule: 4 casi");
}
