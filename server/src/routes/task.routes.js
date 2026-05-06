const router = require('express').Router();
const ctrl = require('../controllers/task.controller');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, updateStatusSchema } = require('../schemas/task.schema');

router.use(authenticate);

// Tasks within a project
router.get('/projects/:projectId/tasks', requireProjectMember, ctrl.getTasks);
router.post('/projects/:projectId/tasks', requireProjectMember, validate(createTaskSchema), ctrl.createTask);

// Individual task operations - we need to load project context from the task
// These middleware will look up the task first to get projectId
const loadTaskProject = async (req, res, next) => {
  const prisma = require('../config/database');
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  req.params.projectId = task.projectId;
  req._task = task;
  next();
};

router.get('/tasks/:id', loadTaskProject, requireProjectMember, ctrl.getTask);
router.put('/tasks/:id', loadTaskProject, requireProjectMember, validate(updateTaskSchema), ctrl.updateTask);
router.put('/tasks/:id/status', loadTaskProject, requireProjectMember, validate(updateStatusSchema), ctrl.updateStatus);
router.delete('/tasks/:id', loadTaskProject, requireProjectAdmin, ctrl.deleteTask);

module.exports = router;