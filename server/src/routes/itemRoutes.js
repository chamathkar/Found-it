const express = require('express');
const router = express.Router();
const {
  getItems,
  getStats,
  getItemById,
  createItem,
  updateItemStatus,
  createClaim,
  reviewClaim,
} = require('../controllers/itemController');

const { protect } = require('../middlewares/authMiddleware');
const {
  validateCreateItem,
  validateUpdateItemStatus,
  validateCreateClaim,
  validateReviewClaim,
} = require('../middlewares/validators');

// Stats endpoint
router.get('/stats', getStats);

// Items CRUD
router.route('/')
  .get(getItems)
  .post(protect, validateCreateItem, createItem);

router.route('/:id')
  .get(getItemById);

router.route('/:id/status')
  .patch(protect, validateUpdateItemStatus, updateItemStatus);

router.route('/:id/claims')
  .post(protect, validateCreateClaim, createClaim);

router.route('/:id/claims/:claimId')
  .patch(protect, validateReviewClaim, reviewClaim);

module.exports = router;
