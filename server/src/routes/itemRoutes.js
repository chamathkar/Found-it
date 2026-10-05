const express = require('express');
const router = express.Router();
const {
  getItems,
  getStats,
  getItemById,
  getMyItems,
  createItem,
  updateItemStatus,
  closeItem,
  deleteItem,
  getPotentialMatches,
  createClaim,
  reviewClaim,
  verifyHandoverOtp,
  regenerateHandoverOtp,
} = require('../controllers/itemController');

const { protect, optionalAuth } = require('../middlewares/authMiddleware');
const {
  validateCreateItem,
  validateUpdateItemStatus,
  validateCreateClaim,
  validateReviewClaim,
} = require('../middlewares/validators');

// Stats endpoint
router.get('/stats', getStats);

// My reports (must come before /:id)
router.get('/my', protect, getMyItems);

// Items CRUD
router.route('/')
  .get(getItems)
  .post(protect, validateCreateItem, createItem);

router.route('/:id')
  .get(optionalAuth, getItemById)
  .delete(protect, deleteItem);

router.route('/:id/status')
  .patch(protect, validateUpdateItemStatus, updateItemStatus);

router.route('/:id/close')
  .patch(protect, closeItem);

// Handover verification endpoints (supports POST /handover/verify as per spec & PATCH /verify-otp)
router.route('/:id/handover/verify')
  .post(protect, verifyHandoverOtp);

router.route('/:id/verify-otp')
  .patch(protect, verifyHandoverOtp)
  .post(protect, verifyHandoverOtp);

router.route('/:id/handover/regenerate')
  .post(protect, regenerateHandoverOtp);

router.route('/:id/regenerate-otp')
  .post(protect, regenerateHandoverOtp);

router.route('/:id/matches')
  .get(getPotentialMatches);

router.route('/:id/claims')
  .post(protect, validateCreateClaim, createClaim);

router.route('/:id/claims/:claimId')
  .patch(protect, validateReviewClaim, reviewClaim);

module.exports = router;
