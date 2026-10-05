import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, CheckCircle, XCircle, MapPin, ExternalLink, AlertCircle, Key, Copy, Check } from 'lucide-react';
import { getMyClaims } from '../services/api';

export default function MyClaims({ onViewItem }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [copiedOtp, setCopiedOtp] = useState(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await getMyClaims();
      if (res?.data) {
        setClaims(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const filteredClaims = claims.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Under Verification
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Claim Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">My Ownership Claims</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review the status of claims you have submitted for items found across campus.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 my-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-900 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Claims ({claims.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-amber-600 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pending ({claims.filter((c) => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'approved'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Approved ({claims.filter((c) => c.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'rejected'
              ? 'bg-rose-600 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Rejected ({claims.filter((c) => c.status === 'rejected').length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading your claims...</div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">No claims found</h3>
          <p className="text-gray-500 text-xs mt-1">You have not submitted any claims matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const item = claim.itemId;
            return (
              <div
                key={claim._id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {item?.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title || 'Claimed Item'}
                        className="w-20 h-20 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs shrink-0 border border-gray-200">
                        No Photo
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Found Item
                        </span>
                        <span className="text-xs text-gray-400">
                          Claim submitted on {new Date(claim.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 text-base mt-1">
                        {item?.title || 'Item Details Unavailable'}
                      </h3>

                      {item?.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {item.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="self-start md:self-auto">{getStatusBadge(claim.status)}</div>
                </div>

                {/* Proof Submitted */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1">
                  <span className="font-semibold text-gray-700 block text-[11px] uppercase tracking-wider">
                    Your Submitted Proof of Ownership:
                  </span>
                  <p className="text-gray-600 leading-relaxed">{claim.proofDetails}</p>
                </div>

                {/* Handover OTP Verification Code Box */}
                {claim.status === 'approved' && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-emerald-600" />
                          Handover Verification Code (OTP)
                        </span>
                        <p className="text-xs text-emerald-800 mt-1 max-w-lg">
                          Show this 6-digit code to the finder or campus administrator at physical pickup. They will enter it to verify your identity and close the case.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-4 py-2 rounded-lg border border-emerald-300 shadow-xs">
                        <span className="font-mono text-xl font-extrabold tracking-widest text-emerald-950">
                          {claim.handoverOtp || '------'}
                        </span>
                        {claim.handoverOtp && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(claim.handoverOtp);
                              setCopiedOtp(claim._id);
                              setTimeout(() => setCopiedOtp(null), 2500);
                            }}
                            className="p-1 rounded text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-colors ml-1"
                            title="Copy Code"
                          >
                            {copiedOtp === claim._id ? (
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

                {/* Status Help & Action */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    {claim.status === 'pending' && (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Campus administrators and the finder are reviewing your details.
                      </span>
                    )}
                    {claim.status === 'approved' && (
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Claim approved! Please contact {item?.contactName || 'the holding office'} at {item?.contactEmail} to arrange handover.
                      </span>
                    )}
                    {claim.status === 'rejected' && (
                      <span className="text-gray-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        Proof provided did not match item verification criteria.
                      </span>
                    )}
                  </div>

                  {item && (
                    <button
                      onClick={() => onViewItem?.(item)}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 self-end sm:self-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Item Post
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
