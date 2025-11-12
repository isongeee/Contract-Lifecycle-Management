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
    const { term, companyId } = await req.json();

    if (!term || !companyId) {
      throw new Error("Search term and company ID are required.");
    }
    
    // Convert search term to a format suitable for tsquery
    // 'word1 word2' becomes 'word1 & word2'
    const query = term.trim().split(/\s+/).join(' & ');

    // This RPC function assumes you have a text search vector on contract_versions.content
    // Example migration:
    // ALTER TABLE contract_versions ADD COLUMN fts tsvector
    //   GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
    // CREATE INDEX contract_versions_fts_idx ON contract_versions USING GIN (fts);
    
    // We will use a direct query here, assuming the 'fts' column exists.
    const { data, error } = await supabaseAdmin
      .from('contract_versions')
      .select(`
        id,
        version_number,
        contract:contracts (
          id,
          title,
          counterparty:counterparties ( name )
        ),
        content
      `)
      .eq('company_id', companyId)
      // The .textSearch() method handles ts_vector conversion internally
      .textSearch('content', query, {
          type: 'websearch',
          config: 'english'
      });

    if (error) throw error;
    
    // Manually create snippets since ts_headline isn't directly available in the client lib
    const results = data.map(v => {
      const regex = new RegExp(term.trim().split(/\s+/).join('|'), 'gi');
      const match = v.content.match(regex);
      let snippet = '...no relevant snippet found...';
      if (match && match.index) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(v.content.length, match.index + match[0].length + 50);
          snippet = `${start > 0 ? '...' : ''}${v.content.substring(start, end)}${end < v.content.length ? '...' : ''}`;
      }
      
      return {
        contractId: v.contract.id,
        contractTitle: v.contract.title,
        counterpartyName: v.contract.counterparty.name,
        versionId: v.id,
        versionNumber: v.version_number,
        snippet: snippet.replace(/\n/g, ' '),
      };
    });


    return new Response(JSON.stringify(results), {
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