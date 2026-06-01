# Pixelbase

**Self-Hosted. Retro. Yours.**

A pixel-art personal dashboard you run yourself. One screen for the parts of your life you actually check every day — projects, books, music, commute, meds, weather, a brain-dump pad, and a daily fortune. No accounts, no tracking, no cloud. Your data lives in your browser and in a config file you own.

![Pixelbase](assets/preview.png)

---

## Features

- **Loading screen** — boots like an old game. Press any key to enter.
- **Top bar** — greeting, date, and three dropdowns: caffeine tracker, weather, mood.
- **Gmail + Calendar** — connect via Google OAuth (optional).
- **Now Spinning** — a spinning vinyl record with track, artist, album art, and controls.
- **Commute** — Home ↔ Office links straight into Google Maps.
- **Medication tracker** — tap to mark taken; resets daily.
- **Book log** — word-count progress bars for what you're writing.
- **Work progress** — custom trackers (MVP %, gym streak, whatever).
- **Brain dump** — a scratchpad that auto-clears at midnight. Expands to 80% of the screen.
- **News & resources** — your curated links, add/remove inline.
- **Fortune / tarot** — a daily pull that sticks for the day.
- **Active quests** — your projects as RPG cards with progress + Drive links.
- **Custom background** — static image, GIF, or looping video.
- **CRT scanlines** baked in.

Everything is configurable in-app (gear icon) or by editing `config.js`. Export/import your whole setup as JSON.

---

## Quick start

1. Clone or download this repo.
2. Open `index.html` in your browser. That's it — it runs as static files.

For live data (Gmail, Calendar, Maps, Weather) you'll want to serve it locally:

```bash
# any static server works, e.g.
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Make it yours

Click the **⚙ gear** in the top bar. Fill in:

- Name + city
- Home / office addresses (commute)
- Background (type + URL)
- Projects, books, meds, progress trackers
- API keys (optional)

Hit **Save & Reload**. Use **Export Config** to save a `pixelbase-config.json` you can paste back into `config.js` to make defaults permanent.

---

## Optional API setup

| Widget | Needs | Where |
|--------|-------|-------|
| Gmail + Calendar | Google OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com) |
| Commute traffic | TomTom API key (free, no card) | [developer.tomtom.com](https://developer.tomtom.com) |
| Weather | OpenWeather API key | [openweathermap.org](https://openweathermap.org/api) |

Music has no API dependency — pick your service (Spotify / Anghami / YouTube / YT Music), set your current track manually, and the "Open app" button launches it. Simple, never breaks.

Leave any key blank to run in demo/manual mode — everything still works, just with placeholder data where a live feed would go.

---

## File structure

```
pixelbase/
├── index.html        # markup
├── style.css         # all styling
├── config.js         # YOUR default data
├── script.js         # logic, widgets, persistence
├── integrations.js   # Google (Gmail+Cal) + TomTom commute
├── assets/
│   ├── backgrounds/
│   └── icons/
└── README.md
```

---

## Fonts

- [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) — pixel headers
- [VT323](https://fonts.google.com/specimen/VT323) — terminal body text

Loaded from Google Fonts. No install needed.

---

## License

MIT — do whatever you want. Fork it, rename it, make it `[yourname]'s Base`.

---

Built with a builder's restlessness on a bored Sunday.
