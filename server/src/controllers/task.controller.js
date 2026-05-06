const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};

const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, priority, assigneeId } = req.query;

  const where = {
    projectId,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
  };

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(tasks);
});

const getTask = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: taskInclude,
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description, priority, assigneeId, dueDate } = req.body;

  if (assigneeId) {
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: assigneeId } },
    });
    if (!isMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const task = await prisma.task.create({
    data: {
      title, description, priority,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId,
      createdById: req.user.id,
    },
    include: taskInclude,
  });
  res.status(201).json(task);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update tasks assigned to them; admins can update any
  const isAdmin = req.projectMembership?.role === 'ADMIN';
  if (!isAdmin && task.assigneeId !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit tasks assigned to you' });
  }

  const { dueDate, ...rest } = req.body;
  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: { ...rest, ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }) },
    include: taskInclude,
  });
  res.json(updated);
});

const updateStatus = asyncHandler(async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isAdmin = req.projectMembership?.role === 'ADMIN';
  if (!isAdmin && task.assigneeId !== req.user.id) {
    return res.status(403).json({ error: 'You can only change status of tasks assigned to you' });
  }

  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
    include: taskInclude,
  });
  res.json(updated);
});

const deleteTask = asyncHandler(async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ message: 'Task deleted' });
});

module.exports = { getTasks, getTask, createTask, updateTask, updateStatus, deleteTask };