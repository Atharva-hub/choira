import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import env from '../src/config/env.js';

const schemaPath = new URL('../database/schema.sql', import.meta.url);

const run = async () => {
  const schema = await readFile(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    multipleStatements: true,
  });

  try {
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [env.mysql.database],
    );
    await connection.changeUser({ database: env.mysql.database });
    await connection.query(schema);
    console.log(`MySQL database "${env.mysql.database}" is ready (tables: users, projects)`);
  } finally {
    await connection.end();
  }
};

run().catch((err) => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
