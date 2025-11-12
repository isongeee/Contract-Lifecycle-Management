// supabase/functions/update-expired-contracts/index.ts
declare var Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// NOTE: This function is designed to be called by a cron job scheduler.
// To test, you can invoke it manually. In production, schedule it to run daily.
// Example cron schedule for Supabase: `0 0 * * *` (every day at midnight UTC)

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (_req) => {
  // Handle CORS preflight request for manual invocation
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .update({ 
        status: 'Expired',
        expired_at: new Date().toISOString() 
      })
      .eq('status', 'Active')
      .lt('end_date', new Date().toISOString().split('T')[0]) // Less than today's date
      .select();

    if (error) {
      throw error;
    }

    const count = data?.length || 0;
    const message = `Successfully updated ${count} contracts to 'Expired' status.`;
    
    console.log(message);

    return new Response(JSON.stringify({ success: true, message, updatedCount: count }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    });

  } catch (error) {
    console.error('Error updating expired contracts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
       },
      status: 500,
    });
  }
});
