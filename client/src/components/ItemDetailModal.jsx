import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Mail,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { submitClaim, getItemById, reviewClaim } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ItemDetailModal({ item, isOpen, onClose, onRefresh, onOpenAuth }) {
  const { user } = useAuth();
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [claimsList, setClaimsList] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);
  const [claimData, setClaimData] = useState({
    claimantName: user?.name || '',
    claimantEmail: user?.email || '',
    claimantPhone: user?.phone || '',
    proofDetails: '',
  });

  useEffect(() => {
    if (user) {
      setClaimData((prev) => ({
        ...prev,
        claimantName: prev.claimantName || user.name || '',
        claimantEmail: prev.claimantEmail || user.email || '',
        claimantPhone: prev.claimantPhone || user.phone || '',
      }));
    }
  }, [user, claimFormOpen]);

  useEffect(() => {
    if (isOpen && item?._id) {
      getItemById(item._id)
        .then((res) => {
          if (res?.claims) {
            setClaimsList(res.claims);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, item]);

  const [submitting, setSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  if (!isOpen || !item) return null;

  const isFound = item.type === 'found';
  const isOwner = user && item.userId && (user._id === item.userId || user.id === item.userId);
  const isAdmin = user?.role === 'admin';
  const canReview = isOwner || isAdmin;

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setClaimError('');
    setClaimSuccess('');

    if (!user) {
      onOpenAuth?.('login');
      return;
    }

    if (!claimData.claimantName || !claimData.claimantEmail || !claimData.proofDetails) {
      setClaimError('Please provide your name, email, and proof details.');
      return;
    }

    setSubmitting(true);
    try {
      await submitClaim(item._id, claimData);
      setClaimSuccess('Claim submitted. The finder will review your details.');
      setClaimFormOpen(false);
      // Refresh claims list
      const res = await getItemById(item._id);
      if (res?.claims) setClaimsList(res.claims);
      onRefresh?.();
    } catch (err) {
      setClaimError(err.response?.data?.message || err.message || 'Failed to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (claimId, status) => {
    setReviewingId(claimId);
    try {
      await reviewClaim(item._id, claimId, status);
      const res = await getItemById(item._id);
      if (res?.claims) setClaimsList(res.claims);
      onRefresh?.();
    } catch (err) {
      alert('Error updating claim: ' + (err.response?.data?.message || err.message));
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/50">
      <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden my-8">
        {/* Media or Image */}
        <div className="relative h-56 w-full bg-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-200">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="text-gray-400 text-sm">No photo available</div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-gray-700 hover:bg-white flex items-center justify-center shadow-sm border border-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold text-white shadow-xs ${
                isFound ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              {isFound ? 'Found' : 'Lost'}
            </span>

            {item.status === 'claimed' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500 text-white shadow-xs">
                Claim in Progress
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <span className="text-xs font-medium text-gray-500">
              {item.category}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">
              {item.title}
            </h2>
          </div>

          {claimSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{claimSuccess}</span>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Location</span>
              <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {item.location}
              </span>
            </div>

            <div>
              <span className="text-gray-400 block text-[11px]">Date</span>
              <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                {new Date(item.dateFoundOrLost || item.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              Description
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1">
              {isFound ? 'Finder / Holding Office' : 'Reported By'}
            </h4>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-medium text-gray-900">{item.contactName}</span>
              <div className="flex items-center gap-3 text-blue-600">
                <a href={`mailto:${item.contactEmail}`} className="hover:underline flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{item.contactEmail}</span>
                </a>
                {item.contactPhone && (
                  <a href={`tel:${item.contactPhone}`} className="text-gray-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{item.contactPhone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Claims Review Section for Item Owner / Admin */}
          {canReview && isFound && claimsList.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Submitted Claims ({claimsList.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {claimsList.map((c) => (
                  <div
                    key={c._id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">{c.claimantName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="text-gray-500 text-[11px] flex gap-3">
                      <span>{c.claimantEmail}</span>
                      {c.claimantPhone && <span>{c.claimantPhone}</span>}
                    </div>
                    <p className="text-gray-700 bg-white p-2 rounded border border-gray-100 text-[11px]">
                      {c.proofDetails}
                    </p>
                    {c.status === 'pending' && (
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={reviewingId === c._id}
                          onClick={() => handleReview(c._id, 'rejected')}
                          className="px-2.5 py-1 rounded text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={reviewingId === c._id}
                          onClick={() => handleReview(c._id, 'approved')}
                          className="px-2.5 py-1 rounded text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                        >
                          Approve Claim
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claim Submission Section (For other users looking at a Found item) */}
          {isFound && !isOwner && item.status === 'open' && (
            <div className="pt-2 border-t border-gray-200">
              {!claimFormOpen ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                  <div>
                    <h5 className="text-xs font-semibold text-blue-900">Is this yours?</h5>
                    <p className="text-[11px] text-blue-700">Submit proof of ownership to claim this item.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        onOpenAuth?.('login');
                      } else {
                        setClaimFormOpen(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                  >
                    {user ? 'Claim Item' : 'Sign In to Claim'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleClaimSubmit} className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-gray-900">Submit Ownership Claim</h5>
                    <button
                      type="button"
                      onClick={() => setClaimFormOpen(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>

                  {claimError && (
                    <div className="p-2 rounded bg-red-50 text-red-700 text-xs">
                      {claimError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={claimData.claimantName}
                      onChange={(e) => setClaimData({ ...claimData, claimantName: e.target.value })}
                      required
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Your Email *"
                      value={claimData.claimantEmail}
                      onChange={(e) => setClaimData({ ...claimData, claimantEmail: e.target.value })}
                      required
                      className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <input
                    type="tel"
                    placeholder="Phone (Optional)"
                    value={claimData.claimantPhone}
                    onChange={(e) => setClaimData({ ...claimData, claimantPhone: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />

                  <textarea
                    rows={2}
                    placeholder="Describe specific proof (passcode, stickers, serial number, contents) *"
                    value={claimData.proofDetails}
                    onChange={(e) => setClaimData({ ...claimData, proofDetails: e.target.value })}
                    required
                    className="w-full bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      {submitting ? 'Submitting...' : 'Send Claim'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
