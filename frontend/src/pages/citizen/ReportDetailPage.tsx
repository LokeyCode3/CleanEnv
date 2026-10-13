import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { MapPin, ChevronLeft, Clock, Building2, ThumbsUp, AlertCircle } from 'lucide-react';
import { reportApi } from '@/lib/api';
import { Report, StatusHistory } from '@/types';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatRelative, statusConfig } from '@/lib/utils';

export const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading } = useQuery(
    ['report', id],
    () => reportApi.getById(id!),
    {
      select: (d) => d.data.data.report as Report,
      enabled: !!id,
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!report) return <div className="text-center py-12 text-gray-500">Report not found</div>;

  const category = typeof report.categoryId !== 'string' ? report.categoryId : null;
  const department = typeof report.departmentId !== 'string' ? report.departmentId : null;
  const primaryAttachment = report.attachments.find((a) => a.isPrimary) || report.attachments[0];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 p-2 -ml-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{report.title}</h1>
          <p className="text-xs text-gray-500 font-mono">{report.reportId}</p>
        </div>
      </div>

      {/* Primary image */}
      {primaryAttachment && (
        <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
          <img
            src={primaryAttachment.url}
            alt="Report evidence"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Status card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{category?.icon || '📋'}</span>
            <div>
              <div className="text-sm font-medium text-gray-900">{category?.name}</div>
              <div className="text-xs text-gray-500">{formatDate(report.createdAt)}</div>
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <SeverityBadge severity={report.severity} />
          {report.supportCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <ThumbsUp className="w-3.5 h-3.5" />
              {report.supportCount} people affected
            </div>
          )}
          {report.isSlaBreach && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
              SLA Breached
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{report.description}</p>
      </div>

      {/* Location */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" /> Location
        </h3>
        <p className="text-sm text-gray-700 break-words">{report.location.address}</p>
        <p className="text-xs text-gray-500 mt-1 break-words">
          {report.location.area && `${report.location.area}, `}
          {report.location.city}, {report.location.district}
        </p>
        {report.location.landmark && (
          <p className="text-xs text-gray-500 break-words">Near: {report.location.landmark}</p>
        )}
      </div>

      {/* Department */}
      {department && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" /> Assigned Department
          </h3>
          <p className="text-sm text-gray-700">{department.name}</p>
        </div>
      )}

      {/* Rejection reason */}
      {report.status === 'rejected' && report.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Rejection Reason</h3>
          <p className="text-sm text-red-700">{report.rejectionReason}</p>
        </div>
      )}

      {/* Resolution */}
      {report.resolution && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-green-800">✅ Issue Resolved</h3>
          <p className="text-sm text-green-700">{report.resolution.description}</p>
          <p className="text-xs text-green-600">Resolved on {formatDate(report.resolution.resolvedAt)}</p>
          {report.resolution.afterImages.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {report.resolution.afterImages.map((img, i) => (
                <img key={i} src={img} alt="After" className="w-20 h-20 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Public comments */}
      {report.internalComments.filter((c) => c.isPublic).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Updates</h3>
          <div className="space-y-3">
            {report.internalComments
              .filter((c) => c.isPublic)
              .map((comment) => (
                <div key={comment._id} className="text-sm">
                  <p className="text-gray-700">{comment.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatRelative(comment.createdAt)}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" /> Status Timeline
        </h3>
        <div className="space-y-4">
          {[...report.statusHistory].reverse().map((entry, idx) => (
            <TimelineEntry key={entry._id || idx} entry={entry} />
          ))}
        </div>
      </div>

      {/* All photos */}
      {report.attachments.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">All Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {report.attachments.map((a) => (
              <img
                key={a._id}
                src={a.url}
                alt="Evidence"
                className="w-full aspect-square rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TimelineEntry = ({ entry }: { entry: StatusHistory }) => {
  const config = statusConfig[entry.status] || { label: entry.status, bg: 'bg-gray-100', color: 'text-gray-700' };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1 ${config.bg.replace('bg-', 'bg-').replace('-100', '-500')}`} />
        <div className="w-0.5 bg-gray-100 flex-1 mt-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
          {config.label}
        </div>
        {entry.comment && (
          <p className="text-xs text-gray-600 mt-1">{entry.comment}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{formatDate(entry.timestamp)}</p>
      </div>
    </div>
  );
};
