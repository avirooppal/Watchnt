import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser } from '../auth.js';

const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const user = await registerUser(body);
    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    return c.json({ id: user.id, email: user.email, token }, 201);
  } catch (err) {
    if (err.status === 400) {
      return c.json({ error: err.message }, 400);
    }
    if (err.code === '23505') { // Postgres unique violation error code
      return c.json({ error: 'Email already exists' }, 409);
    }
    console.error('Register error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const token = await loginUser(body);
    return c.json({ token }, 200);
  } catch (err) {
    if (err.status === 400) {
      return c.json({ error: err.message }, 400);
    }
    if (err.status === 401) {
      return c.json({ error: err.message }, 401);
    }
    console.error('Login error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default authRoutes;
