import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { authService } from '../../services/authService';
import type { Session } from '@supabase/supabase-js';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Purge obsolete legacy mock auth keys
    localStorage.removeItem('nawi_auth_state');
    localStorage.removeItem('nawi_demo_role');
    localStorage.removeItem('nawi_current_user');

    const verifySession = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (isMounted) {
        if (error || !data.session) {
          setSession(null);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      }
    };

    verifySession();

    const unsubscribe = authService.onAuthStateChange(async () => {
      if (isMounted) {
        const currentSession = await authService.getSession();
        setSession(currentSession);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 text-xs gap-3 font-sans">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-teal-400">Verifying Supabase Auth Session...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
