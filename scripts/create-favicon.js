const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

function createFavicon(size, outputPath) {
  const png = new PNG({
    width: size,
    height: size,
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true
  })

  const centerX = size / 2
  const centerY = size / 2

  const bgDark = { r: 15, g: 23, b: 42, a: 255 }
  const bluePrimary = { r: 14, g: 165, b: 233, a: 255 }
  const blueLight = { r: 56, g: 189, b: 248, a: 255 }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)

      png.data[idx] = bgDark.r
      png.data[idx + 1] = bgDark.g
      png.data[idx + 2] = bgDark.b
      png.data[idx + 3] = 255

      // Simplified satellite icon for small favicon
      const satRadius = size * 0.25
      if (dist < satRadius) {
        const normalizedDist = dist / satRadius
        const brightness = 1 - normalizedDist * 0.3

        const isBody = Math.abs(dx) < satRadius * 0.6 && Math.abs(dy) < satRadius * 0.4

        if (isBody) {
          png.data[idx] = Math.floor(bluePrimary.r * brightness)
          png.data[idx + 1] = Math.floor(bluePrimary.g * brightness)
          png.data[idx + 2] = Math.floor(bluePrimary.b * brightness)
        } else {
          png.data[idx] = Math.floor(blueLight.r * brightness)
          png.data[idx + 1] = Math.floor(blueLight.g * brightness)
          png.data[idx + 2] = Math.floor(blueLight.b * brightness)
        }
      }

      // Orbit ring
      const ringRadius = size * 0.4
      if (Math.abs(dist - ringRadius) < size * 0.03) {
        png.data[idx] = bluePrimary.r
        png.data[idx + 1] = bluePrimary.g
        png.data[idx + 2] = bluePrimary.b
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
    await createFavicon(32, path.join(publicDir, 'favicon.png'))
    console.log('\n✅ Favicon created successfully!')
    console.log('Note: Modern browsers support PNG favicons. For ICO format, use an online converter.')
  } catch (error) {
    console.error('❌ Error creating favicon:', error)
    process.exit(1)
  }
}

main()

