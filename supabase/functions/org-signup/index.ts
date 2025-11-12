// FIX: Replaced the `/// <reference>` directive with a `declare` statement to resolve Deno type errors.
// The Deno namespace is globally available in Supabase Edge Functions. This declaration
// informs TypeScript about the 'Deno' global, fixing "Cannot find name 'Deno'" errors
// in environments that are not configured for Deno.
declare var Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// WARNING: The service role key should be stored as an environment secret
// in your Supabase project settings.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const APP_ID = '820ae59d-d821-4038-95e5-43a04c43e2b8';

const adminPermissions = {
    contracts: { view: true, edit: true, approve: true, delete: true },
    counterparties: { view: true, edit: true },
    properties: { view: true, edit: true },
    notifications: { view: true, configure: true },
    settings: { access: true, edit: true },
};

const requestorPermissions = {
    contracts: { view: true, edit: false, approve: false, delete: false },
    counterparties: { view: false, edit: false },
    properties: { view: false, edit: false },
    notifications: { view: false, configure: false },
    settings: { access: false, edit: false },
};


const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { orgName, fullName, email, password } = await req.json();

    // 1. Create Company
    const slug = slugify(orgName);
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: orgName, slug: slug, app: APP_ID })
      .select()
      .single();

    if (companyError) throw companyError;

    // 2. Sign up User in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Set to true to require email verification
    });

    if (authError) {
      // Clean up created company if user creation fails
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw authError;
    }

    const user = authData.user;
    
    // 3. Create Default Roles for the new company
    const { data: adminRole, error: adminRoleError } = await supabaseAdmin
      .from('roles')
      .insert({ name: 'Admin', description: 'Full access to all features.', permissions: adminPermissions, company_id: company.id, app_id: APP_ID })
      .select()
      .single();

    if (adminRoleError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      throw adminRoleError;
    }

    const { error: requestorRoleError } = await supabaseAdmin
      .from('roles')
      .insert({ name: 'Requestor', description: 'Can view contracts.', permissions: requestorPermissions, company_id: company.id, app_id: APP_ID })
      .select()
      .single();

    if (requestorRoleError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      // could also delete admin role here for full cleanup
      throw requestorRoleError;
    }

    // 4. Create User Profile
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');
    
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        company_id: company.id,
        app_id: APP_ID,
        role_id: adminRole.id, // Assign the Admin role
        avatar_url: `https://i.pravatar.cc/150?u=${user.id}`,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      // could also delete roles
      throw profileError;
    }

    return new Response(JSON.stringify({ success: true, userId: user.id }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
       },
      status: 500,
    });
  }
});