// FIX: Replaced the `/// <reference>` directive with a `declare` statement to resolve Deno type errors.
// The Deno namespace is globally available in Supabase Edge Functions. This declaration
// informs TypeScript about the 'Deno' global, fixing "Cannot find name 'Deno'" errors
// in environments that are not configured for Deno.
declare var Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { companyId } = await req.json();
    
    // Use an RPC function for complex date calculations
    const { data, error } = await supabaseAdmin.rpc('report_lifecycle_duration', {
      p_company_id: companyId
    });

    if (error) throw error;
    
    const formattedData = data.map((row: any) => ({
      'Stage': row.stage,
      'Average Duration (Days)': parseFloat(row.avg_duration_days).toFixed(1),
      'Number of Contracts': row.contract_count,
    }));


    return new Response(JSON.stringify(formattedData), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});

/* 
  You need to create the following RPC function in your Supabase SQL editor:

  CREATE OR REPLACE FUNCTION report_lifecycle_duration(p_company_id uuid)
  RETURNS TABLE ("stage" text, "avg_duration_days" numeric, "contract_count" bigint) AS $$
  BEGIN
    RETURN QUERY
    WITH durations AS (
      SELECT
        'Draft -> Review' as stage,
        EXTRACT(EPOCH FROM (review_started_at - submitted_at)) / 86400 AS duration
      FROM contracts
      WHERE company_id = p_company_id AND submitted_at IS NOT NULL AND review_started_at IS NOT NULL
      
      UNION ALL
      
      SELECT
        'Review -> Approval' as stage,
        EXTRACT(EPOCH FROM (approval_started_at - review_started_at)) / 86400 AS duration
      FROM contracts
      WHERE company_id = p_company_id AND review_started_at IS NOT NULL AND approval_started_at IS NOT NULL

      UNION ALL

      SELECT
        'Approval -> Signature' as stage,
        EXTRACT(EPOCH FROM (sent_for_signature_at - approval_completed_at)) / 86400 AS duration
      FROM contracts
      WHERE company_id = p_company_id AND approval_completed_at IS NOT NULL AND sent_for_signature_at IS NOT NULL

      UNION ALL

      SELECT
        'Signature -> Executed' as stage,
        EXTRACT(EPOCH FROM (executed_at - sent_for_signature_at)) / 86400 AS duration
      FROM contracts
      WHERE company_id = p_company_id AND sent_for_signature_at IS NOT NULL AND executed_at IS NOT NULL
    )
    SELECT
      d.stage,
      COALESCE(AVG(d.duration), 0) as avg_duration_days,
      COUNT(d.duration) as contract_count
    FROM durations d
    GROUP BY d.stage
    ORDER BY 
      CASE d.stage
        WHEN 'Draft -> Review' THEN 1
        WHEN 'Review -> Approval' THEN 2
        WHEN 'Approval -> Signature' THEN 3
        WHEN 'Signature -> Executed' THEN 4
        ELSE 5
      END;
  END;
  $$ LANGUAGE plpgsql;

*/