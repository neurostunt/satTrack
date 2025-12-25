# SatTrack 🛰️

A modern Progressive Web App (PWA) for tracking satellites in real-time, designed specifically for radio amateurs. Track satellite passes, get transponder frequencies, and plan radio contacts with ease.

![SatTrack](https://img.shields.io/badge/Nuxt-4-00DC82?style=flat&logo=nuxt.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)
![PWA](https://img.shields.io/badge/PWA-enabled-4285F4?style=flat&logo=pwa)
![License](https://img.shields.io/badge/license-MIT-green?style=flat)

## ✨ Features

### 🛰️ Satellite Tracking
- **Real-time position tracking** - See satellites move across the sky in real-time
- **Pass predictions** - Get accurate pass predictions for your location
- **Polar plot visualization** - Beautiful graphical representation of satellite paths
- **Multiple satellites** - Track multiple satellites (one at a time on polar plot)

### 📡 Radio Amateur Features
- **Transponder data** - Get uplink/downlink frequencies from SatNOGS
- **Doppler calculations** - Automatic frequency corrections (when viewing pass details)
- **Pass alerts** - Sound alerts when satellites are overhead
- **Radio pass predictions** - Optimized for radio operations (elevation-based)

### 📱 Progressive Web App
- **Installable** - Install as a native app on any device
- **Offline support** - Works offline with cached data
- **Mobile-first** - Optimized for mobile devices
- **Dark theme** - Easy on the eyes for night operations

### 🎯 Additional Features
- **Multiple data sources** - Space-Track, CelesTrak, SatNOGS, N2YO
- **Secure credential storage** - API keys encrypted and stored locally in IndexedDB (never sent to server)
- **Data persistence** - IndexedDB for offline data storage

## 🚀 Quick Start

### Prerequisites
- Node.js 24.x (see `.nvmrc`)
- npm or compatible package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/neurostunt/satTrack.git
cd satTrack

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## 🔑 API Keys Setup

SatTrack uses multiple APIs for satellite data. Get your API keys:

1. **N2YO API** (Required for pass predictions)
   - Sign up at [n2yo.com](https://www.n2yo.com/api/)
   - Free tier: 1000 requests/hour

2. **SatNOGS API** (Optional, for transponder data)
   - Get token from [SatNOGS](https://db.satnogs.org/api/)
   - Free, no signup required for public data

3. **Space-Track API** (Optional, for TLE data)
   - Sign up at [Space-Track.org](https://www.space-track.org/)
   - Free for registered users

### Configuration

Add your API keys in the Settings page after first launch, or set them as environment variables:

```bash
# .env file
N2YO_API_KEY=your_n2yo_key
SATNOGS_API_TOKEN=your_satnogs_token
SPACE_TRACK_USERNAME=your_username
SPACE_TRACK_PASSWORD=your_password
```

### 🔒 Security & Privacy

**Your credentials are never stored on our servers.** All API keys and passwords are:
- **Encrypted** using industry-standard AES encryption before storage
- **Stored locally** in your browser's IndexedDB (client-side only)
- **Device-specific** - encryption keys are unique to your device
- **Never transmitted** to our servers except when making API requests (credentials are sent directly to the API provider)

The server API endpoints (`/server/api/*`) act as **proxies only** - they forward your requests to external APIs (N2YO, Space-Track, etc.) but do not store or log your credentials. All sensitive data remains encrypted on your device.

## 📖 Usage

### Tracking Satellites

1. **Set your location** - Go to Settings → Observation Location
   - Enter coordinates manually, or
   - Use GPS to get your current location

2. **Add satellites** - Go to Settings → Satellite Management
   - Search for satellites by name or NORAD ID
   - Add satellites to your tracking list

3. **View passes** - Go to Pass Predictions page
   - See upcoming passes for all tracked satellites
   - Click on a pass to see detailed information
   - View real-time position on polar plot

### Radio Operations

1. **Get transponder frequencies**
   - Satellites with transponder data show frequency information
   - Uplink/downlink frequencies are displayed
   - Doppler corrections are calculated automatically

2. **Set pass alerts**
   - Enable sound alerts in Settings
   - Get notified when satellites are overhead

## 🏗️ Project Structure

```
satTrack/
├── components/          # Vue components
│   ├── common/         # Shared components
│   ├── pass-predict/   # Pass prediction components
│   └── settings/        # Settings components
├── composables/         # Vue composables
│   ├── api/            # API integrations
│   ├── pass-predict/   # Pass prediction logic
│   └── storage/        # Data storage
├── pages/              # Nuxt pages
├── server/api/         # Server API routes
├── utils/              # Utility functions
└── public/             # Static assets
```

## 🛠️ Development

### Branching Strategy

- **`main`** - Production branch (auto-deploys to Vercel)
- **`development`** - Development branch (work in progress)

### Workflow

1. Work on `development` branch
2. When ready, merge `development` → `main` (or push directly to `main`)
3. **Automatic tag creation** - GitHub Actions creates a new tag (e.g., `v1.0.6`) on push to `main`
4. **Automatic deployment** - Vercel automatically deploys from `main`

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run dev:ngrok    # Start with ngrok tunnel (for mobile testing)
```

## 📦 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push to GitHub
2. Import repository in Vercel
3. Configure environment variables
4. Deploy!

Vercel automatically deploys on every push to `main`.

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **N2YO** - Satellite position and pass prediction API
- **Space-Track** - TLE data source
- **SatNOGS** - Transponder frequency database
- **CelesTrak** - Backup TLE data source
- **Nuxt** - Amazing Vue framework
- **UnoCSS** - Atomic CSS framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/neurostunt/satTrack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/neurostunt/satTrack/discussions)

## 🗺️ Roadmap

See [TODO.md](./TODO.md) for planned features and improvements.

### Planned Features
- Signal strength indicator based on elevation
- Multi-satellite simultaneous tracking on polar plot
- Export path data as KML/GPX
- Pass calendar view
- QSO logging

---

Made with ❤️ for the radio amateur community 73
