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
    body.innerHTML = `<div class="empty-state">Connect Gmail in settings &#9881;<br><br>Add Google Client ID to enable.</div>`;
    $("gmail-count").textContent = "—";
    return;
  }
  body.innerHTML = `<div class="empty-state">Gmail connected.<br>Sign-in flow runs on load.</div>`;
}

/* ============================================================
   CALENDAR (placeholder + link; live needs OAuth)
   ============================================================ */
function renderCalendar() {
  const body = $("calendar-body");
  if (!CFG.api.googleClientId) {
    body.innerHTML = `<div class="empty-state">Connect Calendar in settings &#9881;</div>`;
    return;
  }
  body.innerHTML = `<div class="empty-state">Calendar connected.</div>`;
}

/* ============================================================
   BOOK
   ============================================================ */
function renderBooks() {
  const body = $("book-body");
  body.innerHTML = "";
  if (!CFG.books.length) { body.innerHTML = `<div class="empty-state">Add a book in settings</div>`; return; }
  CFG.books.forEach(b => {
    const pct = Math.min(100, Math.round((b.current / b.goal) * 100));
    const el = document.createElement("div");
    el.className = "book-item";
    el.innerHTML = `
      <div class="book-title">${esc(b.title)}</div>
      <div class="book-stat"><span>${b.current.toLocaleString()} / ${b.goal.toLocaleString()}</span><span>${pct}%</span></div>
      <div class="pbar"><div class="pbar-fill purple" style="width:${pct}%"></div></div>`;
    body.appendChild(el);
  });
}

/* ============================================================
   COMMUTE
   ============================================================ */
function renderCommute() {
  const { home, office } = CFG.commute;
  const link = $("commute-link");
  if (home && office) {
    link.href = `https://www.google.com/maps/dir/${encodeURIComponent(home)}/${encodeURIComponent(office)}`;
    $("commute-status-1").textContent = "TAP MAPS FOR LIVE";
    $("commute-status-2").textContent = "TAP MAPS FOR LIVE";
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
   MUSIC / VINYL
   ============================================================ */
function renderMusic() {
  const m = CFG.music;
  $("music-track").textContent = (m.track || "NO TRACK").toUpperCase();
  $("music-artist").textContent = m.artist || "—";
  if (m.art) $("vinyl-art").style.backgroundImage = `url('${m.art}')`;
  $("music-open").href = "https://music.youtube.com";
}
function wireMusic() {
  const vinyl = $("vinyl");
  let playing = false;
  $("music-play").addEventListener("click", () => {
    playing = !playing;
    vinyl.classList.toggle("playing", playing);
    $("music-play").innerHTML = playing ? "&#9208;" : "&#9199;";
  });
}

/* ============================================================
   PROGRESS
   ============================================================ */
function renderProgress() {
  const body = $("progress-body");
  body.innerHTML = `<div class="progress-grid"></div>`;
  const grid = body.querySelector(".progress-grid");
  CFG.progress.forEach(p => {
    const el = document.createElement("div");
    el.className = "progress-item";
    const color = p.color === "purple" ? "purple" : p.color === "green" ? "green" : "";
    el.innerHTML = `
      <div class="progress-label"><span>${esc(p.label)}</span><span class="progress-pct">${p.pct}%</span></div>
      <div class="pbar"><div class="pbar-fill ${color}" style="width:${p.pct}%"></div></div>`;
    grid.appendChild(el);
  });
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
  CFG.projects.forEach(p => {
    const card = document.createElement(p.link ? "a" : "div");
    card.className = "project-card";
    if (p.link) { card.href = p.link; card.target = "_blank"; card.rel = "noopener"; }
    card.innerHTML = `
      <div class="project-name">${esc(p.name)}</div>
      <div class="project-type">${esc(p.type)}</div>
      <div class="pbar"><div class="pbar-fill" style="width:${p.pct}%"></div></div>
      <div class="project-pct">${p.pct}%</div>`;
    grid.appendChild(card);
  });
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

  b.appendChild(group("MUSIC", [
    field("Track", "set-music-track", CFG.music.track),
    field("Artist", "set-music-artist", CFG.music.artist),
    field("Album art URL", "set-music-art", CFG.music.art),
  ]));

  b.appendChild(listGroup("PROJECTS", "projects", CFG.projects,
    [["name","Name"],["type","Type"],["pct","%"],["link","Drive link"]]));

  b.appendChild(listGroup("BOOKS", "books", CFG.books,
    [["title","Title"],["current","Words"],["goal","Goal"]]));

  b.appendChild(listGroup("MEDICATION", "medication", CFG.medication,
    [["name","Name"],["dose","Dose"],["time","Time"]]));

  b.appendChild(listGroup("PROGRESS TRACKERS", "progress", CFG.progress,
    [["label","Label"],["pct","%"],["color","Color"]]));

  b.appendChild(group("API KEYS (optional)", [
    field("Google Client ID", "set-gcid", CFG.api.googleClientId),
    field("Google Maps key", "set-gmaps", CFG.api.googleMapsKey),
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
  CFG.music.track = $("set-music-track").value;
  CFG.music.artist = $("set-music-artist").value;
  CFG.music.art = $("set-music-art").value;
  CFG.api.googleClientId = $("set-gcid").value;
  CFG.api.googleMapsKey = $("set-gmaps").value;
  CFG.api.openWeatherKey = $("set-owm").value;

  // list groups
  ["projects","books","medication","progress"].forEach(key => {
    document.querySelectorAll(`#list-${key} input`).forEach(inp => {
      const i = +inp.dataset.idx, f = inp.dataset.field;
      if (!CFG[key][i]) CFG[key][i] = {};
      let v = inp.value;
      if (f === "pct" || f === "current" || f === "goal") v = parseInt(v) || 0;
      CFG[key][i][f] = v;
    });
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
  wireSettings();
  renderBackground();
  bootLoader();
}
document.addEventListener("DOMContentLoaded", init);
