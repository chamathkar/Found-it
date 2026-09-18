const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      required: true,
      enum: ['lost', 'found'],
      default: 'lost',
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Electronics',
        'Cards & IDs',
        'Keys',
        'Bags & Wallets',
        'Books & Stationery',
        'Clothing & Apparel',
        'Jewelry & Accessories',
        'Other',
      ],
      default: 'Other',
    },
    location: {
      type: String,
      required: [true, 'Campus location is required'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    dateFoundOrLost: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['open', 'claimed'],
      default: 'open',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    rewardOffered: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Search indexes for title, description, and location
itemSchema.index({ title: 'text', description: 'text', location: 'text' });
itemSchema.index({ type: 1, category: 1, status: 1 });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
