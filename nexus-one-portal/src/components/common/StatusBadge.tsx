import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  Calendar,
  Activity
} from 'lucide-react';
import { clsx } from 'clsx';

export interface StatusBadgeProps {
  type?:
    | 'Approved'
    | 'Pending'
    | 'Rejected'
    | 'Cancelled'
    | 'Paid'
    | 'Enrolled'
    | 'Available'
    | 'Completed'
    | 'In Progress'
    | 'Under Review'
    | 'Pending Review'
    | 'Pending Approval'
    | 'Urgent'
    | 'High'
    | 'Medium'
    | 'Low'
    | 'On Track'
    | 'At Risk'
    | 'Blocked'
    | 'Near Complete'
    | 'ONLINE'
    | 'BUSY'
    | 'AWAY'
    | 'OFFLINE'
    | 'EMPLOYEE'
    | 'MANAGER'
    | 'PEOPLE_OPS'
    | 'ADMINISTRATOR'
    | string;
  status?: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, label, size = 'md' }) => {
  const actualType = (type || status || 'Pending') as string;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';

  let bgClass = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let icon: React.ReactNode = null;
  let text = label || actualType;

  switch (actualType) {
    case 'Approved':
    case 'Paid':
    case 'Enrolled':
    case 'Completed':
    case 'On Track':
    case 'Near Complete':
      bgClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      break;

    case 'Pending':
    case 'Pending Approval':
    case 'In Progress':
    case 'Under Review':
    case 'Pending Review':
      bgClass = 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      icon = <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      break;

    case 'Urgent':
    case 'Rejected':
    case 'At Risk':
    case 'Blocked':
      bgClass = 'bg-rose-950/60 text-rose-300 border-rose-500/40';
      icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      break;

    case 'High':
      bgClass = 'bg-orange-950/60 text-orange-300 border-orange-500/40';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
      break;

    case 'Medium':
      bgClass = 'bg-blue-950/60 text-blue-300 border-blue-500/40';
      break;

    case 'Low':
    case 'Available':
      bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
      break;

    case 'ONLINE':
      bgClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
      icon = <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />;
      text = 'Online';
      break;

    case 'BUSY':
      bgClass = 'bg-rose-950/80 text-rose-300 border-rose-500/50';
      icon = <span className="w-2 h-2 rounded-full bg-rose-400" />;
      text = 'Busy';
      break;

    case 'AWAY':
      bgClass = 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      icon = <span className="w-2 h-2 rounded-full bg-amber-400" />;
      text = 'Away';
      break;

    case 'OFFLINE':
      bgClass = 'bg-slate-900 text-slate-400 border-slate-700';
      icon = <span className="w-2 h-2 rounded-full bg-slate-500" />;
      text = 'Offline';
      break;

    case 'EMPLOYEE':
      bgClass = 'bg-blue-950/80 text-blue-300 border-blue-500/40';
      text = 'Employee';
      break;

    case 'MANAGER':
      bgClass = 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      text = 'Team Lead / VP';
      break;

    case 'PEOPLE_OPS':
      bgClass = 'bg-teal-950/80 text-teal-300 border-teal-500/40';
      text = 'People Operations';
      break;

    case 'ADMINISTRATOR':
      bgClass = 'bg-rose-950/80 text-rose-300 border-rose-600/40';
      text = 'Executive Admin';
      break;
  }

  return (
    <span className={clsx("inline-flex items-center font-medium rounded-full border shadow-sm", sizeClasses, bgClass)}>
      {icon}
      <span>{text}</span>
    </span>
  );
};
