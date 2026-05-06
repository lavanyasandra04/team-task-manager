import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api';
import { TaskCard } from './TaskCard';
import { Empty } from '../ui';
import { getStatusLabel } from '../../utils/roles';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'DONE'];
const COLUMN_COLORS = {
  TODO: 'border-t-gray-300',
  IN_PROGRESS: 'border-t-blue-400',
  DONE: 'border-t-green-400',
};

export function KanbanBoard({ tasks = [], projectId, onTaskClick, membership }) {
  const qc = useQueryClient();
  const isAdmin = membership?.role === 'ADMIN';

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => tasksApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col);
        return (
          <div key={col} className={`card border-t-4 ${COLUMN_COLORS[col]}`}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">{getStatusLabel(col)}</span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{colTasks.length}</span>
            </div>
            <div className="p-3 space-y-3 min-h-[120px]">
              {colTasks.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">No tasks</p>
                : colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={onTaskClick}
                    isAdmin={isAdmin}
                    onStatusChange={(t, status) => statusMutation.mutate({ id: t.id, status })}
                  />
                ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}