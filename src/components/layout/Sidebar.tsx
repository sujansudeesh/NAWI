import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Scale,
  ClipboardList,
  FileCheck2,
  History,
  Users as UsersIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { authService } from '../../services/authService';
import { User } from '../../types';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;
    authService.getCurrentUser().then((user) => {
      if (isMounted && user) {
        setAuthUser(user);
      }
    });

    const unsubscribe = authService.onAuthStateChange((user) => {
      if (isMounted) {
        setAuthUser(user);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Instruments', path: '/instruments', icon: Scale },
    { label: 'Tests', path: '/test-sessions', icon: ClipboardList },
    { label: 'Reports', path: '/reports', icon: FileCheck2 },
    { label: 'Audit Trail', path: '/audit-trail', icon: History },
    { label: 'Users', path: '/users', icon: UsersIcon },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-all duration-300 relative select-none font-sans ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Brand Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Logo variant="dark" showSubtitle={false} />
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-slate-950 font-bold text-sm">
              N
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* SIH Context Badge */}
      {!collapsed && (
        <div className="mx-4 mt-3 px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-teal-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> SIH 2026 • SIH26035
          </span>
          <span className="text-[10px] text-slate-400">Metrology Lab</span>
        </div>
      )}

      {/* Main Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-teal-600 text-white font-semibold shadow-md shadow-teal-900/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom User Profile Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!collapsed ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                {(authUser?.name || 'Officer').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">{authUser?.name || 'Metrology Officer'}</span>
                <span className="text-[10px] text-teal-400 font-mono truncate">{authUser?.role || 'TESTING_OFFICER'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
