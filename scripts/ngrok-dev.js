#!/usr/bin/env node

/**
 * Script to start ngrok tunnel, display QR code, then start nuxt dev
 */

const qrcode = require('qrcode-terminal')
const http = require('http')

const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels'

// Function to get ngrok URL from local API
function getNgrokUrl(retries = 15, delay = 1000) {
  return new Promise((resolve) => {
    let attempts = 0

    const tryGetUrl = () => {
      attempts++

      const req = http.get(NGROK_API_URL, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const json = JSON.parse(data)

            if (json.tunnels && json.tunnels.length > 0) {
              // Prefer HTTPS tunnel if available
              const httpsTunnel = json.tunnels.find(t => t.proto === 'https')
              const tunnel = httpsTunnel || json.tunnels[0]
              resolve(tunnel.public_url)
              return
            }
          } catch (_error) {
            // JSON parse error, continue retrying
          }

          // If no valid URL found and more retries available
          if (attempts < retries) {
            setTimeout(tryGetUrl, delay)
          } else {
            resolve(null)
          }
        })
      })

      req.on('error', () => {
        // ngrok API not ready yet, wait and retry
        if (attempts < retries) {
          setTimeout(tryGetUrl, delay)
        } else {
          resolve(null)
        }
      })

      req.setTimeout(2000, () => {
        req.destroy()
        if (attempts < retries) {
          setTimeout(tryGetUrl, delay)
        } else {
          resolve(null)
        }
      })
    }

    tryGetUrl()
  })
}

// Function to display QR code and URL
function displayQRCode(url) {
  console.log('\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌐  ngrok Tunnel - Scan QR Code or Open URL')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`\n🔗 URL: ${url}\n`)

  // Generate QR code
  qrcode.generate(url, { small: true }, (qr) => {
    console.log(qr)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  })
}

// Main function
async function main() {
  console.log('🚀 Waiting for ngrok to start...')

  // Wait for ngrok API to be ready and get URL
  const url = await getNgrokUrl()

  if (url) {
    displayQRCode(url)
  } else {
    console.log('⚠️  Could not retrieve ngrok URL. Make sure ngrok is running.')
    console.log('   ngrok should be started separately or via concurrently.\n')
  }
}

// Run main function
main().catch(console.error)
