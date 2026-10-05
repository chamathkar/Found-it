const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getAdminUsers,
  getAdminItems,
  getAdminClaims,
  approveClaim,
  rejectClaim,
  closeAdminItem,
  deleteAdminItem,
} = require('../controllers/adminController');

const { protect } = require('../middlewares/authMiddleware');
const adminOnly = require('../middlewares/adminMiddleware');

// All admin routes are protected and restricted to users with role === 'admin'
router.use(protect, adminOnly);

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/items', getAdminItems);
router.get('/claims', getAdminClaims);
router.patch('/claims/:claimId/approve', approveClaim);
router.patch('/claims/:claimId/reject', rejectClaim);
router.patch('/items/:id/close', closeAdminItem);
router.post('/items/:id/close', closeAdminItem);
router.delete('/items/:id', deleteAdminItem);

module.exports = router;
