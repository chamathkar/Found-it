import React from 'react';
import { Package, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function StatsBanner({ stats }) {
  const cards = [
    {
      label: 'Total Listed',
      value: stats?.total ?? 0,
      icon: Package,
      color: 'text-gray-700 bg-gray-100',
    },
    {
      label: 'Lost (Unfound)',
      value: stats?.activeLost ?? 0,
      icon: AlertCircle,
      color: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Found (Awaiting Owner)',
      value: stats?.activeFound ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3.5"
          >
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 leading-tight">{card.value}</div>
              <div className="text-xs text-gray-500 font-medium">{card.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
