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

    // Use an RPC function for aggregation
    const { data, error } = await supabaseAdmin.rpc('report_value_by_counterparty', {
      p_company_id: companyId
    });

    if (error) throw error;
    
    const formattedData = data.map((row: any) => ({
      'Counterparty Type': row.counterparty_type,
      'Total Value': row.total_value,
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

  CREATE OR REPLACE FUNCTION report_value_by_counterparty(p_company_id uuid)
  RETURNS TABLE ("counterparty_type" text, "total_value" numeric, "contract_count" bigint) AS $$
  BEGIN
    RETURN QUERY
    SELECT
      cp.type,
      SUM(c.value) as total_value,
      COUNT(c.id) as contract_count
    FROM
      contracts c
    JOIN
      counterparties cp ON c.counterparty_id = cp.id
    WHERE
      c.company_id = p_company_id
    GROUP BY
      cp.type
    ORDER BY
      total_value DESC;
  END;
  $$ LANGUAGE plpgsql;

*/