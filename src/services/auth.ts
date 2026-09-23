import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';
import { UserRole } from '../types';

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  village: string;
  ward: string;
  created_at?: string;
  updated_at?: string;
}

export async function signUpUser(params: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  village?: string;
  ward?: string;
}) {
  if (!isSupabaseConfigured) {
    return {
      user: { id: `usr-${Date.now()}`, email: params.email },
      profile: {
        id: `usr-${Date.now()}`,
        full_name: params.fullName,
        phone: params.phone,
        role: 'citizen' as UserRole,
        village: params.village || 'Shivpur',
        ward: params.ward || 'ward-3',
      },
      error: null,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        phone: params.phone,
        village: params.village || 'Shivpur',
        ward: params.ward || 'ward-3',
      },
    },
  });

  if (error) return { user: null, profile: null, error: formatSupabaseError(error) };

  let profile: UserProfile | null = null;
  if (data.user) {
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profData) {
      profile = profData as UserProfile;
    } else {
      // Fallback profile from metadata if DB trigger is delayed
      profile = {
        id: data.user.id,
        full_name: params.fullName || data.user.email || 'Citizen User',
        phone: params.phone,
        role: 'citizen',
        village: params.village || 'Shivpur',
        ward: params.ward || 'ward-3',
      };
    }
  }

  return { user: data.user, profile, error: null };
}

export async function signInUser(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return {
      user: { id: 'mock-user-id', email },
      profile: {
        id: 'mock-user-id',
        full_name: 'ग्रामीण नागरिक (वार्ड निवासी)',
        role: 'citizen' as UserRole,
        village: 'Shivpur',
        ward: 'ward-3',
      },
      error: null,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { user: null, profile: null, error: formatSupabaseError(error) };

  let profile: UserProfile | null = null;
  if (data.user) {
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profData) {
      profile = profData as UserProfile;
    } else {
      // Fallback profile if user profile row missing
      const meta = data.user.user_metadata || {};
      profile = {
        id: data.user.id,
        full_name: meta.full_name || data.user.email || 'Citizen User',
        phone: meta.phone,
        role: (meta.role as UserRole) || 'citizen',
        village: meta.village || 'Shivpur',
        ward: meta.ward || 'ward-3',
      };
    }
  }

  return { user: data.user, profile, error: null };
}

export async function signOutUser() {
  if (!isSupabaseConfigured) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error: error ? formatSupabaseError(error) : null };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      const meta = user.user_metadata || {};
      return {
        id: user.id,
        full_name: meta.full_name || user.email || 'Citizen User',
        phone: meta.phone,
        role: (meta.role as UserRole) || 'citizen',
        village: meta.village || 'Shivpur',
        ward: meta.ward || 'ward-3',
      };
    }

    return data as UserProfile;
  } catch (err) {
    console.error('Error fetching current user profile:', err);
    return null;
  }
}

export async function updateUserProfile(updates: Partial<UserProfile>) {
  if (!isSupabaseConfigured) return { data: updates, error: null };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not authenticated' };

    // Strip role update to prevent privilege escalation on frontend
    const { role, ...allowedUpdates } = updates;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...allowedUpdates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: formatSupabaseError(err) };
  }
}

