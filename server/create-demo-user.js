import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createDemoUser () {
  try {
    console.log('🔐 Creating demo user...')

    // Hash the demo password
    const passwordHash = await bcrypt.hash('ChangeMe123!', 12)

    // Create demo user
    const demoUser = await prisma.users.upsert({
      where: { email: 'demo@example.com' },
      update: {
        password: passwordHash,
        name: 'Demo User',
        runescape_name: 'DemoPlayer',
        membership: 1,
        access: true,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      },
      create: {
        email: 'demo@example.com',
        password: passwordHash,
        name: 'Demo User',
        runescape_name: 'DemoPlayer',
        membership: 1,
        access: true,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    console.log('✅ Demo user created successfully!')
    console.log('📧 Email: demo@example.com')
    console.log('🔑 Password: ChangeMe123!')
    console.log('👤 Name:', demoUser.name)
  } catch (error) {
    console.error('❌ Error creating demo user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDemoUser()
