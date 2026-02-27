const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const Issue = require('../src/models/Issue')

const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snapfix'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')
}

const migrateClosedToResolved = async () => {
  try {
    console.log('🔄 Starting migration: Converting "closed" issues to "resolved"...')
    
    // Find all issues with status "closed"
    const closedIssues = await Issue.find({ status: 'closed' })
    console.log(`📊 Found ${closedIssues.length} issues with status "closed"`)
    
    if (closedIssues.length === 0) {
      console.log('✅ No issues to migrate. Migration complete!')
      return
    }
    
    // Update all closed issues to resolved
    const result = await Issue.updateMany(
      { status: 'closed' },
      { $set: { status: 'resolved' } }
    )
    
    console.log(`✅ Successfully migrated ${result.modifiedCount} issues from "closed" to "resolved"`)
    console.log('✅ Migration complete!')
  } catch (error) {
    console.error('❌ Migration error:', error)
    throw error
  }
}

const runMigration = async () => {
  try {
    await connectToDatabase()
    await migrateClosedToResolved()
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

