import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getInitials } from '@/lib/utils';
import { LogOut, User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  const { register: regProfile, handleSubmit: hsProfile, formState: { errors: eP } } = useForm({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const { register: regPw, handleSubmit: hsPw, formState: { errors: ePw }, watch } = useForm<{
    currentPassword: string; newPassword: string; confirmPassword: string;
  }>();

  const updateProfile = useMutation(
    (data: { name: string; phone: string }) => authApi.updateProfile(data),
    {
      onSuccess: (res) => {
        updateUser(res.data.data.user);
        toast.success('Profile updated');
      },
      onError: () => { toast.error('Update failed'); },
    }
  );

  const changePw = useMutation(
    (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data.currentPassword, data.newPassword),
    {
      onSuccess: () => { toast.success('Password changed'); },
      onError: () => { toast.error('Password change failed'); },
    }
  );

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
          {user ? getInitials(user.name) : 'U'}
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-lg">{user?.name}</div>
          <div className="text-sm text-gray-500">{user?.email}</div>
          <div className="text-xs text-primary-600 capitalize font-medium mt-0.5">{user?.role}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['profile', 'password'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'profile' ? <><User className="w-4 h-4 inline mr-1" />Profile</> : <><Lock className="w-4 h-4 inline mr-1" />Password</>}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card>
          <form onSubmit={hsProfile((d) => updateProfile.mutate(d))} className="space-y-4">
            <Input label="Full Name" {...regProfile('name', { required: 'Name required' })} error={eP.name?.message} />
            <Input label="Phone" {...regProfile('phone', { required: 'Phone required' })} error={eP.phone?.message} />
            <Input label="Email" value={user?.email || ''} disabled className="bg-gray-50" />
            <Button type="submit" isLoading={updateProfile.isLoading} className="w-full">Save Changes</Button>
          </form>
        </Card>
      )}

      {tab === 'password' && (
        <Card>
          <form onSubmit={hsPw((d) => changePw.mutate(d))} className="space-y-4">
            <Input label="Current Password" type="password" {...regPw('currentPassword', { required: 'Required' })} error={ePw.currentPassword?.message} />
            <Input label="New Password" type="password" {...regPw('newPassword', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} error={ePw.newPassword?.message} />
            <Input
              label="Confirm New Password"
              type="password"
              {...regPw('confirmPassword', { validate: (v) => v === watch('newPassword') || 'Passwords do not match' })}
              error={ePw.confirmPassword?.message}
            />
            <Button type="submit" isLoading={changePw.isLoading} className="w-full">Change Password</Button>
          </form>
        </Card>
      )}

      <Button variant="danger" className="w-full" onClick={() => { logout(); navigate('/login'); }}>
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
};
