require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const signAccess  = (p) => jwt.sign(p, process.env.JWT_SECRET, { expiresIn: '15m' });
const signRefresh = (p) => jwt.sign(p, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const projectAdmin = async (req, res, next) => {
  const pid = req.params.projectId || req.params.id;
  const { rows } = await pool.query(
    'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
    [pid, req.user.id]
  );
  if (!rows[0] || rows[0].role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  req.membership = rows[0];
  next();
};

const projectMember = async (req, res, next) => {
  const pid = req.params.projectId || req.params.id;
  const { rows } = await pool.query(
    'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
    [pid, req.user.id]
  );
  if (!rows[0]) return res.status(403).json({ error: 'Not a project member' });
  req.membership = rows[0];
  next();
};

// ─── HEALTH ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, globalRole } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows[0]) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name,email,password_hash,global_role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,global_role,created_at',
      [name, email, passwordHash, globalRole || 'MEMBER']
    );
    const user = rows[0];

    const accessToken  = signAccess({ id: user.id, email: user.email, globalRole: user.global_role });
    const refreshToken = signRefresh({ id: user.id });
    await pool.query(
      'INSERT INTO refresh_tokens (token,user_id,expires_at) VALUES ($1,$2,$3)',
      [refreshToken, user.id, new Date(Date.now() + 7*24*60*60*1000)]
    );

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    console.error('SIGNUP ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken  = signAccess({ id: user.id, email: user.email, globalRole: user.global_role });
    const refreshToken = signRefresh({ id: user.id });
    await pool.query(
      'INSERT INTO refresh_tokens (token,user_id,expires_at) VALUES ($1,$2,$3)',
      [refreshToken, user.id, new Date(Date.now() + 7*24*60*60*1000)]
    );

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, accessToken, refreshToken });
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token=$1', [refreshToken]);
    if (!rows[0] || rows[0].expires_at < new Date()) return res.status(401).json({ error: 'Invalid refresh token' });
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows: users } = await pool.query('SELECT * FROM users WHERE id=$1', [payload.id]);
    const accessToken = signAccess({ id: users[0].id, email: users[0].email, globalRole: users[0].global_role });
    res.json({ accessToken });
  } catch (err) { res.status(401).json({ error: 'Invalid refresh token' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await pool.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id,name,email,global_role,created_at FROM users WHERE id=$1', [req.user.id]);
  res.json(rows[0]);
});

// ─── PROJECTS ─────────────────────────────────────────────────────────────────
app.get('/api/projects', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, 
        json_build_object('id',u.id,'name',u.name,'email',u.email) as owner,
        (SELECT json_agg(json_build_object('id',pm.id,'role',pm.role,'user',
          json_build_object('id',u2.id,'name',u2.name,'email',u2.email)))
         FROM project_members pm JOIN users u2 ON u2.id=pm.user_id WHERE pm.project_id=p.id) as members,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) as task_count
      FROM projects p
      JOIN users u ON u.id=p.owner_id
      WHERE p.id IN (SELECT project_id FROM project_members WHERE user_id=$1)
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO projects (name,description,owner_id) VALUES ($1,$2,$3) RETURNING *',
      [name, description || null, req.user.id]
    );
    const project = rows[0];
    await pool.query(
      'INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,$3)',
      [project.id, req.user.id, 'ADMIN']
    );
    res.status(201).json(project);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/projects/:id', auth, projectMember, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*,
        json_build_object('id',u.id,'name',u.name,'email',u.email) as owner,
        (SELECT json_agg(json_build_object('id',pm.id,'role',pm.role,'user',
          json_build_object('id',u2.id,'name',u2.name,'email',u2.email)))
         FROM project_members pm JOIN users u2 ON u2.id=pm.user_id WHERE pm.project_id=p.id) as members
      FROM projects p JOIN users u ON u.id=p.owner_id
      WHERE p.id=$1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/projects/:id', auth, projectAdmin, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const { rows } = await pool.query(
      'UPDATE projects SET name=COALESCE($1,name),description=COALESCE($2,description),status=COALESCE($3,status),updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, description, status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projects/:id', auth, projectAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:id/members', auth, projectAdmin, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const user = await pool.query('SELECT id,name,email FROM users WHERE id=$1', [userId]);
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' });
    const { rows } = await pool.query(
      'INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, userId, role || 'MEMBER']
    );
    res.status(201).json({ ...rows[0], user: user.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'User already a member' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/members/:userId', auth, projectAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    res.json({ message: 'Member removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TASKS ────────────────────────────────────────────────────────────────────
app.get('/api/projects/:projectId/tasks', auth, projectMember, async (req, res) => {
  try {
    const { status, priority, assigneeId } = req.query;
    let q = `SELECT t.*,
      json_build_object('id',u.id,'name',u.name,'email',u.email) as assignee,
      json_build_object('id',u2.id,'name',u2.name,'email',u2.email) as created_by
      FROM tasks t
      LEFT JOIN users u ON u.id=t.assignee_id
      JOIN users u2 ON u2.id=t.created_by_id
      WHERE t.project_id=$1`;
    const params = [req.params.projectId];
    if (status)     { params.push(status);     q += ` AND t.status=$${params.length}`; }
    if (priority)   { params.push(priority);   q += ` AND t.priority=$${params.length}`; }
    if (assigneeId) { params.push(assigneeId); q += ` AND t.assignee_id=$${params.length}`; }
    q += ' ORDER BY t.created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:projectId/tasks', auth, projectMember, async (req, res) => {
  try {
    const { title, description, priority, assigneeId, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      'INSERT INTO tasks (title,description,priority,assignee_id,due_date,project_id,created_by_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [title, description||null, priority||'MEDIUM', assigneeId||null, dueDate||null, req.params.projectId, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const task = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!task.rows[0]) return res.status(404).json({ error: 'Task not found' });
    const { title, description, priority, assigneeId, dueDate } = req.body;
    const { rows } = await pool.query(
      `UPDATE tasks SET title=COALESCE($1,title),description=COALESCE($2,description),
       priority=COALESCE($3,priority),assignee_id=COALESCE($4,assignee_id),
       due_date=COALESCE($5,due_date),updated_at=NOW() WHERE id=$6 RETURNING *`,
      [title, description, priority, assigneeId, dueDate, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tasks/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    const { rows } = await pool.query(
      'UPDATE tasks SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/api/dashboard/my-tasks', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*,json_build_object('id',p.id,'name',p.name) as project
       FROM tasks t JOIN projects p ON p.id=t.project_id
       WHERE t.assignee_id=$1 AND t.status!='DONE' ORDER BY t.due_date ASC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/overdue', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*,json_build_object('id',p.id,'name',p.name) as project
       FROM tasks t JOIN projects p ON p.id=t.project_id
       WHERE t.assignee_id=$1 AND t.status!='DONE' AND t.due_date<NOW() ORDER BY t.due_date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard/stats', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const [total,todo,inProgress,done,overdue,projects] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM tasks WHERE assignee_id=$1',[uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE assignee_id=$1 AND status='TODO'",[uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE assignee_id=$1 AND status='IN_PROGRESS'",[uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE assignee_id=$1 AND status='DONE'",[uid]),
      pool.query("SELECT COUNT(*) FROM tasks WHERE assignee_id=$1 AND status!='DONE' AND due_date<NOW()",[uid]),
      pool.query('SELECT COUNT(*) FROM project_members WHERE user_id=$1',[uid]),
    ]);
    res.json({
      total: +total.rows[0].count,
      todo: +todo.rows[0].count,
      inProgress: +inProgress.rows[0].count,
      done: +done.rows[0].count,
      overdue: +overdue.rows[0].count,
      projects: +projects.rows[0].count,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── 404 + ERROR ──────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message }); });

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
