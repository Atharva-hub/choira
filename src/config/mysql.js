import mysql from 'mysql2/promise';
import env from './env.js';

const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  timezone: 'Z',
});

pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export const connectMySQL = async () => {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
  console.log('MySQL connected');
};

export default pool;
