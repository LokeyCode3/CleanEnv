import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { adminApi, departmentApi } from '@/lib/api';
import { User, Department } from '@/types';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, getInitials } from '@/lib/utils';
import { UserPlus, Trash2, Edit, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'citizen', label: 'Citizen' },
  { value: 'officer', label: 'Officer' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const ROLE_BADGE: Record<string, string> = {
  citizen: 'bg-blue-100 text-blue-700',
  officer: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
  super_admin: 'bg-red-100 text-red-700',
};

export const AdminUsersPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: departments } = useQuery('departments', () => departmentApi.getAll(), { select: (d) => d.data.data.departments as Department[] });
  const { data, isLoading } = useQuery(['admin-users', search, role], () => adminApi.listUsers({ ...(search && { search }), ...(role && { role }), limit: 50 }), { select: (d) => d.data.data });

  const users: User[] = data?.users || [];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{
    name: string; email: string; phone: string; password: string; role: string; departmentId: string;
  }>();

  const createUser = useMutation((formData: object) => adminApi.createUser(formData), {
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries('admin-users'); setShowCreate(false); reset(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed'); },
  });

  const deleteUser = useMutation((id: string) => adminApi.deleteUser(id), {
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries('admin-users'); },
  });

  const deptOptions = [{ value: '', label: 'No Department' }, ...(departments?.map((d) => ({ value: d._id, label: d.name })) || [])];
  const roleCreateOptions = [
    { value: 'citizen', label: 'Citizen' },
    { value: 'officer', label: 'Officer' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <AdminLayout title="User Management">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-56" placeholder="Search name, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select options={ROLE_OPTIONS} value={role} onChange={(e) => setRole(e.target.value)} className="w-36 text-sm" />
        <Button onClick={() => setShowCreate(true)} className="ml-auto"><UserPlus className="w-4 h-4" /> Add User</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['User', 'Email', 'Phone', 'Role', 'Department', 'Joined', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7}><EmptyState title="No users found" className="py-10" /></td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">{getInitials(u.name)}</div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{typeof u.departmentId === 'object' && u.departmentId ? (u.departmentId as Department).name : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => { if (confirm('Delete this user?')) deleteUser.mutate(u.id); }} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal isOpen={showCreate} title="Create New User" onClose={() => { setShowCreate(false); reset(); }}>
        <form onSubmit={handleSubmit((d) => createUser.mutate(d))} className="space-y-4">
          <Input label="Full Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <Input label="Email" type="email" {...register('email', { required: 'Required' })} error={errors.email?.message} />
          <Input label="Phone" {...register('phone', { required: 'Required' })} error={errors.phone?.message} />
          <Input label="Password" type="password" {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })} error={errors.password?.message} />
          <Select label="Role" options={roleCreateOptions} {...register('role', { required: 'Required' })} error={errors.role?.message} />
          <Select label="Department (for officers)" options={deptOptions} {...register('departmentId')} />
          <Button type="submit" isLoading={createUser.isLoading} className="w-full">Create User</Button>
        </form>
      </Modal>
    </AdminLayout>
  );
};
