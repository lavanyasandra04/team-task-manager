require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcrypt');

async function seed() {
  console.log('Seeding database...');
  
  const adminHash  = await bcrypt.hash('Admin@1234', 10);
  const memberHash = await bcrypt.hash('Member@1234', 10);

  // Create users
  const { rows: [admin] } = await pool.query(
    `INSERT INTO users (name,email,password_hash,global_role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
    ['Alice Admin','admin@example.com', adminHash,'ADMIN']
  );
  const { rows: [bob] } = await pool.query(
    `INSERT INTO users (name,email,password_hash,global_role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
    ['Bob Member','bob@example.com', memberHash,'MEMBER']
  );
  const { rows: [carol] } = await pool.query(
    `INSERT INTO users (name,email,password_hash,global_role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
    ['Carol Dev','carol@example.com', memberHash,'MEMBER']
  );

  // Create project
  const { rows: [project] } = await pool.query(
    `INSERT INTO projects (name,description,owner_id) VALUES ($1,$2,$3) RETURNING *`,
    ['Website Redesign','Complete overhaul of the company website.', admin.id]
  );

  // Add members
  await pool.query(
    `INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,'ADMIN') ON CONFLICT DO NOTHING`,
    [project.id, admin.id]
  );
  await pool.query(
    `INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,'MEMBER') ON CONFLICT DO NOTHING`,
    [project.id, bob.id]
  );
  await pool.query(
    `INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,'MEMBER') ON CONFLICT DO NOTHING`,
    [project.id, carol.id]
  );

  // Create tasks
  const tasks = [
    ['Design new homepage mockup','DONE','HIGH', bob.id],
    ['Set up CI/CD pipeline','IN_PROGRESS','HIGH', carol.id],
    ['Write unit tests','TODO','MEDIUM', bob.id],
    ['Update documentation','TODO','LOW', null],
  ];
  for (const [title, status, priority, assigneeId] of tasks) {
    await pool.query(
      `INSERT INTO tasks (title,status,priority,assignee_id,project_id,created_by_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [title, status, priority, assigneeId, project.id, admin.id]
    );
  }

  console.log('✅ Seed complete!');
  console.log('Admin:  admin@example.com / Admin@1234');
  console.log('Member: bob@example.com   / Member@1234');
  console.log('Member: carol@example.com / Member@1234');
  process.exit(0);
}

seed().catch((err) => { console.error('Seed failed:', err.message); process.exit(1); });
