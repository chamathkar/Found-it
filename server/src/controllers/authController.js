const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

// Format user response without exposing sensitive data
const sanitizeUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  studentId: user.studentId || '',
  role: user.role || 'user',
  createdAt: user.createdAt,
});

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, studentId } = req.body;

    if (!name || !email || !password) {
      throw ApiError.badRequest('Please provide your name, email, and password.');
    }

    if (password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters long.');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : '',
      studentId: studentId ? studentId.trim() : '',
      role: 'user', // Security: public registration must never allow role 'admin'
    });

    // Generate JWT including role
    const token = signToken({ id: user._id, email: user.email, role: user.role });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw ApiError.badRequest('Please provide both email and password.');
    }

    // Find user by email and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    // Generate JWT including role
    const token = signToken({ id: user._id, email: user.email, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
