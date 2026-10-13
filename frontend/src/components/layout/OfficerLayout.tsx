import { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { ClipboardList, CheckCircle, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { cn, getInitials } from '@/lib/utils';

interface OfficerLayoutProps {
  children: ReactNode;
  title?: string;
}

const navItems = [
  { to: '/officer', icon: ClipboardList, label: 'Assigned Reports', end: true },
  { to: '/officer/resolved', icon: CheckCircle, label: 'Resolved' },
  { to: '/officer/profile', icon: User, label: 'Profile' },
];

export const OfficerLayout = ({ children, title }: OfficerLayoutProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  return (
    <div className="min-h-screen bg-gray-50">
      <motion.header
        className="bg-white border-b border-gray-200 sticky top-0 z-30 pt-safe"
        initial={prefersReduced ? false : { y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🕳️</span>
            <div>
              <div className="font-bold text-sm text-gray-900">PathHoles</div>
              <div className="text-xs text-gray-500">Officer Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
                {user ? getInitials(user.name) : 'O'}
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="text-gray-500 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30 pb-[env(safe-area-inset-bottom,0px)]">
        <LayoutGroup>
          <div className="grid grid-cols-3 max-w-lg mx-auto">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center py-2 gap-0.5 text-xs transition-colors relative min-h-[44px] justify-center',
                    isActive ? 'text-primary-600' : 'text-gray-500'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="officer-nav-indicator"
                        className="absolute inset-0 bg-primary-50 -z-10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className="w-5 h-5" />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </LayoutGroup>
      </nav>

      <main className="max-w-5xl mx-auto w-full min-w-0 px-4 py-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-6">
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
    </div>
  );
};
