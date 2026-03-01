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
tle           1000/hr
positions     1000/hr
visualpasses   100/hr
radiopasses    100/hr
above          100/hr
```

---

## Quick Start

```bash
# Requires Node 24 (see .nvmrc)
npm install
npm run dev           # http://localhost:3000
npm run build
npm run preview
npm run dev:ngrok     # tunnel for mobile testing
```

---

## Environment Variables

```bash
# .env (never commit — API keys can also be set in Settings page)
N2YO_API_KEY=              # Required — from n2yo.com/api
SPACE_TRACK_USERNAME=      # Optional — space-track.org account
SPACE_TRACK_PASSWORD=      # Optional
SATNOGS_API_TOKEN=         # Optional — db.satnogs.org
```

API keys entered in the Settings page are encrypted (AES) and stored locally in IndexedDB.

---

## Deployment

Deployments are **explicit only** — Vercel does not auto-deploy on every push.

| Command | What it does |
|---|---|
| `npm run release:preview` | Preview changelog without deploying |
| `npm run beta` | Deploy current branch to Vercel preview URL |
| `npm run production` | Interactive release — patch / minor / major / hotfix |
| `npm run rollback` | Roll back production to a previous deployment |
| `npm run status` | List recent production deployments |

### Production release flow

```bash
npm run production
# → Choose: patch / minor / major / hotfix
# → Confirm version (e.g. v1.0.5)
# → Tags + pushes → GitHub Actions:
#     1. Merges tag into main
#     2. Deploys to Vercel production
#     3. Creates GitHub Release
#     4. Opens + closes release ticket in Issues
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup instructions.

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
│   │   ├── usePassData.ts
│   │   ├── usePassStatus.ts
│   │   ├── useRealTimePosition.ts
│   │   ├── useSatellitePath.ts
│   │   ├── usePolarPlotBackground.ts
│   │   ├── usePassFiltering.ts
│   │   └── usePassCleanup.ts
│   ├── storage/
│   │   ├── useSettings.ts
│   │   ├── useIndexedDB.ts
│   │   └── useSecureStorage.ts
│   ├── useDeviceOrientation.ts  # alpha/beta/gamma for AR
│   ├── useCredentials.ts
│   ├── useSoundAlerts.ts
│   └── usePWAInstall.ts
│
├── server/api/
│   ├── n2yo.post.ts           # N2YO proxy
│   ├── space-track.post.ts    # Space-Track proxy
│   ├── celestrak.post.ts
│   ├── satnogs.post.ts
│   └── amsat.post.ts
│
├── scripts/
│   ├── deploy.sh              # release + beta deploy
│   ├── rollback.sh            # Vercel production rollback
│   └── preview-release.sh     # changelog preview
│
├── .github/workflows/
│   ├── production-release.yml # Triggered by tag push
│   └── beta-deploy.yml        # Triggered manually (workflow_dispatch)
│
└── .cursor/rules/             # AI coding rules
    ├── project-overview.mdc   # Always applied
    ├── api-rules.mdc          # Loaded for server/api + composables/api
    ├── frontend-rules.mdc     # Loaded for components + pages
    └── git-workflow.mdc       # Loaded on request
```

---

## Git Worktree Layout

```
satTrack/
├── satTrack.git/    # Bare repo — NEVER work here
├── development/     # Primary dev branch
├── main/            # Production
└── feature-*/       # Feature branches
```

Flow: `feature/* → development → main`

Main is only updated automatically by GitHub Actions when a tag is pushed — never directly.

---

## Security

All credentials are:
- Encrypted (AES) before storage
- Stored only in browser IndexedDB
- Never persisted on the server
- Sent only during proxy API requests

---

73 de radio amateur community
