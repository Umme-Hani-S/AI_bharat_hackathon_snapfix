const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI
    
    if (!mongoURI) {
      console.error('❌ MongoDB connection error: MONGODB_URI is not defined in environment variables')
      console.error('Please add MONGODB_URI to your .env file')
      process.exit(1)
    }

    const conn = await mongoose.connect(mongoURI)
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message)
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Authentication failed. Please check:')
      console.error('   1. Your MongoDB username and password in the connection string')
      console.error('   2. Make sure your IP is whitelisted in MongoDB Atlas')
      console.error('   3. Verify your connection string format:')
      console.error('      mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority')
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Network error. Please check:')
      console.error('   1. Your internet connection')
      console.error('   2. MongoDB Atlas cluster is running')
      console.error('   3. Your connection string is correct')
    }
    
    process.exit(1)
  }
}

module.exports = connectDB

