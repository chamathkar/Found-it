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
  },
  {
    timestamps: true,
  }
);

const Claim = mongoose.model('Claim', claimSchema);

module.exports = Claim;
