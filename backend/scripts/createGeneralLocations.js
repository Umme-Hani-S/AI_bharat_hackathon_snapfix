const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const Site = require('../src/models/Site')
const Location = require('../src/models/Location')
const { createGeneralLocationForSite } = require('../src/utils/locationHelper')

const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snapfix'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')
}


const createGeneralLocationsForAllSites = async () => {
  try {
    console.log('🔄 Starting migration: Creating general locations for all sites...')
    
    // Find all sites
    const sites = await Site.find({}).lean()
    console.log(`📊 Found ${sites.length} sites`)
    
    if (sites.length === 0) {
      console.log('✅ No sites found. Migration complete!')
      return
    }

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const site of sites) {
      try {
        const existing = await Location.findOne({
          siteId: site._id,
          name: 'General',
          clientId: site.clientId,
        })

        if (existing) {
          skippedCount++
          console.log(`   ⏭️  General location already exists for site: ${site.name} (ID: ${site._id})`)
          continue
        }

        await createGeneralLocationForSite(site)
        createdCount++
      } catch (error) {
        errorCount++
        console.error(`   ❌ Failed to create general location for site ${site.name} (ID: ${site._id}):`, error.message)
      }
    }
    
    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Created: ${createdCount} general locations`)
    console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

const runMigration = async () => {
  try {
    await connectToDatabase()
    await createGeneralLocationsForAllSites()
    await mongoose.connection.close()
    console.log('✅ Database connection closed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

runMigration()

