import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface LoginForm {
  email: string;
  password: string;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const LoginPage = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const prefersReduced = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      const role = useAuthStore.getState().user?.role;
      if (role === 'super_admin' || role === 'admin') navigate('/admin');
      else if (role === 'officer') navigate('/officer');
      else navigate('/citizen');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Login failed';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={prefersReduced ? false : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="text-5xl mb-3 inline-block"
            animate={prefersReduced ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          >
            🕳️
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900">PathHoles</h1>
          <p className="text-gray-600 mt-1">Civic Infrastructure Reporting Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>

          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            variants={prefersReduced ? {} : { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            initial={prefersReduced ? false : 'hidden'}
            animate="show"
          >
            <motion.div variants={prefersReduced ? {} : fieldVariants}>
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                {...register('email', { required: 'Email is required' })}
                error={errors.email?.message}
              />
            </motion.div>

            <motion.div variants={prefersReduced ? {} : fieldVariants} className="relative">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
                error={errors.password?.message}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>

            <motion.div variants={prefersReduced ? {} : fieldVariants}>
              <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-2">
                Sign In
              </Button>
            </motion.div>
          </motion.form>

          <motion.p
            className="text-center text-sm text-gray-600 mt-6"
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Register
            </Link>
          </motion.p>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Demo Credentials:</p>
            <p>👤 Citizen: citizen@example.com / Citizen@123</p>
            <p>🏛️ Admin: admin@pathhole.gov.in / Admin@1234</p>
            <p>👷 Officer: officer@pathhole.gov.in / Admin@1234</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
