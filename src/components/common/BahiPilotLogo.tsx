/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BahiPilotLogoProps {
  variant?: 'icon' | 'horizontal' | 'stacked';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inverted?: boolean; // For dark backgrounds (sidebar, dark mode)
  showTagline?: boolean;
}

export const BahiPilotIcon: React.FC<{ sizePx?: number; className?: string }> = ({
  sizePx = 40,
  className = '',
}) => {
  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="BahiPilot Emblem"
    >
      {/* Background Rounded Shield / Tile */}
      <rect width="100" height="100" rx="22" fill="#123C2A" />

      {/* Subtle Inner Glow Border */}
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        rx="20.5"
        stroke="#2E9D58"
        strokeWidth="2"
        strokeOpacity="0.4"
      />

      {/* Traditional Bahi Ledger Book (Open Pages) */}
      <g id="bahi-ledger" transform="translate(14, 28)">
        {/* Left Page */}
        <path
          d="M3 38 C 14 36, 26 36, 35 40 L 35 12 C 25 8, 14 8, 3 12 Z"
          fill="#1C523A"
          stroke="#2E9D58"
          strokeWidth="1.5"
        />
        {/* Left Page Ledger Lines */}
        <line x1="8" y1="18" x2="30" y2="18" stroke="#D8F3C5" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
        <line x1="8" y1="24" x2="30" y2="24" stroke="#D8F3C5" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
        <line x1="8" y1="30" x2="25" y2="30" stroke="#D8F3C5" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />

        {/* Right Page */}
        <path
          d="M37 40 C 46 36, 58 36, 69 38 L 69 12 C 58 8, 46 8, 37 12 Z"
          fill="#236548"
          stroke="#2E9D58"
          strokeWidth="1.5"
        />
        {/* Right Page Ledger Lines */}
        <line x1="42" y1="18" x2="64" y2="18" stroke="#D8F3C5" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
        <line x1="42" y1="24" x2="64" y2="24" stroke="#D8F3C5" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
        <line x1="42" y1="30" x2="57" y2="30" stroke="#D8F3C5" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />

        {/* Traditional Golden Spine Bookmark Ribbon */}
        <path d="M35 10 L 37 10 L 37 45 L 36 43 L 35 45 Z" fill="#E5A93C" />
      </g>

      {/* Inventory Product Box */}
      <g id="inventory-box" transform="translate(24, 46)">
        {/* Isometric Box Top */}
        <path d="M14 0 L 25 5 L 14 10 L 3 5 Z" fill="#D8F3C5" />
        {/* Left Side */}
        <path d="M3 5 L 14 10 L 14 20 L 3 15 Z" fill="#2E9D58" />
        {/* Right Side */}
        <path d="M14 10 L 25 5 L 25 15 L 14 20 Z" fill="#1C523A" />
        {/* Box Tape / Fold */}
        <path d="M14 3 L 14 10" stroke="#FAF8F0" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* Upward Modern Growth Arrow (Flight / Pilot) */}
      <g id="pilot-arrow">
        <path
          d="M48 68 C 58 64, 68 52, 74 34"
          stroke="#D8F3C5"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />
        <path
          d="M48 68 C 60 62, 70 50, 77 28"
          stroke="#2E9D58"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Aerodynamic Arrowhead pointing Up & Right */}
        <path
          d="M66 22 L 85 24 L 79 43 L 75 33 Z"
          fill="#2E9D58"
        />
        <path
          d="M74 24 L 85 24 L 81 35 Z"
          fill="#E5A93C"
        />
      </g>
    </svg>
  );
};

export const BahiPilotLogo: React.FC<BahiPilotLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  inverted = false,
  showTagline = false,
}) => {
  const sizeMap = {
    sm: { iconPx: 28, textClass: 'text-base', subClass: 'text-[9px]' },
    md: { iconPx: 38, textClass: 'text-xl', subClass: 'text-[11px]' },
    lg: { iconPx: 48, textClass: 'text-2xl', subClass: 'text-xs' },
    xl: { iconPx: 64, textClass: 'text-3xl', subClass: 'text-sm' },
  };

  const { iconPx, textClass, subClass } = sizeMap[size];

  if (variant === 'icon') {
    return <BahiPilotIcon sizePx={iconPx} className={className} />;
  }

  const textColorBahi = inverted ? 'text-white' : 'text-[#123C2A] dark:text-white';
  const textColorPilot = 'text-[#2E9D58] dark:text-[#48C578]';
  const taglineColor = inverted ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400';

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <BahiPilotIcon sizePx={iconPx * 1.3} />
        <div className="mt-2.5">
          <span className={`font-bold tracking-tight ${textClass} block`}>
            <span className={textColorBahi}>Bahi</span>
            <span className={textColorPilot}>Pilot</span>
          </span>
          {showTagline && (
            <p className={`mt-0.5 font-medium tracking-wide ${subClass} ${taglineColor}`}>
              Every Sale. Every Stock. Every Rupee.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BahiPilotIcon sizePx={iconPx} />
      <div className="flex flex-col min-w-0">
        <span className={`font-bold tracking-tight leading-none ${textClass} whitespace-nowrap`}>
          <span className={textColorBahi}>Bahi</span>
          <span className={textColorPilot}>Pilot</span>
        </span>
        {showTagline ? (
          <span className={`mt-1 font-medium tracking-tight whitespace-nowrap ${subClass} ${taglineColor}`}>
            Every Sale. Every Stock. Every Rupee.
          </span>
        ) : (
          <span className={`mt-0.5 font-mono text-[10px] tracking-wider uppercase text-[#2E9D58] dark:text-[#52D284]`}>
            Shop Management
          </span>
        )}
      </div>
    </div>
  );
};
