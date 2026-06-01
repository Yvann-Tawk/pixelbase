/* ============================================================
   PIXELBASE — integrations.js
   Google (Gmail + Calendar) via GIS token client.
   TomTom commute via routing API.
   All read from CFG; everything degrades gracefully when blank.
   ============================================================ */

/* ---------------- GOOGLE (Gmail + Calendar) ---------------- */

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

let gapiReady = false;
let gisReady = false;
let googleTokenClient = null;
let googleToken = null;

function onGapiLoad() {
  if (!window.gapi) return;
  gapi.load("client", async () => {
    await gapi.client.init({
      discoveryDocs: [
        "https://gmail.googleapis.com/$discovery/rest?version=v1",
        "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
      ],
    });
    gapiReady = true;
  });
}

function initGoogleAuth() {
  const id = CFG.api.googleClientId;
  if (!id || !window.google || !google.accounts) return;
  try {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope: GOOGLE_SCOPES,
      callback: (resp) => {
        if (resp && resp.access_token) {
          googleToken = resp.access_token;
          gapi.client.setToken({ access_token: googleToken });
          STATE.googleConnected = true;
          saveState(STATE);
          whenGapiReady(() => {
            if (typeof renderGmail === "function") renderGmail();
            if (typeof renderCalendar === "function") renderCalendar();
          });
        }
      },
    });
    gisReady = true;
  } catch (e) {
    console.warn("GIS init failed", e);
  }
}

function whenGapiReady(cb, tries = 0) {
  if (gapiReady) return cb();
  if (tries > 40) return;
  setTimeout(() => whenGapiReady(cb, tries + 1), 250);
}

function googleSignIn() {
  if (!googleTokenClient) {
    alert("Add your Google Client ID in settings first.");
    return;
  }
  googleTokenClient.requestAccessToken({ prompt: googleToken ? "" : "consent" });
}

async function fetchGmail() {
  const body = $("gmail-body");
  if (!gapiReady || !googleToken) return;
  try {
    const list = await gapi.client.gmail.users.messages.list({
      userId: "me", maxResults: 4, labelIds: ["INBOX"], q: "is:unread",
    });
    const msgs = list.result.messages || [];
    $("gmail-count").textContent = `${msgs.length} NEW`;
    if (!msgs.length) { body.innerHTML = `<div class="empty-state">Inbox zero. Nice.</div>`; return; }
    body.innerHTML = "";
    const fetches = msgs.map(m => gapi.client.gmail.users.messages.get({
      userId: "me", id: m.id, format: "metadata",
      metadataHeaders: ["From", "Subject"],
    }));
    const results = await Promise.all(fetches);
    results.forEach(full => {
      const h = full.result.payload.headers;
      const from = (h.find(x => x.name === "From") || {}).value || "";
      const subj = (h.find(x => x.name === "Subject") || {}).value || "(no subject)";
      const sender = from.replace(/<.*>/, "").replace(/"/g, "").trim() || from;
      const row = document.createElement("div");
      row.className = "email-row unread";
      row.innerHTML = `<div class="email-sender">${esc(sender.slice(0, 28))}</div>
        <div class="email-preview">${esc(subj)}</div>`;
      body.appendChild(row);
    });
  } catch (e) {
    body.innerHTML = `<div class="empty-state">Gmail error. Reconnect in settings.</div>`;
  }
}

async function fetchCalendar() {
  const body = $("calendar-body");
  if (!gapiReady || !googleToken) return;
  try {
    const now = new Date();
    const end = new Date(); end.setHours(23, 59, 59);
    const res = await gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 6,
    });
    const events = res.result.items || [];
    if (!events.length) { body.innerHTML = `<div class="empty-state">Nothing left today.</div>`; return; }
    body.innerHTML = "";
    events.forEach(ev => {
      const start = ev.start.dateTime || ev.start.date;
      const t = ev.start.dateTime
        ? new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "ALL DAY";
      const row = document.createElement("div");
      row.className = "cal-event";
      row.innerHTML = `<div class="cal-time">${esc(t)}</div>
        <div class="cal-title">${esc((ev.summary || "(busy)").slice(0, 40))}</div>`;
      body.appendChild(row);
    });
  } catch (e) {
    body.innerHTML = `<div class="empty-state">Calendar error. Reconnect.</div>`;
  }
}

/* ---------------- TOMTOM COMMUTE ---------------- */

async function geocode(addr, key) {
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(addr)}.json?key=${key}&limit=1`;
  const r = await fetch(url);
  const d = await r.json();
  if (!d.results || !d.results.length) throw new Error("no geocode");
  const p = d.results[0].position;
  return `${p.lat},${p.lon}`;
}

async function routeEta(from, to, key) {
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${from}:${to}/json?key=${key}&traffic=true`;
  const r = await fetch(url);
  const d = await r.json();
  const leg = d.routes[0].summary;
  const mins = Math.round(leg.travelTimeInSeconds / 60);
  const noTraffic = Math.round(leg.noTrafficTravelTimeInSeconds / 60);
  const delay = mins - noTraffic;
  let status = "CLEAR", cls = "clear";
  if (delay > 10) { status = "HEAVY TRAFFIC"; cls = "heavy"; }
  else if (delay > 3) { status = "SOME TRAFFIC"; cls = ""; }
  return { mins, status, cls };
}

async function fetchCommute() {
  const key = CFG.api.tomtomKey;
  const { home, office } = CFG.commute;
  if (!key || !home || !office) return;
  try {
    const [h, o] = await Promise.all([geocode(home, key), geocode(office, key)]);
    const [toOffice, toHome] = await Promise.all([
      routeEta(h, o, key), routeEta(o, h, key),
    ]);
    $("commute-eta-1").textContent = `${toOffice.mins} MIN`;
    $("commute-status-1").textContent = toOffice.status;
    $("commute-status-1").className = "commute-status " + toOffice.cls;
    $("commute-eta-2").textContent = `${toHome.mins} MIN`;
    $("commute-status-2").textContent = toHome.status;
    $("commute-status-2").className = "commute-status " + toHome.cls;
  } catch (e) {
    $("commute-status-1").textContent = "ROUTE ERROR";
    $("commute-status-2").textContent = "CHECK KEY/ADDR";
  }
}

/* ---------------- HOOKS ---------------- */

window.addEventListener("load", () => {
  const t = setInterval(() => {
    if (window.gapi && !gapiReady) onGapiLoad();
    if (window.google && google.accounts && !gisReady) initGoogleAuth();
    if (gapiReady && gisReady) clearInterval(t);
  }, 300);
  setTimeout(() => clearInterval(t), 8000);
});
