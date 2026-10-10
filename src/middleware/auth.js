import ApiError from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import * as UserModel from '../models/user.model.js';

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Access token is missing. Send it as: Authorization: Bearer <token>');
  }

  const payload = verifyToken(token);

  const user = await UserModel.findById(Number(payload.sub));
  if (!user) {
    throw ApiError.unauthorized('The user for this token no longer exists');
  }

  req.user = user;
  next();
};

export default authenticate;
