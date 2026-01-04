/**
 * Scheduled Edge Function to send habit reminder notifications
 *
 * This function runs every 15 minutes via cron and:
 * 1. Finds users whose reminder time has arrived (based on their timezone)
 * 2. Checks which habits have active streaks (currentStreak > 0) and aren't completed today
 * 3. Sends push notifications to all of the user's registered devices
 *
 * Deploy: supabase functions deploy send-habit-reminders
 * Test: supabase functions invoke send-habit-reminders --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification, isConfigured } from '../_shared/web-push.ts';

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserWithPrefs {
  user_id: string;
  reminder_time: string;
  timezone: string;
}

interface HabitLog {
  date: string;
  completed: boolean;
}

interface HabitWithLogs {
  id: string;
  name: string;
  user_id: string;
  habit_logs: HabitLog[];
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

Deno.serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if VAPID keys are configured
  if (!isConfigured()) {
    return new Response(
      JSON.stringify({ error: 'VAPID keys not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running habit reminders check`);

    // Step 1: Find users whose reminder time window has arrived
    const usersToNotify = await findUsersToNotify(now);
    console.log(`Found ${usersToNotify.length} users to potentially notify`);

    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to notify', processed: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: For each user, check habits with active streaks
    const results = {
      processed: 0,
      notified: 0,
      skipped: 0,
      errors: 0,
    };

    for (const user of usersToNotify) {
      try {
        const pendingHabits = await getPendingHabitsWithStreaks(user.user_id);

        if (pendingHabits.length === 0) {
          results.skipped++;
          results.processed++;
          continue; // No habits need reminding
        }

        // Step 3: Send push notification
        const success = await sendHabitReminder(user.user_id, pendingHabits);

        if (success) {
          results.notified++;
        } else {
          results.skipped++;
        }
        results.processed++;
      } catch (err) {
        console.error(`Error processing user ${user.user_id}:`, err);
        results.errors++;
        results.processed++;
      }
    }

    console.log(`Completed: ${JSON.stringify(results)}`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Find users whose reminder time falls within the current 15-minute window
 */
async function findUsersToNotify(now: Date): Promise<UserWithPrefs[]> {
  // Get all users with reminders enabled
  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('user_id, reminder_time, timezone')
    .eq('habit_reminders_enabled', true);

  if (error) throw error;
  if (!preferences) return [];

  // Filter to users whose local time matches their reminder time (within 15 min window)
  return preferences.filter((pref) => {
    try {
      // Get current time in user's timezone
      const userTimeStr = now.toLocaleString('en-US', {
        timeZone: pref.timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      });

      // Parse the time string (format: "HH:MM")
      const [userHourStr, userMinuteStr] = userTimeStr.split(':');
      const userHour = parseInt(userHourStr, 10);
      const userMinute = parseInt(userMinuteStr, 10);

      // Parse reminder time (HH:MM:SS)
      const [reminderHourStr, reminderMinuteStr] = pref.reminder_time.split(':');
      const reminderHour = parseInt(reminderHourStr, 10);
      const reminderMinute = parseInt(reminderMinuteStr, 10);

      // Check if within 15-minute window (for cron running every 15 mins)
      const userMinutes = userHour * 60 + userMinute;
      const reminderMinutes = reminderHour * 60 + reminderMinute;

      // Window: reminder time to reminder time + 14 minutes
      return userMinutes >= reminderMinutes && userMinutes < reminderMinutes + 15;
    } catch (err) {
      console.error(`Invalid timezone for user ${pref.user_id}: ${pref.timezone}`, err);
      return false;
    }
  });
}

/**
 * Get habits with active streaks that haven't been completed today
 */
async function getPendingHabitsWithStreaks(userId: string): Promise<string[]> {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Fetch all habits for the user
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', userId);

  if (habitsError) throw habitsError;
  if (!habits || habits.length === 0) return [];

  // Fetch recent logs for these habits
  const habitIds = habits.map((h) => h.id);
  const { data: logs, error: logsError } = await supabase
    .from('habit_logs')
    .select('habit_id, date, completed')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', thirtyDaysAgo)
    .in('habit_id', habitIds);

  if (logsError) throw logsError;

  // Group logs by habit
  const logsByHabit: Record<string, Set<string>> = {};
  for (const log of logs || []) {
    if (!logsByHabit[log.habit_id]) {
      logsByHabit[log.habit_id] = new Set();
    }
    logsByHabit[log.habit_id].add(log.date);
  }

  // Calculate streaks and filter
  const pendingHabits: string[] = [];

  for (const habit of habits) {
    const completedDates = logsByHabit[habit.id] || new Set();

    // Check if completed today
    if (completedDates.has(today)) {
      continue; // Already done today
    }

    // Calculate current streak (from yesterday backwards)
    let streak = 0;
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

    while (completedDates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Only notify if there's an active streak to protect
    if (streak > 0) {
      pendingHabits.push(habit.name);
    }
  }

  return pendingHabits;
}

/**
 * Send push notification to all user devices
 */
async function sendHabitReminder(userId: string, habitNames: string[]): Promise<boolean> {
  // Get user's push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  if (!subscriptions || subscriptions.length === 0) {
    console.log(`User ${userId} has no push subscriptions`);
    return false;
  }

  // Build notification
  const habitList =
    habitNames.length <= 3
      ? habitNames.join(', ')
      : `${habitNames.slice(0, 2).join(', ')} and ${habitNames.length - 2} more`;

  const payload = {
    title: 'Habit Reminder',
    body: `Don't break your streak! Complete: ${habitList}`,
    icon: '/MyDash/pwa-192x192.png',
    badge: '/MyDash/pwa-192x192.png',
    tag: 'habit-reminder',
    data: {
      url: '/MyDash/habits',
      habitCount: habitNames.length,
    },
  };

  // Send to all devices
  let anySuccess = false;
  const expiredEndpoints: string[] = [];

  for (const sub of subscriptions as PushSubscriptionRow[]) {
    const result = await sendPushNotification(
      {
        endpoint: sub.endpoint,
        p256dh_key: sub.p256dh_key,
        auth_key: sub.auth_key,
      },
      payload
    );

    if (result.success) {
      anySuccess = true;
      // Update last_used_at
      await supabase
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', sub.id);
    } else if (result.statusCode === 404 || result.statusCode === 410) {
      // Subscription expired, mark for deletion
      expiredEndpoints.push(sub.endpoint);
    } else {
      console.error(`Failed to send to ${sub.endpoint}:`, result.error);
    }
  }

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', expiredEndpoints);
    console.log(`Cleaned up ${expiredEndpoints.length} expired subscriptions`);
  }

  // Log notification
  await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: 'habit_reminder',
    title: payload.title,
    body: payload.body,
    status: anySuccess ? 'sent' : 'failed',
    sent_at: anySuccess ? new Date().toISOString() : null,
  });

  return anySuccess;
}
