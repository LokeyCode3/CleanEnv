import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ReportStatus, Severity } from '@/types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const statusConfig: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-100' },
  under_review: { label: 'Under Review', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  verified: { label: 'Verified', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  assigned: { label: 'Assigned', color: 'text-purple-700', bg: 'bg-purple-100' },
  work_in_progress: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-100' },
  resolved: { label: 'Resolved', color: 'text-green-700', bg: 'bg-green-100' },
  closed: { label: 'Closed', color: 'text-gray-700', bg: 'bg-gray-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-100' },
  duplicate: { label: 'Duplicate', color: 'text-slate-700', bg: 'bg-slate-100' },
};

export const severityConfig: Record<Severity, { label: string; color: string; bg: string; dot: string }> = {
  low: { label: 'Low', color: 'text-green-700', bg: 'bg-green-100', dot: 'bg-green-500' },
  medium: { label: 'Medium', color: 'text-yellow-700', bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  high: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100', dot: 'bg-orange-500' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-600' },
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatRelative = (date: string | Date): string => {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(date);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

export const getInitials = (name: string): string =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

export const truncate = (str: string, n: number): string =>
  str.length > n ? str.slice(0, n) + '…' : str;
