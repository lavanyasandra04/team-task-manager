const router = require('express').Router();
const ctrl = require('../controllers/project.controller');
const { authenticate, requireProjectAdmin, requireProjectMember } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema, addMemberSchema } = require('../schemas/project.schema');

// All project routes require auth
router.use(authenticate);

router.get('/', ctrl.getProjects);
router.post('/', validate(createProjectSchema), ctrl.createProject);

router.get('/:id', requireProjectMember, ctrl.getProject);
router.put('/:id', requireProjectAdmin, validate(updateProjectSchema), ctrl.updateProject);
router.delete('/:id', requireProjectAdmin, ctrl.deleteProject);

router.post('/:id/members', requireProjectAdmin, validate(addMemberSchema), ctrl.addMember);
router.delete('/:id/members/:userId', requireProjectAdmin, ctrl.removeMember);
router.put('/:id/members/:userId', requireProjectAdmin, ctrl.updateMemberRole);

module.exports = router;