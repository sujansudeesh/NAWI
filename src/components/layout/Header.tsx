import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, LogOut } from 'lucide-react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { User, UserRole } from '../../types';
import { authService } from '../../services/authService';
import { AuthDebugPanel } from '../auth/AuthDebugPanel';

interface HeaderProps {
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
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

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/login', { replace: true });
  };

  // Generate breadcrumb path
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const getBreadcrumbs = () => {
    if (pathSegments.length === 0 || pathSegments[0] === 'dashboard') {
      return [{ label: 'Dashboard', path: '/dashboard' }];
    }
    return [
      { label: 'Home', path: '/dashboard' },
      ...pathSegments.map((seg, idx) => {
        const path = '/' + pathSegments.slice(0, idx + 1).join('/');
        let label = seg.replace('-', ' ');
        label = label.charAt(0).toUpperCase() + label.slice(1);
        if (seg.startsWith('INS-') || seg.startsWith('TS-') || seg.startsWith('REP-')) {
          label = seg;
        }
        return { label, path };
      }),
    ];
  };

  const breadcrumbs = getBreadcrumbs();
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('ins') || q.includes('scale') || q.includes('balance')) {
      navigate(`/instruments?q=${encodeURIComponent(searchQuery)}`);
    } else if (q.includes('ts') || q.includes('test')) {
      navigate(`/test-sessions?q=${encodeURIComponent(searchQuery)}`);
    } else if (q.includes('rep') || q.includes('cert')) {
      navigate(`/reports?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/instruments?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80 shadow-xs font-sans">
      {/* Left side: Breadcrumb & Page Title */}
      <div className="flex flex-col justify-center">
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <Link
                to={crumb.path}
                className={`hover:text-teal-600 transition-colors ${
                  idx === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''
                }`}
              >
                {crumb.label}
              </Link>
            </React.Fragment>
          ))}
        </nav>
        <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
          {currentPageTitle}
        </h1>
      </div>

      {/* Center: Live Auth Debug Panel */}
      <div className="hidden lg:flex items-center flex-1 max-w-xl mx-4">
        <AuthDebugPanel />
      </div>

      {/* Right side: Read-only DB Role Badge & User Profile */}
      <div className="flex items-center gap-3">
        {/* Read-Only DB Role Indicator */}
        <RoleSwitcher currentRole={authUser?.role || 'TESTING_OFFICER'} />

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-white" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3 font-semibold text-slate-900">
                <span>Laboratory Alerts</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">3 New</span>
              </div>
              <div className="space-y-2.5">
                <div className="p-2 rounded bg-amber-50 border border-amber-200/60">
                  <div className="font-semibold text-amber-900">Technical Review Pending</div>
                  <div className="text-[11px] text-amber-700 mt-0.5">Session TS-2026-102 requires audit sign-off.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-400 font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {(authUser?.name || 'Officer').split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              {authUser?.name || 'Metrology Officer'}
            </span>
            <span className="text-[10px] text-teal-700 font-semibold uppercase tracking-wider">{authUser?.role || 'TESTING_OFFICER'}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
