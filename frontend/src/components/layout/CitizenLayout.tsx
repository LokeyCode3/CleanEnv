import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, PlusCircle, Bell, User, LogOut, FileText } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

interface CitizenLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/citizen', icon: Home, label: 'Home', end: true },
  { to: '/citizen/map', icon: MapPin, label: 'Nearby' },
  { to: '/citizen/report/new', icon: PlusCircle, label: 'Report' },
  { to: '/citizen/my-reports', icon: FileText, label: 'My Reports' },
  { to: '/citizen/notifications', icon: Bell, label: 'Alerts' },
  { to: '/citizen/profile', icon: User, label: 'Profile' },
];

export const CitizenLayout = ({ children }: CitizenLayoutProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <motion.header
        className="bg-white border-b border-gray-200 sticky top-0 z-30 pt-safe"
        initial={prefersReduced ? false : { y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary-600">🕳️</span>
            <span className="font-bold text-gray-900">PathHoles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
              {user ? getInitials(user.name) : 'U'}
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-lg hover:bg-gray-100 text-gray-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full min-w-0 px-4 py-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-[env(safe-area-inset-bottom,0px)]">
        <LayoutGroup>
          <div className="max-w-lg mx-auto grid grid-cols-6">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors relative min-h-[44px]',
                    to === '/citizen/report/new' ? 'relative -top-3' : '',
                    isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && to !== '/citizen/report/new' && (
                      <motion.span
                        layoutId="citizen-nav-indicator"
                        className="absolute inset-0 bg-primary-50 rounded-lg -z-10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    {to === '/citizen/report/new' ? (
                      <motion.div
                        className="bg-primary-600 rounded-full p-3 shadow-lg"
                        animate={prefersReduced ? {} : { scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </motion.div>
                    ) : (
                      <Icon className={cn('w-5 h-5', isActive ? 'text-primary-600' : 'text-gray-500')} />
                    )}
                    <span className={cn(to === '/citizen/report/new' && 'text-primary-600 font-medium')}>
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </LayoutGroup>
      </nav>
    </div>
  );
};
