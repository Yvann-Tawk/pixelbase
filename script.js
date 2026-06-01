/* ============================================================
   PIXELBASE — script.js
   Boot, state, widgets, settings, persistence.
   ============================================================ */

/* ---------- STATE / PERSISTENCE ---------- */
const LS_KEY = "pixelbase_config_v1";
const LS_STATE = "pixelbase_state_v1";

function loadConfig() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return { ...structuredClone(PIXELBASE_DEFAULTS), ...JSON.parse(saved) };
  } catch (e) { console.warn("config load failed", e); }
  return structuredClone(PIXELBASE_DEFAULTS);
}
function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(LS_STATE)) || {}; }
  catch { return {}; }
}
function saveState(s) { localStorage.setItem(LS_STATE, JSON.stringify(s)); }

let CFG = loadConfig();
let STATE = loadState();

/* ---------- HELPERS ---------- */
const $ = (id) => document.getElementById(id);
const todayKey = () => new Date().toISOString().slice(0, 10);
function fmtDate() {
  const d = new Date();
  const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const mons = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${days[d.getDay()]} · ${mons[d.getMonth()]} ${d.getDate()} · ${d.getFullYear()} · ${CFG.city.toUpperCase()}`;
}
function greetWord() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

/* ============================================================
   LOADING SCREEN
   ============================================================ */
function bootLoader() {
  $("load-title").innerHTML = `${CFG.name.toUpperCase()}'S<br>BASE`;
  $("load-city").textContent = CFG.city.toUpperCase();

  const bar = $("load-bar"), pct = $("load-pct"), press = $("load-press");
  const steps = [
    {p:0,t:160},{p:12,t:280},{p:25,t:240},{p:38,t:360},
    {p:52,t:200},{p:67,t:340},{p:79,t:260},{p:91,t:300},{p:100,t:480}
  ];
  let i = 0;
  function step() {
    if (i >= steps.length) {
      press.classList.add("show");
      const go = () => { startDashboard(); cleanup(); };
      const cleanup = () => {
        document.removeEventListener("keydown", go);
        document.removeEventListener("click", go);
      };
      document.addEventListener("keydown", go, { once: true });
      document.addEventListener("click", go, { once: true });
      return;
    }
    bar.style.width = steps[i].p + "%";
    pct.textContent = steps[i].p;
    setTimeout(step, steps[i].t);
    i++;
  }
  setTimeout(step, 500);
}

function startDashboard() {
  $("loading-screen").classList.add("hidden");
  $("dashboard").classList.remove("hidden");
  renderAll();
}

/* ============================================================
   BACKGROUND
   ============================================================ */
function renderBackground() {
  const layer = $("bg-layer");
  layer.innerHTML = "";
  layer.className = "";
  const bg = CFG.background || { type: "none" };
  if (bg.type === "none" || !bg.url) return;
  layer.classList.add("has-media");
  if (bg.type === "video") {
    const v = document.createElement("video");
    v.src = bg.url; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
    layer.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = bg.url; img.alt = "";
    layer.appendChild(img);
  }
}

/* ============================================================
   TOP BAR
   ============================================================ */
function renderTopbar() {
  $("greeting").textContent = `${greetWord()}, ${CFG.name.toUpperCase()}.`;
  $("date").textContent = fmtDate();

  // mood persisted
  if (STATE.mood) {
    // (mood shown via dropdown selection; could show pill — kept minimal)
  }
}

/* ---- dropdown toggles ---- */
function wireDropdowns() {
  const map = {
    "btn-caffeine": "dd-caffeine",
    "btn-weather":  "dd-weather",
    "btn-mood":     "dd-mood",
  };
  Object.entries(map).forEach(([btn, dd]) => {
    $(btn).addEventListener("click", (e) => {
      e.stopPropagation();
      const el = $(dd);
      const wasOpen = el.classList.contains("open");
      document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
      if (!wasOpen) el.classList.add("open");
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
  });
  document.querySelectorAll(".dropdown").forEach(d =>
    d.addEventListener("click", e => e.stopPropagation()));

  $("btn-settings").addEventListener("click", openSettings);
}

/* ============================================================
   CAFFEINE TRACKER
   ============================================================ */
const CAFFEINE_HALFLIFE_H = 5;
function renderCaffeine() {
  const t = todayKey();
  if (!STATE.caffeine || STATE.caffeine.day !== t) {
    STATE.caffeine = { day: t, mg: 0, lastDose: null };
    saveState(STATE);
  }
  updateCaffeineDisplay();
}
function updateCaffeineDisplay() {
  const c = STATE.caffeine;
  $("caf-mg").textContent = Math.round(c.mg);
  if (c.mg <= 0 || !c.lastDose) {
    $("caf-crash").textContent = "—";
    return;
  }
  const hrsToHalf = CAFFEINE_HALFLIFE_H;
  const since = (Date.now() - c.lastDose) / 3600000;
  const remaining = Math.max(0, hrsToHalf - since);
  $("caf-crash").textContent = remaining > 0 ? `${remaining.toFixed(1)}H` : "SOON";
}
function wireCaffeine() {
  $("caf-add").addEventListener("click", () => {
    STATE.caffeine.mg += 80;
    STATE.caffeine.lastDose = Date.now();
    saveState(STATE);
    updateCaffeineDisplay();
  });
  $("caf-reset").addEventListener("click", () => {
    STATE.caffeine = { day: todayKey(), mg: 0, lastDose: null };
    saveState(STATE);
    updateCaffeineDisplay();
  });
}

/* ============================================================
   WEATHER
   ============================================================ */
async function renderWeather() {
  const key = CFG.api.openWeatherKey;
  if (!key) {
    $("wx-temp").innerHTML = "27&deg;";
    $("wx-desc").textContent = "DEMO";
    return;
  }
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(CFG.city)}&units=metric&appid=${key}`;
    const r = await fetch(url);
    const d = await r.json();
    $("wx-temp").innerHTML = `${Math.round(d.main.temp)}&deg;`;
    $("wx-desc").textContent = (d.weather[0].main || "").toUpperCase();
    $("wx-hi").innerHTML = `${Math.round(d.main.temp_max)}&deg;`;
    $("wx-lo").innerHTML = `${Math.round(d.main.temp_min)}&deg;`;
    const m = (d.weather[0].main || "").toLowerCase();
    const ic = m.includes("rain") ? "&#127783;" : m.includes("cloud") ? "&#9925;" : m.includes("snow") ? "&#10052;" : "&#9728;";
    $("wx-icon").innerHTML = ic;
  } catch (e) {
    $("wx-desc").textContent = "OFFLINE";
  }
}

/* ============================================================
   MOOD
   ============================================================ */
function wireMood() {
  document.querySelectorAll(".mood-opt").forEach(b => {
    b.addEventListener("click", () => {
      STATE.mood = b.dataset.mood;
      saveState(STATE);
      document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
    });
  });
}

/* ============================================================
   GMAIL  (placeholder + link; live needs OAuth)
   ============================================================ */
function renderGmail() {
  const body = $("gmail-body");
  if (!CFG.api.googleClientId) {
    body.innerHTML = `<div class="empty-state">Add Google Client ID in settings &#9881;</div>`;
    $("gmail-count").textContent = "—";
    return;
  }
  if (!STATE.googleConnected) {
    body.innerHTML = `<div class="empty-state">Ready to connect.</div>
      <button class="px-btn px-btn-sm" id="gmail-connect">CONNECT GOOGLE</button>`;
    const btn = $("gmail-connect");
    if (btn) btn.onclick = googleSignIn;
    return;
  }
  body.innerHTML = `<div class="empty-state">Loading inbox...</div>`;
  if (typeof fetchGmail === "function") fetchGmail();
}

/* ============================================================
   CALENDAR (placeholder + link; live needs OAuth)
   ============================================================ */
function renderCalendar() {
  const body = $("calendar-body");
  if (!CFG.api.googleClientId) {
    body.innerHTML = `<div class="empty-state">Add Google Client ID in settings &#9881;</div>`;
    return;
  }
  if (!STATE.googleConnected) {
    body.innerHTML = `<div class="empty-state">Connect Google in the Gmail card.</div>`;
    return;
  }
  body.innerHTML = `<div class="empty-state">Loading events...</div>`;
  if (typeof fetchCalendar === "function") fetchCalendar();
}

/* ============================================================
   BOOK
   ============================================================ */
function renderBooks() {
  const body = $("book-body");
  body.innerHTML = "";
  if (!CFG.books.length) { body.innerHTML = `<div class="empty-state">Add a book in settings</div>`; return; }
  CFG.books.forEach((b, i) => {
    const unit = b.unit || "pg";
    const pct = Math.min(100, Math.round((b.current / b.goal) * 100));
    const el = document.createElement("div");
    el.className = "book-item";
    el.innerHTML = `
      <div class="book-title">${esc(b.title)}</div>
      <div class="book-stat">
        <span class="book-stepper">
          <button class="step-btn" data-i="${i}" data-d="-1">&minus;</button>
          <span class="book-current">${b.current.toLocaleString()}</span> / ${b.goal.toLocaleString()} ${esc(unit)}
          <button class="step-btn" data-i="${i}" data-d="1">+</button>
        </span>
        <span>${pct}%</span>
      </div>
      <div class="pbar"><div class="pbar-fill purple" style="width:${pct}%"></div></div>
      ${b.link ? `<a class="book-link" href="${esc(b.link)}" target="_blank" rel="noopener">GOODREADS SHELF &rarr;</a>` : ""}`;
    el.querySelectorAll(".step-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = +btn.dataset.i, d = +btn.dataset.d;
        const stepBig = unit === "words" ? 250 : 1;
        CFG.books[idx].current = Math.max(0, CFG.books[idx].current + d * stepBig);
        saveConfig(CFG); renderBooks();
      };
    });
    body.appendChild(el);
  });
}
function wireBookEdit() {
  $("book-edit").onclick = () => {
    if (!CFG.books.length) return;
    const b = CFG.books[0];
    const v = prompt(`Current ${b.unit || "pg"} read (of ${b.goal})?`, b.current);
    if (v === null) return;
    CFG.books[0].current = Math.max(0, parseInt(v) || 0);
    saveConfig(CFG); renderBooks();
  };
}

/* ============================================================
   COMMUTE
   ============================================================ */
function renderCommute() {
  const { home, office } = CFG.commute;
  const link = $("commute-link");
  if (home && office) {
    link.href = `https://www.google.com/maps/dir/${encodeURIComponent(home)}/${encodeURIComponent(office)}`;
    if (CFG.api.tomtomKey) {
      $("commute-status-1").textContent = "LOADING...";
      $("commute-status-2").textContent = "LOADING...";
      if (typeof fetchCommute === "function") fetchCommute();
    } else {
      $("commute-status-1").textContent = "TAP MAPS FOR LIVE";
      $("commute-status-2").textContent = "TAP MAPS FOR LIVE";
    }
  }
}

/* ============================================================
   MEDICATION
   ============================================================ */
function renderMedication() {
  const body = $("med-body");
  body.innerHTML = "";
  const t = todayKey();
  if (!STATE.medTaken || STATE.medTaken.day !== t) {
    STATE.medTaken = { day: t, taken: {} };
    saveState(STATE);
  }
  if (!CFG.medication.length) {
    body.innerHTML = `<div class="empty-state">Add meds in settings &#9881;</div>`;
    $("med-count").textContent = "0/0";
    return;
  }
  let done = 0;
  CFG.medication.forEach((m, i) => {
    const taken = !!STATE.medTaken.taken[i];
    if (taken) done++;
    const row = document.createElement("div");
    row.className = "med-row" + (taken ? " taken" : "");
    row.innerHTML = `
      <div class="med-check">${taken ? "&#10003;" : ""}</div>
      <div class="med-info">
        <div class="med-name">${esc(m.name)}</div>
        <div class="med-dose">${esc(m.dose || "")}</div>
      </div>
      <div class="med-time">${esc(m.time || "")}</div>`;
    row.addEventListener("click", () => {
      STATE.medTaken.taken[i] = !STATE.medTaken.taken[i];
      saveState(STATE);
      renderMedication();
    });
    body.appendChild(row);
  });
  $("med-count").textContent = `${done}/${CFG.medication.length}`;
}

/* ============================================================
   MUSIC — YOUTUBE PLAYER
   ============================================================ */
let ytPlayer = null;
let ytApiReady = false;
let ytPendingId = null;

function onYouTubeIframeAPIReady() {
  ytApiReady = true;
  if (ytPendingId) { createYtPlayer(ytPendingId); ytPendingId = null; }
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function parseYtId(input) {
  const s = input.trim();
  let m = s.match(/[?&]v=([\w-]+)/);            if (m) return { id: m[1], type: "video" };
  m = s.match(/[?&]list=([\w-]+)/);              if (m) return { id: m[1], type: "playlist" };
  m = s.match(/youtu\.be\/([\w-]+)/);            if (m) return { id: m[1], type: "video" };
  if (/^[\w-]{11}$/.test(s))                     return { id: s, type: "video" };
  if (/^(PL|UU|LL|RD|OL)[\w-]+$/.test(s))        return { id: s, type: "playlist" };
  return { id: s, type: "video" };
}

function createYtPlayer(item) {
  const empty = $("yt-empty");
  if (empty) empty.style.display = "none";
  const cfg = item.type === "playlist"
    ? { listType: "playlist", list: item.id }
    : { videoId: item.id };
  if (ytPlayer) {
    if (item.type === "playlist") ytPlayer.loadPlaylist({ list: item.id });
    else ytPlayer.loadVideoById(item.id);
    return;
  }
  ytPlayer = new YT.Player("yt-player", {
    height: "180", width: "100%",
    playerVars: { playsinline: 1, ...cfg, rel: 0, modestbranding: 1 },
    events: {},
  });
}

function playYt(item) {
  if (!ytApiReady || typeof YT === "undefined" || !YT.Player) { ytPendingId = item; return; }
  createYtPlayer(item);
}

function renderMusic() {
  const list = $("yt-list");
  list.innerHTML = "";
  const items = (CFG.music.playlist || []);
  if (!items.length) {
    list.innerHTML = `<div class="empty-state" style="font-size:16px">Add a song or playlist with +</div>`;
  }
  items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "yt-item";
    row.innerHTML = `<span class="yt-item-title">&#9654; ${esc(it.title)}</span>
      <button class="news-del" data-i="${i}">&times;</button>`;
    row.querySelector(".yt-item-title").onclick = () => playYt(it);
    row.querySelector(".news-del").onclick = (e) => {
      e.stopPropagation();
      CFG.music.playlist.splice(i, 1); saveConfig(CFG); renderMusic();
    };
    list.appendChild(row);
  });
}

function wireMusic() {
  $("music-add").onclick = () => {
    const title = prompt("Name for this song/playlist?");
    if (!title) return;
    const raw = prompt("YouTube link or ID (video or playlist):");
    if (!raw) return;
    const parsed = parseYtId(raw);
    CFG.music.playlist.push({ title, id: parsed.id, type: parsed.type });
    saveConfig(CFG); renderMusic();
  };
}

/* ============================================================
   PROGRESS
   ============================================================ */
function renderProgress() {
  const body = $("progress-body");
  body.innerHTML = `<div class="progress-grid"></div>`;
  const grid = body.querySelector(".progress-grid");
  CFG.progress.forEach((p, i) => {
    const el = document.createElement("div");
    el.className = "progress-item";
    const color = p.color === "purple" ? "purple" : p.color === "green" ? "green" : "";
    el.innerHTML = `
      <div class="progress-label"><span>${esc(p.label)}</span><span class="progress-pct">${p.pct}%</span></div>
      <div class="pbar pbar-click" data-i="${i}" title="Click to set"><div class="pbar-fill ${color}" style="width:${p.pct}%"></div></div>`;
    const bar = el.querySelector(".pbar-click");
    bar.onclick = (e) => {
      const rect = bar.getBoundingClientRect();
      const newPct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
      CFG.progress[i].pct = newPct; saveConfig(CFG); renderProgress();
    };
    grid.appendChild(el);
  });
}
function wireProgressEdit() {
  $("progress-edit").onclick = () => {
    CFG.progress.forEach((p, i) => {
      const v = prompt(`${p.label} — progress %?`, p.pct);
      if (v !== null) CFG.progress[i].pct = Math.max(0, Math.min(100, parseInt(v) || 0));
    });
    saveConfig(CFG); renderProgress();
  };
}

/* ============================================================
   TAROT / FORTUNE
   ============================================================ */
function renderTarot() {
  const t = todayKey();
  const symbols = ["&#9670;","&#9733;","&#9789;","&#9788;","&#10052;","&#9851;","&#9883;","&#10070;"];
  if (STATE.fortune && STATE.fortune.day === t) {
    showFortune(STATE.fortune.text, STATE.fortune.sym);
  }
  $("tarot-flip").addEventListener("click", () => {
    const idx = Math.floor(Math.random() * CFG.fortunes.length);
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const text = CFG.fortunes[idx];
    STATE.fortune = { day: t, text, sym };
    saveState(STATE);
    showFortune(text, sym);
  });
}
function showFortune(text, sym) {
  $("tarot-symbol").innerHTML = sym;
  $("tarot-text").textContent = text;
}

/* ============================================================
   BRAIN DUMP
   ============================================================ */
function renderBraindump() {
  const t = todayKey();
  const area = $("braindump-text");
  const big = $("braindump-text-big");
  if (!STATE.braindump || STATE.braindump.day !== t) {
    STATE.braindump = { day: t, text: "" };
    saveState(STATE);
  }
  area.value = STATE.braindump.text;
  big.value = STATE.braindump.text;
  $("braindump-meta").textContent = "auto-clears at midnight";

  const sync = (val) => {
    STATE.braindump = { day: todayKey(), text: val };
    saveState(STATE);
    area.value = val; big.value = val;
  };
  area.addEventListener("input", e => sync(e.target.value));
  big.addEventListener("input", e => sync(e.target.value));

  $("braindump-expand").addEventListener("click", () => {
    big.value = area.value;
    $("braindump-overlay").classList.remove("hidden");
    big.focus();
  });
  $("braindump-collapse").addEventListener("click", () => {
    area.value = big.value;
    $("braindump-overlay").classList.add("hidden");
  });
}

/* ============================================================
   NEWS
   ============================================================ */
function renderNews() {
  const body = $("news-body");
  body.innerHTML = "";
  CFG.news.forEach((n, i) => {
    const row = document.createElement("div");
    row.className = "news-row";
    row.innerHTML = `
      <a class="news-link" href="${esc(n.url)}" target="_blank" rel="noopener">&#8226; ${esc(n.label)}</a>
      <button class="news-del" data-i="${i}">&times;</button>`;
    row.querySelector(".news-del").addEventListener("click", () => {
      CFG.news.splice(i, 1); saveConfig(CFG); renderNews();
    });
    body.appendChild(row);
  });
  $("news-add").onclick = () => {
    const label = prompt("Link name?");
    if (!label) return;
    const url = prompt("URL? (https://...)");
    if (!url) return;
    CFG.news.push({ label, url }); saveConfig(CFG); renderNews();
  };
}

/* ============================================================
   PROJECTS
   ============================================================ */
function renderProjects() {
  const body = $("projects-body");
  body.innerHTML = `<div class="projects-grid"></div>`;
  const grid = body.querySelector(".projects-grid");
  CFG.projects.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="project-name">${esc(p.name)}</div>
      <div class="project-type">${esc(p.type)}</div>
      <div class="pbar pbar-click" data-i="${i}" title="Click to set %"><div class="pbar-fill" style="width:${p.pct}%"></div></div>
      <div class="project-foot">
        <span class="project-pct">${p.pct}%</span>
        ${p.link ? `<a class="project-link" href="${esc(p.link)}" target="_blank" rel="noopener">DRIVE &rarr;</a>` : ""}
      </div>`;
    const bar = card.querySelector(".pbar-click");
    bar.onclick = (e) => {
      const rect = bar.getBoundingClientRect();
      const newPct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
      CFG.projects[i].pct = newPct; saveConfig(CFG); renderProjects();
    };
    grid.appendChild(card);
  });
}
function wireProjectsEdit() {
  $("projects-edit").onclick = () => {
    CFG.projects.forEach((p, i) => {
      const v = prompt(`${p.name} — progress %?`, p.pct);
      if (v !== null) CFG.projects[i].pct = Math.max(0, Math.min(100, parseInt(v) || 0));
    });
    saveConfig(CFG); renderProjects();
  };
}

/* ============================================================
   SETTINGS PANEL
   ============================================================ */
function openSettings() {
  document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("open"));
  buildSettings();
  $("settings-overlay").classList.remove("hidden");
}
function buildSettings() {
  const b = $("settings-body");
  b.innerHTML = "";

  b.appendChild(group("PERSONAL", [
    field("Name", "set-name", CFG.name),
    field("City", "set-city", CFG.city),
  ]));

  b.appendChild(group("COMMUTE", [
    field("Home address", "set-home", CFG.commute.home),
    field("Office address", "set-office", CFG.commute.office),
  ]));

  b.appendChild(group("BACKGROUND", [
    selectField("Type", "set-bg-type", ["none","image","gif","video"], CFG.background.type),
    field("URL / path", "set-bg-url", CFG.background.url, "assets/backgrounds/yours.gif"),
  ]));

  b.appendChild(listGroup("PROJECTS", "projects", CFG.projects,
    [["name","Name"],["type","Type"],["link","Drive link"]]));

  b.appendChild(listGroup("BOOKS", "books", CFG.books,
    [["title","Title"],["goal","Goal"],["unit","pg/words"],["link","Goodreads link"]]));

  b.appendChild(listGroup("MEDICATION", "medication", CFG.medication,
    [["name","Name"],["dose","Dose"],["time","Time"]]));

  b.appendChild(listGroup("PROGRESS TRACKERS", "progress", CFG.progress,
    [["label","Label"],["color","Color (gold/purple/green)"]]));

  b.appendChild(group("API KEYS (optional)", [
    field("Google Client ID", "set-gcid", CFG.api.googleClientId),
    field("TomTom key (commute)", "set-tomtom", CFG.api.tomtomKey),
    field("OpenWeather key", "set-owm", CFG.api.openWeatherKey),
  ]));
}

function group(title, fields) {
  const g = document.createElement("div");
  g.className = "set-group";
  g.innerHTML = `<div class="set-group-title">${title}</div>`;
  fields.forEach(f => g.appendChild(f));
  return g;
}
function field(label, id, val, ph = "") {
  const f = document.createElement("div");
  f.className = "set-field";
  f.innerHTML = `<label class="set-label">${label}</label>
    <input class="set-input" id="${id}" value="${esc(val ?? "")}" placeholder="${esc(ph)}" />`;
  return f;
}
function selectField(label, id, opts, val) {
  const f = document.createElement("div");
  f.className = "set-field";
  f.innerHTML = `<label class="set-label">${label}</label>
    <select class="set-input" id="${id}">
      ${opts.map(o => `<option ${o===val?"selected":""}>${o}</option>`).join("")}
    </select>`;
  return f;
}
function listGroup(title, key, arr, cols) {
  const g = document.createElement("div");
  g.className = "set-group";
  g.innerHTML = `<div class="set-group-title">${title}</div>`;
  const wrap = document.createElement("div");
  wrap.id = `list-${key}`;
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "8px";
  arr.forEach((item, i) => wrap.appendChild(listItem(key, item, i, cols)));
  g.appendChild(wrap);
  const add = document.createElement("button");
  add.className = "set-add-btn";
  add.textContent = `+ ADD ${title}`;
  add.onclick = () => {
    const blank = {}; cols.forEach(([k]) => blank[k] = "");
    arr.push(blank);
    wrap.appendChild(listItem(key, blank, arr.length - 1, cols));
  };
  g.appendChild(add);
  return g;
}
function listItem(key, item, i, cols) {
  const row = document.createElement("div");
  row.className = "set-list-item";
  cols.forEach(([k, label]) => {
    const inp = document.createElement("input");
    inp.className = "set-input";
    inp.placeholder = label;
    inp.value = item[k] ?? "";
    inp.dataset.key = key; inp.dataset.field = k; inp.dataset.idx = i;
    inp.style.flex = "1";
    row.appendChild(inp);
  });
  const del = document.createElement("button");
  del.className = "news-del";
  del.innerHTML = "&times;";
  del.onclick = () => { CFG[key].splice(i, 1); buildSettings(); };
  row.appendChild(del);
  return row;
}

function collectSettings() {
  CFG.name = $("set-name").value || "Yvann";
  CFG.city = $("set-city").value || "Beirut";
  CFG.commute.home = $("set-home").value;
  CFG.commute.office = $("set-office").value;
  CFG.background.type = $("set-bg-type").value;
  CFG.background.url = $("set-bg-url").value;
  CFG.api.googleClientId = $("set-gcid").value;
  CFG.api.tomtomKey = $("set-tomtom").value;
  CFG.api.openWeatherKey = $("set-owm").value;

  // list groups (definitional fields only — live values like pct/current are edited on the cards)
  ["projects","books","medication","progress"].forEach(key => {
    document.querySelectorAll(`#list-${key} input`).forEach(inp => {
      const i = +inp.dataset.idx, f = inp.dataset.field;
      if (!CFG[key][i]) CFG[key][i] = {};
      let v = inp.value;
      if (f === "goal") v = parseInt(v) || 0;
      CFG[key][i][f] = v;
    });
    // ensure live-value fields exist with sane defaults
    if (key === "projects") CFG.projects.forEach(p => { if (p.pct == null) p.pct = 0; });
    if (key === "progress") CFG.progress.forEach(p => { if (p.pct == null) p.pct = 0; });
    if (key === "books") CFG.books.forEach(b => { if (b.current == null) b.current = 0; if (!b.unit) b.unit = "pg"; });
  });
  saveConfig(CFG);
}

function wireSettings() {
  $("settings-close").addEventListener("click", () => $("settings-overlay").classList.add("hidden"));
  $("settings-save").addEventListener("click", () => {
    collectSettings();
    $("settings-overlay").classList.add("hidden");
    renderAll();
  });
  $("settings-export").addEventListener("click", () => {
    collectSettings();
    const blob = new Blob([JSON.stringify(CFG, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pixelbase-config.json";
    a.click();
  });
  $("settings-import").addEventListener("click", () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json";
    inp.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          CFG = { ...structuredClone(PIXELBASE_DEFAULTS), ...JSON.parse(reader.result) };
          saveConfig(CFG); buildSettings(); renderAll();
        } catch { alert("Invalid config file."); }
      };
      reader.readAsText(file);
    };
    inp.click();
  });
}

/* ============================================================
   UTIL
   ============================================================ */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
  renderBackground();
  renderTopbar();
  renderCaffeine();
  renderWeather();
  renderGmail();
  renderCalendar();
  renderBooks();
  renderCommute();
  renderMedication();
  renderMusic();
  renderProgress();
  renderTarot();
  renderBraindump();
  renderNews();
  renderProjects();
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  wireDropdowns();
  wireCaffeine();
  wireMood();
  wireMusic();
  wireBookEdit();
  wireProgressEdit();
  wireProjectsEdit();
  wireSettings();
  renderBackground();
  bootLoader();
}
document.addEventListener("DOMContentLoaded", init);
