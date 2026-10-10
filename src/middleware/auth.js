import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import * as UserModel from '../models/user.model.js';

// Protects a route. Expects the header:  Authorization: Bearer <token>
// On success the logged-in user is available as req.user.
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Access token is missing. Send it as: Authorization: Bearer <token>');
  }

  // Bad signature or expired token -> jsonwebtoken throws,
  // and the central error handler turns that into a 401.
  const payload = verifyToken(token);

  // The token may outlive the account, so confirm the user still exists.
  const user = await UserModel.findById(Number(payload.sub));
  if (!user) {
    throw ApiError.unauthorized('The user for this token no longer exists');
  }

  req.user = user; // { id, name, email, created_at, updated_at } - no password hash
  next();
};

export default authenticate;
