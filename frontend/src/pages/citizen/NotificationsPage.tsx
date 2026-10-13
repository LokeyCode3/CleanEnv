import { useQuery, useMutation, useQueryClient } from 'react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { notificationApi } from '@/lib/api';
import { Notification } from '@/types';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

export const NotificationsPage = () => {
  const qc = useQueryClient();
  const prefersReduced = useReducedMotion();

  const { data, isLoading } = useQuery('notifications', () => notificationApi.getAll(), {
    select: (d) => d.data.data as { notifications: Notification[]; unread: number },
  });

  const markAll = useMutation(() => notificationApi.markAllRead(), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });

  const markOne = useMutation((id: string) => notificationApi.markRead(id), {
    onSuccess: () => qc.invalidateQueries('notifications'),
  });

  const notifications = data?.notifications || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900">
          Notifications {data?.unread ? <span className="text-sm text-primary-600 ml-1">({data.unread} new)</span> : ''}
        </h1>
        {data?.unread ? (
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()} isLoading={markAll.isLoading}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description="You'll be notified here when there are updates to your reports." />
      ) : (
        <motion.div
          className="space-y-2"
          variants={prefersReduced ? {} : { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          initial={prefersReduced ? false : 'hidden'}
          animate="show"
        >
          {notifications.map((n) => (
            <motion.div
              key={n._id}
              variants={prefersReduced ? {} : { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}
            >
              <motion.button
                onClick={() => !n.isRead && markOne.mutate(n._id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-colors',
                  n.isRead ? 'bg-white border-gray-200' : 'bg-primary-50 border-primary-200'
                )}
                whileHover={prefersReduced ? {} : { scale: 1.005, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                whileTap={prefersReduced ? {} : { scale: 0.99 }}
              >
                <div className="flex items-start gap-3">
                  <Bell className={cn('w-4 h-4 mt-0.5 shrink-0', n.isRead ? 'text-gray-400' : 'text-primary-600')} />
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium break-words', n.isRead ? 'text-gray-700' : 'text-gray-900')}>{n.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 line-clamp-2 break-words">{n.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</div>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-600 shrink-0 mt-1" />}
                </div>
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};
