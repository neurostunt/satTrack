/**
 * Satellite Image Utilities
 * Handles satellite images from SatNOGS API
 */

/**
 * Converts SatNOGS relative image path to full URL
 * SatNOGS returns paths like "satellites/ISS.jpg" which need to be converted to
 * full URLs like "https://db.satnogs.org/media/satellites/ISS.jpg"
 */
export function getSatnogsImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath || typeof imagePath !== 'string') {
    return null
  }
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // Convert relative path to full URL
  // SatNOGS images are served from /media/ path
  const baseUrl = 'https://db.satnogs.org/media'
  return `${baseUrl}/${imagePath}`
}
