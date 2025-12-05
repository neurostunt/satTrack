# API Endpoint Environment Variables

This document lists all API endpoint variables that can be added to a `.env` file for the SatTrack application.

## 📋 Quick Reference

Create a `.env` file in the project root with the following variables:

```bash
# N2YO API (Required for pass predictions and real-time positions)
N2YO_API_KEY=your_n2yo_api_key_here
N2YO_BASE_URL=https://api.n2yo.com/rest/v1/satellite

# Space-Track API (Optional - Primary TLE source)
SPACE_TRACK_USERNAME=your_email@example.com
SPACE_TRACK_PASSWORD=your_password
SPACE_TRACK_BASE_URL=https://www.space-track.org
SPACE_TRACK_LOGIN_ENDPOINT=/ajaxauth/login
SPACE_TRACK_TLE_ENDPOINT=/basicspacedata/query/class/tle_latest
SPACE_TRACK_SATELLITE_DATA_ENDPOINT=/basicspacedata/query/class/satcat

# SatNOGS API (Optional - No auth required for read operations)
SATNOGS_API_TOKEN=your_satnogs_api_token
SATNOGS_BASE_URL=https://db.satnogs.org/api
SATNOGS_SATELLITES_ENDPOINT=/satellites
SATNOGS_TLE_ENDPOINT=/tle
SATNOGS_TRANSMITTERS_ENDPOINT=/transmitters
SATNOGS_TELEMETRY_ENDPOINT=/telemetry

# CelesTrak (Automatic fallback - No configuration needed)
# Used automatically when Space-Track and SatNOGS don't have TLE data
```

---

## 🔑 N2YO API Configuration

### Required Variables

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `N2YO_API_KEY` | Your N2YO API key | - | ✅ Yes |
| `N2YO_BASE_URL` | N2YO API base URL | `https://api.n2yo.com/rest/v1/satellite` | ❌ No |

### API Endpoints (used internally)

- **Positions**: `/positions/{noradId}/{lat}/{lng}/{alt}/{seconds}&apiKey={key}`
  - Limit: 1000 requests/hour
  - Max: 300 seconds of data per request

- **Radio Passes**: `/radiopasses/{noradId}/{lat}/{lng}/{alt}/{days}/{minElevation}&apiKey={key}`
  - Limit: 100 requests/hour

- **Visual Passes**: `/visualpasses/{noradId}/{lat}/{lng}/{alt}/{days}/{minVisibility}&apiKey={key}`
  - Limit: 100 requests/hour

- **TLE**: `/tle/{noradId}&apiKey={key}`
  - Limit: 1000 requests/hour

### Getting Your API Key

1. Visit: https://www.n2yo.com/api/
2. Register for a free account
3. Get your API key from the dashboard

---

## 🛰️ Space-Track.org API Configuration

### Required Variables

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `SPACE_TRACK_USERNAME` | Space-Track.org username | - | ⚠️ Optional* |
| `SPACE_TRACK_PASSWORD` | Space-Track.org password | - | ⚠️ Optional* |
| `SPACE_TRACK_BASE_URL` | Space-Track API base URL | `https://www.space-track.org` | ❌ No |
| `SPACE_TRACK_LOGIN_ENDPOINT` | Login endpoint path | `/ajaxauth/login` | ❌ No |
| `SPACE_TRACK_TLE_ENDPOINT` | TLE data endpoint path | `/basicspacedata/query/class/tle_latest` | ❌ No |
| `SPACE_TRACK_SATELLITE_DATA_ENDPOINT` | Satellite catalog endpoint path | `/basicspacedata/query/class/satcat` | ❌ No |

**Note**: `SPACE_TRACK_USERNAME` and `SPACE_TRACK_PASSWORD` are **optional**.

### Multi-Source TLE Fallback Chain:
The app automatically tries multiple sources to ensure all satellites get TLE data:

1. **Space-Track.org** (Primary) - Most up-to-date, requires credentials
2. **SatNOGS DB** (Secondary) - No auth required, comprehensive coverage
3. **CelesTrak** (Tertiary) - No auth required, reliable fallback

**Example**: HUNITY (NORAD 98537) may not be in Space-Track but is available in SatNOGS DB.

This ensures **100% coverage** - every satellite will get TLE data from at least one source.

### API Endpoints (used internally)

- **Login**: `{BASE_URL}{LOGIN_ENDPOINT}` (POST with username/password)
- **TLE Data**: `{BASE_URL}{TLE_ENDPOINT}` (requires authenticated session)
- **Satellite Catalog**: `{BASE_URL}{SATELLITE_DATA_ENDPOINT}` (requires authenticated session)

### Authentication

Space-Track uses **session-based authentication**:
1. Login with username/password to get a session cookie
2. Session cookie is used for subsequent API requests
3. Session expires after inactivity

### Getting Your Credentials

1. Visit: https://www.space-track.org/auth/createAccount
2. Register for a free account
3. Username and password can be stored in `.env` (for server-side) or app settings (for client-side)

---

## 📡 SatNOGS API Configuration

### Required Variables

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `SATNOGS_API_TOKEN` | SatNOGS API token (only needed for write operations) | - | ⚠️ Optional |
| `SATNOGS_BASE_URL` | SatNOGS API base URL | `https://db.satnogs.org/api` | ❌ No |
| `SATNOGS_SATELLITES_ENDPOINT` | Satellites endpoint path | `/satellites` | ❌ No |
| `SATNOGS_TLE_ENDPOINT` | TLE endpoint path | `/tle` | ❌ No |
| `SATNOGS_TRANSMITTERS_ENDPOINT` | Transmitters endpoint path | `/transmitters` | ❌ No |
| `SATNOGS_TELEMETRY_ENDPOINT` | Telemetry endpoint path | `/telemetry` | ❌ No |

**Note**: `SATNOGS_API_TOKEN` is **completely optional** for all read-only operations. According to SatNOGS DB API documentation, authentication is only required for write operations (POST/PUT/DELETE).

All read-only endpoints work without authentication:
- Satellite search
- Satellite list
- TLE data (read-only)
- Transmitters data (read-only)
- Transmitter details (read-only)
- Combined satellite data (read-only)
- Telemetry data (read-only)
- Test connection

Authentication (token) is only required for:
- Writing/updating satellite data
- Creating/modifying transmitters
- Submitting telemetry data

### API Endpoints (used internally)

- **Satellites**: `{BASE_URL}{SATELLITES_ENDPOINT}`
- **TLE**: `{BASE_URL}{TLE_ENDPOINT}`
- **Transmitters**: `{BASE_URL}{TRANSMITTERS_ENDPOINT}` (requires token)
- **Telemetry**: `{BASE_URL}{TELEMETRY_ENDPOINT}` (requires token)

### Authentication

SatNOGS uses **Token-based authentication**:
- Header format: `Authorization: Token {your_token}`
- Token is sent in request body to server proxy, which adds it to headers

### Getting Your API Token

1. Visit: https://db.satnogs.org/api/
2. Register for a free account
3. Generate an API token from your account dashboard
4. Token can be stored in `.env` (for server-side) or app settings (for client-side)

---

## ⚙️ Optional Configuration Variables

### Application Configuration

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `NODE_ENV` | Node environment | `development` |
| `APP_BASE_URL` | Application base URL (for PWA) | `http://localhost:3000` |

### API Request Timeouts (Optional)

These can override defaults in `constants/api.ts`:

| Variable | Description | Default Value (ms) |
|----------|-------------|-------------------|
| `REQUEST_TIMEOUT_DEFAULT` | Default request timeout | `10000` (10s) |
| `REQUEST_TIMEOUT_LONG_RUNNING` | Long-running request timeout | `30000` (30s) |
| `REQUEST_TIMEOUT_QUICK` | Quick request timeout | `5000` (5s) |

### Cache Durations (Optional)

These can override defaults in `constants/api.ts`:

| Variable | Description | Default Value (ms) |
|----------|-------------|-------------------|
| `CACHE_DURATION_SEARCH_RESULTS` | Search results cache | `86400000` (24h) |
| `CACHE_DURATION_TLE_DATA` | TLE data cache | `7200000` (2h) |
| `CACHE_DURATION_TRANSMITTER_DATA` | Transmitter data cache | `21600000` (6h) |
| `CACHE_DURATION_SATELLITE_DATA` | Satellite data cache | `43200000` (12h) |

---

## 📝 Example .env File

```bash
# ============================================================================
# SatTrack - API Configuration
# ============================================================================

# N2YO API (Required)
N2YO_API_KEY=your_n2yo_api_key_here
N2YO_BASE_URL=https://api.n2yo.com/rest/v1/satellite

# Space-Track API (Required for TLE data)
SPACE_TRACK_USERNAME=your_space_track_username
SPACE_TRACK_PASSWORD=your_space_track_password
SPACE_TRACK_BASE_URL=https://www.space-track.org
SPACE_TRACK_LOGIN_ENDPOINT=/ajaxauth/login
SPACE_TRACK_TLE_ENDPOINT=/basicspacedata/query/class/tle_latest
SPACE_TRACK_SATELLITE_DATA_ENDPOINT=/basicspacedata/query/class/satcat

# SatNOGS API (Optional - but required for transmitters/telemetry)
SATNOGS_API_TOKEN=your_satnogs_api_token
SATNOGS_BASE_URL=https://db.satnogs.org/api
SATNOGS_SATELLITES_ENDPOINT=/satellites
SATNOGS_TLE_ENDPOINT=/tle
SATNOGS_TRANSMITTERS_ENDPOINT=/transmitters
SATNOGS_TELEMETRY_ENDPOINT=/telemetry

# Application Configuration (Optional)
NODE_ENV=development
APP_BASE_URL=http://localhost:3000
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** to version control
2. **Two Storage Options**:
   - **`.env` file**: For server-side use (recommended for production)
   - **App Settings**: For client-side use (encrypted in IndexedDB, stored in browser)
3. **Current Implementation**:
   - Credentials are stored in app settings (encrypted in IndexedDB)
   - To use `.env` variables, update code to read from `import.meta.env` (Nuxt 4)
4. **Best Practice**: Use `.env` for server-side API calls, app settings for user-specific credentials

---

## 📚 Current Implementation Status

**Note**: Currently, the application uses hardcoded API endpoints defined in `constants/api.ts`. To use environment variables:

1. Update `constants/api.ts` to read from `process.env` or `import.meta.env`
2. Update server API proxies (`server/api/*.ts`) to use environment variables
3. Ensure Nuxt 4 properly exposes environment variables to the client/server

The following files would need updates:
- `constants/api.ts` - Main API configuration
- `server/api/n2yo.post.ts` - N2YO API proxy
- `server/api/space-track.post.ts` - Space-Track API proxy
- `server/api/satnogs.post.ts` - SatNOGS API proxy

---

## 🔗 API Documentation Links

- **N2YO API**: https://www.n2yo.com/api/
- **Space-Track API**: https://www.space-track.org/documentation
- **SatNOGS API**: https://db.satnogs.org/api/

