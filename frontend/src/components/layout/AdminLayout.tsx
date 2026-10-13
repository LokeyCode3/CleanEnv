import { ReactNode, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Map, Building2, Users2, Tag,
  Bell, BarChart3, Settings, Shield, ChevronLeft, ChevronRight,
  LogOut, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { cn, getInitials } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/map', icon: Map, label: 'Map View' },
  { to: '/admin/departments', icon: Building2, label: 'Departments' },
  { to: '/admin/users', icon: Users2, label: 'Users' },
  { to: '/admin/categories', icon: Tag, label: 'Categories' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/audit', icon: Shield, label: 'Audit Logs' },
];

export const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navVariants: Variants | undefined = prefersReduced
    ? undefined
    : {
        show: { transition: { staggerChildren: 0.05 } },
      };
  const navItemVariants: Variants | undefined = prefersReduced
    ? undefined
    : {
        hidden: { opacity: 0, x: -12 },
        show: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
      };

  const Sidebar = () => (
    <aside
      className={cn(
        'h-screen flex flex-col bg-gray-900 text-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700">
        <span className="text-2xl">🕳️</span>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm">PathHoles</div>
            <div className="text-xs text-gray-400">Admin Portal</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-gray-400 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <motion.nav
        className="flex-1 overflow-y-auto py-4 space-y-1 px-2"
        variants={navVariants}
        initial={prefersReduced ? false : 'hidden'}
        animate={prefersReduced ? undefined : 'show'}
      >
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <motion.div key={to} variants={navItemVariants}>
            <NavLink
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* User */}
      <div className="border-t border-gray-700 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user ? getInitials(user.name) : 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-gray-400 hover:text-white" aria-label="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.div
        className="hidden lg:flex shrink-0"
        initial={prefersReduced ? false : { x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Sidebar />
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <motion.div
              className="relative flex"
              initial={prefersReduced ? false : { x: -280 }}
              animate={{ x: 0 }}
              exit={prefersReduced ? {} : { x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Sidebar />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{title || 'Admin Portal'}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
};
