import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    algorithm: 'HS256',
  });

export const verifyToken = (token) =>
  jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
