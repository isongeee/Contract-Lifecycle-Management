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

    const query = supabaseAdmin
      .from('contracts')
      .select(`
        title,
        end_date,
        owner:users (
          first_name,
          last_name
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'Active')
      .order('end_date', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    
    const reportData = data.map(c => {
      const owner = c.owner as { first_name: string, last_name: string } | null;
      const endDate = new Date(c.end_date);
      const quarter = `Q${Math.floor(endDate.getMonth() / 3) + 1} ${endDate.getFullYear()}`;

      return {
        "Owner": owner ? `${owner.first_name} ${owner.last_name}` : 'Unassigned',
        "Quarter": quarter,
        "Contract": c.title,
        "End Date": c.end_date,
      };
    });

    return new Response(JSON.stringify(reportData), {
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