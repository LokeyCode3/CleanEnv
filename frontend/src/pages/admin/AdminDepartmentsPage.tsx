import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { departmentApi } from '@/lib/api';
import { Department } from '@/types';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Building2, Trash2 } from 'lucide-react';

export const AdminDepartmentsPage = () => {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: departments, isLoading } = useQuery('departments', () => departmentApi.getAll(), { select: (d) => d.data.data.departments as Department[] });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string; code: string; description: string; headName: string; headEmail: string; headPhone: string }>();

  const create = useMutation((data: object) => departmentApi.create(data), {
    onSuccess: () => { toast.success('Department created'); qc.invalidateQueries('departments'); setShowCreate(false); reset(); },
    onError: (e: any) => { toast.error(e.response?.data?.message || 'Failed'); },
  });

  const remove = useMutation((id: string) => departmentApi.delete(id), {
    onSuccess: () => { toast.success('Department deleted'); qc.invalidateQueries('departments'); },
  });

  return (
    <AdminLayout title="Departments">
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Department</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-36 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
        </div>
      ) : !departments?.length ? (
        <EmptyState icon="🏢" title="No departments" description="Create your first department to start assigning reports." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <div key={d._id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <button onClick={() => { if (confirm('Delete this department?')) remove.mutate(d._id); }} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="font-semibold text-gray-900">{d.name}</div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">{d.code}</div>
              {d.description && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{d.description}</p>}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} title="Add Department" onClose={() => { setShowCreate(false); reset(); }}>
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-4">
          <Input label="Department Name *" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <Input label="Code *" placeholder="e.g. PWD" {...register('code', { required: 'Required' })} error={errors.code?.message} />
          <Input label="Description" {...register('description')} />
          <Input label="Head Name" {...register('headName')} />
          <Input label="Head Email" type="email" {...register('headEmail')} />
          <Input label="Head Phone" {...register('headPhone')} />
          <Button type="submit" isLoading={create.isLoading} className="w-full">Create Department</Button>
        </form>
      </Modal>
    </AdminLayout>
  );
};
