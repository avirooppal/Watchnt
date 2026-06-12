import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

export const jwtMiddleware = async (c, next) => {
  if (c.req.method === 'GET' && c.req.path === '/health') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    c.set('userId', payload.sub);
    await next();
  } catch (err) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

export const registerUser = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email, hash]
  );
  
  return result.rows[0];
};

export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.status = 400;
    throw err;
  }

  const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};
