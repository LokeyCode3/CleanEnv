import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const RegisterPage = () => {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast.success('Registration successful! Welcome to PathHoles.');
      navigate('/citizen');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Registration failed';
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
        <div className="text-center mb-8">
          <motion.div
            className="text-5xl mb-3 inline-block"
            animate={prefersReduced ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          >
            🕳️
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900">PathHoles</h1>
          <p className="text-gray-600 mt-1">Join the civic movement</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Account</h2>

          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            variants={prefersReduced ? {} : { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            initial={prefersReduced ? false : 'hidden'}
            animate="show"
          >
            {([
              {
                label: 'Full Name',
                name: 'name' as const,
                type: 'text',
                placeholder: 'Ravi Kumar',
                validation: { required: 'Name is required' },
              },
              {
                label: 'Email Address',
                name: 'email' as const,
                type: 'email',
                placeholder: 'you@example.com',
                validation: { required: 'Email is required' },
              },
              {
                label: 'Phone Number',
                name: 'phone' as const,
                type: 'tel',
                placeholder: '9876543210',
                validation: { required: 'Phone is required' },
              },
              {
                label: 'Password',
                name: 'password' as const,
                type: 'password',
                placeholder: 'Min. 8 characters',
                validation: {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                },
              },
              {
                label: 'Confirm Password',
                name: 'confirmPassword' as const,
                type: 'password',
                placeholder: 'Repeat password',
                validation: {
                  validate: (v: string) =>
                    v === watch('password') || 'Passwords do not match',
                },
              },
            ]).map((field) => (
              <motion.div key={field.name} variants={prefersReduced ? {} : fieldVariants}>
                <Input
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  {...register(field.name, field.validation)}
                  error={errors[field.name]?.message}
                />
              </motion.div>
            ))}

            <motion.div variants={prefersReduced ? {} : fieldVariants}>
              <Button type="submit" isLoading={isLoading} size="lg" className="w-full mt-2">
                Create Account
              </Button>
            </motion.div>
          </motion.form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
