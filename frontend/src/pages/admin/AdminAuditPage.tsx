import { useState } from 'react';
import { useQuery } from 'react-query';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export const AdminAuditPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery(['audit-logs', page], () => adminApi.getAuditLogs({ page, limit: 50 }), { select: (d) => d.data.data, keepPreviousData: true });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  const actionColors: Record<string, string> = {
    report_created: 'bg-blue-100 text-blue-700',
    report_verified: 'bg-green-100 text-green-700',
    report_rejected: 'bg-red-100 text-red-700',
    status_changed: 'bg-yellow-100 text-yellow-700',
    department_assigned: 'bg-purple-100 text-purple-700',
    officer_assigned: 'bg-indigo-100 text-indigo-700',
    user_created: 'bg-cyan-100 text-cyan-700',
    user_deleted: 'bg-pink-100 text-pink-700',
    login: 'bg-gray-100 text-gray-700',
  };

  return (
    <AdminLayout title="Audit Logs">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Action', 'Performed By', 'Target', 'Details', 'IP', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No audit logs" className="py-10" /></td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.performedBy?.name || 'System'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.targetModel}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{log.changes ? JSON.stringify(log.changes).slice(0, 80) : '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-gray-500">{pagination.total} total entries</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="px-3 py-1.5 text-xs text-gray-600">Page {page} of {pagination.pages}</span>
              <Button size="sm" variant="outline" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
