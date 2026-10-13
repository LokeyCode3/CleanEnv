import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { reportApi, categoryApi } from '@/lib/api';
import { Report, IssueCategory, ReportStatus } from '@/types';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { ReportCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Input';
import { formatRelative } from '@/lib/utils';
import { MapPin, ChevronRight } from 'lucide-react';

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

export const MyReportsPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const prefersReduced = useReducedMotion();

  const { data: categories } = useQuery('categories', () => categoryApi.getAll(), {
    select: (d) => d.data.data.categories as IssueCategory[],
  });

  const { data, isLoading } = useQuery(
    ['my-reports', status, categoryId],
    () => reportApi.getMy({ ...(status && { status }), ...(categoryId && { categoryId }), limit: 50 }),
    { select: (d) => d.data.data }
  );

  const reports: Report[] = data?.reports || [];

  const catOptions = [
    { value: '', label: 'All Categories' },
    ...(categories?.map((c) => ({ value: c._id, label: `${c.icon} ${c.name}` })) || []),
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-bold text-xl text-gray-900">My Reports</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs py-1.5 w-full sm:w-auto"
        />
        <Select
          options={catOptions}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="text-xs py-1.5 w-full sm:w-auto"
        />
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-sm text-gray-500">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <ReportCardSkeleton key={i} />)}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No reports found"
          description="You haven't submitted any reports matching these filters."
        />
      ) : (
        <motion.div
          className="space-y-3"
          variants={prefersReduced ? {} : { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          initial={prefersReduced ? false : 'hidden'}
          animate="show"
        >
          {reports.map((report) => {
            const cat = typeof report.categoryId !== 'string' ? report.categoryId : null;
            return (
              <motion.div
                key={report._id}
                variants={prefersReduced ? {} : { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
              >
                <motion.button
                  onClick={() => navigate(`/citizen/report/${report.reportId}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-primary-300 hover:shadow-sm transition-colors"
                  whileHover={prefersReduced ? {} : { y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  whileTap={prefersReduced ? {} : { scale: 0.98 }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{cat?.icon || '📋'}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{report.title}</div>
                        <div className="text-xs text-gray-400 font-mono">{report.reportId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={report.status} />
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">{report.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={report.severity} />
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        {report.location.area || report.location.city}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatRelative(report.createdAt)}</span>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
