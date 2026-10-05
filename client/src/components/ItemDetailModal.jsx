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
  Sparkles,
  ArrowRight,
  Check,
  Layers,
  Key,
  Copy,
} from 'lucide-react';
import { submitClaim, getItemById, reviewClaim, getPotentialMatches, closeItem, verifyHandoverOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ItemDetailModal({ item, isOpen, onClose, onRefresh, onOpenAuth, onSelectItem }) {
  const { user } = useAuth();
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [claimsList, setClaimsList] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [closingItem, setClosingItem] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'matches'
  const [inputOtp, setInputOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');
  const [copiedOtp, setCopiedOtp] = useState(false);
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
      setActiveTab('details');
      setClaimSuccess('');
      setClaimError('');
      setClaimFormOpen(false);
      setInputOtp('');
      setOtpError('');
      setOtpSuccess('');
      setCopiedOtp(false);
      // Fetch item details & claims
      getItemById(item._id)
        .then((res) => {
          if (res?.claims) {
            setClaimsList(res.claims);
          }
        })
        .catch(() => {});

      // Fetch potential lost/found matches
      setLoadingMatches(true);
      getPotentialMatches(item._id)
        .then((res) => {
          const list = res?.matches || res?.data || [];
          setMatches(
            list.map((m) => ({
              item: m.item || m,
              matchScore: m.matchScore,
              matchReasons: m.matchReasons || m.reasons || [],
            }))
          );
        })
        .catch(() => {
          setMatches([]);
        })
        .finally(() => {
          setLoadingMatches(false);
        });
    }
  }, [isOpen, item, user]);

  const [submitting, setSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState('');
  const [claimError, setClaimError] = useState('');

  if (!isOpen || !item) return null;

  const isFound = item.type === 'found';
  const currentUserId = user?._id || user?.id;
  const isOwner = user && item.userId && (currentUserId === item.userId || currentUserId === item.userId?._id);
  const isAdmin = user?.role === 'admin';
  const canReview = isOwner || isAdmin;

  // Find if current user already submitted an active claim for this item
  const userClaim = user && claimsList.find((c) => {
    const claimantId = c.claimantId?._id || c.claimantId;
    return (
      (claimantId && currentUserId && claimantId.toString() === currentUserId.toString()) ||
      (user.email && c.claimantEmail && c.claimantEmail.toLowerCase() === user.email.toLowerCase())
    );
  });
  const hasUserClaimed = !!userClaim && userClaim.status !== 'rejected';
  const isClaimableStatus = item.status === 'open' || item.status === 'pending_claim';
  const canSubmitClaim = isFound && !isOwner && !isAdmin && isClaimableStatus && !hasUserClaimed;

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
      setClaimSuccess('Claim submitted successfully! Item status is now pending admin review.');
      setClaimFormOpen(false);
      // Refresh claims list & parent data
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

  const handleCloseItem = async () => {
    if (!window.confirm('Confirm that the physical handover has taken place and this item case can be closed?')) {
      return;
    }
    setClosingItem(true);
    try {
      await closeItem(item._id);
      setClaimSuccess('Item case successfully marked as resolved and closed.');
      onRefresh?.();
    } catch (err) {
      alert('Error closing item: ' + (err.response?.data?.message || err.message));
    } finally {
      setClosingItem(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    setOtpSuccess('');

    if (!inputOtp || inputOtp.trim().length !== 6) {
      setOtpError('Please enter the full 6-digit handover OTP code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await verifyHandoverOtp(item._id, inputOtp.trim());
      setOtpSuccess(res.message || 'OTP verified! Case officially closed.');
      setInputOtp('');
      // Refresh item data & claims
      const updated = await getItemById(item._id);
      if (updated?.claims) setClaimsList(updated.claims);
      onRefresh?.();
    } catch (err) {
      setOtpError(err.response?.data?.message || err.message || 'Verification failed. Incorrect OTP.');
    } finally {
      setVerifyingOtp(false);
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
              {isFound ? 'Found Item' : 'Lost Item'}
            </span>

            {item.status === 'open' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500 text-white shadow-xs">
                Open
              </span>
            )}
            {item.status === 'pending_claim' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500 text-white shadow-xs">
                Claim in Review
              </span>
            )}
            {item.status === 'claimed' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-600 text-white shadow-xs">
                Claim Approved
              </span>
            )}
            {item.status === 'closed' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-600 text-white shadow-xs">
                Case Closed
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-5 pt-2 bg-gray-50/60">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Item Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'matches'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Potential Matches</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold">
              {matches.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {item.category}
              </span>
              <span className="text-[11px] text-gray-400">
                ID: {item._id?.slice(-6)}
              </span>
            </div>
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

          {activeTab === 'details' ? (
            <>
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
                  <span className="text-gray-400 block text-[11px]">Incident Date</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {new Date(item.dateFoundOrLost || item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Handover / Lifecycle Alert Banners */}
              {item.status === 'pending_claim' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">
                      {hasUserClaimed
                        ? 'Your Claim Is Under Review'
                        : 'Claim In Review — Open For Other Claimants'}
                    </span>
                    <span className="text-[11px] text-amber-800">
                      {hasUserClaimed
                        ? 'You have submitted an ownership claim. Campus administration is reviewing your proof details.'
                        : 'A claim for this item has been filed and is being verified. If this is your item, you can still submit your ownership proof below.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Approved Claimant: Handover OTP Box */}
              {hasUserClaimed && userClaim?.status === 'approved' && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-emerald-600" />
                        Your Handover Verification OTP
                      </span>
                      <p className="text-xs text-emerald-800 mt-1 max-w-sm">
                        Show this 6-digit code to the finder or campus administrator at pickup to confirm handover and close the case.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-4 py-2 rounded-lg border border-emerald-300 shadow-xs">
                      <span className="font-mono text-xl font-extrabold tracking-widest text-emerald-950">
                        {userClaim.handoverOtp || '------'}
                      </span>
                      {userClaim.handoverOtp && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(userClaim.handoverOtp);
                            setCopiedOtp(true);
                            setTimeout(() => setCopiedOtp(false), 2500);
                          }}
                          className="p-1 rounded text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-colors ml-1"
                          title="Copy Code"
                        >
                          {copiedOtp ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Finder or Admin: Verify Handover OTP Section */}
              {canReview && item.status === 'claimed' && (
                <div className="p-4 rounded-xl bg-blue-50/90 border border-blue-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Verify Pickup OTP &amp; Complete Handover</span>
                      </div>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Ask the claimant for the 6-digit verification code shown on their device to securely confirm the item was returned.
                      </p>
                    </div>
                  </div>

                  {otpError && (
                    <div className="p-2 rounded bg-rose-100 text-rose-800 text-xs">
                      {otpError}
                    </div>
                  )}

                  {otpSuccess && (
                    <div className="p-2 rounded bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{otpSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="flex flex-wrap items-center gap-2 pt-1">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-36 font-mono text-center tracking-widest text-sm bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                    <button
                      type="submit"
                      disabled={verifyingOtp || inputOtp.length !== 6}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors"
                    >
                      {verifyingOtp ? 'Verifying...' : 'Verify OTP & Close Case'}
                    </button>
                  </form>
                </div>
              )}

              {/* Public/General Claimed Status Banner */}
              {!canReview && (!hasUserClaimed || userClaim?.status !== 'approved') && item.status === 'claimed' && (
                <div className="p-3.5 rounded-lg bg-blue-50/80 border border-blue-200 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Claim Approved — Awaiting Handover</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    The ownership claim was approved. Physical pickup and handover is currently being arranged.
                  </p>
                </div>
              )}

              {item.status === 'closed' && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>This item case has been officially handed over and closed.</span>
                </div>
              )}

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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claim Submission Section (For other users looking at a Found item) */}
              {canSubmitClaim && (
                <div className="pt-2 border-t border-gray-200">
                  {!claimFormOpen ? (
                    <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                      <div>
                        <h5 className="text-xs font-semibold text-blue-900">Is this item yours?</h5>
                        <p className="text-[11px] text-blue-700">
                          {item.status === 'pending_claim'
                            ? 'A claim is currently being verified. If this is your item, submit your proof so administrators can evaluate all claims.'
                            : 'Submit proof of ownership to initiate an official claim.'}
                        </p>
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
                        className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
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
                          className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                        >
                          {submitting ? 'Submitting...' : 'Submit Claim'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Active claim notice if current user already submitted a claim on this item */}
              {isFound && !isOwner && !isAdmin && hasUserClaimed && userClaim?.status === 'pending' && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-amber-900 block">Your claim is active and under review</span>
                        <span className="text-[11px] text-amber-700">Campus administration will review your submitted proof details.</span>
                      </div>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
                      In Review
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Potential Matches Tab */
            <div className="space-y-3">
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-xs text-purple-900">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Automated Lost &amp; Found Cross-Matching</span>
                </div>
                <p className="text-[11px] text-purple-800 mt-1">
                  Scanning active {isFound ? 'lost' : 'found'} reports comparing category, location keywords, incident date, and item description.
                </p>
              </div>

              {loadingMatches ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Calculating potential matches...
                </div>
              ) : matches.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
                  No matching {isFound ? 'lost' : 'found'} items detected at this time.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {matches.map((m, idx) => {
                    const matched = m.item;
                    return (
                      <div
                        key={matched._id || idx}
                        className="p-3 rounded-lg border border-gray-200 bg-white hover:border-purple-300 transition-colors shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${
                                  matched.type === 'found' ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              >
                                {matched.type}
                              </span>
                              <h5 className="text-xs font-bold text-gray-900">{matched.title}</h5>
                            </div>
                            <span className="text-[11px] text-gray-500 flex items-center gap-2 mt-1">
                              <span><MapPin className="w-3 h-3 inline text-gray-400" /> {matched.location}</span>
                              <span>•</span>
                              <span>{matched.category}</span>
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                m.matchScore >= 70
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : m.matchScore >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {m.matchScore}% Match
                            </span>
                          </div>
                        </div>

                        {/* Reasons */}
                        {m.matchReasons?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {m.matchReasons.map((r, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Switch button */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => onSelectItem?.(matched)}
                            className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline"
                          >
                            <span>View Matched Report</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
