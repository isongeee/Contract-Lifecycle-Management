declare var Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This function is designed to be run as a scheduled cron job (e.g., daily).
// It iterates through all users' notification settings and creates reminders
// for contracts expiring on their configured reminder days.

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (_req) => {
  // Handle CORS preflight request, although not strictly necessary for cron jobs
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 1. Fetch all user notification settings along with user's company and app ID.
    // We join the 'users' table to get company_id and app_id for creating the notification.
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('user_notification_settings')
      .select(`
        *,
        profile:users (
          company_id,
          app_id
        )
      `);

    if (settingsError) throw settingsError;

    let totalNotificationsCreated = 0;

    // 2. Process each user's settings individually.
    for (const setting of settings) {
      // Skip if user profile is missing or user has no reminder days configured.
      if (!setting.profile || !setting.renewal_days_before || setting.renewal_days_before.length === 0) {
        continue;
      }

      // 3. Calculate the specific dates this user wants reminders for.
      const targetDates = setting.renewal_days_before.map((day: number) => {
        const target = new Date(today);
        target.setUTCDate(target.getUTCDate() + day);
        return target.toISOString().split('T')[0];
      });

      // 4. Find 'Active' contracts for this user's company that expire on one of the target dates.
      const { data: contractsToExpire, error: contractsError } = await supabaseAdmin
        .from('contracts')
        .select('id, title, end_date')
        .eq('company_id', setting.profile.company_id)
        .eq('status', 'Active')
        .in('end_date', targetDates);

      if (contractsError) {
        console.error(`Error fetching contracts for company ${setting.profile.company_id}:`, contractsError);
        continue; // Move to the next user's settings
      }

      // 5. If matching contracts are found, create notification records.
      if (contractsToExpire && contractsToExpire.length > 0) {
        const notificationsToInsert = [];

        for (const contract of contractsToExpire) {
          const endDate = new Date(contract.end_date + 'T00:00:00Z');
          const daysRemaining = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Double-check this user wants a reminder for this exact number of days.
          // This ensures if multiple target dates match, we only notify for the correct one.
          if (setting.renewal_days_before.includes(daysRemaining)) {
            // Check if in-app notifications are enabled for renewals
            if (setting.preferences.renewals.inApp) {
              notificationsToInsert.push({
                user_id: setting.user_id,
                type: 'RENEWAL_REMINDER',
                message: `Contract "${contract.title}" is expiring in ${daysRemaining} days on ${contract.end_date}.`,
                related_entity_type: 'contract',
                related_entity_id: contract.id,
                company_id: setting.profile.company_id,
                app_id: setting.profile.app_id,
              });
            }

            // if (setting.preferences.renewals.email) {
            //   // In a real application, you would add logic here to send an email.
            //   // This could be another RPC call or using a service like Resend.
            // }
          }
        }

        // 6. Batch insert the notifications for this user.
        if (notificationsToInsert.length > 0) {
          const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert(notificationsToInsert);
          
          if (insertError) {
            console.error(`Error inserting notifications for user ${setting.user_id}:`, insertError);
          } else {
            totalNotificationsCreated += notificationsToInsert.length;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, notificationsCreated: totalNotificationsCreated }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});
