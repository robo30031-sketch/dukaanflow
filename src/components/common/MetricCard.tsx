/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  trend?: {
    label: string;
    isPositive?: boolean;
  };
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  action,
}) => {
  const getAccentStyles = () => {
    switch (variant) {
      case 'success':
        return {
          iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          indicator: 'text-emerald-700',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-700 border-amber-100',
          indicator: 'text-amber-700',
        };
      case 'danger':
        return {
          iconBg: 'bg-rose-50 text-rose-700 border-rose-100',
          indicator: 'text-rose-700',
        };
      default:
        return {
          iconBg: 'bg-slate-50 text-teal-800 border-slate-200',
          indicator: 'text-teal-800',
        };
    }
  };

  const accent = getAccentStyles();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg border ${accent.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend || action) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            {trend && (
              <span className={`font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend.label}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline shrink-0"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
