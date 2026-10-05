const Claim = require('../models/Claim');
const ApiError = require('../utils/apiError');

// @desc    Get all claims submitted by the logged in user
// @route   GET /api/claims/my
const getMyClaims = async (req, res, next) => {
  try {
    const claims = await Claim.find({ claimantId: req.user._id })
      .populate('itemId', 'title description type category location status imageUrl contactName contactEmail')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: claims.length,
      data: claims,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyClaims,
};
