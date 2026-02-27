const Location = require('../models/Location')

/**
 * Generates a unique location code from site name
 * Format: First 2 letters of site name (uppercase) + "G" + unique 3-digit number
 * Example: "Building A" -> "BUG001", "BUG002", etc.
 */
const generateUniqueLocationCode = async (siteName, clientId) => {
  // Get first 2 letters of site name, uppercase, remove spaces
  const siteNamePrefix = siteName
    ?.trim()
    .substring(0, 2)
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/[^A-Z]/g, '') || 'SI' // Default to 'SI' if can't extract letters
  
  const baseCode = `${siteNamePrefix}G`
  
  // Find existing locations with similar codes to generate unique number
  const existingLocations = await Location.find({
    clientId: clientId,
    locationCode: { $regex: `^${baseCode}\\d{3}$` }
  }).select('locationCode').lean()
  
  // Extract existing numbers
  const existingNumbers = existingLocations
    .map(loc => {
      const match = loc.locationCode?.match(/\d{3}$/)
      return match ? parseInt(match[0], 10) : null
    })
    .filter(num => num !== null)
    .sort((a, b) => a - b)
  
  // Find the next available number (001-999)
  let uniqueNumber = 1
  for (let i = 1; i <= 999; i++) {
    if (!existingNumbers.includes(i)) {
      uniqueNumber = i
      break
    }
  }
  
  // Format as 3-digit string (001, 002, etc.)
  const numberStr = uniqueNumber.toString().padStart(3, '0')
  
  return `${baseCode}${numberStr}`
}

/**
 * Creates a general location for a site
 * @param {Object} site - Site object with _id, clientId, name, code, timeZone, latitude, longitude
 * @returns {Promise<Object>} Created location object
 */
const createGeneralLocationForSite = async (site) => {
  try {
    // Check if general location already exists for this site
    const existingLocation = await Location.findOne({
      siteId: site._id,
      name: 'General',
      clientId: site.clientId,
    })

    if (existingLocation) {
      console.log(`General location already exists for site: ${site.name}`)
      return existingLocation
    }

    // Generate location code
    let locationCode
    if (site.code) {
      // If site has code, use {SITE_CODE}-GEN
      locationCode = `${site.code}-GEN`
    } else {
      // If site doesn't have code, generate from site name: first 2 letters + G + unique 3 numbers
      locationCode = await generateUniqueLocationCode(site.name, site.clientId)
    }
    
    // Use same code for shortCode
    const shortCode = locationCode

    const generalLocation = await Location.create({
      clientId: site.clientId,
      siteId: site._id,
      name: 'General',
      locationCode: locationCode,
      shortCode: shortCode,
      timeZone: site.timeZone || 'UTC',
      enabled: true,
      loc: {
        type: 'Point',
        coordinates: site.longitude && site.latitude 
          ? [site.longitude, site.latitude] // GeoJSON format: [longitude, latitude]
          : [0, 0],
      },
    })

    console.log(`Created general location for site: ${site.name}`)
    return generalLocation
  } catch (error) {
    console.error(`Error creating general location for site ${site.name}:`, error.message)
    // Don't throw - allow site creation to succeed even if location creation fails
    return null
  }
}

/**
 * Gets the General location for a site
 * @param {Object|String} siteId - Site ID or Site object
 * @param {Object|String} clientId - Client ID
 * @returns {Promise<Object|null>} General location object or null if not found
 */
const getGeneralLocationForSite = async (siteId, clientId) => {
  try {
    const Location = require('../models/Location')
    const siteIdValue = typeof siteId === 'object' ? siteId._id || siteId : siteId
    
    const generalLocation = await Location.findOne({
      siteId: siteIdValue,
      name: 'General',
      clientId: clientId,
      enabled: true,
    })

    return generalLocation
  } catch (error) {
    console.error('Error getting general location for site:', error.message)
    return null
  }
}

module.exports = {
  createGeneralLocationForSite,
  getGeneralLocationForSite,
}

