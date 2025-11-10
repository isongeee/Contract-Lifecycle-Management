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
    const slug = slugify(orgName);
    const [firstName, ...lastNameParts] = fullName.split(' ');
    const lastName = lastNameParts.join(' ');

    // 1. Ensure the hardcoded App record exists in the database to prevent foreign key errors.
    const { error: appError } = await supabase.from('apps').upsert({
        id: APP_ID,
        name: 'Contract Lifecycle Management'
    });
    if (appError) {
        console.error("Error ensuring app record exists:", appError);
        return { user: null, session: null, error: appError };
    }

    // 2. Create Company, linking it to the hardcoded App ID.
    const { data: company, error: companyError } = await supabase.from('companies').insert({ 
        name: orgName, 
        slug,
        app: APP_ID 
    }).select().single();
    if (companyError) return { user: null, session: null, error: companyError };

    // 3. Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError || !authData.user) return { user: null, session: null, error: authError };

    // 4. Create default roles for the new company, linked to the app.
    const { data: adminRole, error: adminRoleError } = await supabase.from('roles').insert({
        name: 'Admin',
        description: 'Full system access',
        permissions: adminPermissions,
        app_id: APP_ID,
        company_id: company.id
    }).select().single();
    if (adminRoleError) return { user: null, session: null, error: adminRoleError };
    
    await supabase.from('roles').insert({
        name: 'Requestor',
        description: 'Can view assigned contracts.',
        permissions: defaultPermissions,
        app_id: APP_ID,
        company_id: company.id
    });


    // 5. Create User Profile
    const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email,
        app_id: APP_ID,
        company_id: company.id,
        role_id: adminRole.id,
        avatar_url: `https://i.pravatar.cc/150?u=${authData.user.id}`,
    });
    if (profileError) return { user: null, session: null, error: profileError };

    return { user: authData.user, session: authData.session, error: null };
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
