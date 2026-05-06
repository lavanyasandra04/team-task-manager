export const isProjectAdmin = (membership) => membership?.role === 'ADMIN';

export const canEditTask = (task, user, membership) => {
  if (!user) return false;
  if (isProjectAdmin(membership)) return true;
  return task.assigneeId === user.id;
};

export const getRoleBadgeColor = (role) => {
  if (role === 'ADMIN') return 'bg-indigo-100 text-indigo-700';
  return 'bg-gray-100 text-gray-600';
};

export const getPriorityColor = (priority) => {
  const map = { HIGH: 'bg-red-100 text-red-700', MEDIUM: 'bg-yellow-100 text-yellow-700', LOW: 'bg-green-100 text-green-700' };
  return map[priority] || 'bg-gray-100 text-gray-600';
};

export const getStatusColor = (status) => {
  const map = { TODO: 'bg-gray-100 text-gray-600', IN_PROGRESS: 'bg-blue-100 text-blue-700', DONE: 'bg-green-100 text-green-700' };
  return map[status] || 'bg-gray-100 text-gray-600';
};

export const getStatusLabel = (status) => {
  const map = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
  return map[status] || status;
};