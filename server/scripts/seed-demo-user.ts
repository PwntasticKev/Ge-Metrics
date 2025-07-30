import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, subscriptions, userProfits } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { config } from '../src/config/simple';

async function seedDemoUser() {
  // Create database connection
  const client = postgres(config.DATABASE_URL);
  const db = drizzle(client);

  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(users).where(
      eq(users.email, 'demo@example.com')
    ).limit(1);

    if (existingUser.length > 0) {
      console.log('Demo user already exists, deleting and recreating...');
      const userId = existingUser[0].id;
      
      // Delete related records first
      await db.delete(userProfits).where(eq(userProfits.userId, userId));
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      
      console.log('Existing demo user deleted.');
    }
    // Generate password hash for demo user
    const saltRounds = 10;
    const password = 'demopassword123';
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert demo user
    const [newUser] = await db.insert(users).values({
      email: 'demo@example.com',
      username: 'demouser',
      passwordHash,
      salt,
      name: 'Demo User',
      avatar: null,
      googleId: null
    }).returning();

    console.log('Demo user created:', newUser);

    // Create default subscription for demo user
    const [subscription] = await db.insert(subscriptions).values({
      userId: newUser.id,
      status: 'active',
      plan: 'premium',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      cancelAtPeriodEnd: false
    }).returning();

    console.log('Demo subscription created:', subscription);

    // Create user profits entry
    const [userProfit] = await db.insert(userProfits).values({
      userId: newUser.id,
      totalProfit: 0,
      weeklyProfit: 0,
      monthlyProfit: 0,
      totalTrades: 0,
      bestSingleFlip: 0,
      currentRank: null
    }).returning();

    console.log('Demo user profits created:', userProfit);

    console.log('\n=== DEMO USER CREATED SUCCESSFULLY ===');
    console.log('Email: demo@example.com');
    console.log('Username: demouser');
    console.log('Password: demopassword123');
    console.log('Plan: premium');
    console.log('=========================================\n');

  } catch (error) {
    console.error('Error seeding demo user:', error);
  } finally {
    await client.end();
  }
}

// Run the script
seedDemoUser().catch(console.error);
