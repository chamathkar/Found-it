const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

// Protect routes - requires valid JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('Not authorized. Please log in to continue.'));
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(ApiError.unauthorized('User associated with this token no longer exists.'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(ApiError.unauthorized('Invalid or expired authentication token.'));
  }
};

// Optional auth - attaches user if token exists, but doesn't reject if not
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }
  } catch (error) {
    // Ignore invalid optional token
  }

  next();
};

module.exports = {
  protect,
  optionalAuth,
};
