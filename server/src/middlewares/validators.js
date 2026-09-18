const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

// Middleware to extract and format express-validator errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    const primaryMessage = formattedErrors[0]?.message || 'Validation error';
    return next(ApiError.badRequest(primaryMessage, formattedErrors));
  }
  next();
};

// Auth Validations
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Please provide a valid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// Item Validations
const validateCreateItem = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('type').trim().toLowerCase().isIn(['lost', 'found']).withMessage("Item type must be either 'lost' or 'found'"),
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 100 }).withMessage('Location cannot exceed 100 characters'),
  body('contactName').trim().notEmpty().withMessage('Contact name is required'),
  body('contactEmail').trim().isEmail().withMessage('Please provide a valid contact email'),
  handleValidationErrors,
];

const validateUpdateItemStatus = [
  body('status').trim().toLowerCase().isIn(['open', 'claimed']).withMessage("Status must be either 'open' or 'claimed'"),
  handleValidationErrors,
];

// Claim Validations
const validateCreateClaim = [
  body('claimantName').trim().notEmpty().withMessage('Claimant name is required'),
  body('claimantEmail').trim().isEmail().withMessage('Please provide a valid claimant email'),
  body('proofDetails').trim().notEmpty().withMessage('Proof of ownership details are required').isLength({ max: 1000 }).withMessage('Proof details cannot exceed 1000 characters'),
  handleValidationErrors,
];

const validateReviewClaim = [
  body('status').trim().toLowerCase().isIn(['approved', 'rejected']).withMessage("Status must be either 'approved' or 'rejected'"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateCreateItem,
  validateUpdateItemStatus,
  validateCreateClaim,
  validateReviewClaim,
};
