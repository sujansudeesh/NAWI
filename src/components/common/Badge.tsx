import React from 'react';
import { ComplianceStatus, TestSessionStatus, ReportStatus, AccuracyClass } from '../../types';
import { Check, X, AlertTriangle, Clock } from 'lucide-react';

interface BadgeProps {
  status: ComplianceStatus | TestSessionStatus | ReportStatus | AccuracyClass | string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  let styleClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let Icon: React.ElementType | null = null;
  let labelText = status;

  switch (status) {
    case 'Compliant':
    case 'Approved':
    case 'APPROVED':
    case 'Finalized':
    case 'FINALIZED':
    case 'Pass':
      styleClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      Icon = Check;
      labelText = status === 'Compliant' ? '✓ Compliant' : status === 'Pass' ? '✓ Pass' : status === 'APPROVED' ? '✓ Approved' : status === 'FINALIZED' ? '✓ Finalized' : status;
      break;

    case 'TECHNICALLY_APPROVED':
      styleClasses = 'bg-teal-50 text-teal-800 border-teal-300 font-semibold';
      Icon = Check;
      labelText = '✓ Technically Approved';
      break;

    case 'Non-Compliant':
    case 'Fail':
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      Icon = X;
      labelText = status === 'Non-Compliant' ? '✕ Non-Compliant' : '✕ Fail';
      break;

    case 'CHANGES_REQUESTED':
      styleClasses = 'bg-rose-50 text-rose-800 border-rose-300 font-semibold';
      Icon = AlertTriangle;
      labelText = '⚠ Changes Requested';
      break;

    case 'Under Evaluation':
    case 'In Progress':
    case 'IN_PROGRESS':
    case 'Pending Review':
    case 'Awaiting Review':
    case 'UNDER_REVIEW':
    case 'Needs Review':
    case 'TESTING_COMPLETE':
      styleClasses = 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      Icon = AlertTriangle;
      labelText = status === 'UNDER_REVIEW' ? 'Under Review' : status === 'IN_PROGRESS' ? 'In Progress' : status === 'TESTING_COMPLETE' ? 'Testing Complete' : status;
      break;

    case 'Draft':
    case 'DRAFT':
      styleClasses = 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
      Icon = Clock;
      labelText = 'Draft';
      break;

    case 'Class I':
      styleClasses = 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
      break;
    case 'Class II':
      styleClasses = 'bg-sky-50 text-sky-800 border-sky-200 font-bold';
      break;
    case 'Class III':
      styleClasses = 'bg-teal-50 text-teal-800 border-teal-200 font-bold';
      break;
    case 'Class IIII':
      styleClasses = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
      break;

    default:
      styleClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-md border ${sizeClasses} ${styleClasses}`}>
      {labelText}
    </span>
  );
};
