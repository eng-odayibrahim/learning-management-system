import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { connectDatabase } from '../shared/infrastructure/database/connection'
import { UserModel } from '../identity/infrastructure/persistence/UserModel'

async function seedAdmin() {
  try {
    // 1. Connect to Database
    console.log('⏳ Connecting to database...')
    await connectDatabase()

    // 2. Admin details (You can change these values)
    const username = process.env.ADMIN_BOOTSTRAP_USERNAME?.trim().toLowerCase()
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase()
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
    if (!username || !email || !password) {
      throw new Error('ADMIN_BOOTSTRAP_USERNAME, ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required')
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters with upper, lower case and a digit')
    }
    const adminData = {
      username,
      email,
      password,
      fullName: 'System Admin',
      role: 'admin',
      phones: [{ number: '0000000000', relation: 'personal' }],
      isActive: true,
      isSuperAdmin: true,
    }

    // 3. Check if admin already exists
    const existingAdmin = await UserModel.findOne({ username: adminData.username })
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists!')
      process.exit(0)
    }

    // 4. Hash password and create user
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(adminData.password, salt)

    await UserModel.create({
      ...adminData,
      password: hashedPassword,
    })

    console.log('✅ Admin user created successfully!')
    console.log(`👤 Username: ${adminData.username}`)
    
  } catch (error) {
    console.error('❌ Error creating admin:', error)
  } finally {
    // 5. Close connection
    await mongoose.connection.close()
    console.log('🔌 Database connection closed.')
    process.exit(0)
  }
}

seedAdmin()
