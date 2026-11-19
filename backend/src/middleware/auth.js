const jwt = require('jsonwebtoken');
const httpError = require('../utils/httpError');

// Protects routes: expects header  Authorization: Bearer <token>
module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(httpError(401, 'Please log in to continue'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    next(httpError(401, 'Session expired, please log in again'));
  }
};
