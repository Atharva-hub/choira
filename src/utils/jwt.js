import jwt from 'jsonwebtoken';
import env from '../config/env.js';

// The token only stores the user id (the "subject"). Everything else
// about the user is loaded fresh from MySQL on each request.
export const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    algorithm: 'HS256',
  });

// Throws JsonWebTokenError / TokenExpiredError when the token is bad.
export const verifyToken = (token) =>
  jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
