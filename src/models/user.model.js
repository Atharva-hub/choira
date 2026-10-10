import pool from '../config/mysql.js';

const PUBLIC_COLUMNS = 'id, name, email, created_at AS createdAt, updated_at AS updatedAt';

const UPDATABLE_COLUMNS = {
  name: 'name',
  email: 'email',
  passwordHash: 'password_hash',
};

export const create = async ({ name, email, passwordHash }) => {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash],
  );
  return result.insertId;
};

export const findById = async (id) => {
  const [rows] = await pool.execute(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

export const findByEmailWithPassword = async (email) => {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS passwordHash FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] || null;
};

export const findByIdWithPassword = async (id) => {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_COLUMNS}, password_hash AS passwordHash FROM users WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
};

export const updateById = async (id, fields) => {
  const assignments = [];
  const values = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (fields[field] !== undefined) {
      assignments.push(`${column} = ?`);
      values.push(fields[field]);
    }
  }
  if (assignments.length === 0) return;

  await pool.execute(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`, [...values, id]);
};
