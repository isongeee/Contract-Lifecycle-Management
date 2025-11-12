import { supabase } from './supabaseClient';
import type { UserProfile, PermissionSet } from '../types';

// Hardcoded App ID for "Contract Lifecycle Management"
const APP_ID = '820ae59d-d821-4038-95e5-43a04c43e2b8';

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const adminPermissions: PermissionSet = {
    contracts: { view: true, edit: true, approve: true, delete: true },
    counterparties: { view: true, edit: true },
    properties: { view: true, edit: true },
    notifications: { view: true, configure: true },
    settings: { access: true, edit: true },
};

const defaultPermissions: PermissionSet = {
    contracts: { view: true, edit: false, approve: false, delete: false },
    counterparties: { view: false, edit: false },
    properties: { view: false, edit: false },
    notifications: { view: false, configure: false },
    settings: { access: false, edit: false },
};


export async function orgSignUp(orgName: string, fullName: string, email: string, password: string) {
    /*
      This function was moved to a Supabase Edge Function ('org-signup') to ensure atomicity.
      If any step in the sign-up process fails, the entire transaction is rolled back,
      preventing inconsistent data states (e.g., a company without a user or a user without a profile).

      The Edge Function performs the following steps transactionally:
      1. Slugifies the organization name.
      2. Ensures the hardcoded App record exists.
      3. Creates a new company record.
      4. Signs up the new user in Supabase Auth.
      5. Creates default 'Admin' and 'Requestor' roles for the new company.
      6. Creates the user's profile, linking them to the company and the 'Admin' role.
    */
    const { data, error } = await supabase.functions.invoke('org-signup', {
        body: { orgName, fullName, email, password },
    });

    if (error) {
        // The error from the function might not be a Supabase AuthError,
        // but we'll return it in a compatible structure.
        return { user: null, session: null, error: { name: 'FunctionError', message: error.message } };
    }
    
    // The edge function should return the auth data on success.
    // The client needs to sign in separately after successful signup and email confirmation.
    // This part of the flow remains unchanged; the user is redirected to login after seeing the confirmation alert.
    return { user: data?.user || null, session: data?.session || null, error: null };
}

export async function userSignUp(fullName: string, email: string, password: string, inviteCode: string) {
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    // 1. Find company and its associated app_id by invite code (slug)
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, app')
        .eq('slug', inviteCode)
        .single();
    
    if (companyError || !company || !company.app) {
        return { user: null, session: null, error: companyError || new Error('Invalid invite code or organization is not configured correctly.') };
    }
    
    const appId = company.app;

    // 2. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) return { user: null, session: null, error: authError };

    // 3. Find default role ('Requestor') for the company
    const { data: requestorRole, error: roleError } = await supabase.from('roles').select('id').eq('name', 'Requestor').eq('company_id', company.id).single();
    if (roleError || !requestorRole) return { user: null, session: null, error: roleError || new Error('Default role not found for this organization.') };

    // 4. Create User Profile
    const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        app_id: appId,
        company_id: company.id,
        role_id: requestorRole.id,
        avatar_url: `https://i.pravatar.cc/150?u=${authData.user.id}`,
    });
    if (profileError) return { user: null, session: null, error: profileError };

    return { user: authData.user, session: authData.session, error: null };
}


export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data: userProfile, error } = await supabase
        .from('users')
        .select(`
            *,
            roles ( name )
        `)
        .eq('id', userId)
        .single();
        
    if (error || !userProfile) {
        console.error("Error fetching user profile:", error);
        return null;
    }
    
    // Safely access role name from the joined 'roles' table data
    const role = userProfile.roles as { name: string } | null;
    const roleName = role ? role.name : 'Unknown';

    return {
        id: userProfile.id,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        email: userProfile.email,
        phone: userProfile.phone,
        jobTitle: userProfile.job_title,
        department: userProfile.department,
        avatarUrl: userProfile.avatar_url,
        role: roleName,
        roleId: userProfile.role_id,
        status: userProfile.status,
        lastLogin: userProfile.last_login,
        companyId: userProfile.company_id,
        appId: userProfile.app_id,
    };
}

export async function resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Redirect user back to the app's root URL after reset
    });
}

export async function adminCreateUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roleId: string;
    companyId: string;
    appId: string;
}) {
    // This function now invokes a secure Supabase Edge Function to create a user.
    // This prevents the admin's session from being overwritten on the client-side,
    // which was a major security and stability issue. The Edge Function itself
    // would use the Supabase admin client to create the user and profile securely.
    const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData,
    });

    if (error) {
        // The invoke error might not be a Supabase AuthError, but we'll return it as is.
        // The calling function in App.tsx handles displaying the error message.
        return { data: null, error };
    }

    // The function is expected to return the newly created user on success.
    // The current UI in App.tsx doesn't use the return data, but this provides it for future use.
    return { data, error: null };
}