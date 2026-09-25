import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, UserRole, UserRoleCode } from '../types';
import type { Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  role: UserRoleCode | UserRole;
  organization: string;
}

export const authService = {
  /**
   * Sign in user via Supabase Auth strictly.
   * Throws Error if credentials are invalid or session is missing.
   */
  async signIn(email: string, password?: string): Promise<{ user: any; session: Session }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is not configured.');
    }

    if (!email || !password) {
      throw new Error('Invalid email or password.');
    }

    // Explicitly sign out any previous authenticated session before validating new credentials
    try {
      await supabase.auth.signOut();
    } catch (_e) {
      // Ignore errors if no active session existed
    }

    // Purge any stale legacy local auth keys
    localStorage.removeItem('nawi_auth_state');
    localStorage.removeItem('nawi_demo_role');
    localStorage.removeItem('nawi_current_user');

    // 1. Attempt real Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // 2. Reject immediately if Supabase returns an error
    if (error) {
      throw error;
    }

    // 3. Require BOTH data.user and data.session
    if (!data || !data.user || !data.session) {
      throw new Error('Authentication failed');
    }

    // 4. Fetch or provision authorized profile from public.profiles table
    let profile = await this.getCurrentProfile(data.user.id);
    if (!profile) {
      profile = {
        id: data.user.id,
        fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Metrology Officer',
        email: data.user.email || '',
        role: 'TESTING_OFFICER',
        organization: 'National Legal Metrology Laboratory',
      };
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  /**
   * Sign up new user via Supabase Auth strictly.
   */
  async signUp(email: string, password?: string, fullName?: string): Promise<{ user: any; session: Session | null; confirmationRequired: boolean }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is not configured.');
    }

    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    // Explicitly sign out any previous authenticated session before validating new credentials
    try {
      await supabase.auth.signOut();
    } catch (_e) {
      // Ignore errors
    }

    // Purge any stale legacy local auth keys
    localStorage.removeItem('nawi_auth_state');
    localStorage.removeItem('nawi_demo_role');
    localStorage.removeItem('nawi_current_user');

    const cleanEmail = email.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: fullName?.trim() || 'Metrology Officer',
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      // If error is rate limit or user already registered, try signing in immediately
      if (msg.includes('rate limit') || msg.includes('already registered') || msg.includes('already exists')) {
        try {
          const signInRes = await this.signIn(cleanEmail, password);
          return {
            user: signInRes.user,
            session: signInRes.session,
            confirmationRequired: false,
          };
        } catch (signInErr: any) {
          if (signInErr.message?.toLowerCase().includes('email not confirmed')) {
            throw new Error('User registered in database! Email confirmation is enabled in your Supabase project — please click the email link or turn off "Confirm Email" in Supabase Dashboard.');
          }
          throw error;
        }
      }
      throw error;
    }

    if (data && data.user && data.session) {
      await this.getCurrentProfile(data.user.id);
      return {
        user: data.user,
        session: data.session,
        confirmationRequired: false,
      };
    }

    if (data && data.user) {
      try {
        const signInRes = await this.signIn(cleanEmail, password);
        return {
          user: signInRes.user,
          session: signInRes.session,
          confirmationRequired: false,
        };
      } catch (_e) {
        return {
          user: data.user,
          session: null,
          confirmationRequired: true,
        };
      }
    }

    throw new Error('Registration failed.');
  },

  /**
   * Sign out current user from Supabase and purge local auth state
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('nawi_auth_state');
    localStorage.removeItem('nawi_demo_role');
    localStorage.removeItem('nawi_current_user');
  },

  /**
   * Get current authenticated user from real Supabase Session ONLY
   */
  async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    // Check active Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) {
      return null;
    }

    // Get current authenticated user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return null;
    }

    // Fetch user profile from public.profiles
    const profile = await this.getCurrentProfile(userData.user.id);
    if (!profile) {
      return null;
    }

    return {
      id: userData.user.id,
      name: profile.fullName || userData.user.email || 'Metrology Officer',
      email: userData.user.email || '',
      role: profile.role || 'TESTING_OFFICER',
      department: profile.organization || 'National Legal Metrology Laboratory',
      avatar: (profile.fullName || 'User').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
      active: true,
    };
  },

  /**
   * Get active Supabase Auth Session
   */
  async getSession(): Promise<Session | null> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session) {
        return null;
      }
      return data.session;
    }
    return null;
  },

  /**
   * Get user profile from public.profiles table
   */
  async getCurrentProfile(userId?: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured() || !supabase || !userId) {
      return null;
    }

    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      return {
        id: data.id,
        fullName: data.full_name || userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Metrology Officer',
        name: data.full_name || userData?.user?.user_metadata?.full_name || 'Metrology Officer',
        email: userData?.user?.email || '',
        role: (data.role as UserRoleCode) || 'TESTING_OFFICER',
        organization: data.organization || 'National Legal Metrology Laboratory',
      };
    }

    // Fallback profile provision if profiles row is not found or RLS blocked select
    if (userData?.user && userData.user.id === userId) {
      const fallbackName = userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'Metrology Officer';

      try {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: fallbackName,
          role: 'TESTING_OFFICER',
          organization: 'National Legal Metrology Laboratory',
        }, { onConflict: 'id' });
      } catch (_e) {
        // Ignore RLS or schema errors if table triggers handled profile
      }

      return {
        id: userId,
        fullName: fallbackName,
        name: fallbackName,
        email: userData.user.email || '',
        role: 'TESTING_OFFICER',
        organization: 'National Legal Metrology Laboratory',
      };
    }

    return null;
  },

  /**
   * Reset password request
   */
  async resetPassword(email: string): Promise<boolean> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw new Error('Password reset failed.');
      return true;
    }
    return false;
  },

  /**
   * Subscribe to Supabase auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    if (isSupabaseConfigured() && supabase) {
      const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const user = await this.getCurrentUser();
          callback(user);
        } else {
          callback(null);
        }
      });
      return () => subscription.subscription.unsubscribe();
    }
    return () => {};
  },
};
