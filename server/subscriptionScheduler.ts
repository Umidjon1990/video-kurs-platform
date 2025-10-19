import { storage } from "./storage";

/**
 * Check subscriptions and send notifications for expiring ones
 * This should be called periodically (e.g., daily via cron)
 */
export async function checkExpiringSubscriptions() {
  try {
    console.log("[Subscription Scheduler] Checking expiring subscriptions...");
    
    // Check for subscriptions expiring in 7 days
    const expiring7Days = await storage.getExpiringSubscriptions(7);
    for (const item of expiring7Days) {
      const daysRemaining = Math.ceil(
        (new Date(item.subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      // Only send notification if exactly 7, 3, or 1 days remaining
      if (daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1) {
        await storage.createNotification({
          userId: item.subscription.userId,
          type: 'warning',
          title: 'Obuna muddati tugayapti',
          message: `${item.course.title} kursi bo'yicha obuna muddatingiz ${daysRemaining} kundan keyin tugaydi. Iltimos, o'qituvchi bilan bog'laning.`,
          relatedId: item.subscription.id,
        });
        
        console.log(`[Subscription Scheduler] Sent ${daysRemaining}-day expiration warning to user ${item.user.email}`);
      }
    }
    
    // Update expired subscriptions
    await storage.checkAndUpdateExpiredSubscriptions();
    console.log("[Subscription Scheduler] Expired subscriptions updated");
    
    return { success: true };
  } catch (error) {
    console.error("[Subscription Scheduler] Error:", error);
    throw error;
  }
}

/**
 * Start the subscription scheduler
 * Runs every 24 hours
 */
export function startSubscriptionScheduler() {
  // Run immediately on startup
  checkExpiringSubscriptions().catch(console.error);
  
  // Then run every 24 hours
  setInterval(() => {
    checkExpiringSubscriptions().catch(console.error);
  }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  
  console.log("[Subscription Scheduler] Started - will run every 24 hours");
}
