# SatTrack

Satellite pass tracker and AR visualizer for ham radio operators. Built with Nuxt 4, deployed as a PWA on Vercel.

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat&logo=nuxt.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![PWA](https://img.shields.io/badge/PWA-enabled-4285F4?style=flat&logo=pwa)

---

## Features

- **Pass predictions** — upcoming passes for tracked satellites (N2YO)
- **Polar plot** — graphical AZ/EL path visualization, real-time position during pass
- **AR tracking** — augmented reality view using device compass + gyroscope
- **Transponder data** — uplink/downlink frequencies from SatNOGS
- **Doppler** — frequency correction based on real-time position
- **TLE data** — fetched from Space-Track (primary) and CelesTrak (fallback)
- **PWA** — installable, offline-capable, mobile-first, dark UI

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — active pass + transponder info for selected satellite |
| `/pass-predict` | Pass predictions list + polar plot for selected pass |
| `/ar-track` | AR view — compass-rotated polar plot using device orientation |
| `/settings` | Location, satellite management, API credentials, storage |

---

## Tech Stack

- **Nuxt 4** + Vue 3 Composition API + `<script setup>`
- **TypeScript** strict mode
- **UnoCSS** atomic CSS
- **IndexedDB** for local encrypted storage (credentials never leave device)
- **No map library** — all visualization is custom SVG/Canvas

---

## APIs

| API | Purpose | Limit | Docs |
|---|---|---|---|
| [N2YO](https://www.n2yo.com/api/) | Pass predictions, real-time positions | 1000 req/hr | Required |
| [Space-Track](https://www.space-track.org/) | TLE data (`/class/gp`) | — | Free account |
| [SatNOGS](https://db.satnogs.org/api/) | Transponder frequencies | — | No auth needed |
| [CelesTrak](https://celestrak.org/) | TLE fallback | — | No auth needed |

> **Space-Track note:** Uses `/basicspacedata/query/class/gp` endpoint. The old `tle_latest` class is deprecated.

N2YO rate limits per endpoint:
```
tle          1000/hr
positions    1000/hr
visualpasses  100/hr
radiopasses   100/hr
above         100/hr
```

---

## Project Structure

```
satTrack/
├── pages/
│   ├── index.vue              # Dashboard
│   ├── pass-predict.vue       # Pass list + polar plot
│   ├── ar-track.vue           # AR satellite tracker
│   └── settings.vue           # Settings
│
├── components/
│   ├── common/                # Shared UI (ObservationLocation, SatellitePassCard…)
│   ├── pass-predict/          # PassCard, PassDetails, PolarPlot, PassHeader
│   ├── ar-track/              # ArPolarPlot (SVG + compass rotation), ArIndicators
│   ├── settings/              # ApiCredentials, SatelliteManagement, AdditionalSettings…
│   └── PWAInstallButton.vue
│
├── composables/
│   ├── api/
│   │   ├── useN2YO.ts         # Pass predictions + real-time positions
│   │   ├── useSpaceTrack.ts   # TLE fetch via /api/space-track proxy
│   │   ├── useTLEData.ts      # TLE orchestration (Space-Track → CelesTrak fallback)
│   │   ├── useSatnogs.ts      # Transponder data
│   │   └── useSatelliteSearch.ts
│   ├── pass-predict/
│   │   ├── usePassData.ts     # Pass fetch + state
│   │   ├── usePassStatus.ts   # Is pass active/upcoming/past
│   │   ├── useRealTimePosition.ts  # Polls N2YO positions during active pass
│   │   ├── useSatellitePath.ts     # Path arc calculation for polar plot
│   │   ├── usePolarPlotBackground.ts
│   │   ├── usePassFiltering.ts
│   │   └── usePassCleanup.ts
│   ├── satellite/
│   │   └── usePassPrediction.ts
│   ├── storage/
│   │   ├── useSettings.ts     # App settings (location, preferences)
│   │   ├── useIndexedDB.ts    # IndexedDB wrapper
│   │   └── useSecureStorage.ts # Encrypted credential storage
│   ├── useDeviceOrientation.ts  # DeviceOrientationEvent (alpha/beta/gamma) for AR
│   ├── useCredentials.ts        # API credential management
│   ├── useSoundAlerts.ts
│   └── usePWAInstall.ts
│
├── server/api/
│   ├── n2yo.post.ts           # N2YO proxy (adds API key server-side)
│   ├── space-track.post.ts    # Space-Track proxy (login + TLE fetch via /class/gp)
│   ├── celestrak.post.ts      # CelesTrak proxy
│   ├── satnogs.post.ts        # SatNOGS proxy
│   └── amsat.post.ts          # AMSAT frequencies proxy
│
├── utils/
│   ├── dateTimeUtils.ts
│   ├── dopplerCalculations.ts
│   ├── frequencyUtils.ts
│   ├── satelliteImageUtils.ts
│   ├── satelliteNameUtils.ts
│   ├── satelliteStatusUtils.ts
│   ├── transmitterCategorization.ts
│   ├── secureStorage.ts       # AES encryption helpers
│   ├── indexedDBStorage.ts    # Low-level IndexedDB ops
│   └── spaceTrackApi.ts
│
├── types/
│   ├── satellite.d.ts
│   ├── api.d.ts
│   ├── storage.d.ts
│   └── global.d.ts
│
├── constants/
│   ├── api.ts                 # Endpoints, cache durations, rate limits
│   ├── satellite.ts           # Default satellites, categories
│   └── ui.ts
│
└── .cursor/rules/
    └── project-description.mdc   # AI coding rules (always applied)
```

---

## Quick Start

```bash
# requires Node 24 (see .nvmrc)
npm install
npm run dev         # http://localhost:3000
npm run build
npm run preview
npm run dev:ngrok   # tunnel for mobile testing
npm run deploy      # merge development → main + push (triggers Vercel deploy)
```

---

## Environment Variables

```bash
# .env (never commit credentials)
N2YO_API_KEY=              # Required — from n2yo.com/api
SPACE_TRACK_USERNAME=      # Optional — space-track.org account
SPACE_TRACK_PASSWORD=      # Optional
SATNOGS_API_TOKEN=         # Optional — db.satnogs.org
```

API keys can also be entered in the Settings page — they are encrypted and stored locally in IndexedDB.

---

## Security

All credentials are:
- Encrypted (AES) before storage
- Stored only in browser IndexedDB (client-side)
- Never persisted on the server
- Sent only when making proxy API requests

---

## Git Worktree Layout

```
satTrack/
├── satTrack.git/          # Bare repo — NEVER work here
├── development/           # Primary dev branch
├── main/                  # Production (auto-deploys to Vercel)
└── feature-*/             # Feature branches
```

Flow: `feature/* → development → main`

Push to `main` triggers: GitHub Actions auto-tag (v1.0.X) + Vercel deploy.

```bash
# Deploy from development branch
npm run deploy
```

The script validates you're on `development`, pushes it, merges into the `main` worktree and pushes — CI does the rest.

---

## Current Feature Branch: `feature/ar-satellite-tracking`

AR tracking augments the polar plot with real device compass data:

- `useDeviceOrientation.ts` — wraps `DeviceOrientationEvent`, returns `alpha` (True North heading), `beta` (pitch), `gamma` (roll)
- `ArPolarPlot.vue` — SVG polar plot rotated by compass heading so "up = where you're pointing"
- `ArIndicators.vue` — elevation/azimuth overlay indicators
- `ar-track.vue` — page combining pass selection + AR view

**iOS note:** `DeviceOrientationEvent` requires explicit user permission on iOS 13+. Permission request is handled in `useDeviceOrientation.ts`.

---

73 de radio amateur community
