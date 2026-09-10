import "./style.css";
import packBrandMark from "./assets/pack-logo.svg?raw";
import packBrandURL from "./assets/pack-logo.svg?url";
import openaiBrandMark from "./assets/booster-pack-logo.svg?raw";
import xBrandMark from "./assets/x-builders-logo.svg?raw";
import xBrandURL from "./assets/x-builders-logo.svg?url";
import openaiBrandURL from "./assets/booster-pack-logo.svg?url";
import {
  createIcons,
  ArrowUpRight,
  ArrowRight,
  Volume2,
  VolumeX,
  X,
  Layers,
  Rotate3d,
  ChevronLeft,
  Sparkles,
  Check,
  MoveHorizontal,
  MousePointer2,
  Maximize,
  RotateCw,
} from "lucide";
import { Textures } from "./textures";
import { PORTRAIT_SHEETS } from "./artwork";
import { PackScene } from "./scene";
import { Sound } from "./audio";
import {
  BUILDERS,
  PACKS,
  getPack,
  packForPerson,
  cardNumber,
  SERIES,
  FINISHES,
  FINAL_CARD_GOLD_PERCENT,
  COLLECTION_SIZE,
  cardKey,
  cleanSave,
} from "./data";
import {
  BONUS_PACKS,
  CREATOR_X_URL,
  packsRemaining,
  bonusSecondsRemaining,
} from "./pack-access";
import { initializePlayer, request, requestPack, serverNow } from "./api.js";

const icons = {
  ArrowUpRight,
  ArrowRight,
  Volume2,
  VolumeX,
  X,
  Layers,
  Rotate3d,
  ChevronLeft,
  Sparkles,
  Check,
  MoveHorizontal,
  MousePointer2,
  Maximize,
  RotateCw,
};
const $ = (s) => document.querySelector(s);
const sound = new Sound();
let edition = getPack(new URLSearchParams(location.search).get("pack")) || getPack();
let brandMark = packBrandMark;
const editionTitle = "Builders Booster Packs";
document.title = `${editionTitle} Collector Simulator`;
document.body.dataset.pack = edition.id;
function updateFavicon(id) {
  document.querySelector('link[rel="icon"]').href = packBrandURL;
}
updateFavicon(edition.id);
function packWordmark(pack, uppercase = false) {
  return pack.id === 'x-builders'
    ? `<span class="x-wordmark"><span class="sr-only">X </span>${xBrandMark.replace('<svg ', '<svg aria-hidden="true" ')}<span>${uppercase ? 'BUILDERS' : 'Builders'}</span></span>`
    : (uppercase ? pack.label : pack.name);
}
let save = cleanSave(null);
let openingRequest = null;
let packReady = false;
let openingRequestId = null;
let textureSets, rosterEdition = edition;
let collectionEdition = edition;
let builderPreviewObserver, builderPreviewFrame = 0;
let scene,
  textures,
  pack = [],
  phase = "loading",
  index = 0,
  collectionFilter = "all",
  collectionReturn = false,
  inspecting = false,
  lastFocus;
// The app has one page; normalize old preview links back to the root.
if (location.pathname !== "/") {
  history.replaceState(null, "", `/${location.search}${location.hash}`);
}
$("#app").innerHTML = `
  <header class="header">
    <a class="brand" href="/" aria-label="${editionTitle} Collector Simulator home">${brandMark}<span class="brand-lockup"><span class="brand-name">${editionTitle}</span><span class="brand-subtitle">Collector Simulator</span></span></a>
    <nav aria-label="Main navigation"><button class="nav-link active" id="room-nav">Pack room<span class="nav-dot"></span></button><button class="nav-link" id="collection-nav">Collection <span class="count-badge" id="nav-count">0</span></button></nav>
    <div class="header-tools"><button id="sound" class="sound-button" aria-label="Sound on" aria-pressed="true"><i data-lucide="volume-2"></i><span>Sound on</span></button></div>
  </header>
  <main>
    <section class="room" aria-label="Pack opening room">
      <div id="pack-options" class="pack-options" hidden>${PACKS.map(p => `<div class="pack-option" data-pack-option="${p.id}"><button type="button" class="pack-option-select" data-pack-select="${p.id}" aria-pressed="${p.id === edition.id}"><span class="pack-option-name">${packWordmark(p)}</span><span class="pack-option-meta">${p.count} cards · Series ${p.series}</span></button><button type="button" class="pack-option-roster" data-pack-roster="${p.id}" aria-label="View ${p.name} cards">View cards ↗</button></div>`).join("")}</div>
      <div id="three-stage" class="three-stage"><div class="loading" id="loading"><span class="loading-star">${brandMark}</span><span>Sealing something special…</span></div><div id="seal-hint" class="seal-hint" hidden><span class="hint-grip">⠿</span><span>DRAG NEAR THE TOP TO RIP</span><i data-lucide="arrow-right"></i><span class="hint-line"></span></div></div>
      <aside class="pack-info rarity-info" id="pack-info" aria-label="Rarity odds">
        <h2>Rarity odds</h2>
        <div class="rarity-odds-groups">
          <section class="rarity-odds-group"><h3>Cards 1–4 <span>per card</span></h3><dl>${[[0, 64], [1, 25], [2, 10], [3, 1]].map(([finish, chance]) => `<div class="rarity-odds-row"><dt><span class="rarity-symbol" style="color:${FINISHES[finish].color}" aria-hidden="true">${FINISHES[finish].symbol}</span>${FINISHES[finish].name}</dt><dd>${chance}%</dd></div>`).join("")}</dl></section>
          <section class="rarity-odds-group"><h3>Card 5 <span>guaranteed holo</span></h3><dl>${[[2, 100 - FINAL_CARD_GOLD_PERCENT], [3, FINAL_CARD_GOLD_PERCENT]].map(([finish, chance]) => `<div class="rarity-odds-row"><dt><span class="rarity-symbol" style="color:${FINISHES[finish].color}" aria-hidden="true">${FINISHES[finish].symbol}</span>${FINISHES[finish].name}</dt><dd>${chance}%</dd></div>`).join("")}</dl></section>
        </div>
      </aside>
      <aside class="card-info" id="card-info" hidden></aside>
      <div class="stage-bottom" id="stage-bottom" hidden><div class="tear-meter" id="tear-meter" hidden><span></span></div><div class="card-progress" id="card-progress" hidden></div></div>
      <div class="summary" id="summary" hidden></div>
    </section>
    <footer class="footer"><div class="collection-stats"><span class="mini-stack"><i data-lucide="layers"></i></span><div><b id="footer-count">0 <span>/ ${COLLECTION_SIZE}</span></b><span class="stats-label">unique cards collected</span></div><div class="footer-divider"></div><div><b id="packs-count">0</b><span class="stats-label">packs opened</span></div></div><div class="pack-balance" role="status"><b id="packs-remaining">3</b><span id="packs-left-label">packs left</span></div></footer>
  </main>
  <dialog id="collection-dialog" class="collection-dialog"><div class="dialog-head"><div><div class="eyebrow">YOUR BUILDERS COLLECTION</div><h2>The collection<span>.</span></h2></div><button class="icon-button close-dialog" aria-label="Close collection"><i data-lucide="x"></i></button></div><div class="filter-tabs collection-pack-tabs" aria-label="Choose collection pack">${PACKS.map(p => `<button class="filter" data-collection-pack="${p.id}" aria-pressed="false">${packWordmark(p)}</button>`).join("")}</div><div class="collection-toolbar"><p id="collection-description"></p><div class="filter-tabs" aria-label="Filter by finish">${["All cards", ...FINISHES.map((f) => f.name)].map((f, i) => `<button data-filter="${i === 0 ? "all" : i - 1}" class="filter ${i === 0 ? "active" : ""}" aria-pressed="${i === 0}">${f}</button>`).join("")}</div></div><div class="collection-grid" id="collection-grid"></div></dialog>
  <dialog id="help-dialog" class="help-dialog"><div class="dialog-head"><div><div class="eyebrow">THE JOY IS IN THE OPENING</div><h2>A small ritual<span>.</span></h2></div><button class="icon-button close-dialog" aria-label="Close guide"><i data-lucide="x"></i></button></div><div class="guide-steps"><div><span>01</span><div><h3>Grab near the top.</h3><p>Grab anywhere near the top of the pack and pull left or right. Feel it crinkle, watch it curl. Let go anytime and pick up where you left off.</p></div><i data-lucide="move-horizontal"></i></div><div><span>02</span><div><h3>Take your time.</h3><p>Tap the card to flip it. Drag to tilt it into the light, then tap again for the next card. Your holo is waiting.</p></div><i data-lucide="rotate-3d"></i></div><div><span>03</span><div><h3>Keep the good ones. All of them.</h3><p>Every card you reveal is saved to your collection. Open your collection to inspect it again, in every glorious finish.</p></div><i data-lucide="layers"></i></div></div><div class="odds-panel"><div class="eyebrow">THE POSSIBILITIES</div><p>Cards 1–4: 64% standard · 25% reverse holo · 10% holographic · 1% gold rare. <br>Card 5: ${100 - FINAL_CARD_GOLD_PERCENT}% holographic · ${FINAL_CARD_GOLD_PERCENT}% gold rare. Five different builders in every pack.</p></div><div class="keyboard-note"><span>Keyboard friendly</span><p><kbd>Enter</kbd> / <kbd>Space</kbd> Open, flip & next &nbsp; <kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> Tilt &nbsp; <kbd>M</kbd> Sound</p></div><button class="primary-button" id="start-guide">Let’s find something good<i data-lucide="arrow-right"></i></button></dialog>
  <dialog id="builders-dialog" class="collection-dialog builders-dialog"><div class="dialog-head"><div><div class="eyebrow">${edition.label} · SERIES ${edition.series}</div><h2>Meet the builders<span>.</span></h2></div><button class="icon-button close-dialog" aria-label="Close builders"><i data-lucide="x"></i></button></div><p class="roster-note">${edition.count} community-selected builders. Four collectible finishes. Abilities and stats are playful fiction.</p><div class="builder-search-bar"><input id="builder-search" type="search" placeholder="Search a name or @handle" aria-label="Find a builder" autocomplete="off"><span id="builder-results" role="status"></span></div><div id="builders-grid" class="builders-grid"></div></dialog>
  <div class="toast" id="toast" role="status"></div><div id="announcer" class="sr-only" aria-live="polite"></div>`;
function selectEdition(id) {
  const next = getPack(id);
  if (!next || !textureSets || !['sealed', 'loading'].includes(phase)) return;
  edition = next;
  textures = textureSets[id];
  scene.textures = textures;
  scene.selectPack(id);
  $("#pack-options").hidden = true;
  const mark = packBrandMark;
  brandMark = mark;
  updateFavicon(id);
  const title = "Builders Booster Packs";
  document.title = `${title} Collector Simulator`;
  document.body.dataset.pack = id;
  $('.brand').innerHTML = `${mark}<span class="brand-lockup"><span class="brand-name">${title}</span><span class="brand-subtitle">Collector Simulator</span></span>`;
  $('.brand').setAttribute('aria-label', `${title} Collector Simulator home`);
  const url = new URL(location.href);
  if (id === 'openai') url.searchParams.delete('pack'); else url.searchParams.set('pack', id);
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  document.querySelectorAll('[data-pack-select]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.packSelect === id)));
  phase = 'preparing';
  packReady = false;
  announce('Preparing your pack.');
  preparePack().then(({ error }) => {
    if (error) {
      openingRequest = null;
      resetView();
      toast(error.message);
      return;
    }
    packReady = true;
    if (phase === 'preparing') phase = 'sealed';
    scene.resumePendingTear();
    announce('Your pack is ready.');
  });
}
document.querySelectorAll('[data-pack-select]').forEach(button => button.onclick = () => scene?.choosePack(button.dataset.packSelect));
document.querySelectorAll('[data-pack-roster]').forEach(button => button.onclick = () => openBuilders(button.dataset.packRoster));
const bonusPanel = document.createElement("section");
bonusPanel.id = "bonus-panel";
bonusPanel.className = "bonus-panel";
bonusPanel.hidden = true;
bonusPanel.setAttribute("aria-labelledby", "bonus-title");
bonusPanel.innerHTML = `<div class="bonus-kicker">A LITTLE THANK-YOU</div><h2 id="bonus-title">1,000 extra booster packs.</h2><p id="bonus-copy">Keep collecting. Follow me on X for 1,000 extra booster packs.</p><a id="follow-bonus" class="primary-button" href="${CREATOR_X_URL}" target="_blank" rel="noopener noreferrer"><span id="follow-bonus-label">Follow me on X</span><span id="follow-bonus-spinner" class="bonus-spinner" aria-hidden="true" hidden></span><span id="bonus-status" class="sr-only" role="status"></span></a><button id="bonus-continue" class="primary-button" hidden>Open a pack</button><p id="bonus-note" class="bonus-note">Already following? This bonus is for you too.</p>`;
$(".room").append(bonusPanel);

// The server owns the timer and balance; the UI only displays its countdown.
let bonusTimer;
let bonusStarting = false;
let bonusPolling = false;
function acceptState(data) {
  save = data.save;
  updateCounts();
}
function renderBonus() {
  const remaining = packsRemaining(save.packAccess);
  const atSummary = phase === "summary";
  const show = phase === "locked" || (atSummary && remaining === 0);
  const parent = atSummary ? $("#summary") : $(".room");
  if (bonusPanel.parentElement !== parent) {
    if (atSummary) parent.insertBefore(bonusPanel, $("#view-all"));
    else parent.append(bonusPanel);
  }
  bonusPanel.classList.toggle("bonus-in-summary", atSummary);
  bonusPanel.hidden = !show || inspecting;
  const next = $("#another-pack");
  if (next) next.hidden = remaining === 0;
  const pending = bonusStarting || (save.packAccess.bonusStartedAt !== null && !save.packAccess.bonusClaimed);
  $("#follow-bonus").hidden = save.packAccess.bonusClaimed;
  $("#follow-bonus").setAttribute("aria-disabled", String(pending));
  $("#follow-bonus").setAttribute("aria-busy", String(pending));
  $("#follow-bonus").setAttribute("aria-label", pending ? "Preparing your bonus" : "Follow me on X");
  $("#follow-bonus-label").hidden = pending;
  $("#follow-bonus-spinner").hidden = !pending;
  $("#bonus-continue").hidden = !save.packAccess.bonusClaimed;
  bonusPanel.setAttribute("aria-busy", String(pending));
  if (save.packAccess.bonusClaimed) {
    $("#bonus-title").textContent = remaining ? "1,000 packs. All yours." : "What a collection.";
    $("#bonus-copy").textContent = remaining ? "Your bonus is ready. Let’s see what’s inside." : "You’ve opened all 1,003 packs. Explore every card you’ve collected.";
    $("#bonus-continue").textContent = remaining ? "Open a pack" : "Explore your collection";
    $("#bonus-note").textContent = "Your cards are saved to your collection.";
  } else {
    $("#bonus-title").textContent = "1,000 extra booster packs.";
    $("#bonus-copy").textContent = "Keep collecting. Follow me on X for 1,000 extra booster packs.";
    $("#bonus-note").textContent = "Already following? This bonus is for you too.";
  }
  if (pending) {
    const label = `Preparing your bonus… ${bonusSecondsRemaining(save.packAccess, serverNow())}s`;
    if ($("#bonus-status").textContent !== label) $("#bonus-status").textContent = label;
  }
}
async function updateBonusTimer() {
  renderBonus();
  if (save.packAccess.bonusClaimed || save.packAccess.bonusStartedAt === null) {
    clearInterval(bonusTimer);
    bonusTimer = undefined;
    return;
  }
  if (!bonusTimer) bonusTimer = setInterval(updateBonusTimer, 500);
  if (bonusPolling || bonusSecondsRemaining(save.packAccess, serverNow()) > 0) return;
  bonusPolling = true;
  try {
    acceptState(await request('state'));
    if (save.packAccess.bonusClaimed) {
      clearInterval(bonusTimer);
      bonusTimer = undefined;
      sound.tick();
      toast(`${BONUS_PACKS.toLocaleString('en-US')} booster packs added. Enjoy your next discoveries!`);
    }
    renderBonus();
  } catch (error) {
    clearInterval(bonusTimer);
    bonusTimer = undefined;
    toast(error.message + ' Return to the pack room to retry.');
  } finally { bonusPolling = false; }
}
$("#follow-bonus").addEventListener("click", async (event) => {
  if (bonusStarting || save.packAccess.bonusClaimed || save.packAccess.bonusStartedAt !== null) {
    event.preventDefault();
    if (!bonusStarting) updateBonusTimer();
    return;
  }
  bonusStarting = true;
  renderBonus();
  try {
    acceptState(await request('bonus', {}));
  } catch (error) { toast(error.message); }
  finally { bonusStarting = false; renderBonus(); updateBonusTimer(); }
});
$("#bonus-continue").onclick = () => packsRemaining(save.packAccess) ? reset() : openCollection();
async function syncGame() {
  if (!scene || openingRequest || !['sealed', 'locked', 'front', 'back', 'summary'].includes(phase) || inspecting) return;
  try {
    acceptState(await request('state'));
    if (['sealed', 'locked'].includes(phase) && !openingRequest) resetView();
    updateBonusTimer();
  } catch (error) { toast(error.message); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncGame(); });
function refreshIcons() {
  createIcons({ icons, attrs: { "stroke-width": 1.6 } });
}
function announce(text) {
  $("#announcer").textContent = text;
}
function updateCounts() {
  const unique = Object.keys(save.cards).length;
  $("#nav-count").textContent = unique;
  $("#footer-count").innerHTML = `${unique} <span>/ ${COLLECTION_SIZE}</span>`;
  $("#packs-count").textContent = save.packs;
  const remaining = packsRemaining(save.packAccess);
  $("#packs-remaining").textContent = remaining.toLocaleString("en-US");
  $("#packs-left-label").textContent = remaining === 1 ? "pack left" : "packs left";
}
let toastTimeout;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    4500,
  );
}
function onTearStart() {
  if (["sealed", "preparing"].includes(phase)) {
    phase = "tearing";
    $("#pack-options").hidden = true;
    $("#pack-info").hidden = true;
    $("#card-info").hidden = true;
    $("#seal-hint").hidden = true;
    $("#tear-meter").hidden = false;
    announce("Tearing the pack. Keep dragging across the seal.");
  }
}
function preparePack() {
  if (openingRequest) return openingRequest;
  openingRequestId ||= crypto.randomUUID();
  // Catch immediately: the player may still be dragging when the request fails.
  openingRequest = requestPack(openingRequestId, edition.id).then(data => {
    acceptState(data);
    return { data };
  }, error => ({ error }));
  return openingRequest;
}
async function onOpen() {
  if (!['sealed', 'tearing'].includes(phase)) return;
  phase = 'opening';
  const { data, error } = await preparePack();
  openingRequest = null;
  if (error) {
    // Preserve the request ID so a retry recovers a committed pack after a lost response.
    resetView();
    toast(error.message);
    return;
  }
  openingRequestId = null;
  pack = data.pack.cards;
  $('#seal-hint').hidden = true;
  $('#tear-meter').hidden = true;
  scene.open(pack);
}
function onReady(i) {
  phase = "back";
  index = i;
  $("#pack-info").hidden = true;
  $("#card-info").hidden = true;
  $("#card-info").innerHTML =
    `<div class="series-kicker">YOUR NEXT DISCOVERY</div><h2>The unknown.</h2><p>Some things are worth <br>taking a moment for.</p><div class="info-divider"></div><div class="info-row"><span>Card</span><b>${String(i + 1).padStart(2, "0")} / 05</b></div>${i === 4 ? '<div class="guarantee"><span>✦</span> Your guaranteed holo</div>' : ""}`;
  $("#card-progress").hidden = false;
  $("#stage-bottom").hidden = false;
  updateProgress();
  refreshIcons();
  announce(`Card ${i + 1} of 5. Ready to reveal.`);
}
function onRevealed(i) {
  phase = "front";
  $("#card-info").hidden = false;
  const c = pack[i],
    info = BUILDERS[c.person],
    finish = FINISHES[c.finish],
    key = cardKey(c),
    isNew = save.cards[key] === 1;
  $("#card-info").innerHTML =
    `<div class="finish-tag" style="--finish:${finish.color}">${finish.symbol} ${finish.label}</div><h2>${info.name}</h2><a class="profile-link" href="https://x.com/${info.handle}" target="_blank" rel="noopener noreferrer">@${info.handle} <i data-lucide="arrow-up-right"></i></a><p class="person-quote">${info.bio}</p><div class="info-divider"></div><div class="info-row"><span>Card class</span><b>${info.specialty}</b></div><div class="info-row"><span>${packForPerson(c.person).name}</span><b>#${String(cardNumber(c.person)).padStart(3, "0")}</b></div><div class="saved-label"><i data-lucide="${isNew ? "sparkles" : "check"}"></i> ${isNew ? "New to your collection" : "Added to your collection"}</div>`;
  updateProgress();
  refreshIcons();
  announce(
    `${info.name}, ${finish.name}. ${isNew ? "New to your collection." : "Added to your collection."}`,
  );
}
function updateProgress() {
  $("#card-progress").innerHTML = pack
    .map(
      (c, i) =>
        `<span class="progress-dot ${i < index || (i === index && phase === "front") ? "seen" : ""} ${i === index ? "current" : ""}" title="Card ${i + 1}" ${i === index ? 'aria-current="step"' : ""}></span>`,
    )
    .join("");
}
function onComplete() {
  phase = "summary";
  $("#pack-options").hidden = true;
  $("#stage-bottom").hidden = true;
  $("#card-info").hidden = true;
  $("#summary").hidden = false;
  // Preserve the bonus controls when replacing the summary contents.
  $(".room").append(bonusPanel);
  $("#summary").innerHTML =
    `<h2>A lovely little haul<span>.</span></h2><div class="pulls-row">${pack.map((c, i) => `<button class="pull-card" data-pull="${i}" style="--card-i:${i};--finish:${FINISHES[c.finish].color}" aria-label="Inspect ${BUILDERS[c.person].name}, ${FINISHES[c.finish].name}"><img src="${textures.cardURL(c)}" alt="${BUILDERS[c.person].name}"/><span>${FINISHES[c.finish].symbol} ${FINISHES[c.finish].name}</span></button>`).join("")}</div><button class="primary-button" id="another-pack">Open more booster packs</button><button class="text-link" id="view-all">Visit your collection <i data-lucide="arrow-right"></i></button>`;
  $("#another-pack").onclick = reset;
  $("#view-all").onclick = openCollection;
  document
    .querySelectorAll("[data-pull]")
    .forEach(
      (b) => (b.onclick = () => inspect(pack[Number(b.dataset.pull)], false)),
    );
  refreshIcons();
  announce("Pack complete. All five cards are in your collection.");
  renderBonus();
}
function reset() {
  if (openingRequest || phase === 'opening') return;
  resetView();
  updateBonusTimer();
}
function resetView() {
  packReady = false;
  $("#pack-options").hidden = true;
  const locked = packsRemaining(save.packAccess) === 0;
  phase = locked ? "locked" : "sealed";
  index = 0;
  pack = [];
  scene.reset(locked);
  $("#pack-options").hidden = locked;
  document.querySelectorAll("[data-pack-select]").forEach(button => button.setAttribute("aria-pressed", "false"));
  $("#summary").hidden = true;
  $("#stage-bottom").hidden = true;
  $("#card-info").hidden = true;
  $("#pack-info").hidden = locked;
  scene.layoutPacks();
  $("#card-progress").hidden = true;
  $("#seal-hint").hidden = locked;
  updateCounts();
  renderBonus();
  refreshIcons();
}
function action() {
  sound.unlock();
  if (phase === 'locked') {
    bonusPanel.querySelector('a:not([hidden]), button:not([hidden])')?.focus();
    return;
  }
  if (['sealed', 'preparing', 'tearing'].includes(phase)) { scene.autoTear(); return; }
  if (!['back', 'front'].includes(phase)) return;
  const revealing = phase === 'back';
  phase = revealing ? 'flipping' : 'advancing';
  $('#card-info').hidden = true;
  if (revealing) scene.reveal();
  else scene.next();
}
function dialogOpen(el) {
  sound.unlock();
  sound.tick();
  lastFocus = document.activeElement;
  el.showModal();
  document.body.classList.add("modal-open");
}
function dialogClose(el) {
  if (el.id === "builders-dialog") stopBuilderPreviews();
  el.close();
  document.body.classList.remove("modal-open");
  lastFocus?.focus();
}
function openCollection(preservePack = false) {
  if (!textures) return;
  if (["opening", "flipping", "advancing"].includes(phase)) {
    toast("Just a moment — a little magic is happening.");
    return;
  }
  if (inspecting) closeInspect(false);
  if (preservePack !== true) collectionEdition = edition;
  renderCollection();
  dialogOpen($("#collection-dialog"));
}
function renderCollection() {
  const packEntries = Object.entries(save.cards)
    .map(([key, count]) => {
      const [person, finish] = key.split("-").map(Number);
      return { person, finish, count };
    })
    .filter(c => collectionEdition.people.includes(c.person));
  const entries = packEntries.filter(
      (c) =>
        collectionFilter === "all" || c.finish === Number(collectionFilter),
    )
    .sort((a, b) => b.finish - a.finish || a.person - b.person);
  $("#collection-description").textContent =
    `${packEntries.length} of ${collectionEdition.count * FINISHES.length} unique cards · ${packEntries.reduce((sum, c) => sum + c.count, 0)} total pulls`;
  document.querySelectorAll("[data-collection-pack]").forEach(button => {
    const selected = button.dataset.collectionPack === collectionEdition.id;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("#collection-grid").innerHTML = entries.length
    ? entries
        .map(
          (c) =>
            `<button class="collection-card" data-card="${cardKey(c)}"><div class="collection-card-image"><img loading="lazy" src="${textureSets[collectionEdition.id].cardURL(c)}" alt="${BUILDERS[c.person].name}, ${FINISHES[c.finish].name}"><span class="duplicate-count">×${c.count}</span></div><b>${BUILDERS[c.person].name}</b><span style="color:${FINISHES[c.finish].color}">${FINISHES[c.finish].symbol} ${FINISHES[c.finish].name}</span></button>`,
        )
        .join("")
    : `<div class="empty-collection">${collectionEdition.id === "openai" ? openaiBrandMark : xBrandMark}<h3>${packEntries.length ? "No cards in this finish yet." : "Every collection starts with a little curiosity."}</h3><p>${packEntries.length ? "No cards in this finish yet. Your next pack could change that." : "Your first discovery is one rip away. Open a pack to get started."}</p><button class="primary-button" id="empty-back">Back to the pack room<i data-lucide="arrow-right"></i></button></div>`;
  $("#empty-back")?.addEventListener("click", () =>
    dialogClose($("#collection-dialog")),
  );
  document.querySelectorAll("[data-card]").forEach(
    (b) =>
      (b.onclick = () => {
        const [person, finish] = b.dataset.card.split("-").map(Number);
        inspect({ person, finish }, true);
      }),
  );
  refreshIcons();
}
function inspect(card, fromCollection) {
  collectionReturn = fromCollection;
  inspecting = true;
  if (fromCollection) dialogClose($("#collection-dialog"));
  scene.inspect(card);
  $("#summary").hidden = true;
  $("#stage-bottom").hidden = true;
  $("#pack-info").hidden = true;
  $("#card-info").hidden = true;
  $("#seal-hint").hidden = true;
  const c = BUILDERS[card.person],
    f = FINISHES[card.finish];
  const div = document.createElement("div");
  div.id = "inspection";
  div.innerHTML = `<div class="inspect-label"><button id="close-inspect" class="text-link"><i data-lucide="chevron-left"></i> ${fromCollection ? "Back to collection" : "Back to your pulls"}</button><span class="finish-tag" style="--finish:${f.color}">${f.symbol} ${f.label}</span><h2>${c.name}</h2><a class="profile-link" href="https://x.com/${c.handle}" target="_blank" rel="noopener noreferrer">@${c.handle} <i data-lucide="arrow-up-right"></i></a><p>Drag to explore every angle.</p><button id="flip-inspect" class="secondary-button"><i data-lucide="rotate-cw"></i> Flip card</button></div>`;
  $(".room").append(div);
  $("#close-inspect").onclick = () => closeInspect();
  $("#flip-inspect").onclick = () => scene.flipInspection();
  renderBonus();
  refreshIcons();
}
function closeInspect(reopen = collectionReturn) {
  if (!inspecting) return;
  inspecting = false;
  scene.closeInspect();
  $("#inspection").remove();
  if (phase === "summary") $("#summary").hidden = false;
  else {
    $("#stage-bottom").hidden = ["locked", "sealed", "tearing", "opening"].includes(phase);
    $("#pack-info").hidden = phase !== "sealed";
    $("#seal-hint").hidden = phase !== "sealed";
    $("#card-info").hidden = phase !== "front";
  }
  renderBonus();
  if (reopen) openCollection(true);
}
function toggleSound() {
  sound.unlock();
  const enabled = sound.toggle();
  $("#sound").setAttribute("aria-pressed", String(enabled));
  $("#sound").setAttribute("aria-label", `Sound ${enabled ? "on" : "off"}`);
  $("#sound").innerHTML =
    `<i data-lucide="${enabled ? "volume-2" : "volume-x"}"></i><span>Sound ${enabled ? "on" : "off"}</span>`;
  refreshIcons();
}
$("#sound").onclick = toggleSound;
$("#collection-nav").onclick = openCollection;
$("#room-nav").onclick = () => {
  if (inspecting) closeInspect();
  document.querySelectorAll("dialog[open]").forEach(dialogClose);
  syncGame();
};
function openBuilders(id = edition.id) {
  if (!textures) return;
  rosterEdition = getPack(id);
  $('#builders-dialog .eyebrow').innerHTML = `${packWordmark(rosterEdition, true)} · SERIES ${rosterEdition.series}`;
  $('#builders-dialog .roster-note').textContent = `${rosterEdition.count} community-selected builders. Four collectible finishes. Abilities and stats are playful fiction.`;
  $('#builder-search').value = '';
  renderBuilders();
  dialogOpen($("#builders-dialog"));
}
function stopBuilderPreviews() {
  builderPreviewObserver?.disconnect();
  cancelAnimationFrame(builderPreviewFrame);
  builderPreviewFrame = 0;
}
function renderBuilders() {
  if (!textures) return;
  stopBuilderPreviews();
  const query = $("#builder-search").value.trim().replace(/^@/, "").toLowerCase();
  const matches = rosterEdition.people.map(person => ({ b: BUILDERS[person], person })).filter(
    ({ b }) => `${b.name} ${b.fullName} ${b.handle}`.toLowerCase().includes(query),
  );
  $("#builder-results").textContent = `${matches.length} / ${rosterEdition.count} builders`;
  $("#builders-grid").innerHTML = matches.length ? matches.map(
    ({ b, person }) =>
      `<article class="builder-preview"><canvas class="builder-card-preview" data-person="${person}" width="0" height="0" role="img" aria-label="${b.name} trading card"></canvas><h3>${b.fullName}</h3><a class="profile-link" href="https://x.com/${b.handle}" target="_blank" rel="noopener noreferrer">@${b.handle} <i data-lucide="arrow-up-right"></i></a><p>${b.bio}</p><a class="bio-source" href="${b.source}" target="_blank" rel="noopener noreferrer">Profile source ↗</a></article>`,
  ).join("") : '<p class="builders-empty">No builders found. Try another name or handle.</p>';
  refreshIcons();
  // Draw only nearby cards, one per frame. No synchronous image encoding is
  // needed for this on-screen gallery, and search/close cancels pending work.
  const queue = [];
  const drawNext = () => {
    builderPreviewFrame = 0;
    if (!$('#builders-dialog').open) return;
    const canvas = queue.shift();
    if (canvas?.isConnected) {
      canvas.width = 600;
      canvas.height = 840;
      canvas.getContext('2d').drawImage(textures.cardCanvas({ person: Number(canvas.dataset.person), finish: 0 }), 0, 0, 600, 840);
      canvas.dataset.ready = 'true';
    }
    if (queue.length) builderPreviewFrame = requestAnimationFrame(drawNext);
  };
  builderPreviewObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      builderPreviewObserver.unobserve(entry.target);
      queue.push(entry.target);
    }
    if (queue.length && !builderPreviewFrame) builderPreviewFrame = requestAnimationFrame(drawNext);
  }, { root: $('#builders-dialog'), rootMargin: '160px 0px' });
  document.querySelectorAll('.builder-card-preview').forEach(canvas => builderPreviewObserver.observe(canvas));
}
$('#builders-dialog').addEventListener('close', stopBuilderPreviews);
$("#builder-search").oninput = renderBuilders;
$("#start-guide").onclick = () => dialogClose($("#help-dialog"));
document
  .querySelectorAll(".close-dialog")
  .forEach((b) => (b.onclick = () => dialogClose(b.closest("dialog"))));
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialogClose(d);
    }
  });
  d.addEventListener("close", () =>
    document.body.classList.remove("modal-open"),
  );
});
document.querySelectorAll("[data-collection-pack]").forEach(button => {
  button.onclick = () => {
    collectionEdition = getPack(button.dataset.collectionPack);
    renderCollection();
  };
});
document.querySelectorAll("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      collectionFilter = b.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((el) => {
        el.classList.toggle("active", el === b);
        el.setAttribute("aria-pressed", String(el === b));
      });
      renderCollection();
    }),
);
window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]") || e.repeat) return;
  if (e.key === "Escape" && inspecting) {
    closeInspect();
    return;
  }
  if (e.key.toLowerCase() === "m") {
    toggleSound();
    return;
  }
  if (!scene) return;
  if (scene.mode === 'sealed' && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
    scene.stepPack(e.key === 'ArrowRight' ? 1 : -1);
    return;
  }
  if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
    ["back", "front", "inspect"].includes(scene.mode)
  ) {
    e.preventDefault();
    scene.keyboardTilt(
      e.key === "ArrowUp" ? -0.12 : e.key === "ArrowDown" ? 0.12 : 0,
      e.key === "ArrowLeft" ? -0.18 : e.key === "ArrowRight" ? 0.18 : 0,
    );
  }
  if (
    (e.code === "Space" || e.code === "Enter") &&
    !["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement.tagName,
    )
  ) {
    e.preventDefault();
    if (inspecting) scene.flipInspection();
    else if (phase === "summary") reset();
    else action();
  }
});
refreshIcons();
updateCounts();
async function start() {
  try {
    acceptState(await initializePlayer());
    const images = [
      ...PORTRAIT_SHEETS.map((sheet) => sheet.file),
      ...PACKS.map(pack => pack.art),
    ].map((file) => {
      const image = new Image();
      image.src = `/assets/${file}`;
      return image;
    });
    const brandImages = Object.fromEntries(Object.entries({ openai: openaiBrandMark, "x-builders": xBrandMark }).map(([id, mark]) => {
      const image = new Image();
      const goldMark = mark.replaceAll("#162920", "#0b0b0e").replaceAll("#f5d6db", "#d9b66f").replaceAll("#ffffff", "#f5dfa3");
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(goldMark)}`;
      return [id, image];
    }));
    await Promise.all([
      ...images.map((image) => image.decode()),
      ...Object.values(brandImages).map(image => image.decode()),
      document.fonts.ready,
    ]);
    textureSets = Object.fromEntries(PACKS.map((pack, i) => [pack.id, new Textures(images.slice(0, PORTRAIT_SHEETS.length), images[PORTRAIT_SHEETS.length + i], brandImages[pack.id], pack.id, brandImages)]));
    textures = textureSets[edition.id];
    scene = new PackScene($("#three-stage"), textures, sound, {
      packTextures: Object.fromEntries(PACKS.map(pack => [pack.id, textureSets[pack.id].pack()])),
      onPackSelect: selectEdition,
      onPackBrowse: () => document.querySelectorAll('[data-pack-select]').forEach(button => button.setAttribute('aria-pressed', 'false')),
      onPackLayout: positions => {
        const host = $('#three-stage');
        for (const point of positions) {
          const label = document.querySelector(`[data-pack-option="${point.id}"]`);
          label.style.left = `${host.offsetLeft + point.x}px`;
          label.style.top = `${host.offsetTop + point.y + 12}px`;
          label.style.width = `${point.width}px`;
        }
      },
      canCompleteTear: () => packReady,
      onTearStart,
      onProgress: (p) => ($("#tear-meter span").style.width = `${p * 100}%`),
      onOpen,
      onReady,
      onCardTap: action,
      onRevealed,
      onComplete,
      onFrame: (point) => {
        const hint = $("#seal-hint");
        hint.querySelector("span:nth-child(2)").textContent = phase === "preparing" ? "DRAG TO RIP · LOADING CARDS…" : point.confirmed ? "DRAG NEAR THE TOP TO RIP" : "CLICK THE PACK TO CHOOSE";
        hint.style.left = `${point.x}px`;
        hint.style.top = `${point.y}px`;
      },
    });
    $("#loading").remove();
    resetView();
    updateBonusTimer();
    if (import.meta.env.DEV)
      window.__rift = {
        get state() {
          return {
            phase,
            mode: scene.mode,
            index,
            progress: scene.progress,
            pack: [...pack],
            save: structuredClone(save),
            rotation: { ...scene.rotation },
            audio: sound.ctx?.state,
            muted: !sound.enabled,
            render: {
              calls: scene.renderer.info.render.calls,
              geometries: scene.renderer.info.memory.geometries,
              textures: scene.renderer.info.memory.textures,
            },
          };
        },
      };
  } catch (err) {
    console.error(err);
    const loading = $("#loading") || document.createElement('div');
    if (!loading.isConnected) $('#three-stage').append(loading);
    loading.className = 'loading';
    loading.innerHTML = '<span>We couldn’t open your collection.</span><p>Check your connection and try again.</p><button class="secondary-button" onclick="location.reload()">Try again</button>';
  }
}
start();
