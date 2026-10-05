const express = require('express');
const router = express.Router();
const { getMyClaims } = require('../controllers/claimController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/my', protect, getMyClaims);

module.exports = router;
