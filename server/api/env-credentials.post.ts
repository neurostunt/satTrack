/**
 * Server API: Return credentials from process.env
 * Bypasses runtimeConfig which may not receive .env values in some Nuxt/Vite setups.
 * Server reads process.env directly when handling requests.
 * Uses POST to match project convention (all api/* routes are POST).
 */
import 'dotenv/config'

export default defineEventHandler(() => {
  const satnogsToken =
    process.env.NUXT_PUBLIC_SATNOGS_TOKEN ||
    process.env.SATNOGS_API_TOKEN ||
    ''
  const n2yoApiKey =
    process.env.NUXT_PUBLIC_N2YO_API_KEY ||
    process.env.N2YO_API_KEY ||
    ''
  const spaceTrackUsername =
    process.env.NUXT_PUBLIC_SPACE_TRACK_USERNAME ||
    process.env.SPACE_TRACK_USERNAME ||
    ''
  const spaceTrackPassword =
    process.env.NUXT_PUBLIC_SPACE_TRACK_PASSWORD ||
    process.env.SPACE_TRACK_PASSWORD ||
    ''

  return {
    spaceTrackUsername,
    spaceTrackPassword,
    satnogsToken,
    n2yoApiKey
  }
})
