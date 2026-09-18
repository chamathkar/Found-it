import React, { useState, useEffect } from 'react';
import { X, AlertCircle, HelpCircle, PlusCircle, Image, MapPin } from 'lucide-react';
import { createItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

const categories = [
  'Electronics',
  'Cards & IDs',
  'Keys',
  'Bags & Wallets',
  'Books & Stationery',
  'Clothing & Apparel',
  'Jewelry & Accessories',
  'Other',
];

export default function ReportModal({ isOpen, initialType = 'lost', onClose, onSuccess }) {
  const { user } = useAuth();
  const [type, setType] = useState(initialType);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    location: '',
    dateFoundOrLost: new Date().toISOString().split('T')[0],
    imageUrl: '',
    contactName: user?.name || '',
    contactEmail: user?.email || '',
    contactPhone: user?.phone || '',
    rewardOffered: false,
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        contactName: prev.contactName || user.name || '',
        contactEmail: prev.contactEmail || user.email || '',
        contactPhone: prev.contactPhone || user.phone || '',
      }));
    }
  }, [user, isOpen]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description || !formData.location || !formData.contactName || !formData.contactEmail) {
      setError('Please fill in all required fields (Title, Description, Location, Name, Email).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        type,
      };
      await createItem(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50">
      <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {type === 'found' ? 'Report a Found Item' : 'Report a Lost Item'}
            </h2>
            <p className="text-xs text-gray-500">List an item on the campus board to help recover it.</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setType('lost')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                type === 'lost'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              I Lost Something
            </button>
            <button
              type="button"
              onClick={() => setType('found')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                type === 'found'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              I Found Something
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={type === 'found' ? 'e.g. AirPods Pro with white case' : 'e.g. Blue Hydro Flask 32oz'}
              required
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Campus Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Library 2nd Floor"
                required
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date & Image URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date {type === 'found' ? 'Found' : 'Lost'}
              </label>
              <input
                type="date"
                name="dateFoundOrLost"
                value={formData.dateFoundOrLost}
                onChange={handleChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Photo URL (Optional)</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Provide identifiable details, colors, scratches, or stickers..."
              required
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Contact Details */}
          <div className="pt-2 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">
              Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  placeholder="Your Name *"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="Email *"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="Phone (Optional)"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Reward (if lost) */}
          {type === 'lost' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rewardOffered"
                name="rewardOffered"
                checked={formData.rewardOffered}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rewardOffered" className="text-xs text-gray-700">
                Offering a finder's reward
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-lg text-xs font-medium text-white shadow-xs transition-colors ${
                type === 'found'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading ? 'Submitting...' : type === 'found' ? 'Submit Found Item' : 'Post Lost Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
