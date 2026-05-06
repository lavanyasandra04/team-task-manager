import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Spinner, Badge } from '../components/ui';
import { TaskCard } from '../components/tasks/TaskCard';
import { getPriorityColor, getStatusColor, getStatusLabel } from '../utils/roles';
import { formatDate } from '../utils/dates';

function StatCard({ label, value, color = 'text-gray-900' }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: sl } = useQuery({ queryKey: ['stats'], queryFn: dashboardApi.stats });
  const { data: myTasks = [], isLoading: tl } = useQuery({ queryKey: ['myTasks'], queryFn: dashboardApi.myTasks });
  const { data: overdue = [] } = useQuery({ queryKey: ['overdue'], queryFn: dashboardApi.overdue });

  if (sl || tl) return <AppLayout><div className="flex items-center justify-center h-full"><Spinner /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Good to see you, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Here's what's happening with your tasks today.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total tasks" value={stats?.total ?? 0} />
          <StatCard label="To do" value={stats?.todo ?? 0} color="text-gray-600" />
          <StatCard label="In progress" value={stats?.inProgress ?? 0} color="text-blue-600" />
          <StatCard label="Done" value={stats?.done ?? 0} color="text-green-600" />
          <StatCard label="Overdue" value={stats?.overdue ?? 0} color="text-red-600" />
        </div>

        {overdue.length > 0 && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm font-semibold text-red-700 mb-3">⚠ {overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</p>
            <div className="space-y-2">
              {overdue.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-red-800">{t.title}</span>
                  <span className="text-red-500 text-xs">{t.project?.name} · due {formatDate(t.dueDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My tasks */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My tasks</h2>
          {myTasks.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">You have no open tasks assigned to you.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTasks.map((task) => (
                <div key={task.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{task.project?.name}</p>
                  <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}