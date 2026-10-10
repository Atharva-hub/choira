import bcrypt from 'bcrypt';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.js';
import * as UserModel from '../models/user.model.js';

// Never let the password hash leave the service layer.
const toPublicUser = ({ passwordHash, ...user }) => user;

export const register = async ({ name, email, password }) => {
  const existing = await UserModel.findByEmailWithPassword(email);
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  let userId;
  try {
    userId = await UserModel.create({ name, email, passwordHash });
  } catch (err) {
    // Two requests with the same email can pass the check above at the
    // same moment. The UNIQUE index in MySQL is the real guarantee.
    if (err.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('An account with this email already exists');
    }
    throw err;
  }

  const user = await UserModel.findById(userId);
  return { user, token: signToken(userId) };
};

export const login = async ({ email, password }) => {
  const user = await UserModel.findByEmailWithPassword(email);

  // Same message for "no such email" and "wrong password", so an
  // attacker cannot use this endpoint to find out which emails exist.
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  return { user: toPublicUser(user), token: signToken(user.id) };
};

export const updateProfile = async (userId, { name, email, password, currentPassword }) => {
  const user = await UserModel.findByIdWithPassword(userId);
  const changes = {};

  if (name !== undefined) changes.name = name;

  if (email !== undefined && email !== user.email) {
    const emailOwner = await UserModel.findByEmailWithPassword(email);
    if (emailOwner) {
      throw ApiError.conflict('An account with this email already exists');
    }
    changes.email = email;
  }

  if (password !== undefined) {
    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw ApiError.unauthorized('Current password is incorrect');
    }
    changes.passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  }

  try {
    await UserModel.updateById(userId, changes);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw ApiError.conflict('An account with this email already exists');
    }
    throw err;
  }

  return UserModel.findById(userId);
};
