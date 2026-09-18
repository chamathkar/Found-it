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

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
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
    const [total, lost, found] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ type: 'lost', status: 'open' }),
      Item.countDocuments({ type: 'found', status: 'open' }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        total,
        activeLost: lost,
        activeFound: found,
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
    const claims = await Claim.find({ itemId: item._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: item,
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
      throw ApiError.conflict('You have already submitted an active claim for this item.');
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

    // Note: Item remains 'open' until the finder/admin approves the claim
    return res.status(201).json({
      success: true,
      message: 'Claim submitted successfully! The finder will review your proof.',
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
      item.status = 'claimed';
      await item.save();

      // Automatically reject other pending claims for this item
      await Claim.updateMany(
        { itemId: item._id, _id: { $ne: claim._id }, status: 'pending' },
        { status: 'rejected' }
      );
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

module.exports = {
  getItems,
  getStats,
  getItemById,
  createItem,
  updateItemStatus,
  createClaim,
  reviewClaim,
};
