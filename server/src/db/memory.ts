// In-memory database for testing without PostgreSQL
export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  salt?: string;
  googleId?: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// In-memory storage
const users: User[] = []
const refreshTokens: RefreshToken[] = []

// Helper function to generate UUID
function generateId (): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Master user for testing
const MASTER_USER: User = {
  id: 'master-user-id',
  email: 'admin@test.com',
  passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5cKe9Ys8Gu', // password: "admin123"
  salt: '$2a$12$LQv3c1yqBWVHxkd0LHAkCO',
  name: 'Admin User',
  avatar: undefined,
  createdAt: new Date(),
  updatedAt: new Date()
}

// Initialize with master user
users.push(MASTER_USER)

export const memoryDb = {
  users: {
    findByEmail: async (email: string): Promise<User | null> => {
      return users.find(u => u.email === email) || null
    },

    findById: async (id: string): Promise<User | null> => {
      return users.find(u => u.id === id) || null
    },

    create: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
      const user: User = {
        ...userData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      users.push(user)
      return user
    },

    update: async (id: string, updates: Partial<User>): Promise<User | null> => {
      const index = users.findIndex(u => u.id === id)
      if (index === -1) return null

      users[index] = {
        ...users[index],
        ...updates,
        updatedAt: new Date()
      }
      return users[index]
    }
  },

  refreshTokens: {
    findByToken: async (token: string): Promise<RefreshToken | null> => {
      return refreshTokens.find(rt => rt.token === token) || null
    },

    create: async (tokenData: Omit<RefreshToken, 'id' | 'createdAt'>): Promise<RefreshToken> => {
      const refreshToken: RefreshToken = {
        ...tokenData,
        id: generateId(),
        createdAt: new Date()
      }
      refreshTokens.push(refreshToken)
      return refreshToken
    },

    deleteByToken: async (token: string): Promise<boolean> => {
      const index = refreshTokens.findIndex(rt => rt.token === token)
      if (index === -1) return false

      refreshTokens.splice(index, 1)
      return true
    },

    deleteByUserId: async (userId: string): Promise<number> => {
      const initialLength = refreshTokens.length
      const filtered = refreshTokens.filter(rt => rt.userId !== userId)
      refreshTokens.length = 0
      refreshTokens.push(...filtered)
      return initialLength - refreshTokens.length
    }
  }
}
