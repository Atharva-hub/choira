import mongoose from 'mongoose';
import pool from '../config/mysql.js';

const MONGO_CONNECTED = 1;

const checkMySQL = async () => {
  try {
    await pool.query('SELECT 1');
    return 'up';
  } catch {
    return 'down';
  }
};

const checkMongo = () => (mongoose.connection.readyState === MONGO_CONNECTED ? 'up' : 'down');

export const checkDatabases = async () => ({
  mysql: await checkMySQL(),
  mongodb: checkMongo(),
});
