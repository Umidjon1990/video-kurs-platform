import { db } from "./db";
import { subscriptionPlans } from "@shared/schema";
import { sql } from "drizzle-orm";

/**
 * Ensures that the database has at least one subscription plan.
 * This is critical for the system to function, as course enrollments require a plan.
 * Runs automatically on server startup.
 */
export async function ensureDefaultSubscriptionPlan() {
  try {
    console.log('[DB Init] Checking for subscription plans...');
    
    // Check if any subscription plans exist
    const existingPlans = await db
      .select()
      .from(subscriptionPlans)
      .limit(1);
    
    if (existingPlans.length > 0) {
      console.log(`[DB Init] ✓ Subscription plans found (${existingPlans.length}). Skipping initialization.`);
      return;
    }
    
    // No plans exist - create a default plan
    console.log('[DB Init] ⚠️  No subscription plans found. Creating default plan...');
    
    const [defaultPlan] = await db
      .insert(subscriptionPlans)
      .values({
        name: 'Asosiy Tarif',
        displayName: 'Asosiy Tarif',
        description: 'Standart obuna tarifi - barcha kurslar uchun',
        features: sql`'{"access": "full", "description": "Avtomatik yaratilgan asosiy tarif"}'::jsonb`,
        order: 1,
      })
      .returning();
    
    console.log(`[DB Init] ✓ Default subscription plan created: ${defaultPlan.name} (ID: ${defaultPlan.id})`);
    console.log('[DB Init] System is now ready for course enrollments.');
  } catch (error) {
    console.error('[DB Init] ❌ Failed to initialize database:', error);
    // Don't throw - let the server start, but log the error
    console.error('[DB Init] ⚠️  Course enrollment may not work until a subscription plan is created manually.');
  }
}
