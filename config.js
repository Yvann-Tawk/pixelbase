/* ============================================================
   PIXELBASE — config.js
   This is YOUR data. Edit it here, or use the in-app Settings panel.
   Everything you change in Settings is saved to your browser and
   overrides these defaults. Export from Settings to update this file.
   ============================================================ */

const PIXELBASE_DEFAULTS = {

  // ---- PERSONAL ----
  name: "Yvann",
  city: "Beirut",

  // ---- COMMUTE (used for Google Maps links + ETA) ----
  commute: {
    home:   "",   // e.g. "Baabda, Lebanon"
    office: "",   // e.g. "Downtown Beirut, Lebanon"
  },

  // ---- BACKGROUND ----
  // type: "none" | "image" | "gif" | "video"
  // url:  path or link to the asset (assets/backgrounds/yours.gif)
  background: {
    type: "none",
    url: "",
  },

  // ---- PROJECTS (Active Quests) ----
  projects: [
    { name: "Downski",              type: "App · In build",      pct: 35, link: "" },
    { name: "What God Left Behind", type: "Trilogy · Writing",   pct: 20, link: "" },
    { name: "Apex Piling Systems",  type: "Engineering · Active", pct: 60, link: "" },
    { name: "Travel Follies",       type: "Agency · Active",     pct: 55, link: "" },
  ],

  // ---- BOOKS ----
  // Track by pages or words. Bump "current" from the card itself.
  // Goodreads shut their public API in 2020, so this is manual + an optional shelf link.
  books: [
    { title: "What God Left Behind — Book 1", current: 40, goal: 300, unit: "pg", link: "" },
  ],

  // ---- WORK PROGRESS (custom trackers) ----
  progress: [
    { label: "Downski MVP",     pct: 35,  color: "gold" },
    { label: "Book 1 Draft",    pct: 20,  color: "purple" },
    { label: "Gym (this week)", pct: 60,  color: "green" },
    { label: "Muay Thai (wk)",  pct: 50,  color: "green" },
  ],

  // ---- MEDICATION ----
  medication: [
    // { name: "Vitamin D", dose: "1000 IU", time: "Morning" },
  ],

  // ---- NEWS & RESOURCES ----
  news: [
    { label: "Hacker News", url: "https://news.ycombinator.com" },
    { label: "Letterboxd",  url: "https://letterboxd.com" },
  ],

  // ---- MUSIC (YouTube player) ----
  // Saved songs/playlists. Add from the card with the + button.
  // id = YouTube video ID or playlist ID.
  music: {
    playlist: [
      { title: "lofi hip hop radio", id: "jfKfPfyJRdk", type: "video" },
    ],
  },

  // ---- FORTUNES (rotates daily) ----
  fortunes: [
    "Build the thing. The thing builds you.",
    "Momentum beats motivation.",
    "Ship it ugly, fix it live.",
    "Your future self is watching. Make them proud.",
    "Rest is part of the work.",
    "The page won't write itself, but you will.",
    "Small reps. Big results.",
    "Done is the engine of more.",
  ],

  // ---- API KEYS (optional — for live data) ----
  // Leave blank to use placeholder/manual mode.
  api: {
    googleClientId:   "",   // Gmail + Calendar (OAuth)
    tomtomKey:        "",   // Commute traffic
    openWeatherKey:   "",   // Weather
  },
};
