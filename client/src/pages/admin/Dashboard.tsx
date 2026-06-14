import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/portal.api';
import { DataTable } from '../../components/DataTable';
import type { Column } from '../../components/DataTable';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'audit'>('analytics');

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-slate-900">Admin Portal</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">{user?.firstName} {user?.lastName}</span>
              <button onClick={logout} className="text-sm text-slate-500 hover:text-red-600 transition-colors">
                Sign out
              </button>
            </div>
          </div>
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'audit' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Audit Logs
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'audit' && <AuditLogsTab />}
      </main>
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics().then(res => res.data.data),
  });

  if (isLoading) return <div className="text-slate-500">Loading analytics...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard title="Total Users" value={data?.totalUsers} />
      <StatCard title="Total Doctors" value={data?.totalDoctors} />
      <StatCard title="Total Patients" value={data?.totalPatients} />
      <StatCard title="Total Appointments" value={data?.totalAppointments} />
      <StatCard title="Total Medicines" value={data?.totalMedicines} />
      <StatCard title="Audit Logs (24h)" value={data?.recentLogs24h} />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value?: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value ?? '-'}</p>
    </div>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter],
    queryFn: () => adminApi.getUsers(page, 10, '', roleFilter).then(res => res.data.data),
  });

  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Role updated successfully', 'success');
    },
    onError: () => showToast('Failed to update role', 'error'),
  });

  const columns: Column<any>[] = [
    { header: 'Name', cell: (u) => `${u.firstName} ${u.lastName}` },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Role', cell: (u) => (
      <select 
        value={u.role} 
        onChange={(e) => mutation.mutate({ id: u.id, role: e.target.value })}
        className="text-sm border-slate-200 rounded-md py-1 px-2"
        disabled={mutation.isPending}
      >
        <option value="PATIENT">Patient</option>
        <option value="DOCTOR">Doctor</option>
        <option value="CAREGIVER">Caregiver</option>
        <option value="ADMIN">Admin</option>
      </select>
    ) },
    { header: 'Joined', cell: (u) => new Date(u.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Manage Users</h2>
        <select 
          className="border-slate-200 rounded-lg text-sm px-3 py-2"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Roles</option>
          <option value="PATIENT">Patient</option>
          <option value="DOCTOR">Doctor</option>
          <option value="CAREGIVER">Caregiver</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      
      {isLoading ? <div className="text-slate-500">Loading users...</div> : (
        <>
          <DataTable data={data?.users || []} columns={columns} />
          <div className="flex justify-between items-center mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3">Prev</button>
            <span className="text-sm text-slate-500">Page {page} of {data?.totalPages || 1}</span>
            <button disabled={page >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3">Next</button>
          </div>
        </>
      )}
    </div>
  );
}

function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => adminApi.getAuditLogs(page, 15).then(res => res.data.data),
  });

  const columns: Column<any>[] = [
    { header: 'Date', cell: (l) => new Date(l.createdAt).toLocaleString() },
    { header: 'Action', accessorKey: 'action' },
    { header: 'Entity', cell: (l) => `${l.entity} (${l.entityId})` },
    { header: 'User', cell: (l) => l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System' },
    { header: 'IP', accessorKey: 'ipAddress' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">System Audit Logs</h2>
      {isLoading ? <div className="text-slate-500">Loading logs...</div> : (
        <>
          <DataTable data={data?.logs || []} columns={columns} />
          <div className="flex justify-between items-center mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1 px-3">Prev</button>
            <span className="text-sm text-slate-500">Page {page} of {data?.totalPages || 1}</span>
            <button disabled={page >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1 px-3">Next</button>
          </div>
        </>
      )}
    </div>
  );
}
