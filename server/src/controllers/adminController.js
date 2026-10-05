const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ApiError = require('../utils/apiError');

// @desc    Get complete administrative statistics
// @route   GET /api/admin/stats
const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalItems,
      lostItems,
      foundItems,
      pendingClaims,
      approvedClaims,
      closedItems,
      recentItems,
      recentClaims,
    ] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments(),
      Item.countDocuments({ type: 'lost' }),
      Item.countDocuments({ type: 'found' }),
      Claim.countDocuments({ status: 'pending' }),
      Claim.countDocuments({ status: 'approved' }),
      Item.countDocuments({ status: 'closed' }),
      Item.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name email'),
      Claim.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('itemId', 'title type status')
        .populate('claimantId', 'name email'),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalItems,
        lostItems,
        foundItems,
        pendingClaims,
        approvedClaims,
        closedItems,
      },
      recentActivity: {
        items: recentItems,
        claims: recentClaims,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of all registered users
// @route   GET /api/admin/users
const getAdminUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all items with optional filters for admin management
// @route   GET /api/admin/items
const getAdminItems = async (req, res, next) => {
  try {
    const { type, status, search } = req.query;
    const query = {};

    if (type && ['lost', 'found'].includes(type.toLowerCase())) {
      query.type = type.toLowerCase();
    }

    if (status && ['open', 'pending_claim', 'claimed', 'closed'].includes(status)) {
      query.status = status;
    }

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { contactName: searchRegex },
        { contactEmail: searchRegex },
      ];
    }

    const items = await Item.find(query)
      .populate('userId', 'name email studentId role')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all claims across the campus with full verification details
// @route   GET /api/admin/claims
const getAdminClaims = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    const claims = await Claim.find(query)
      .populate('itemId')
      .populate('claimantId', 'name email phone studentId')
      .populate('reviewedBy', 'name email')
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

// @desc    Approve an ownership claim
// @route   PATCH /api/admin/claims/:claimId/approve
const approveClaim = async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    if (!claim) {
      throw ApiError.notFound('Claim not found');
    }

    if (claim.status !== 'pending') {
      throw ApiError.badRequest(`Cannot approve claim with status '${claim.status}'. Only pending claims can be approved.`);
    }

    const item = await Item.findById(claim.itemId);
    if (!item) {
      throw ApiError.notFound('Associated item not found');
    }

    // Generate secure 6-digit handover verification OTP and set 24h validity
    const crypto = require('crypto');
    const handoverOtp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    claim.status = 'approved';
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    claim.handoverOtp = handoverOtp;
    claim.handoverOtpCreatedAt = new Date();
    claim.otpExpiresAt = otpExpiresAt;
    claim.otpAttempts = 0;
    claim.handoverStatus = 'pending';
    await claim.save();

    item.status = 'claimed';
    item.handoverOtp = handoverOtp;
    item.otpExpiresAt = otpExpiresAt;
    item.otpAttempts = 0;
    item.handoverStatus = 'pending';
    await item.save();

    // Reject all other pending claims on this item
    await Claim.updateMany(
      { itemId: item._id, _id: { $ne: claim._id }, status: 'pending' },
      {
        status: 'rejected',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      }
    );

    // If the claimant reported a matching lost item, also mark it as claimed so it leaves the student dashboard
    if (claim.claimantId) {
      const claimantLostQuery = {
        userId: claim.claimantId,
        type: 'lost',
        status: { $in: ['open', 'pending_claim'] },
      };
      const categoryMatchCount = await Item.countDocuments({
        ...claimantLostQuery,
        category: item.category,
      });

      if (categoryMatchCount > 0) {
        await Item.updateMany(
          { ...claimantLostQuery, category: item.category },
          { status: 'claimed' }
        );
      } else {
        const claimantLostItems = await Item.find(claimantLostQuery);
        if (claimantLostItems.length === 1) {
          claimantLostItems[0].status = 'claimed';
          await claimantLostItems[0].save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Claim approved! Item marked as claimed and other pending claims rejected.',
      data: { claim, item },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject an ownership claim
// @route   PATCH /api/admin/claims/:claimId/reject
const rejectClaim = async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    if (!claim) {
      throw ApiError.notFound('Claim not found');
    }

    if (claim.status !== 'pending') {
      throw ApiError.badRequest(`Cannot reject claim with status '${claim.status}'. Only pending claims can be rejected.`);
    }

    const item = await Item.findById(claim.itemId);
    if (!item) {
      throw ApiError.notFound('Associated item not found');
    }

    claim.status = 'rejected';
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = new Date();
    await claim.save();

    // Check if there are remaining pending claims for this item
    const remainingPending = await Claim.countDocuments({
      itemId: item._id,
      status: 'pending',
    });

    // If no more pending claims and item is still in 'pending_claim', revert back to 'open'
    if (remainingPending === 0 && item.status === 'pending_claim') {
      item.status = 'open';
      await item.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Claim rejected.',
      data: { claim, itemStatus: item.status },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close an item (mark as handed over / resolved via admin override)
// @route   PATCH /api/admin/items/:id/close
const closeAdminItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    if (item.status === 'closed') {
      throw ApiError.badRequest('Item is already closed');
    }

    // Direct open -> closed transitions remain blocked. Item must be 'claimed'.
    if (item.status !== 'claimed') {
      throw ApiError.badRequest(
        `Cannot close item with status '${item.status}'. Only 'claimed' items can be closed via admin override.`
      );
    }

    const now = new Date();
    item.status = 'closed';
    item.closureMethod = 'admin_override';
    item.closedBy = req.user._id;
    item.closedAt = now;
    item.handoverStatus = 'admin_override';
    item.handoverCompletedAt = now;
    item.handoverVerifiedBy = req.user._id;
    await item.save();

    // Also update approved claim for auditing
    await Claim.updateMany(
      { itemId: item._id, status: 'approved' },
      {
        handoverStatus: 'admin_override',
        handoverCompletedAt: now,
        handoverVerifiedBy: req.user._id,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Item marked as closed via admin override.',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin delete item and associated claims
// @route   DELETE /api/admin/items/:id
const deleteAdminItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    await Claim.deleteMany({ itemId: item._id });
    await Item.findByIdAndDelete(item._id);

    return res.status(200).json({
      success: true,
      message: 'Item and all associated claims deleted by admin.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminStats,
  getAdminUsers,
  getAdminItems,
  getAdminClaims,
  approveClaim,
  rejectClaim,
  closeAdminItem,
  deleteAdminItem,
};
