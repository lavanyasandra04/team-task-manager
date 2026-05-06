const router = require('express').Router();
const { getMyTasks, getOverdueTasks, getStats } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/my-tasks', getMyTasks);
router.get('/overdue', getOverdueTasks);
router.get('/stats', getStats);

module.exports = router;