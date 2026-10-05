import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MapPin,
  User,
  Mail,
  Phone,
  FileText,
  Key
} from 'lucide-react';
import { getAdminClaims, approveClaimAdmin, rejectClaimAdmin } from '../services/api';

export default function AdminClaims({ onViewItem }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await getAdminClaims({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      if (res?.data) setClaims(res.data);
    } catch (err) {
      console.error('Failed to load claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);

  const handleApprove = async (claimId) => {
    if (!confirm('Approve this claim? This will mark the item as Claimed and reject any other pending claims on it.')) {
      return;
    }
    setActionLoading(claimId);
    try {
      await approveClaimAdmin(claimId);
      await fetchClaims();
    } catch (err) {
      alert('Error approving claim: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (claimId) => {
    if (!confirm('Reject this claim? If no other claims remain, the item will return to Open.')) {
      return;
    }
    setActionLoading(claimId);
    try {
      await rejectClaimAdmin(claimId);
      await fetchClaims();
    } catch (err) {
      alert('Error rejecting claim: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Verification
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Link
          to="/admin"
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Admin Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Claim Verification Center</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Inspect submitted ownership proofs and authorize item handovers.
            </p>
          </div>
          <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
            Claims Found: <span className="font-bold text-gray-900">{claims.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'pending'
              ? 'bg-amber-600 text-white font-semibold shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Pending Review
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'approved'
              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Approved Claims
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'rejected'
              ? 'bg-rose-600 text-white font-semibold shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Rejected Claims
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-gray-900 text-white font-semibold shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Claims
        </button>
      </div>

      {/* Claims Feed */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading claims...</div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">No claims in this category</h3>
          <p className="text-gray-500 text-xs mt-1">There are no claims matching the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => {
            const item = claim.itemId;
            const claimant = claim.claimantId;
            return (
              <div
                key={claim._id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Item Details */}
                  <div className="flex items-start gap-4 flex-1">
                    {item?.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title || 'Found item'}
                        className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs shrink-0 border border-gray-200">
                        No Photo
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {item?.type?.toUpperCase()} &bull; {item?.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          Filed on {new Date(claim.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base">
                        {item?.title || 'Item Post Removed'}
                      </h3>

                      {item?.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          Found at: {item.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status & Review Controls */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
                    {getStatusBadge(claim.status)}

                    {claim.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoading === claim._id}
                          onClick={() => handleReject(claim._id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === claim._id}
                          onClick={() => handleApprove(claim._id)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
                        >
                          Approve Claim
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Claimant & Proof Section */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                  {/* Claimant Profile */}
                  <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                    <span className="font-semibold text-gray-700 block text-[11px] uppercase tracking-wider">
                      Claimant Identity
                    </span>
                    <div className="font-medium text-gray-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {claimant?.name || claim.claimantName}
                    </div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {claimant?.email || claim.claimantEmail}
                    </div>
                    {(claimant?.phone || claim.claimantPhone) && (
                      <div className="text-gray-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {claimant?.phone || claim.claimantPhone}
                      </div>
                    )}
                    {claimant?.studentId && (
                      <div className="text-gray-500 text-[11px]">
                        ID: <span className="font-mono">{claimant.studentId}</span>
                      </div>
                    )}
                  </div>

                  {/* Proof Details */}
                  <div className="bg-gray-50 p-3 rounded-lg text-xs md:col-span-2 space-y-1">
                    <span className="font-semibold text-gray-700 block text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Submitted Proof of Ownership
                    </span>
                    <p className="text-gray-700 bg-white p-2.5 rounded border border-gray-200 leading-relaxed font-mono text-[11px]">
                      {claim.proofDetails}
                    </p>
                  </div>
                </div>

                {/* Handover OTP & Audit Info */}
                {claim.status === 'approved' && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                        <Key className="w-4 h-4 text-emerald-600" />
                        <span>Handover Verification OTP:</span>
                        <span className="font-mono font-bold tracking-widest bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950">
                          {claim.handoverOtp || '------'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-500">Handover Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          claim.handoverStatus === 'verified'
                            ? 'bg-emerald-200 text-emerald-900'
                            : claim.handoverStatus === 'locked'
                            ? 'bg-rose-200 text-rose-900'
                            : claim.handoverStatus === 'expired'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          {claim.handoverStatus || (claim.handoverCompletedAt ? 'verified' : 'pending')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800">
                      <div>
                        {claim.handoverCompletedAt ? (
                          <span>
                            Verified &amp; Handed Over:{' '}
                            <strong className="font-mono">
                              {new Date(claim.handoverOtpVerifiedAt || claim.handoverCompletedAt).toLocaleString()}
                            </strong>
                          </span>
                        ) : (
                          <span>Awaiting physical pickup and OTP exchange between students</span>
                        )}
                      </div>
                      {item?.closureMethod && (
                        <div>
                          Closure Method:{' '}
                          <strong className="font-semibold uppercase tracking-wider">
                            {item.closureMethod === 'otp_verified' ? 'OTP Verified' : 'Admin Override'}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Audit Footer */}
                {claim.reviewedBy && (
                  <div className="mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between">
                    <span>
                      Reviewed by Admin: <strong className="text-gray-600">{claim.reviewedBy.name || claim.reviewedBy.email}</strong>
                    </span>
                    {claim.reviewedAt && (
                      <span>on {new Date(claim.reviewedAt).toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
