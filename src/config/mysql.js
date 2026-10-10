import mysql from 'mysql2/promise';
import env from './env.js';

// A pool keeps a few connections open and reuses them, which is much
// cheaper than opening a new connection for every request.
const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  database: env.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  // Return SUM() results as numbers instead of strings.
  decimalNumbers: true,
  // Read and write DATETIME/TIMESTAMP values as UTC...
  timezone: 'Z',
});

// ...and tell MySQL to use UTC for every new connection too. Without this
// pair, timestamps shift whenever the server and Node disagree on timezone.
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
