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
    const { firstName, lastName, email, password, roleId, companyId, appId } = await req.json();

    // 1. Create the user in Supabase Auth using the admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // User will need to verify their email
    });

    if (authError) {
      throw authError;
    }
    
    const user = authData.user;

    // 2. Create the corresponding user profile in the public.users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        role_id: roleId,
        company_id: companyId,
        app_id: appId,
        avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, delete the auth user to keep data consistent
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    // 3. Create default user notification settings
    const { error: settingsError } = await supabaseAdmin
        .from('user_notification_settings')
        .insert({ user_id: user.id });
    
    if (settingsError) {
        // Cleanup auth user if settings creation fails. Profile will cascade delete.
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        throw settingsError;
    }

    return new Response(JSON.stringify(profile), {
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