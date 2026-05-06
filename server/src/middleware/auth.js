const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../config/database');

// Attaches req.user if token is valid
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Must be used after authenticate + after :projectId is in params
const requireProjectAdmin = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const pid = projectId || id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: pid, userId: req.user.id } },
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Project admin access required' });
    }
    req.projectMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

// Require user to be a member of the project (any role)
const requireProjectMember = async (req, res, next) => {
  try {
    const { projectId, id } = req.params;
    const pid = projectId || id;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: pid, userId: req.user.id } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Project access denied' });
    }
    req.projectMembership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireProjectAdmin, requireProjectMember };