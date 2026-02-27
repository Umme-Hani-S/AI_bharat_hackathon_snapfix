/* eslint-disable no-console */
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const Client = require('../src/models/Client')
const User = require('../src/models/User')
const Department = require('../src/models/Department')
const Category = require('../src/models/Category')
const Site = require('../src/models/Site')

const sampleClients = [
  {
    name: 'Acme Facilities',
    email: 'acme-owner@snapfix.com',
    password: 'AcmePass123!',
    phone: '+1 555 0100',
    companyName: 'Acme Facilities Inc.',
    subscriptionTier: 'enterprise',
    departments: ['General', 'Maintenance', 'Security'],
    categories: [
      { name: 'Electrical', description: 'Power, wiring, and lighting' },
      { name: 'HVAC', description: 'Heating and cooling systems' },
      { name: 'Plumbing', description: 'Pipes, fixtures, and drainage' },
    ],
    sites: ['Downtown HQ', 'Warehouse West', 'Logistics Hub'],
  },
  {
    name: 'Globex Retail',
    email: 'globex-owner@snapfix.com',
    password: 'GlobexPass123!',
    phone: '+1 555 0200',
    companyName: 'Globex Retail Group',
    subscriptionTier: 'professional',
    departments: ['General', 'Operations', 'Customer Experience'],
    categories: [
      { name: 'Storefront', description: 'Front-of-house issues' },
      { name: 'Back Office', description: 'Administrative areas' },
      { name: 'IT & POS', description: 'Point-of-sale and IT equipment' },
    ],
    sites: ['Flagship Store', 'Mall Outlet', 'Airport Kiosk'],
  },
]

const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snapfix'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')
}

const ensureDepartment = async (clientId, name) => {
  await Department.findOneAndUpdate(
    { clientId, name },
    {
      $setOnInsert: {
        clientId,
        name,
        enabled: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

const ensureCategory = async (clientId, { name, description }) => {
  await Category.findOneAndUpdate(
    { clientId, name },
    {
      $setOnInsert: {
        clientId,
        name,
        description: description || '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

const ensureSite = async (clientId, name) => {
  await Site.findOneAndUpdate(
    { clientId, name },
    {
      $setOnInsert: {
        clientId,
        name,
        enabled: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

const ensureClientAdmin = async ({ clientId, name, email, password }) => {
  const existingAdmin = await User.findOne({ clientId, isClientAdmin: true })
  if (existingAdmin) {
    return existingAdmin
  }

  return User.create({
    name,
    email,
    password,
    isClientAdmin: true,
    isSuperAdmin: false,
    isSaasOwner: false,
    clientId,
  })
}

const ensureSaasOwner = async () => {
  let saasOwner = await User.findOne({ isSaasOwner: true })
  
  if (!saasOwner) {
    saasOwner = await User.create({
      name: 'SaaS Owner',
      email: 'admin@snapfix.com',
      password: 'admin123',
      isSaasOwner: true,
      isSuperAdmin: false,
      isClientAdmin: false,
    })
    console.log('👑 Created SaaS owner user')
  }
  
  return saasOwner
}

const seedClient = async (clientDefinition, createdByUserId) => {
  const { name, email, phone, companyName, subscriptionTier, password } = clientDefinition

  let client = await Client.findOne({ email })

  if (!client) {
    client = await Client.create({
      name,
      email,
      phone,
      companyName,
      status: 'active',
      subscriptionTier: subscriptionTier || 'basic',
      createdBy: createdByUserId,
    })
    console.log(`👤 Created client ${companyName}`)
  } else {
    console.log(`ℹ️  Client ${companyName} already exists, reusing`)
  }

  await ensureClientAdmin({
    clientId: client._id,
    name,
    email,
    password,
  })

  const uniqueDepartments = new Set(clientDefinition.departments || [])
  if (!uniqueDepartments.has('General')) {
    uniqueDepartments.add('General')
  }

  await Promise.all(
    Array.from(uniqueDepartments).map((deptName) => ensureDepartment(client._id, deptName))
  )

  await Promise.all(
    (clientDefinition.categories || []).map((category) =>
      ensureCategory(client._id, category)
    )
  )

  await Promise.all(
    (clientDefinition.sites || []).map((siteName) => ensureSite(client._id, siteName))
  )
}

const seedSampleData = async () => {
  try {
    await connectToDatabase()
    
    // Ensure we have a SaaS owner to use as createdBy
    const saasOwner = await ensureSaasOwner()
    
    for (const client of sampleClients) {
      await seedClient(client, saasOwner._id)
    }
    console.log('🎉 Sample data seeded successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to seed sample data:', error)
    process.exit(1)
  }
}

seedSampleData()

