const ApiError = require('../utils/apiError');

// Middleware to restrict access to admin users only
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required. Please log in.'));
  }

  if (req.user.role !== 'admin') {
    return next(ApiError.forbidden('Forbidden. Admin access required.'));
  }

  next();
};

module.exports = adminOnly;
