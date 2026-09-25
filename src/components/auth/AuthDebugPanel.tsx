import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { authService } from '../../services/authService';

export const AuthDebugPanel: React.FC = () => {
  const [sessionExists, setSessionExists] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('NONE');
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [dbRole, setDbRole] = useState<string>('NONE');

  useEffect(() => {
    let isMounted = true;
    const fetchDebug = async () => {
      const session = await authService.getSession();
      const user = await authService.getCurrentUser();
      if (isMounted) {
        setSessionExists(!!session);
        setUserEmail(session?.user?.email || 'NONE');
        setProfileLoaded(!!user);
        setDbRole(user?.role || 'NONE');
      }
    };
    fetchDebug();

    const unsubscribe = authService.onAuthStateChange(() => {
      if (isMounted) fetchDebug();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono px-3 py-1.5 rounded-lg flex flex-wrap items-center gap-x-4 gap-y-1 shadow-inner select-none">
      <span className="font-bold text-teal-400 uppercase tracking-wider">AUTH DEBUG</span>
      <span>Supabase Configured: <strong className="text-white">{isSupabaseConfigured() ? 'YES' : 'NO'}</strong></span>
      <span>Supabase Session Exists: <strong className={sessionExists ? 'text-emerald-400' : 'text-rose-400'}>{sessionExists ? 'YES' : 'NO'}</strong></span>
      <span>Authenticated Email: <strong className="text-teal-300">{userEmail}</strong></span>
      <span>Profile Loaded: <strong className={profileLoaded ? 'text-emerald-400' : 'text-amber-400'}>{profileLoaded ? 'YES' : 'NO'}</strong></span>
      <span>Database Role: <strong className="text-teal-300">{dbRole}</strong></span>
    </div>
  );
};
