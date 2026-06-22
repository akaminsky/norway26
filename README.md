# Norway Fjords Roadtrip 🏔️

An interactive, mobile-first visualizer for a 12-day campervan trip through the western Norwegian fjords (**July 17–28, 2026**).

A hybrid of AllTrails (trail/terrain detail), Polarsteps (day-by-day journey log), and Notion (clean structured info per day) — with a Google-Maps-style bottom-sheet UX.

## Features

- **Full-screen terrain/satellite map** (Leaflet) with the route plotted as a polyline through every stop, dashed lines for ferry legs, and category pins (campsite · hike · water · town · scenic) with day tooltips.
- **Bottom sheet** that drags between peek / mid / full — horizontal day strip when collapsed, full itinerary when expanded, Google-Maps style.
- **Per-day detail**: weather, drive time, gear, activities (with distance/duration + Google Maps deep links), accommodation & booking status, notes.
- **Editable** itinerary with OpenStreetMap place search, plus a **trip log** and **photo journal** — all saved to `localStorage`.
- **Live weather** via Open-Meteo (with a typical-July fallback offline).

Itinerary data is synced from the trip planning spreadsheet (`Norway Campervan Road Trip - July 2026`).

## Running it

It's a single static file. Serve it (don't open via `file://`, since the libraries load from CDNs):

```bash
python3 -m http.server 8000
```

Then open **http://localhost:8000/**

Needs an internet connection for map tiles, weather, and the React/Leaflet CDNs. Everything else (edits, trip logs, photos) works offline and persists in the browser.

## Install on your phone

It's a PWA. On iPhone: open the site in Safari → **Share → Add to Home Screen**. It launches full-screen (no browser chrome) with its own icon, like a native app. (Android/Chrome: **⋮ → Install app**.)

## Tech

Single `index.html` — React 18 + Leaflet (via CDN), no build step.
