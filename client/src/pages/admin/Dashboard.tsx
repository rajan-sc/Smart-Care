import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/portal.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'USERS' | 'AUDIT'>('ANALYTICS');

  return (
    <div className="min-h-screen bg-slate-50 font-mono text-charcoal">
      {/* Header */}
      <header className="bg-linen-white border-b border-hairline-gray sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-mint-veil flex items-center justify-center border-2 border-forest-ink">
                <span className="font-bold text-forest-ink">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-forest-ink">Admin Portal</h1>
                <p className="text-xs text-charcoal opacity-70">SmartCare Management</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="hidden md:block text-sm text-forest-ink font-semibold">{user?.email}</span>
              <button 
                onClick={logout} 
                className="btn-secondary text-xs px-4 py-2"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div className="flex space-x-6 mt-2">
            {['ANALYTICS', 'USERS', 'AUDIT'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-4 text-sm font-semibold transition-colors relative ${
                  activeTab === tab 
                    ? 'text-forest-ink' 
                    : 'text-charcoal opacity-60 hover:opacity-100'
                }`}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-forest-ink rounded-t-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="animate-fade-in">
          {activeTab === 'ANALYTICS' && <AnalyticsTab />}
          {activeTab === 'USERS' && <UsersTab />}
          {activeTab === 'AUDIT' && <AuditLogsTab />}
        </div>
      </main>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics().then(res => res.data.data),
  });

  if (isLoading) return <div className="text-forest-ink animate-pulse">Loading data...</div>;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-bold text-forest-ink mb-6">User Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Users" value={data?.totalUsers} />
          <StatCard title="Active Doctors" value={data?.totalDoctors} />
          <StatCard title="Active Patients" value={data?.totalPatients} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-forest-ink mb-6">Operations (24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Appointments" value={data?.totalAppointments} highlight />
          <StatCard title="Medicines" value={data?.totalMedicines} />
          <StatCard title="Audit Logs" value={data?.recentLogs24h} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, highlight = false }: { title: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`card ${highlight ? 'bg-mint-veil border-mint-veil' : 'bg-linen-white border-hairline-gray'}`}>
      <h3 className="text-sm font-semibold text-charcoal opacity-70 mb-2">{title}</h3>
      <p className="text-4xl font-bold text-forest-ink">
        {value ?? '0'}
      </p>
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter],
    queryFn: () => adminApi.getUsers(page, 15, '', roleFilter).then(res => res.data.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Role updated successfully', 'success');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: boolean }) => adminApi.verifyDoctor(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Verification status updated', 'success');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('User has been deactivated', 'success');
    },
  });

  const handleDelete = async (u: any) => {
    const ok = await confirm({
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${u.email}?\n\nMedical records and audit logs will be preserved for compliance.`,
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      isDestructive: true,
    });
    if (ok) deleteMutation.mutate(u.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end pb-4 gap-4">
        <h2 className="text-lg font-bold text-forest-ink">Manage Users</h2>
        <select 
          className="input bg-linen-white max-w-xs text-sm"
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
      
      {isLoading ? <div className="text-forest-ink animate-pulse">Loading users...</div> : (
        <div className="card p-0 overflow-hidden border-hairline-gray">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-linen border-b border-hairline-gray text-forest-ink">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Verification</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-gray">
                {data?.users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-forest-ink' : 'bg-red-500'}`}></div>
                        <div>
                          <p className={`font-bold text-forest-ink ${!u.isActive && 'line-through opacity-50'}`}>
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-charcoal opacity-70">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={u.role} 
                        onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                        disabled={roleMutation.isPending || !u.isActive}
                        className="input py-1 px-2 text-xs bg-transparent w-auto"
                      >
                        <option value="PATIENT">PATIENT</option>
                        <option value="DOCTOR">DOCTOR</option>
                        <option value="CAREGIVER">CAREGIVER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'DOCTOR' ? (
                        <button
                          onClick={() => verifyMutation.mutate({ id: u.id, status: !u.isVerified })}
                          disabled={!u.isActive || verifyMutation.isPending}
                          className={`badge-pill text-xs border ${
                            u.isVerified 
                              ? 'bg-mint-veil text-forest-ink border-transparent' 
                              : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
                          } disabled:opacity-50 transition-colors`}
                        >
                          {u.isVerified ? 'Verified' : 'Pending Review'}
                        </button>
                      ) : (
                        <span className="text-charcoal opacity-50 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.isActive ? (
                        <button 
                          onClick={() => handleDelete(u)}
                          disabled={deleteMutation.isPending}
                          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <span className="badge-pill bg-slate-200 text-slate-600 text-xs">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center p-4 border-t border-hairline-gray bg-linen-white">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)} 
              className="btn-secondary text-xs px-3 py-1"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-charcoal">
              Page {page} of {data?.totalPages || 1}
            </span>
            <button 
              disabled={page >= (data?.totalPages || 1)} 
              onClick={() => setPage(p => p + 1)} 
              className="btn-secondary text-xs px-3 py-1"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit Logs Tab ───────────────────────────────────────────────────────
function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, entityFilter, actionFilter],
    queryFn: () => adminApi.getAuditLogs(page, 20, entityFilter, actionFilter).then(res => res.data.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-forest-ink">Audit Logs</h2>
          <p className="text-xs text-charcoal opacity-70 mt-1">Immutable system records</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text"
            placeholder="Filter by Entity..."
            className="input bg-linen-white text-sm py-2 px-3"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          />
          <input 
            type="text"
            placeholder="Filter by Action..."
            className="input bg-linen-white text-sm py-2 px-3"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? <div className="text-forest-ink animate-pulse">Loading logs...</div> : (
        <div className="card p-0 overflow-hidden border-hairline-gray">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-linen border-b border-hairline-gray text-forest-ink">
                <tr>
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Actor</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                  <th className="px-6 py-4 font-semibold">Target Entity</th>
                  <th className="px-6 py-4 font-semibold text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-gray">
                {data?.logs?.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-charcoal opacity-80">
                      {format(new Date(l.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-forest-ink">
                      {l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System'}
                    </td>
                    <td className={`px-6 py-4 font-bold ${l.action.includes('DELETE') ? 'text-red-600' : 'text-forest-ink'}`}>
                      {l.action}
                    </td>
                    <td className="px-6 py-4 text-xs text-charcoal">
                      {l.entity} <span className="opacity-50">[{l.entityId.substring(0,8)}]</span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-charcoal opacity-70">
                      {l.ipAddress || '0.0.0.0'}
                    </td>
                  </tr>
                ))}
                {data?.logs?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-charcoal opacity-50">
                      No logs found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-between items-center p-4 border-t border-hairline-gray bg-linen-white">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)} 
              className="btn-secondary text-xs px-3 py-1"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-charcoal">
              Page {page} of {data?.totalPages || 1}
            </span>
            <button 
              disabled={page >= (data?.totalPages || 1)} 
              onClick={() => setPage(p => p + 1)} 
              className="btn-secondary text-xs px-3 py-1"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
