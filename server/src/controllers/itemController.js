const Item = require('../models/Item');
const Claim = require('../models/Claim');
const ApiError = require('../utils/apiError');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

// @desc    Get all items with filtering, search, and pagination
// @route   GET /api/items
const getItems = async (req, res, next) => {
  try {
    const { search, type, category, status, sortBy = 'newest' } = req.query;
    const query = {};

    // Filter by type (lost or found)
    if (type && ['lost', 'found'].includes(type.toLowerCase())) {
      query.type = type.toLowerCase();
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by status:
    // Once an item is claimed (claim approved) or handed over (closed),
    // it is removed from the student dashboard.
    // If a specific status other than 'all' is requested, respect it; otherwise exclude claimed & closed items.
    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $nin: ['claimed', 'closed'] };
    }

    // Search by title, description, or location (with escaped regex)
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'date') {
      sortOptions = { dateFoundOrLost: -1 };
    }

    const { page, limit, skip } = getPagination(req.query);

    const [items, total] = await Promise.all([
      Item.find(query).sort(sortOptions).skip(skip).limit(limit),
      Item.countDocuments(query),
    ]);

    return res.status(200).json(formatPaginatedResponse(items, total, page, limit));
  } catch (error) {
    next(error);
  }
};

// @desc    Get stats summary
// @route   GET /api/items/stats
const getStats = async (req, res, next) => {
  try {
    const [total, lost, found, pendingClaim, claimed, closed] = await Promise.all([
      Item.countDocuments({ status: { $nin: ['claimed', 'closed'] } }),
      Item.countDocuments({ type: 'lost', status: { $nin: ['claimed', 'closed'] } }),
      Item.countDocuments({ type: 'found', status: { $nin: ['claimed', 'closed'] } }),
      Item.countDocuments({ status: 'pending_claim' }),
      Item.countDocuments({ status: 'claimed' }),
      Item.countDocuments({ status: 'closed' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        activeLost: lost,
        activeFound: found,
        pendingClaim,
        claimed,
        closed,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single item by ID
// @route   GET /api/items/:id
const getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    // Fetch claims for this item
    let claims = await Claim.find({ itemId: item._id }).sort({ createdAt: -1 }).lean();

    // Privacy: Only return handoverOtp to the claimant who owns the claim or an admin
    const currentUserId = req.user ? req.user._id.toString() : null;
    const isAdmin = req.user && req.user.role === 'admin';
    claims = claims.map((c) => {
      const isClaimant = currentUserId && c.claimantId && c.claimantId.toString() === currentUserId;
      if (!isClaimant && !isAdmin) {
        delete c.handoverOtp;
      }
      return c;
    });

    const itemObj = item.toObject();
    delete itemObj.handoverOtp; // Always keep secret from public item responses

    return res.status(200).json({
      success: true,
      data: itemObj,
      claims,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new lost or found item
// @route   POST /api/items
const createItem = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      category,
      location,
      dateFoundOrLost,
      imageUrl,
      contactName,
      contactEmail,
      contactPhone,
      rewardOffered,
    } = req.body;

    if (!title || !description || !type || !location || !contactName || !contactEmail) {
      throw ApiError.badRequest('Missing required fields. Please fill in all required details.');
    }

    const item = await Item.create({
      title,
      description,
      type: type.toLowerCase(),
      category: category || 'Other',
      location,
      dateFoundOrLost: dateFoundOrLost ? new Date(dateFoundOrLost) : new Date(),
      imageUrl: imageUrl || '',
      contactName,
      contactEmail,
      contactPhone: contactPhone || '',
      rewardOffered: Boolean(rewardOffered),
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: `${type === 'found' ? 'Found' : 'Lost'} item report submitted successfully`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item status (e.g. mark as open/claimed)
// @route   PATCH /api/items/:id/status
const updateItemStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'claimed'].includes(status)) {
      throw ApiError.badRequest('Invalid status. Allowed values: open, claimed');
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    // Ownership check: must be owner or admin
    const isOwner = item.userId && item.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You are not allowed to update this item.');
    }

    item.status = status;
    await item.save();

    return res.status(200).json({
      success: true,
      message: `Item marked as ${status}`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit an ownership claim for a found item
// @route   POST /api/items/:id/claims
const createClaim = async (req, res, next) => {
  try {
    const { claimantName, claimantEmail, claimantPhone, proofDetails } = req.body;

    if (!claimantName || !claimantEmail || !proofDetails) {
      throw ApiError.badRequest('Name, email, and proof details are required to file a claim.');
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    if (item.type !== 'found') {
      throw ApiError.badRequest('Ownership claims can only be submitted for found items.');
    }

    if (item.status === 'claimed' || item.status === 'closed') {
      throw ApiError.badRequest('This item has already been claimed or resolved.');
    }

    // Prevent claimant from claiming their own reported item
    if (item.userId && item.userId.toString() === req.user._id.toString()) {
      throw ApiError.badRequest('You cannot submit an ownership claim for an item you reported.');
    }

    // Check for existing pending claim by this user
    const existingClaim = await Claim.findOne({
      itemId: item._id,
      claimantId: req.user._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existingClaim) {
      throw ApiError.badRequest('You already have a pending claim for this item.');
    }

    const claim = await Claim.create({
      itemId: item._id,
      claimantId: req.user._id,
      claimantName,
      claimantEmail,
      claimantPhone: claimantPhone || '',
      proofDetails,
      status: 'pending',
    });

    // Requirement: Set item status to 'pending_claim' when a valid claim is submitted
    if (item.status === 'open') {
      item.status = 'pending_claim';
      await item.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Claim submitted successfully! The admin and finder will review your proof.',
      data: claim,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Review (approve or reject) an ownership claim
// @route   PATCH /api/items/:id/claims/:claimId
const reviewClaim = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      throw ApiError.badRequest('Invalid claim status. Allowed values: approved, rejected');
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    // Ownership check: must be owner or admin
    const isOwner = item.userId && item.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You are not allowed to review claims for this item.');
    }

    const claim = await Claim.findOne({ _id: req.params.claimId, itemId: item._id });
    if (!claim) {
      throw ApiError.notFound('Claim not found for this item');
    }

    claim.status = status;
    await claim.save();

    if (status === 'approved') {
      // Generate secure 6-digit handover verification OTP and set 24h validity
      const crypto = require('crypto');
      const handoverOtp = crypto.randomInt(100000, 1000000).toString();
      const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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

      // Automatically reject other pending claims for this item
      await Claim.updateMany(
        { itemId: item._id, _id: { $ne: claim._id }, status: 'pending' },
        { status: 'rejected' }
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
          // If claimant only has 1 active lost item, mark it claimed
          const claimantLostItems = await Item.find(claimantLostQuery);
          if (claimantLostItems.length === 1) {
            claimantLostItems[0].status = 'claimed';
            await claimantLostItems[0].save();
          }
        }
      }
    } else if (status === 'rejected') {
      // If rejected, check if there are other pending claims
      const remainingPending = await Claim.countDocuments({
        itemId: item._id,
        status: 'pending',
      });
      if (remainingPending === 0 && item.status === 'pending_claim') {
        item.status = 'open';
        await item.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Claim ${status} successfully.`,
      data: {
        claim,
        itemStatus: item.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get items reported by the currently logged in user
// @route   GET /api/items/my
const getMyItems = async (req, res, next) => {
  try {
    const items = await Item.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Close a claimed item after handover
// @route   PATCH /api/items/:id/close
const closeItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    if (item.status !== 'claimed') {
      throw ApiError.badRequest(
        `Cannot close item with status '${item.status}'. Item must be 'claimed' before it can be closed.`
      );
    }

    const isOwner = item.userId && item.userId.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You are not authorized to close this item.');
    }

    item.status = 'closed';
    await item.save();

    return res.status(200).json({
      success: true,
      message: 'Item has been successfully closed and marked as handed over.',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an item and its claims
// @route   DELETE /api/items/:id
const deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    const isOwner = item.userId && item.userId.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You are not authorized to delete this item.');
    }

    await Claim.deleteMany({ itemId: item._id });
    await Item.findByIdAndDelete(item._id);

    return res.status(200).json({
      success: true,
      message: 'Item deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get potential matches between lost and found items
// @route   GET /api/items/:id/matches
const getPotentialMatches = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    const oppositeType = item.type === 'found' ? 'lost' : 'found';
    const candidates = await Item.find({
      type: oppositeType,
      status: { $in: ['open', 'pending_claim'] },
      _id: { $ne: item._id },
    }).lean();

    const tokenize = (str) =>
      str ? str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean) : [];

    const itemKeywords = new Set([
      ...tokenize(item.title),
      ...tokenize(item.description),
      ...tokenize(item.location),
    ]);

    const matches = candidates
      .map((candidate) => {
        let score = 0;
        const reasons = [];

        // 1. Same Category (+40)
        if (candidate.category && candidate.category === item.category) {
          score += 40;
          reasons.push(`Category: ${item.category}`);
        }

        // 2. Similar Location (+25)
        const candLocationTokens = tokenize(candidate.location);
        const itemLocationTokens = tokenize(item.location);
        const locationCommon = candLocationTokens.filter((tok) =>
          itemLocationTokens.includes(tok)
        );
        if (locationCommon.length > 0) {
          score += 25;
          reasons.push(`Location keyword: ${locationCommon[0]}`);
        }

        // 3. Keyword Overlap (+25)
        const candTextTokens = tokenize(`${candidate.title} ${candidate.description}`);
        const commonWords = candTextTokens.filter((tok) => tok.length > 3 && itemKeywords.has(tok));
        if (commonWords.length > 0) {
          const uniqueWords = [...new Set(commonWords)].slice(0, 3);
          score += Math.min(25, uniqueWords.length * 8);
          reasons.push(`Matching keywords: ${uniqueWords.join(', ')}`);
        }

        // 4. Incident Date proximity within 7 days (+10)
        if (candidate.dateFoundOrLost && item.dateFoundOrLost) {
          const diffDays =
            Math.abs(new Date(candidate.dateFoundOrLost) - new Date(item.dateFoundOrLost)) /
            (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            score += 10;
            reasons.push('Dates within 7 days');
          }
        }

        return {
          ...candidate,
          matchScore: Math.min(100, score),
          reasons,
          matchReasons: reasons,
        };
      })
      .filter((m) => m.matchScore >= 30)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
      matches,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify handover OTP and close item
// @route   POST /api/items/:id/handover/verify OR PATCH /api/items/:id/verify-otp
const verifyHandoverOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp || typeof otp !== 'string' || !otp.trim()) {
      throw ApiError.badRequest('Handover verification OTP code is required.');
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    if (item.status !== 'claimed') {
      throw ApiError.badRequest(
        `Cannot verify handover for item with status '${item.status}'. Item must be 'claimed' (approved claim awaiting physical return).`
      );
    }

    const isFinder = item.userId && item.userId.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isFinder && !isAdmin) {
      throw ApiError.forbidden('Only the person who reported this item or an administrator can verify the handover OTP.');
    }

    const approvedClaim = await Claim.findOne({
      itemId: item._id,
      status: 'approved',
    });

    if (!approvedClaim) {
      throw ApiError.notFound('No approved claim found for this item.');
    }

    // Check if verification attempts are locked
    if ((approvedClaim.otpAttempts || 0) >= 5 || approvedClaim.handoverStatus === 'locked') {
      approvedClaim.handoverStatus = 'locked';
      item.handoverStatus = 'locked';
      await approvedClaim.save();
      await item.save();
      throw ApiError.badRequest('Maximum verification attempts exceeded. Verification is locked. Please contact an administrator.');
    }

    // Check if OTP has expired
    if (approvedClaim.otpExpiresAt && new Date() > approvedClaim.otpExpiresAt) {
      approvedClaim.handoverStatus = 'expired';
      item.handoverStatus = 'expired';
      await approvedClaim.save();
      await item.save();
      throw ApiError.badRequest('Handover OTP has expired. Please request a new OTP.');
    }

    const expectedOtp = approvedClaim.handoverOtp || item.handoverOtp;
    if (!expectedOtp || expectedOtp.trim() !== otp.trim()) {
      approvedClaim.otpAttempts = (approvedClaim.otpAttempts || 0) + 1;
      item.otpAttempts = (item.otpAttempts || 0) + 1;

      if (approvedClaim.otpAttempts >= 5) {
        approvedClaim.handoverStatus = 'locked';
        item.handoverStatus = 'locked';
        await approvedClaim.save();
        await item.save();
        throw ApiError.badRequest('Invalid handover OTP. Maximum attempts reached. Verification is locked. Please contact an administrator.');
      }

      await approvedClaim.save();
      await item.save();
      throw ApiError.badRequest(`Invalid handover OTP. ${5 - approvedClaim.otpAttempts} attempt(s) remaining.`);
    }

    // OTP matched! Mark as handed over and closed
    const now = new Date();
    item.status = 'closed';
    item.handoverStatus = 'verified';
    item.handoverOtpVerifiedAt = now;
    item.handoverCompletedAt = now;
    item.closureMethod = 'otp_verified';
    item.handoverVerifiedBy = req.user._id;
    await item.save();

    approvedClaim.handoverStatus = 'verified';
    approvedClaim.handoverOtpVerifiedAt = now;
    approvedClaim.handoverCompletedAt = now;
    approvedClaim.handoverVerifiedBy = req.user._id;
    await approvedClaim.save();

    return res.status(200).json({
      success: true,
      message: 'Handover OTP verified successfully! The physical handover has been successfully recorded and the item is now closed.',
      data: {
        item,
        claim: approvedClaim,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate handover OTP for claimant
// @route   POST /api/items/:id/handover/regenerate OR POST /api/items/:id/regenerate-otp
const regenerateHandoverOtp = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      throw ApiError.notFound('Item not found');
    }

    if (item.status !== 'claimed') {
      throw ApiError.badRequest('Can only regenerate OTP for claimed items.');
    }

    const approvedClaim = await Claim.findOne({
      itemId: item._id,
      status: 'approved',
    });

    if (!approvedClaim) {
      throw ApiError.notFound('No approved claim found for this item.');
    }

    const isClaimant = approvedClaim.claimantId && approvedClaim.claimantId.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isClaimant && !isAdmin) {
      throw ApiError.forbidden('Only the approved claimant or an administrator can regenerate the handover OTP.');
    }

    const crypto = require('crypto');
    const newOtp = crypto.randomInt(100000, 1000000).toString();
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    approvedClaim.handoverOtp = newOtp;
    approvedClaim.handoverOtpCreatedAt = new Date();
    approvedClaim.otpExpiresAt = newExpiry;
    approvedClaim.otpAttempts = 0;
    approvedClaim.handoverStatus = 'pending';
    await approvedClaim.save();

    item.handoverOtp = newOtp;
    item.otpExpiresAt = newExpiry;
    item.otpAttempts = 0;
    item.handoverStatus = 'pending';
    await item.save();

    return res.status(200).json({
      success: true,
      message: 'New handover verification OTP generated successfully.',
      otp: newOtp,
      validUntil: newExpiry,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
