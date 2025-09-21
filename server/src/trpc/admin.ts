import { z } from 'zod'
import { adminProcedure, router } from './trpc.js'
import { db, users } from '../db/index.js'
import { desc } from 'drizzle-orm'

export const adminRouter = router({
  // Get all users (admin only)
  getAllUsers: adminProcedure
    .query(async () => {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        username: users.username,
        name: users.name,
        createdAt: users.createdAt,
        emailVerified: users.emailVerified
      }).from(users).orderBy(desc(users.createdAt))
      return allUsers
    })

  // More admin procedures can be added here
  // e.g., managing subscriptions, viewing system logs, etc.
})
