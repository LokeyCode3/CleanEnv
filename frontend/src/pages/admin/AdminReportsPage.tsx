import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { adminApi, categoryApi, departmentApi } from '@/lib/api';
import { Report, IssueCategory, Department } from '@/types';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import { Search, Eye, CheckCircle, XCircle, UserPlus, MessageSquare, RefreshCw } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'work_in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const AdminReportsPage = () => {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', severity: '', categoryId: '', search: '', page: 1 });
  const [selected, setSelected] = useState<Report | null>(null);
  const [actionModal, setActionModal] = useState<'assign' | 'comment' | 'reject' | 'status' | null>(null);
  const [actionData, setActionData] = useState<Record<string, string>>({});

  const { data: categories } = useQuery('categories', () => categoryApi.getAll(), { select: (d) => d.data.data.categories as IssueCategory[] });
  const { data: departments } = useQuery('departments', () => departmentApi.getAll(), { select: (d) => d.data.data.departments as Department[] });
  const { data, isLoading, refetch } = useQuery(
    ['admin-reports', filters],
    () => adminApi.listReports({ ...filters, limit: 20 }),
    { select: (d) => d.data.data, keepPreviousData: true }
  );

  const reports: Report[] = data?.reports || [];
  const pagination = data?.pagination;

  const updateStatus = useMutation(
    () => adminApi.updateStatus(selected!.reportId, actionData.status, actionData.comment),
    { onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries('admin-reports'); setActionModal(null); } }
  );
  const assign = useMutation(
    () => adminApi.assignReport(selected!.reportId, { departmentId: actionData.departmentId, officerId: actionData.officerId }),
    { onSuccess: () => { toast.success('Assigned'); qc.invalidateQueries('admin-reports'); setActionModal(null); } }
  );
  const addComment = useMutation(
    () => adminApi.addComment(selected!.reportId, actionData.text, actionData.isPublic === 'true'),
    { onSuccess: () => { toast.success('Comment added'); setActionModal(null); } }
  );
  const rejectReport = useMutation(
    () => adminApi.rejectReport(selected!.reportId, actionData.reason),
    { onSuccess: () => { toast.success('Report rejected'); qc.invalidateQueries('admin-reports'); setActionModal(null); } }
  );

  const catOptions = [{ value: '', label: 'All Categories' }, ...(categories?.map((c) => ({ value: c._id, label: c.name })) || [])];
  const deptOptions = [{ value: '', label: 'Select Department' }, ...(departments?.map((d) => ({ value: d._id, label: d.name })) || [])];
  const statusSelectOptions = STATUS_OPTIONS.slice(1);

  return (
    <AdminLayout title="Reports">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
            placeholder="Search ID, title…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <Select options={STATUS_OPTIONS} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} className="w-40 text-sm" />
        <Select options={SEVERITY_OPTIONS} value={filters.severity} onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value, page: 1 }))} className="w-36 text-sm" />
        <Select options={catOptions} value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))} className="w-44 text-sm" />
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Report ID', 'Category', 'Title', 'Severity', 'Status', 'Location', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }, (_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No reports found" description="Try adjusting your filters." className="py-12" /></td></tr>
              ) : (
                reports.map((r) => {
                  const cat = typeof r.categoryId !== 'string' ? r.categoryId : null;
                  return (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary-600">{r.reportId}</td>
                      <td className="px-4 py-3 text-gray-700">{cat?.icon} {cat?.name}</td>
                      <td className="px-4 py-3 text-gray-900 max-w-[180px] truncate">{r.title}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={r.severity} /></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px] truncate">{r.location?.city}, {r.location?.district}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 whitespace-nowrap">
                          <button title="View" onClick={() => setSelected(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button title="Verify" onClick={() => { setSelected(r); setActionData({ status: 'verified' }); setActionModal('status'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-green-600">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button title="Assign" onClick={() => { setSelected(r); setActionModal('assign'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600">
                            <UserPlus className="w-4 h-4" />
                          </button>
                          <button title="Comment" onClick={() => { setSelected(r); setActionModal('comment'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-purple-600">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button title="Reject" onClick={() => { setSelected(r); setActionModal('reject'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <span>{pagination.total} total</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Prev</Button>
              <span className="px-3 py-1.5 text-xs">Page {pagination.page} of {pagination.pages}</span>
              <Button size="sm" variant="outline" disabled={filters.page >= pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* View Report Modal */}
      {selected && !actionModal && (
        <Modal isOpen title={`Report ${selected.reportId}`} onClose={() => setSelected(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Category:</span> <span className="font-medium">{(typeof selected.categoryId !== 'string' ? selected.categoryId : null)?.name}</span></div>
              <div><span className="text-gray-500">Severity:</span> <SeverityBadge severity={selected.severity} /></div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={selected.status} /></div>
              <div><span className="text-gray-500">Submitted:</span> <span>{formatDate(selected.createdAt)}</span></div>
              <div className="col-span-2"><span className="text-gray-500">Location:</span> <span>{selected.location?.address}</span></div>
            </div>
            <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-700">{selected.description}</p></div>
            {selected.attachments?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {selected.attachments.map((a) => <img key={a._id} src={a.url} alt="" className="w-24 h-24 rounded-lg object-cover" />)}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <Button size="sm" onClick={() => { setActionData({ status: 'verified' }); setActionModal('status'); }}>Verify</Button>
              <Button size="sm" variant="outline" onClick={() => setActionModal('assign')}>Assign</Button>
              <Button size="sm" variant="outline" onClick={() => setActionModal('comment')}>Comment</Button>
              <Button size="sm" variant="danger" onClick={() => setActionModal('reject')}>Reject</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Modal */}
      <Modal isOpen={actionModal === 'status'} title="Update Status" onClose={() => setActionModal(null)}>
        <div className="space-y-4">
          <Select label="New Status" options={statusSelectOptions} value={actionData.status || ''} onChange={(e) => setActionData((d) => ({ ...d, status: e.target.value }))} />
          <Input label="Comment (optional)" value={actionData.comment || ''} onChange={(e) => setActionData((d) => ({ ...d, comment: e.target.value }))} />
          <Button onClick={() => updateStatus.mutate()} isLoading={updateStatus.isLoading} className="w-full">Update Status</Button>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal isOpen={actionModal === 'assign'} title="Assign Report" onClose={() => setActionModal(null)}>
        <div className="space-y-4">
          <Select label="Department" options={deptOptions} value={actionData.departmentId || ''} onChange={(e) => setActionData((d) => ({ ...d, departmentId: e.target.value }))} />
          <Button onClick={() => assign.mutate()} isLoading={assign.isLoading} className="w-full">Assign</Button>
        </div>
      </Modal>

      {/* Comment Modal */}
      <Modal isOpen={actionModal === 'comment'} title="Add Comment" onClose={() => setActionModal(null)}>
        <div className="space-y-4">
          <Input label="Comment" value={actionData.text || ''} onChange={(e) => setActionData((d) => ({ ...d, text: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={actionData.isPublic === 'true'} onChange={(e) => setActionData((d) => ({ ...d, isPublic: String(e.target.checked) }))} />
            Make visible to citizen
          </label>
          <Button onClick={() => addComment.mutate()} isLoading={addComment.isLoading} className="w-full">Add Comment</Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={actionModal === 'reject'} title="Reject Report" onClose={() => setActionModal(null)}>
        <div className="space-y-4">
          <Input label="Rejection Reason *" value={actionData.reason || ''} onChange={(e) => setActionData((d) => ({ ...d, reason: e.target.value }))} />
          <Button variant="danger" onClick={() => rejectReport.mutate()} isLoading={rejectReport.isLoading} disabled={!actionData.reason} className="w-full">Reject Report</Button>
        </div>
      </Modal>
    </AdminLayout>
  );
};
