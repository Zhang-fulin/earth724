# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start local dev server (Vite)
npm run build      # type-check (tsc -b) then bundle
npm run lint       # ESLint
npm run preview    # preview production build locally
npm run deploy     # deploy dist/ to GitHub Pages via gh-pages
```

No test suite is configured.

## Architecture

Single-view SPA that renders geolocated news as animated pulsing dots on an interactive 3D globe.

**Stack:** React 19 + TypeScript, Vite 7, MapLibre GL 5, Supabase (PostgreSQL + realtime)

**Component tree:** `main.tsx` → `<App>` → `<NewsManager>` → `<Map>`

- `NewsManager` — data layer. Owns `news: NewsItem[]` state, fetches initial data from Supabase, and subscribes to `postgres_changes` for real-time inserts (capped at 50 items). Passes `newsData` down as a prop.
- `Map` — rendering layer. Initializes a MapLibre globe once (first `useEffect`), then syncs the GeoJSON source when `newsData` changes (second `useEffect`). Uses `newsDataRef` to avoid stale closures inside map event handlers.
- `lib/supabase.ts` — Supabase client singleton (anon key is intentionally public for client-side use).

**Globe setup:** ArcGIS satellite tiles + label overlay + lat/lng graticule grid, `projection: { type: 'globe' }`.

**Custom marker:** `createPulsingDot` implements `maplibregl.StyleImageInterface` using Canvas 2D with triple-ripple animation driven by `performance.now()`.

**Realtime reconnect:** on re-subscribe after disconnect, initial data is re-fetched; guarded by `isFirstLoad` ref to skip the very first subscription event.
