import Joi from 'joi';

const name = Joi.string().trim().min(2).max(100);
const email = Joi.string().trim().lowercase().email().max(255);
// bcrypt only looks at the first 72 bytes of a password, so we cap the length.
const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/\d/, 'number')
  .messages({
    'string.pattern.name': 'password must contain at least one {#name}',
  });

export const registerSchema = Joi.object({
  name: name.required(),
  email: email.required(),
  password: password.required(),
});

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
});

export const updateProfileSchema = Joi.object({
  name,
  email,
  password,
  currentPassword: Joi.string(),
})
  .or('name', 'email', 'password') // at least one thing to update
  .with('password', 'currentPassword') // new password needs the current one
  .messages({
    'object.missing': 'Provide at least one of: name, email, password',
    'object.with': 'currentPassword is required to set a new password',
  });
