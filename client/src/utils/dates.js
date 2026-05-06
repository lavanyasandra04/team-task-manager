import { format, isPast, differenceInDays, isToday } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
};

export const isOverdue = (date) => {
  if (!date) return false;
  return isPast(new Date(date)) && !isToday(new Date(date));
};

export const daysUntilDue = (date) => {
  if (!date) return null;
  return differenceInDays(new Date(date), new Date());
};

export const dueDateLabel = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return 'Due today';
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff}d`;
};