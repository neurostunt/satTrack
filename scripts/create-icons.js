/**
 * Create proper-sized PWA icons (192x192 and 512x512)
 * Run with: node scripts/create-icons.js
 */

const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

// Create a proper-sized PNG icon
function createPNGIcon(size, outputPath) {
  // Create a new PNG with the specified size
  const png = new PNG({
    width: size,
    height: size,
    colorType: 6, // RGBA
    inputColorType: 6,
    inputHasAlpha: true
  })

  // Fill with a dark theme color (#1a1a1a) matching the app theme
  const color = { r: 26, g: 26, b: 26, a: 255 } // #1a1a1a
  
  // Add a simple satellite icon design (white circle in center)
  const centerX = size / 2
  const centerY = size / 2
  const radius = size * 0.3
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      
      // Calculate distance from center
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < radius) {
        // White circle for satellite icon
        png.data[idx] = 255     // R
        png.data[idx + 1] = 255  // G
        png.data[idx + 2] = 255  // B
        png.data[idx + 3] = 255  // A
      } else {
        // Background color
        png.data[idx] = color.r
        png.data[idx + 1] = color.g
        png.data[idx + 2] = color.b
        png.data[idx + 3] = color.a
      }
    }
  }

  // Write the PNG file
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
