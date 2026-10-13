import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { officerApi } from '@/lib/api';
import { Report } from '@/types';
import { OfficerLayout } from '@/components/layout/OfficerLayout';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, formatRelative } from '@/lib/utils';
import { MapPin, Image, CheckCircle2, Eye } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'work_in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
];

const PROGRESS_STATUSES = [
  { value: 'work_in_progress', label: 'Work in Progress' },
  { value: 'resolved', label: 'Mark Resolved' },
];

export const OfficerReportsPage = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [modal, setModal] = useState<'view' | 'progress' | 'resolve' | null>(null);
  const [note, setNote] = useState('');
  const [progressStatus, setProgressStatus] = useState('work_in_progress');
  const [resolutionDesc, setResolutionDesc] = useState('');

  const { data, isLoading } = useQuery(['officer-reports', statusFilter], () => officerApi.getReports({ ...(statusFilter && { status: statusFilter }) }), { select: (d) => d.data.data });
  const reports: Report[] = data?.reports || [];

  const updateProgress = useMutation(
    () => {
      const fd = new FormData();
      fd.append('status', progressStatus);
      if (note) fd.append('note', note);
      return officerApi.updateProgress(selected!.reportId, fd);
    },
    { onSuccess: () => { toast.success('Progress updated'); qc.invalidateQueries('officer-reports'); setModal(null); setNote(''); } }
  );

  const submitResolution = useMutation(
    () => {
      const fd = new FormData();
      fd.append('description', resolutionDesc);
      return officerApi.submitResolution(selected!.reportId, fd);
    },
    { onSuccess: () => { toast.success('Resolution submitted'); qc.invalidateQueries('officer-reports'); setModal(null); setResolutionDesc(''); } }
  );

  return (
    <OfficerLayout title="Assigned Reports">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">Assigned Reports</h1>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40 text-sm" />
        </div>

        <p className="text-sm text-gray-500">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>

        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState icon="📋" title="No reports assigned" description="Reports assigned to your department will appear here." />
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const cat = typeof r.categoryId !== 'string' ? r.categoryId : null;
              return (
                <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">{cat?.icon || '📋'}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{r.title}</div>
                        <div className="text-xs text-gray-400 font-mono">{r.reportId}</div>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{r.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={r.severity} />
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />{r.location?.area || r.location?.city}
                      </div>
                    </div>
                    <div className="flex gap-1 whitespace-nowrap">
                      <button onClick={() => { setSelected(r); setModal('view'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelected(r); setModal('progress'); }} className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" title="Update Progress">
                        <Image className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelected(r); setModal('resolve'); }} className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600" title="Submit Resolution">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">{formatRelative(r.createdAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Modal */}
      {selected && modal === 'view' && (
        <Modal isOpen title={selected.reportId} onClose={() => setModal(null)} size="lg">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={selected.status} /></div>
              <div><span className="text-gray-500">Severity:</span> <SeverityBadge severity={selected.severity} /></div>
              <div className="col-span-2"><span className="text-gray-500">Location:</span> {selected.location?.address}</div>
            </div>
            <div><p className="text-gray-500 mb-1">Description</p><p className="text-gray-800">{selected.description}</p></div>
            {selected.attachments?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {selected.attachments.map((a) => <img key={a._id} src={a.url} alt="" className="w-24 h-24 rounded-lg object-cover" />)}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setModal('progress')}>Update Progress</Button>
              <Button size="sm" variant="outline" onClick={() => setModal('resolve')}>Submit Resolution</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Progress Modal */}
      <Modal isOpen={modal === 'progress'} title="Update Progress" onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Select label="Status" options={PROGRESS_STATUSES} value={progressStatus} onChange={(e) => setProgressStatus(e.target.value)} />
          <Input label="Work Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What work has been done?" />
          <Button onClick={() => updateProgress.mutate()} isLoading={updateProgress.isLoading} className="w-full">Update</Button>
        </div>
      </Modal>

      {/* Resolve Modal */}
      <Modal isOpen={modal === 'resolve'} title="Submit Resolution" onClose={() => setModal(null)}>
        <div className="space-y-4">
          <Input label="Resolution Description *" value={resolutionDesc} onChange={(e) => setResolutionDesc(e.target.value)} placeholder="Describe what was done to fix the issue" />
          <p className="text-xs text-gray-500">You can upload before/after images via the API or mobile app.</p>
          <Button onClick={() => submitResolution.mutate()} isLoading={submitResolution.isLoading} disabled={!resolutionDesc} className="w-full">Submit Resolution</Button>
        </div>
      </Modal>
    </OfficerLayout>
  );
};
