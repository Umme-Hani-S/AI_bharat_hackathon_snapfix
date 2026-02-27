/* eslint-disable no-console */
const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

const Client = require('../src/models/Client')
const User = require('../src/models/User')
const Department = require('../src/models/Department')
const Category = require('../src/models/Category')
const Site = require('../src/models/Site')
const Issue = require('../src/models/Issue')

const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snapfix'
  await mongoose.connect(uri)
  console.log('✅ Connected to MongoDB')
}

const seedFMClientData = async () => {
  try {
    await connectToDatabase()

    // Find FM client
    const client = await Client.findOne({ email: 'fm@gmail.com' })
    if (!client) {
      console.error('❌ FM client not found. Please create the client first.')
      process.exit(1)
    }

    console.log(`📋 Found client: ${client.companyName} (${client._id})`)

    // Create Departments
    console.log('\n🏢 Creating departments...')
    const departments = []
    const deptNames = ['Maintenance', 'Security', 'Housekeeping', 'IT Support', 'Facilities']
    
    for (const deptName of deptNames) {
      let dept = await Department.findOne({ clientId: client._id, name: deptName })
      if (!dept) {
        dept = await Department.create({
          clientId: client._id,
          name: deptName,
          isCompliance: deptName === 'Security',
        })
        console.log(`   ✓ Created department: ${deptName}`)
      } else {
        console.log(`   ℹ️  Department already exists: ${deptName}`)
      }
      departments.push(dept)
    }

    // Create Sites
    console.log('\n🏗️  Creating sites...')
    const sites = []
    const siteData = [
      { name: 'Main Building', code: 'MB-001', location: '123 Main Street' },
      { name: 'Warehouse', code: 'WH-001', location: '456 Industrial Ave' },
      { name: 'Office Complex', code: 'OC-001', location: '789 Business Park' },
      { name: 'Retail Store', code: 'RS-001', location: '321 Shopping Mall' },
    ]
    
    for (const siteInfo of siteData) {
      let site = await Site.findOne({ clientId: client._id, name: siteInfo.name })
      if (!site) {
        site = await Site.create({
          clientId: client._id,
          name: siteInfo.name,
          code: siteInfo.code,
          location: siteInfo.location,
          timeZone: 'UTC',
          enabled: true,
        })
        console.log(`   ✓ Created site: ${siteInfo.name}`)
        
        // Create general location for the site
        try {
          const { createGeneralLocationForSite } = require('../src/utils/locationHelper')
          await createGeneralLocationForSite(site)
          console.log(`   ✓ Created general location for site: ${siteInfo.name}`)
        } catch (locationError) {
          console.error(`   ⚠️  Failed to create general location for site ${siteInfo.name}:`, locationError.message)
        }
      } else {
        console.log(`   ℹ️  Site already exists: ${siteInfo.name}`)
      }
      sites.push(site)
    }

    // Create Categories
    console.log('\n📁 Creating categories...')
    const categories = []
    const categoryData = [
      { name: 'Electrical', description: 'Electrical issues and repairs' },
      { name: 'Plumbing', description: 'Plumbing and water-related issues' },
      { name: 'HVAC', description: 'Heating, ventilation, and air conditioning' },
      { name: 'Structural', description: 'Building structure and safety issues' },
      { name: 'Cleaning', description: 'Cleaning and maintenance requests' },
      { name: 'Security', description: 'Security and access control issues' },
    ]
    
    for (const catInfo of categoryData) {
      let category = await Category.findOne({ clientId: client._id, name: catInfo.name })
      if (!category) {
        category = await Category.create({
          clientId: client._id,
          name: catInfo.name,
          description: catInfo.description,
        })
        console.log(`   ✓ Created category: ${catInfo.name}`)
      } else {
        console.log(`   ℹ️  Category already exists: ${catInfo.name}`)
      }
      categories.push(category)
    }

    // Create Users with different roles
    console.log('\n👥 Creating users...')
    const users = []

    // Head of Staff
    let headOfStaff = await User.findOne({ clientId: client._id, email: 'headofstaff@fm.com' })
    if (!headOfStaff) {
      headOfStaff = await User.create({
        name: 'John Manager',
        email: 'headofstaff@fm.com',
        password: 'password123',
        clientId: client._id,
        roles: ['head-of-staff'],
        departmentIds: [departments[0]._id, departments[1]._id], // Maintenance & Security
        siteIds: [sites[0]._id, sites[1]._id],
      })
      console.log(`   ✓ Created Head of Staff: ${headOfStaff.name}`)
    } else {
      console.log(`   ℹ️  Head of Staff already exists: ${headOfStaff.name}`)
    }
    users.push(headOfStaff)

    // Field Staff (multiple)
    const fieldStaffData = [
      { name: 'Mike Technician', email: 'mike@fm.com', depts: [departments[0], departments[2]] },
      { name: 'Sarah Worker', email: 'sarah@fm.com', depts: [departments[1], departments[3]] },
      { name: 'Tom Field', email: 'tom@fm.com', depts: [departments[0]] },
    ]
    
    for (const staffData of fieldStaffData) {
      let fieldStaff = await User.findOne({ clientId: client._id, email: staffData.email })
      if (!fieldStaff) {
        fieldStaff = await User.create({
          name: staffData.name,
          email: staffData.email,
          password: 'password123',
          clientId: client._id,
          roles: ['field-staff'],
          departmentIds: staffData.depts.map(d => d._id),
          siteIds: [sites[0]._id, sites[1]._id],
        })
        console.log(`   ✓ Created Field Staff: ${fieldStaff.name}`)
      } else {
        console.log(`   ℹ️  Field Staff already exists: ${fieldStaff.name}`)
      }
      users.push(fieldStaff)
    }

    // Tenants (multiple)
    const tenantData = [
      { name: 'Alice Tenant', email: 'alice@tenant.com' },
      { name: 'Bob Resident', email: 'bob@tenant.com' },
      { name: 'Carol Occupant', email: 'carol@tenant.com' },
    ]
    
    for (const tenantInfo of tenantData) {
      let tenant = await User.findOne({ clientId: client._id, email: tenantInfo.email })
      if (!tenant) {
        tenant = await User.create({
          name: tenantInfo.name,
          email: tenantInfo.email,
          password: 'password123',
          clientId: client._id,
          roles: ['tenants'],
          siteIds: [sites[0]._id],
        })
        console.log(`   ✓ Created Tenant: ${tenant.name}`)
      } else {
        console.log(`   ℹ️  Tenant already exists: ${tenant.name}`)
      }
      users.push(tenant)
    }

    // Vendors (multiple)
    const vendorData = [
      { name: 'ABC Contractors', email: 'abc@vendor.com' },
      { name: 'XYZ Services', email: 'xyz@vendor.com' },
    ]
    
    for (const vendorInfo of vendorData) {
      let vendor = await User.findOne({ clientId: client._id, email: vendorInfo.email })
      if (!vendor) {
        vendor = await User.create({
          name: vendorInfo.name,
          email: vendorInfo.email,
          password: 'password123',
          clientId: client._id,
          roles: ['vendors'],
        })
        console.log(`   ✓ Created Vendor: ${vendor.name}`)
      } else {
        console.log(`   ℹ️  Vendor already exists: ${vendor.name}`)
      }
      users.push(vendor)
    }

    // Create Issues/Tickets
    console.log('\n🎫 Creating issues/tickets...')
    const issues = []
    const issueData = [
      {
        title: 'Broken Window in Room 101',
        description: 'Window pane is cracked and needs replacement. Safety hazard.',
        status: 'open',
        priority: 'high',
        site: sites[0],
        category: categories[3], // Structural
        department: departments[0], // Maintenance
        userId: users.find(u => u.roles.includes('tenants'))?._id,
      },
      {
        title: 'Leaky Faucet in Restroom',
        description: 'Kitchen sink faucet is leaking continuously. Water waste issue.',
        status: 'open',
        priority: 'medium',
        site: sites[0],
        category: categories[1], // Plumbing
        department: departments[0], // Maintenance
        userId: users.find(u => u.roles.includes('tenants'))?._id,
      },
      {
        title: 'AC Not Working - Office Floor 2',
        description: 'Air conditioning unit not cooling. Temperature is too high.',
        status: 'in-progress',
        priority: 'high',
        site: sites[2],
        category: categories[2], // HVAC
        department: departments[0], // Maintenance
        assignedTo: users.find(u => u.roles.includes('field-staff'))?._id,
        userId: users.find(u => u.roles.includes('field-staff'))?._id,
      },
      {
        title: 'Security Camera Offline',
        description: 'Camera 3 in parking lot is not recording. Need immediate attention.',
        status: 'open',
        priority: 'critical',
        site: sites[1],
        category: categories[5], // Security
        department: departments[1], // Security
        userId: users.find(u => u.roles.includes('head-of-staff'))?._id,
      },
      {
        title: 'Elevator Stuck Between Floors',
        description: 'Elevator stopped between 3rd and 4th floor. People trapped inside.',
        status: 'open',
        priority: 'critical',
        site: sites[2],
        category: categories[3], // Structural
        department: departments[0], // Maintenance
        userId: users.find(u => u.roles.includes('tenants'))?._id,
      },
      {
        title: 'Cleaning Request - Conference Room',
        description: 'Conference room needs deep cleaning before important meeting tomorrow.',
        status: 'open',
        priority: 'medium',
        site: sites[2],
        category: categories[4], // Cleaning
        department: departments[2], // Housekeeping
        userId: users.find(u => u.roles.includes('field-staff'))?._id,
      },
      {
        title: 'WiFi Connection Issues',
        description: 'Internet connectivity problems in the east wing. Multiple users affected.',
        status: 'in-progress',
        priority: 'high',
        site: sites[2],
        category: categories[2], // Using HVAC as placeholder, could add IT category
        department: departments[3], // IT Support
        assignedTo: users.find(u => u.roles.includes('vendors'))?._id,
        userId: users.find(u => u.roles.includes('head-of-staff'))?._id,
      },
      {
        title: 'Parking Lot Lights Out',
        description: 'Several parking lot lights are not working. Safety concern for night shift.',
        status: 'open',
        priority: 'high',
        site: sites[1],
        category: categories[0], // Electrical
        department: departments[0], // Maintenance
        userId: users.find(u => u.roles.includes('field-staff'))?._id,
      },
      {
        title: 'Resolved: Broken Door Handle',
        description: 'Main entrance door handle was broken. Fixed and tested.',
        status: 'resolved',
        priority: 'low',
        site: sites[0],
        category: categories[3], // Structural
        department: departments[0], // Maintenance
        resolutionDescription: 'Replaced door handle mechanism. Tested and working properly.',
        resolutionTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        userId: users.find(u => u.roles.includes('field-staff'))?._id,
      },
      {
        title: 'Resolved: Water Heater Repair',
        description: 'Water heater in building A was not heating water properly.',
        status: 'resolved',
        priority: 'medium',
        site: sites[0],
        category: categories[1], // Plumbing
        department: departments[0], // Maintenance
        resolutionDescription: 'Replaced heating element. Water temperature now normal.',
        resolutionTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        assignedTo: users.find(u => u.roles.includes('vendors'))?._id,
        userId: users.find(u => u.roles.includes('head-of-staff'))?._id,
      },
    ]

    for (const issueInfo of issueData) {
      const issue = await Issue.create({
        title: issueInfo.title,
        description: issueInfo.description,
        status: issueInfo.status,
        priority: issueInfo.priority,
        site: issueInfo.site._id,
        category: issueInfo.category._id,
        department: issueInfo.department._id,
        clientId: client._id,
        userId: issueInfo.userId,
        assignedTo: issueInfo.assignedTo || null,
        resolutionDescription: issueInfo.resolutionDescription || null,
        resolutionTime: issueInfo.resolutionTime || null,
      })
      console.log(`   ✓ Created issue: ${issue.title} (${issue.status})`)
      issues.push(issue)
    }

    // Summary
    console.log('\n📊 Summary:')
    console.log(`   Client: ${client.companyName}`)
    console.log(`   Departments: ${departments.length}`)
    console.log(`   Sites: ${sites.length}`)
    console.log(`   Categories: ${categories.length}`)
    console.log(`   Users: ${users.length}`)
    console.log(`   Issues: ${issues.length}`)
    console.log('\n✅ FM client data seeded successfully!')
    
    console.log('\n📝 Test Credentials:')
    console.log('   Client Admin: fm@gmail.com / password123')
    console.log('   Head of Staff: headofstaff@fm.com / password123')
    console.log('   Field Staff: mike@fm.com / password123')
    console.log('   Tenant: alice@tenant.com / password123')
    console.log('   Vendor: abc@vendor.com / password123')

    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to seed FM client data:', error)
    process.exit(1)
  }
}

seedFMClientData()

