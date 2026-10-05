import React from 'react';
import {
  MapPin,
  Clock,
  Laptop,
  CreditCard,
  Key,
  Briefcase,
  BookOpen,
  Shirt,
  Sparkles,
  HelpCircle,
  Award,
  ChevronRight,
} from 'lucide-react';

const categoryIcons = {
  'Electronics': Laptop,
  'Cards & IDs': CreditCard,
  'Keys': Key,
  'Bags & Wallets': Briefcase,
  'Books & Stationery': BookOpen,
  'Clothing & Apparel': Shirt,
  'Jewelry & Accessories': Sparkles,
  'Other': HelpCircle,
};

export default function ItemCard({ item, onClick }) {
  const IconComponent = categoryIcons[item.category] || HelpCircle;

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const isFound = item.type === 'found';
  const isClaimed = item.status === 'claimed';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* Image Container */}
        <div className="relative h-44 w-full bg-gray-100 overflow-hidden flex items-center justify-center">
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
            <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5">
              <IconComponent className="w-8 h-8" />
              <span className="text-xs">No photo</span>
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
            {isFound ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-600 text-white shadow-sm">
                Found
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-600 text-white shadow-sm">
                Lost
              </span>
            )}

            {item.status === 'pending_claim' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500 text-white shadow-sm">
                Claim in Review
              </span>
            )}

            {item.status === 'claimed' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-600 text-white shadow-sm">
                Claimed
              </span>
            )}

            {item.status === 'closed' && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-900 text-white shadow-sm">
                Closed
              </span>
            )}
          </div>

          {/* Reward Badge */}
          {item.rewardOffered && (
            <div className="absolute top-2.5 right-2.5">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                <Award className="w-3.5 h-3.5" />
                Reward
              </span>
            </div>
          )}

          {/* Category Chip */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-xs text-gray-700 bg-white/95 px-2 py-0.5 rounded-md shadow-xs border border-gray-200">
            <IconComponent className="w-3 h-3 text-gray-500" />
            <span>{item.category}</span>
          </div>
        </div>

        {/* Details */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
            {item.title}
          </h3>

          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-600">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{item.location}</span>
            </div>

            <div className="flex items-center justify-between text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{formatDate(item.dateFoundOrLost || item.createdAt)}</span>
              </div>
              <span className="text-[11px] truncate max-w-[110px]">
                By {item.contactName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 pt-1">
        <div className="w-full py-1.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium flex items-center justify-center gap-1 border border-gray-200 transition-colors">
          <span>{isFound ? 'Details & Claim' : 'View Details'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
