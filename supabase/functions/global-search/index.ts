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

// Helper to escape special characters for use in a regular expression.
const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

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
    
    // The search term is passed directly to textSearch, which uses websearch_to_tsquery.
    // This handles multiple words correctly (e.g., 'word1 word2' becomes 'word1' & 'word2').
    const query = term.trim();

    // This function assumes you have a text search vector ('fts') on contract_versions.content
    // as recommended in README.md for performance.
    // Example migration:
    // ALTER TABLE contract_versions ADD COLUMN fts tsvector
    //   GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
    // CREATE INDEX contract_versions_fts_idx ON contract_versions USING GIN (fts);
    
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
      // Use the 'fts' column for performance, and pass the raw term to `websearch` type.
      .textSearch('fts', query, {
          type: 'websearch',
          config: 'english'
      });

    if (error) throw error;
    
    // Manually create snippets since ts_headline isn't directly available in the client lib.
    const results = data
      .map(v => {
        // Safely access nested data and content
        if (!v.content || !v.contract || !v.contract.counterparty) {
          return null;
        }

        // Create a safe regex to find the first occurrence of any search term for snippet context.
        const searchTermRegex = new RegExp(
          term
            .trim()
            .split(/\s+/)
            .map(escapeRegExp) // Escape each word to prevent regex errors
            .join('|'),
          'i'
        );
        const match = v.content.match(searchTermRegex);
        
        let snippet = '...no relevant snippet found...';
        
        if (match && typeof match.index === 'number') {
            const matchIndex = match.index;
            const firstMatchLength = match[0].length;
            const start = Math.max(0, matchIndex - 70);
            const end = Math.min(v.content.length, matchIndex + firstMatchLength + 70);
            snippet = `${start > 0 ? '...' : ''}${v.content.substring(start, end)}${end < v.content.length ? '...' : ''}`;
        } else {
            // Fallback snippet if regex doesn't match (e.g., due to stemming)
            snippet = v.content.substring(0, 150) + (v.content.length > 150 ? '...' : '');
        }
        
        return {
          contractId: v.contract.id,
          contractTitle: v.contract.title,
          counterpartyName: v.contract.counterparty.name,
          versionId: v.id,
          versionNumber: v.version_number,
          snippet: snippet.replace(/\n/g, ' '),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);


    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    // Enhanced error logging for easier debugging in Supabase logs.
    console.error("Error in global-search function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
});