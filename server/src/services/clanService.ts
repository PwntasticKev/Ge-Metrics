import { db } from '../db/index.js'
import * as schema from '../db/schema.js'
import { eq, and } from 'drizzle-orm'

export interface Clan {
  id: string
  name: string
  description: string | null
  ownerId: number
  createdAt: Date
  updatedAt: Date
}

export interface ClanMember {
  id: string
  clanId: string
  userId: number
  role: 'owner' | 'officer' | 'member'
  joinedAt: Date
}

export interface ClanInvite {
  id: string
  clanId: string
  inviterId: number
  invitedEmail: string
  invitedUserId?: number
  status: 'pending' | 'accepted' | 'declined'
  message?: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export class ClanService {
  /**
   * Create a new clan
   */
  async createClan (ownerId: number, name: string, description: string): Promise<Clan> {
    try {
      // Check if user already owns a clan
      const existingClan = await db.select().from(schema.clans).where(eq(schema.clans.ownerId, ownerId))
      if (existingClan.length > 0) {
        throw new Error('User already owns a clan')
      }

      // Check if clan name is taken
      const nameExists = await db.select().from(schema.clans).where(eq(schema.clans.name, name))
      if (nameExists.length > 0) {
        throw new Error('Clan name already exists')
      }

      // Create clan
      const [newClan] = await db.insert(schema.clans).values({
        name,
        description,
        ownerId
      }).returning()

      // Add owner as first member
      await db.insert(schema.clanMembers).values({
        clanId: newClan.id,
        userId: ownerId,
        role: 'owner'
      })

      return newClan as unknown as Clan
    } catch (error) {
      console.error('Error creating clan:', error)
      throw error
    }
  }

  /**
   * Get clan by ID
   */
  async getClan (clanId: string): Promise<Clan | null> {
    try {
      const clans = await db.select().from(schema.clans).where(eq(schema.clans.id, clanId))
      return clans.length > 0 ? clans[0] : null
    } catch (error) {
      console.error('Error getting clan:', error)
      throw error
    }
  }

  /**
   * Get clan by name
   */
  async getClanByName (name: string): Promise<Clan | null> {
    try {
      const clans = await db.select().from(schema.clans).where(eq(schema.clans.name, name))
      return clans.length > 0 ? clans[0] : null
    } catch (error) {
      console.error('Error getting clan by name:', error)
      throw error
    }
  }

  /**
   * Get all clans
   */
  async getAllClans (): Promise<Clan[]> {
    try {
      return await db.select().from(schema.clans)
    } catch (error) {
      console.error('Error getting all clans:', error)
      throw error
    }
  }

  /**
   * Update clan information
   */
  async updateClan (clanId: string, updates: Partial<Pick<Clan, 'name' | 'description'>>): Promise<Clan> {
    try {
      const [updatedClan] = await db.update(schema.clans).set({
        ...updates,
        updatedAt: new Date()
      }).where(eq(schema.clans.id, clanId)).returning()

      return updatedClan
    } catch (error) {
      console.error('Error updating clan:', error)
      throw error
    }
  }

  /**
   * Delete clan (only owner can do this)
   */
  async deleteClan (clanId: string, userId: number): Promise<boolean> {
    try {
      const clan = await this.getClan(clanId)
      if (!clan || clan.ownerId !== userId) {
        throw new Error('Only clan owner can delete the clan')
      }

      // Delete all related data
      await db.delete(schema.clanInvites).where(eq(schema.clanInvites.clanId, clanId))
      await db.delete(schema.clanMembers).where(eq(schema.clanMembers.clanId, clanId))
      await db.delete(schema.clans).where(eq(schema.clans.id, clanId))

      return true
    } catch (error) {
      console.error('Error deleting clan:', error)
      throw error
    }
  }

  /**
   * Invite user to clan
   */
  async inviteToClan (clanId: string, inviterId: number, invitedEmail: string, message?: string): Promise<ClanInvite> {
    try {
      // Check if inviter is clan member
      const member = await this.getClanMember(clanId, inviterId)
      if (!member) {
        throw new Error('Only clan members can invite others')
      }

      // Check if user is already a member
      const existingMember = await this.getClanMemberByEmail(clanId, invitedEmail)
      if (existingMember) {
        throw new Error('User is already a clan member')
      }

      // Check if invite already exists
      const existingInvite = await db.select().from(schema.clanInvites).where(
        and(
          eq(schema.clanInvites.clanId, clanId),
          eq(schema.clanInvites.invitedEmail, invitedEmail),
          eq(schema.clanInvites.status, 'pending')
        )
      )

      if (existingInvite.length > 0) {
        throw new Error('Invite already exists for this user')
      }

      // Create invite
      const [newInvite] = await db.insert(schema.clanInvites).values({
        clanId,
        inviterId,
        invitedEmail,
        message,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }).returning()

      return newInvite
    } catch (error) {
      console.error('Error inviting to clan:', error)
      throw error
    }
  }

  /**
   * Accept clan invite
   */
  async acceptClanInvite (inviteId: string, userId: number): Promise<ClanMember> {
    try {
      // Get invite
      const invites = await db.select().from(schema.clanInvites).where(eq(schema.clanInvites.id, inviteId))
      if (invites.length === 0) {
        throw new Error('Invite not found')
      }

      const invite = invites[0]
      if (invite.status !== 'pending') {
        throw new Error('Invite is no longer valid')
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new Error('Invite has expired')
      }

      // Update invite status
      await db.update(schema.clanInvites).set({
        status: 'accepted',
        invitedUserId: userId,
        updatedAt: new Date()
      }).where(eq(schema.clanInvites.id, inviteId))

      // Add user to clan
      const [newMember] = await db.insert(schema.clanMembers).values({
        clanId: invite.clanId,
        userId,
        role: 'member'
      }).returning()

      return newMember
    } catch (error) {
      console.error('Error accepting clan invite:', error)
      throw error
    }
  }

  /**
   * Decline clan invite
   */
  async declineClanInvite (inviteId: string): Promise<boolean> {
    try {
      await db.update(schema.clanInvites).set({
        status: 'declined',
        updatedAt: new Date()
      }).where(eq(schema.clanInvites.id, inviteId))

      return true
    } catch (error) {
      console.error('Error declining clan invite:', error)
      throw error
    }
  }

  /**
   * Get clan members
   */
  async getClanMembers (clanId: string): Promise<ClanMember[]> {
    try {
      return await db.select().from(schema.clanMembers).where(eq(schema.clanMembers.clanId, clanId))
    } catch (error) {
      console.error('Error getting clan members:', error)
      throw error
    }
  }

  /**
   * Get clan member
   */
  async getClanMember (clanId: string, userId: number): Promise<ClanMember | null> {
    try {
      const members = await db.select().from(schema.clanMembers).where(
        and(
          eq(schema.clanMembers.clanId, clanId),
          eq(schema.clanMembers.userId, userId)
        )
      )
      return members.length > 0 ? members[0] : null
    } catch (error) {
      console.error('Error getting clan member:', error)
      throw error
    }
  }

  /**
   * Get clan member by email
   */
  async getClanMemberByEmail (clanId: string, email: string): Promise<ClanMember | null> {
    try {
      // First get user by email
      const users = await db.select().from(schema.users).where(eq(schema.users.email, email))
      if (users.length === 0) {
        return null
      }

      const userId = users[0].id
      return await this.getClanMember(clanId, userId)
    } catch (error) {
      console.error('Error getting clan member by email:', error)
      throw error
    }
  }

  /**
   * Update clan member role
   */
  async updateClanMemberRole (clanId: string, userId: number, newRole: 'owner' | 'officer' | 'member'): Promise<ClanMember> {
    try {
      const [updatedMember] = await db.update(schema.clanMembers).set({
        role: newRole
      }).where(
        and(
          eq(schema.clanMembers.clanId, clanId),
          eq(schema.clanMembers.userId, userId)
        )
      ).returning()

      return updatedMember as unknown as ClanMember
    } catch (error) {
      console.error('Error updating clan member role:', error)
      throw error
    }
  }

  /**
   * Remove member from clan
   */
  async removeClanMember (clanId: string, userId: number, removedBy: number): Promise<boolean> {
    try {
      // Check if remover has permission
      const remover = await this.getClanMember(clanId, removedBy)
      const member = await this.getClanMember(clanId, userId)

      if (!remover || !member) {
        throw new Error('Invalid operation')
      }

      // Only owner can remove officers, owner and officers can remove members
      if (member.role === 'owner') {
        throw new Error('Cannot remove clan owner')
      }

      if (member.role === 'officer' && remover.role !== 'owner') {
        throw new Error('Only owner can remove officers')
      }

      await db.delete(schema.clanMembers).where(
        and(
          eq(schema.clanMembers.clanId, clanId),
          eq(schema.clanMembers.userId, userId)
        )
      )

      return true
    } catch (error) {
      console.error('Error removing clan member:', error)
      throw error
    }
  }

  /**
   * Leave clan
   */
  async leaveClan (clanId: string, userId: number): Promise<boolean> {
    try {
      const member = await this.getClanMember(clanId, userId)
      if (!member) {
        throw new Error('Not a member of this clan')
      }

      if (member.role === 'owner') {
        throw new Error('Clan owner cannot leave. Transfer ownership or delete the clan.')
      }

      await db.delete(schema.clanMembers).where(
        and(
          eq(schema.clanMembers.clanId, clanId),
          eq(schema.clanMembers.userId, userId)
        )
      )

      return true
    } catch (error) {
      console.error('Error leaving clan:', error)
      throw error
    }
  }

  /**
   * Get user's clan
   */
  async getUserClan (userId: number): Promise<{ clan: Clan; member: ClanMember } | null> {
    try {
      const members = await db.select().from(schema.clanMembers).where(eq(schema.clanMembers.userId, userId))
      if (members.length === 0) {
        return null
      }

      const member = members[0]
      const clan = await this.getClan(member.clanId)

      return clan ? { clan, member: member as unknown as ClanMember } : null
    } catch (error) {
      console.error('Error getting user clan:', error)
      throw error
    }
  }

  /**
   * Get pending invites for user
   */
  async getPendingInvites (userId: number): Promise<ClanInvite[]> {
    try {
      // Get user's email
      const users = await db.select().from(schema.users).where(eq(schema.users.id, userId))
      if (users.length === 0) {
        return []
      }

      const userEmail = users[0].email
      return await db.select().from(schema.clanInvites).where(
        and(
          eq(schema.clanInvites.invitedEmail, userEmail || ''),
          eq(schema.clanInvites.status, 'pending')
        )
      ) as unknown as ClanInvite[]
    } catch (error) {
      console.error('Error getting pending invites:', error)
      throw error
    }
  }
}

export default ClanService
