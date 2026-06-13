export const jwtMiddleware = async (c, next) => {
  if (c.req.method === 'GET' && c.req.path === '/health') {
    return next();
  }
  // Hardcode user ID 1 for single-tenant local environment
  c.set('userId', '00000000-0000-0000-0000-000000000001');
  await next();
};
