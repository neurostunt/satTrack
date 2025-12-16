/**
 * Create PWA icons with blue satellite theme
 * Generates 192x192 and 512x512 icons with satellite design
 * Run with: node scripts/create-icons.js
 */

const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

function createPNGIcon(size, outputPath) {
  const png = new PNG({
    width: size,
    height: size,
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true
  })

  const centerX = size / 2
  const centerY = size / 2

  // Colors
  const bgDark = { r: 15, g: 23, b: 42, a: 255 } // space-950
  const bluePrimary = { r: 14, g: 165, b: 233, a: 255 } // primary-500 #0ea5e9
  const blueLight = { r: 56, g: 189, b: 248, a: 255 } // primary-400 #38bdf8
  const blueDark = { r: 2, g: 132, b: 199, a: 255 } // primary-600 #0284c7

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)

      // Background gradient
      const gradientFactor = Math.min(1, dist / (size * 0.7))
      const bgR = Math.floor(bgDark.r + (26 - bgDark.r) * gradientFactor)
      const bgG = Math.floor(bgDark.g + (26 - bgDark.g) * gradientFactor)
      const bgB = Math.floor(bgDark.b + (26 - bgDark.b) * gradientFactor)

      png.data[idx] = bgR
      png.data[idx + 1] = bgG
      png.data[idx + 2] = bgB
      png.data[idx + 3] = 255

      // Orbit rings (blue, semi-transparent)
      const ring1Radius = size * 0.35
      const ring2Radius = size * 0.45
      const ringWidth = size * 0.02

      if (Math.abs(dist - ring1Radius) < ringWidth || Math.abs(dist - ring2Radius) < ringWidth) {
        const alpha = 0.6
        png.data[idx] = Math.floor(bluePrimary.r * alpha + bgR * (1 - alpha))
        png.data[idx + 1] = Math.floor(bluePrimary.g * alpha + bgG * (1 - alpha))
        png.data[idx + 2] = Math.floor(bluePrimary.b * alpha + bgB * (1 - alpha))
      }

      // Satellite body (blue cube/box shape)
      const satSize = size * 0.12
      const satX = centerX + Math.cos(angle) * ring1Radius
      const satY = centerY + Math.sin(angle) * ring1Radius

      if (Math.abs(x - satX) < satSize && Math.abs(y - satY) < satSize) {
        const satDx = (x - satX) / satSize
        const satDy = (y - satY) / satSize

        // Create a 3D cube effect
        if (Math.abs(satDx) + Math.abs(satDy) < 1.2) {
          const brightness = 1 - (Math.abs(satDx) + Math.abs(satDy)) * 0.3
          png.data[idx] = Math.floor(blueLight.r * brightness)
          png.data[idx + 1] = Math.floor(blueLight.g * brightness)
          png.data[idx + 2] = Math.floor(blueLight.b * brightness)
        } else {
          png.data[idx] = bluePrimary.r
          png.data[idx + 1] = bluePrimary.g
          png.data[idx + 2] = bluePrimary.b
        }
      }

      // Central satellite (larger, more detailed)
      const centerRadius = size * 0.15
      if (dist < centerRadius) {
        const normalizedDist = dist / centerRadius
        const brightness = 1 - normalizedDist * 0.4

        // Satellite shape (rectangular with solar panels)
        const isBody = Math.abs(dx) < centerRadius * 0.6 && Math.abs(dy) < centerRadius * 0.4
        const isPanel = !isBody && (Math.abs(dx) < centerRadius * 0.8 && Math.abs(dy) < centerRadius * 0.3)

        if (isBody) {
          png.data[idx] = Math.floor(bluePrimary.r * brightness)
          png.data[idx + 1] = Math.floor(bluePrimary.g * brightness)
          png.data[idx + 2] = Math.floor(bluePrimary.b * brightness)
        } else if (isPanel) {
          png.data[idx] = Math.floor(blueLight.r * brightness * 0.8)
          png.data[idx + 1] = Math.floor(blueLight.g * brightness * 0.8)
          png.data[idx + 2] = Math.floor(blueLight.b * brightness * 0.8)
        }
      }

      // Stars (deterministic small blue dots)
      const starHash = ((x * 7 + y * 11) % 1000) / 1000
      if (dist > size * 0.5 && starHash < 0.008) {
        png.data[idx] = blueLight.r
        png.data[idx + 1] = blueLight.g
        png.data[idx + 2] = blueLight.b
        png.data[idx + 3] = 200
      }
    }
  }

  png.pack().pipe(fs.createWriteStream(outputPath))

  return new Promise((resolve, reject) => {
    png.on('end', () => {
      console.log(`✅ Created ${outputPath} (${size}x${size})`)
      resolve()
    })
    png.on('error', reject)
  })
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public')

  try {
    await Promise.all([
      createPNGIcon(192, path.join(publicDir, 'icon-192x192.png')),
      createPNGIcon(512, path.join(publicDir, 'icon-512x512.png'))
    ])

    console.log('\n✅ Icons created successfully!')
    console.log('These are proper-sized icons that will pass browser validation.')
    console.log('For production, replace with branded icons:')
    console.log('  - https://faviconify.online')
    console.log('  - https://realfavicongenerator.net')
  } catch (error) {
    console.error('❌ Error creating icons:', error)
    process.exit(1)
  }
}

main()
