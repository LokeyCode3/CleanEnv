import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { adminApi } from '@/lib/api';
import { DashboardStats } from '@/types';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import {
  FileText, AlertTriangle, Clock, CheckCircle2, XCircle,
  TrendingUp, Building2, Zap, AlertCircle
} from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function useAnimatedCounter(target: number, duration = 900): number {
  const prefersReduced = useReducedMotion();
  const [count, setCount] = useState(prefersReduced ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReduced) { setCount(target); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.round(target * progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, prefersReduced]);

  return count;
}

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) => {
  const animated = useAnimatedCounter(value);
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
      variants={prefersReduced ? {} : { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
      whileHover={prefersReduced ? {} : { y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{animated.toLocaleString()}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </motion.div>
  );
};

export const AdminDashboard = () => {
  const prefersReduced = useReducedMotion();

  const { data: stats, isLoading: loadingStats } = useQuery('dash-stats', adminApi.getDashboardStats, {
    select: (d) => d.data.data.stats as DashboardStats,
  });
  const { data: overTime } = useQuery('over-time', () => adminApi.getReportsOverTime(6), {
    select: (d) => d.data.data.chart,
  });
  const { data: byCat } = useQuery('by-cat', adminApi.getByCategory, {
    select: (d) => d.data.data.chart,
  });
  const { data: bySev } = useQuery('by-sev', adminApi.getBySeverity, {
    select: (d) => d.data.data.chart,
  });
  const { data: depts } = useQuery('dept-perf', adminApi.getDeptPerformance, {
    select: (d) => d.data.data.departments,
  });

  const cards = stats
    ? [
        { label: 'Total Reports', value: stats.total, icon: FileText, color: 'bg-blue-500' },
        { label: 'New / Submitted', value: stats.submitted, icon: TrendingUp, color: 'bg-indigo-500' },
        { label: 'Pending Verification', value: stats.underReview, icon: Clock, color: 'bg-yellow-500' },
        { label: 'Verified', value: stats.verified, icon: CheckCircle2, color: 'bg-cyan-500' },
        { label: 'Assigned', value: stats.assigned, icon: Building2, color: 'bg-purple-500' },
        { label: 'Work in Progress', value: stats.wip, icon: Zap, color: 'bg-orange-500' },
        { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'bg-green-500' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'bg-red-500' },
        { label: 'Critical Issues', value: stats.critical, icon: AlertTriangle, color: 'bg-rose-600' },
        { label: 'SLA Breaches', value: stats.slaBreach, icon: AlertCircle, color: 'bg-pink-600' },
      ]
    : [];

  return (
    <AdminLayout title="Dashboard">
      {/* Stat Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array(10).fill(0).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={prefersReduced ? {} : { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          initial={prefersReduced ? false : 'hidden'}
          animate="show"
        >
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </motion.div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          className="bg-white rounded-xl border border-gray-200 p-5"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h3 className="font-semibold text-gray-900 mb-4">Reports Over Time</h3>
          {overTime ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="h-56 animate-pulse bg-gray-100 rounded-lg" />}
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-gray-200 p-5"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3 className="font-semibold text-gray-900 mb-4">By Category</h3>
          {byCat ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCat} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-56 animate-pulse bg-gray-100 rounded-lg" />}
        </motion.div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="bg-white rounded-xl border border-gray-200 p-5"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h3 className="font-semibold text-gray-900 mb-4">By Severity</h3>
          {bySev ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={bySev}
                  dataKey="count"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ _id, percent }: { _id: string; percent: number }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                >
                  {bySev.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-52 animate-pulse bg-gray-100 rounded-lg" />}
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-gray-200 p-5"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h3 className="font-semibold text-gray-900 mb-4">Department Performance</h3>
          {depts?.length ? (
            <div className="space-y-3 overflow-y-auto max-h-48">
              {depts.map((d: { name: string; total: number; resolved: number; resolutionRate: number; slaBreach: number }) => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate max-w-[160px]">{d.name}</span>
                    <span className="text-gray-500 text-xs">{d.resolved}/{d.total} · {d.resolutionRate}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <motion.div
                      className="h-2 bg-green-500 rounded-full"
                      initial={prefersReduced ? false : { width: 0 }}
                      animate={{ width: `${d.resolutionRate}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="h-52 animate-pulse bg-gray-100 rounded-lg" />}
        </motion.div>
      </div>
    </AdminLayout>
  );
};
