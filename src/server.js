import app from './app.js';
import env from './config/env.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';
import pool, { connectMySQL } from './config/mysql.js';

const start = async () => {
  await Promise.all([connectMySQL(), connectMongo()]);

  const server = app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await Promise.allSettled([pool.end(), disconnectMongo()]);
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
