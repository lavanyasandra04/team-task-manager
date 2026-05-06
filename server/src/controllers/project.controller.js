const prisma = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const memberSelect = {
  id: true, name: true, email: true, globalRole: true,
};

const getProjects = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: {
      owner: { select: memberSelect },
      members: { include: { user: { select: memberSelect } } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
});

const getProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, members: { some: { userId: req.user.id } } },
    include: {
      owner: { select: memberSelect },
      members: { include: { user: { select: memberSelect } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const project = await prisma.project.create({
    data: {
      name,
      description,
      ownerId: req.user.id,
      members: { create: { userId: req.user.id, role: 'ADMIN' } },
    },
    include: {
      owner: { select: memberSelect },
      members: { include: { user: { select: memberSelect } } },
    },
  });
  res.status(201).json(project);
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: req.body,
    include: { owner: { select: memberSelect } },
  });
  res.json(project);
});

const deleteProject = asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ message: 'Project deleted' });
});

const addMember = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;
  const { id: projectId } = req.params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (existing) return res.status(409).json({ error: 'User already a member' });

  const member = await prisma.projectMember.create({
    data: { projectId, userId, role },
    include: { user: { select: memberSelect } },
  });
  res.status(201).json(member);
});

const removeMember = asyncHandler(async (req, res) => {
  const { id: projectId, userId } = req.params;

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot remove yourself from the project' });
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });
  res.json({ message: 'Member removed' });
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const { id: projectId, userId } = req.params;
  const { role } = req.body;

  const member = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
    include: { user: { select: memberSelect } },
  });
  res.json(member);
});

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember, updateMemberRole };