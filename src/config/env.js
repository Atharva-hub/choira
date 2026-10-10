import 'dotenv/config';

// Every variable the app cannot run without. We fail fast at startup
// instead of discovering a missing secret in the middle of a request.
// (MYSQL_PASSWORD is not listed because a local MySQL may have an empty one.)
const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE', 'MONGO_URI', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.',
  );
}

const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,

  mysql: Object.freeze({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE,
  }),

  mongoUri: process.env.MONGO_URI,

  jwt: Object.freeze({
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  }),

  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
});

export default env;
