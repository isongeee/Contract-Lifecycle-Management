// supabase/functions/update-expired-contracts/index.ts

declare var Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This function is designed to be run as a scheduled cron job (e.g., daily).
// It finds all 'Active' contracts whose end_date has passed and updates their status to 'Expired'.

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
    const today = new Date().toISOString().split('T')[0];

    // Find all contracts that are 'Active' and have an end_date in the past.
    const { data: contractsToExpire, error: fetchError } = await supabaseAdmin
      .from('contracts')
      .select('id')
      .eq('status', 'Active')
      .lt('end_date', today);

    if (fetchError) {
      throw fetchError;
    }

    if (!contractsToExpire || contractsToExpire.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No contracts to expire." }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200,
      });
    }
    
    const idsToExpire = contractsToExpire.map(c => c.id);

    // Update the status of these contracts to 'Expired'.
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        status: 'Expired',
        expired_at: new Date().toISOString(),
      })
      .in('id', idsToExpire)
      .select('id');

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, expiredCount: updatedData?.length || 0 }), {
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
