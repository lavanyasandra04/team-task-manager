import { Avatar, Badge } from '../ui';
import { formatDate, isOverdue, dueDateLabel } from '../../utils/dates';
import { getPriorityColor, getStatusColor, getStatusLabel } from '../../utils/roles';

export function TaskCard({ task, onClick, onStatusChange, isAdmin }) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'DONE';
  const dateLabel = dueDateLabel(task.dueDate);

  const nextStatus = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' };
  const nextLabel = { TODO: 'Start', IN_PROGRESS: 'Complete', DONE: 'Reopen' };

  return (
    <div
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-medium leading-snug ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(task.status)}>{getStatusLabel(task.status)}</Badge>
          {dateLabel && (
            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {dateLabel}
            </span>
          )}
        </div>
        {task.assignee && <Avatar name={task.assignee.name} size="sm" title={task.assignee.name} />}
      </div>

      {onStatusChange && (
        <button
          className="mt-3 w-full text-xs text-indigo-600 border border-indigo-200 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
          onClick={(e) => { e.stopPropagation(); onStatusChange(task, nextStatus[task.status]); }}
        >
          {nextLabel[task.status]}
        </button>
      )}
    </div>
  );
}