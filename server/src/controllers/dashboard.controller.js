const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
};

const getMyTasks = asyncHandler(async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: req.user.id, status: { not: 'DONE' } },
    include: taskInclude,
    orderBy: { dueDate: 'asc' },
  });
  res.json(tasks);
});

const getOverdueTasks = asyncHandler(async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: req.user.id,
      status: { not: 'DONE' },
      dueDate: { lt: new Date() },
    },
    include: taskInclude,
    orderBy: { dueDate: 'asc' },
  });
  res.json(tasks);
});

const getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [total, todo, inProgress, done, overdue, projects] = await Promise.all([
    prisma.task.count({ where: { assigneeId: userId } }),
    prisma.task.count({ where: { assigneeId: userId, status: 'TODO' } }),
    prisma.task.count({ where: { assigneeId: userId, status: 'IN_PROGRESS' } }),
    prisma.task.count({ where: { assigneeId: userId, status: 'DONE' } }),
    prisma.task.count({ where: { assigneeId: userId, status: { not: 'DONE' }, dueDate: { lt: new Date() } } }),
    prisma.project.count({ where: { members: { some: { userId } } } }),
  ]);

  res.json({ total, todo, inProgress, done, overdue, projects });
});

module.exports = { getMyTasks, getOverdueTasks, getStats };