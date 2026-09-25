import React from 'react';
import { UserRole } from '../../types';
import { Shield } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole }) => {
  return (
    <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-semibold select-none">
      <Shield className="w-3.5 h-3.5 text-teal-400" />
      <span className="text-[10px] uppercase font-bold text-slate-400">DB Verified:</span>
      <span className="text-teal-300 font-mono text-xs">{currentRole || 'TESTING_OFFICER'}</span>
    </div>
  );
};
