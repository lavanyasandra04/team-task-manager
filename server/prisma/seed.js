const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@1234', 10);
  const memberPassword = await bcrypt.hash('Member@1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Alice Admin',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      globalRole: 'ADMIN',
    },
  });

  const member1 = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      name: 'Bob Member',
      email: 'bob@example.com',
      passwordHash: memberPassword,
      globalRole: 'MEMBER',
    },
  });

  const member2 = await prisma.user.upsert({
    where: { email: 'carol@example.com' },
    update: {},
    create: {
      name: 'Carol Dev',
      email: 'carol@example.com',
      passwordHash: memberPassword,
      globalRole: 'MEMBER',
    },
  });

  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website with new branding.',
      ownerId: admin.id,
    },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: admin.id } },
    update: {},
    create: { projectId: project.id, userId: admin.id, role: 'ADMIN' },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: member1.id } },
    update: {},
    create: { projectId: project.id, userId: member1.id, role: 'MEMBER' },
  });

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: member2.id } },
    update: {},
    create: { projectId: project.id, userId: member2.id, role: 'MEMBER' },
  });

  const tasks = [
    { title: 'Design new homepage mockup', status: 'DONE', priority: 'HIGH', assigneeId: member1.id },
    { title: 'Set up CI/CD pipeline', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: member2.id },
    { title: 'Write unit tests for API', status: 'TODO', priority: 'MEDIUM', assigneeId: member1.id },
    { title: 'Update documentation', status: 'TODO', priority: 'LOW', assigneeId: null },
    { title: 'Performance audit', status: 'TODO', priority: 'MEDIUM', assigneeId: member2.id,
      dueDate: new Date(Date.now() - 86400000) },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: { ...task, projectId: project.id, createdById: admin.id },
    });
  }

  console.log('Seed complete!');
  console.log('Admin:  admin@example.com  / Admin@1234');
  console.log('Member: bob@example.com    / Member@1234');
  console.log('Member: carol@example.com  / Member@1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());