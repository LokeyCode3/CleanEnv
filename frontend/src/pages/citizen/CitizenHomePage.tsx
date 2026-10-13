import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { PlusCircle, MapPin, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { reportApi, publicApi } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge';
import { ReportCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelative, truncate } from '@/lib/utils';
import { Report } from '@/types';

function useAnimatedCounter(target: number, duration = 900): number {
  const prefersReduced = useReducedMotion();
  const [count, setCount] = useState(prefersReduced ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReduced) { setCount(target); return; }
    let start: number | null = null;
    const from = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.round(from + (target - from) * progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, prefersReduced]);

  return count;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const CitizenHomePage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const { data: myReports, isLoading } = useQuery(
    'my-reports-recent',
    () => reportApi.getMy({ limit: 5, page: 1 }),
    { select: (d) => d.data.data.reports as Report[] }
  );

  const { data: publicStats } = useQuery('public-stats', () => publicApi.getStats(), {
    select: (d) => d.data.data,
  });

  const totalCount = useAnimatedCounter(publicStats?.total ?? 0);
  const resolvedCount = useAnimatedCounter(publicStats?.resolved ?? 0);
  const activeCount = useAnimatedCounter(publicStats?.active ?? 0);

  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div
      className="space-y-6"
      variants={prefersReduced ? {} : containerVariants}
      initial={prefersReduced ? false : 'hidden'}
      animate="show"
    >
      {/* Welcome */}
      <motion.div variants={prefersReduced ? {} : sectionVariants}>
        <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
          {!prefersReduced && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
            />
          )}
          <p className="text-primary-100 text-sm relative">{timeOfDay()},</p>
          <h1 className="text-2xl font-bold mt-1 relative">{user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-primary-200 text-sm mt-1 relative">Report a civic issue in under 2 minutes</p>
          <Button
            onClick={() => navigate('/citizen/report/new')}
            className="mt-4 bg-white text-primary-700 hover:bg-primary-50 font-semibold w-full relative"
            size="lg"
          >
            <PlusCircle className="w-5 h-5" />
            Report an Issue
          </Button>
        </div>
      </motion.div>

      {/* Quick stats */}
      {publicStats && (
        <motion.div variants={prefersReduced ? {} : sectionVariants} className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total Reports</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Resolved</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
            <div className="text-xs text-gray-500 mt-0.5">Active</div>
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div variants={prefersReduced ? {} : sectionVariants} className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={() => navigate('/citizen/map')}
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 transition-all text-left"
          whileHover={prefersReduced ? {} : { y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
          whileTap={prefersReduced ? {} : { scale: 0.97 }}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Nearby Issues</div>
            <div className="text-xs text-gray-500">See your area</div>
          </div>
        </motion.button>
        <motion.button
          onClick={() => navigate('/citizen/my-reports')}
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 transition-all text-left"
          whileHover={prefersReduced ? {} : { y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
          whileTap={prefersReduced ? {} : { scale: 0.97 }}
        >
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">My Reports</div>
            <div className="text-xs text-gray-500">Track status</div>
          </div>
        </motion.button>
      </motion.div>

      {/* Recent reports */}
      <motion.div variants={prefersReduced ? {} : sectionVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Recent Reports</h2>
          <button
            onClick={() => navigate('/citizen/my-reports')}
            className="text-sm text-primary-600 hover:underline"
          >
            View all
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <ReportCardSkeleton key={i} />)}
          </div>
        ) : !myReports?.length ? (
          <EmptyState
            icon="📋"
            title="No reports yet"
            description="You haven't reported any issues yet. Tap the button above to get started!"
          />
        ) : (
          <div className="space-y-3">
            {myReports.map((report) => (
              <ReportCard key={report._id} report={report} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const ReportCard = ({ report }: { report: Report }) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const category = typeof report.categoryId !== 'string' ? report.categoryId : null;

  return (
    <motion.button
      onClick={() => navigate(`/citizen/report/${report.reportId}`)}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
      whileHover={prefersReduced ? {} : { y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      whileTap={prefersReduced ? {} : { scale: 0.98 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{category?.icon || '📋'}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{report.title}</div>
            <div className="text-xs text-gray-500">{report.reportId}</div>
          </div>
        </div>
        <StatusBadge status={report.status} className="shrink-0" />
      </div>
      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{report.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[180px]">
            {typeof report.location === 'object' ? report.location.area || report.location.city : ''}
          </span>
        </div>
        <span className="text-xs text-gray-400">{formatRelative(report.createdAt)}</span>
      </div>
    </motion.button>
  );
};
