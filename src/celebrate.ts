import { isLoggedIn } from "./auth";
import { playFanfare } from "./audio";
import { cloudLoad, cloudSave } from "./cloud";
import { loadPending, loadTrophies, savePending, saveTrophies } from "./storage";
import { addOnAir, better, finishShow, MEDAL_NAME, RECORDS, type Celebration, type Medal, type Trophies } from "./trophies";

// Records for time on air (see trophies.ts for the rule), kept in his Spotify
// account (cloud.ts) so every phone adds to the same total, and the fun bit
// when a show finishes: a dance party, or the record he won during the show.
// 40 seconds (the parent's choice), and the ✕ ends it straight away.

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const root = $("celebrate");
const SHOW_MS = { party: 40000, bronze: 40000, silver: 40000, gold: 40000 };
let timer: number | null = null;

export const MEDAL_COLOR: Record<Medal, string> = { bronze: "#9C5A2A", silver: "#C9CED6", gold: "#E8B62C" };
const RIBBON: Record<Medal, string> = { bronze: "Nice one, DJ!", silver: "Super DJ!", gold: "Best DJ ever!" };

let base: Trophies = loadTrophies(); // the totals as last agreed with his Spotify account
let pending = loadPending(); // seconds on air this phone hasn't added to those yet
let trophies: Trophies = addOnAir(base, pending).trophies; // what this phone shows: base + pending
let bestThisShow: Medal | null = null; // the record to celebrate when this show finishes
let syncing: Promise<Medal[]> | null = null;

export function showStarted(): void {
  bestThisShow = null;
}

function saveLocal() {
  saveTrophies(base);
  savePending(pending);
}
export const saveNow = saveLocal;

// Called once a second while the show is playing (not paused). Returns the
// record won at that moment, if any.
export function onAirSecond(): Medal | null {
  const r = addOnAir(trophies, 1);
  trophies = r.trophies;
  pending++;
  if (r.earned) bestThisShow = better(bestThisShow, r.earned);
  if (pending % 10 === 0 || r.earned) saveLocal();
  return r.earned;
}

// Add this phone's time to the totals in his Spotify account and take the
// totals back. Returns any records that time from his other phones pushed him
// past, so they can pop up here too. Best effort: offline, nothing changes and
// the seconds stay pending for next time.
export function sync(): Promise<Medal[]> {
  if (!isLoggedIn()) return Promise.resolve([]);
  if (syncing) return syncing;
  syncing = (async () => {
    const mine = pending;
    const before = trophies;
    const cloud = await cloudLoad(base); // a brand-new playlist starts from this phone's agreed totals
    if (!cloud) return [];
    base = addOnAir(cloud, mine).trophies;
    pending -= mine; // seconds that arrived while we waited stay pending
    trophies = addOnAir(base, pending).trophies;
    const extras = RECORDS.filter(m => trophies[m] > before[m]);
    for (const m of extras) bestThisShow = better(bestThisShow, m);
    await cloudSave(base);
    saveLocal();
    return extras;
  })().finally(() => { syncing = null; });
  return syncing;
}

export async function celebrateShowEnd(): Promise<void> {
  await sync().catch(() => []); // so the right record is celebrated
  const c = finishShow(trophies, bestThisShow);
  bestThisShow = null;
  saveLocal();
  showCelebration(c, true);
}

// Add ?demo=party, ?demo=bronze, ?demo=silver or ?demo=gold to the address to
// watch one without playing a show. Nothing is counted; it plays until the ✕.
export function previewCelebration(kind: "party" | Medal): void {
  const c: Celebration = kind === "party" ? { kind, trophies } : { kind, trophies: { ...trophies, [kind]: trophies[kind] + 1 } };
  showCelebration(c, false);
}

function showCelebration(c: Celebration, autoClose: boolean): void {
  $("scene-party").classList.toggle("hidden", c.kind !== "party");
  const rec = $("scene-record");
  rec.classList.toggle("hidden", c.kind === "party");
  if (c.kind !== "party") {
    const m = c.kind;
    rec.className = `cele-scene medal-${m}`;
    $("record-title").textContent = `${MEDAL_NAME[m]} record!`;
    $("record-ribbon").textContent = RIBBON[m];
  }
  // Showing it again restarts all the animations from the beginning.
  root.classList.remove("closing");
  root.classList.remove("hidden");
  void playFanfare(c.kind).catch(() => {});
  if (timer !== null) clearTimeout(timer);
  timer = autoClose ? window.setTimeout(() => closeCelebration(), SHOW_MS[c.kind]) : null;
}

export function closeCelebration(immediately = false): void {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  if (root.classList.contains("hidden")) return;
  if (immediately) { root.classList.add("hidden"); return; }
  root.classList.add("closing");
  window.setTimeout(() => { if (root.classList.contains("closing")) root.classList.add("hidden"); }, 400);
}

$("celebrate-close").addEventListener("click", () => closeCelebration());
