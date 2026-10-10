import pool from '../config/mysql.js';

export const PROJECT_STATUSES = ['active', 'completed', 'archived'];

const COLUMNS =
  'id, user_id AS userId, name, description, status, created_at AS createdAt, updated_at AS updatedAt';

// API field name -> database column. Doubles as a whitelist for updates.
const UPDATABLE_COLUMNS = {
  name: 'name',
  description: 'description',
  status: 'status',
};

// Every read/write below is scoped by user_id, so a user can never
// touch a project that belongs to someone else.

export const create = async ({ userId, name, description = null, status = 'active' }) => {
  const [result] = await pool.execute(
    'INSERT INTO projects (user_id, name, description, status) VALUES (?, ?, ?, ?)',
    [userId, name, description, status],
  );
  return result.insertId;
};

export const findAllByUser = async (userId, { status } = {}) => {
  let sql = `SELECT ${COLUMNS} FROM projects WHERE user_id = ?`;
  const values = [userId];

  if (status) {
    sql += ' AND status = ?';
    values.push(status);
  }
  sql += ' ORDER BY created_at DESC, id DESC';

  const [rows] = await pool.execute(sql, values);
  return rows;
};

export const findByIdAndUser = async (id, userId) => {
  const [rows] = await pool.execute(
    `SELECT ${COLUMNS} FROM projects WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId],
  );
  return rows[0] || null;
};

export const updateByIdAndUser = async (id, userId, fields) => {
  const assignments = [];
  const values = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[field] !== undefined) {
      assignments.push(`${column} = ?`);
      values.push(fields[field]);
    }
  }
  if (assignments.length === 0) return;

  await pool.execute(
    `UPDATE projects SET ${assignments.join(', ')} WHERE id = ? AND user_id = ?`,
    [...values, id, userId],
  );
};

// Returns true when a row was actually deleted.
export const deleteByIdAndUser = async (id, userId) => {
  const [result] = await pool.execute('DELETE FROM projects WHERE id = ? AND user_id = ?', [id, userId]);
  return result.affectedRows > 0;
};

// One query gives all three project numbers for the dashboard.
export const getStatsByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(status = 'active'), 0) AS active,
       COALESCE(SUM(status = 'completed'), 0) AS completed
     FROM projects
     WHERE user_id = ?`,
    [userId],
  );
  return {
    total: Number(rows[0].total),
    active: Number(rows[0].active),
    completed: Number(rows[0].completed),
  };
};
