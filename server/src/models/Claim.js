const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    claimantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Claimant ID is required'],
    },
    claimantName: {
      type: String,
      required: [true, 'Claimant name is required'],
      trim: true,
    },
    claimantEmail: {
      type: String,
      required: [true, 'Claimant email is required'],
      trim: true,
      lowercase: true,
    },
    claimantPhone: {
      type: String,
      trim: true,
      default: '',
    },
    proofDetails: {
      type: String,
      required: [true, 'Proof of ownership details are required'],
      maxlength: [1000, 'Proof details cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    handoverOtp: {
      type: String,
      default: null,
    },
    handoverOtpCreatedAt: {
      type: Date,
      default: null,
    },
    handoverStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'locked', 'admin_override', null],
      default: null,
    },
    handoverOtpVerifiedAt: {
      type: Date,
      default: null,
    },
    handoverCompletedAt: {
      type: Date,
      default: null,
    },
    handoverVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Claim = mongoose.model('Claim', claimSchema);

module.exports = Claim;
