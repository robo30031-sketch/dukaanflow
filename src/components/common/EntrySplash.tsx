/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Package, Receipt, TrendingUp, ArrowRight } from 'lucide-react';
import { BahiPilotIcon, BahiPilotLogo } from './BahiPilotLogo';

interface EntrySplashProps {
  onComplete: () => void;
}

/**
 * 3.5-second introductory animation for BahiPilot:
 * Scene 1 (0.0s - 0.8s): Warm cream background, BahiPilot emblem reveals with ledger, box & upward arrow.
 * Scene 2 (0.8s - 1.8s): Shop comes to life: Product box (inventory), Receipt/Rupee (sales/expenses), Chart (growth).
 * Scene 3 (1.8s - 2.8s): Heading "Your Entire Shop. In Control." and "Stock • Sales • Expenses • Profit".
 * Scene 4 (2.8s - 3.5s): Logo & tagline "Every Sale. Every Stock. Every Rupee." transitioning to dashboard.
 */
export const EntrySplash: React.FC<EntrySplashProps> = ({ onComplete }) => {
  // Scene tracker: 1, 2, 3, 4
  const [scene, setScene] = useState<number>(1);
  const [subStep, setSubStep] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const hasFinishedRef = useRef(false);

  const finish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 350);
  };

  useEffect(() => {
    // Check reduced motion preference
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onComplete();
      return;
    }

    // Keyboard listener (Escape skips intro)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        finish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Timeline execution:
    // Scene 1: 0.0s - 0.8s (Emblem emerges on warm cream)
    const t0 = setTimeout(() => setSubStep(1), 100);

    // Scene 2: 0.8s - 1.8s (Shop comes to life: 3 icons)
    const t1 = setTimeout(() => {
      setScene(2);
      setSubStep(2);
    }, 850);

    // Scene 3: 1.8s - 2.8s (Your Entire Shop. In Control.)
    const t2 = setTimeout(() => {
      setScene(3);
      setSubStep(3);
    }, 1800);

    // Scene 4: 2.8s - 3.5s (Logo & Tagline reveal, then fade to dashboard)
    const t3 = setTimeout(() => {
      setScene(4);
      setSubStep(4);
    }, 2800);

    // Complete transition around 3.5s
    const t4 = setTimeout(() => {
      finish();
    }, 3500);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="BahiPilot Introduction"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FAF8F0] text-[#22332A] transition-opacity duration-400 font-sans select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle organic green ambient glow in background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(216,243,197,0.5),transparent_65%)] pointer-events-none" />

      {/* Accessible Skip Button (top right) */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={finish}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#123C2A] bg-white/80 hover:bg-white border border-[#2E9D58]/30 rounded-full shadow-xs transition-all hover:scale-105"
          aria-label="Skip Intro Animation"
        >
          <span>Skip Intro</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#2E9D58]" />
        </button>
      </div>

      {/* Main Stage Container */}
      <div className="relative z-10 w-full max-w-md px-6 text-center flex flex-col items-center justify-center min-h-[360px]">
        {/* ===================================================================
            SCENE 1 (0.0s - 0.8s): The Brand Appears
            Emblem reveals with smooth scale and soft motion on warm cream
            =================================================================== */}
        {scene === 1 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <div
              className={`p-3 bg-white rounded-3xl shadow-xl border border-[#2E9D58]/20 transition-all duration-600 ease-out transform ${
                subStep >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-4'
              }`}
            >
              <BahiPilotIcon sizePx={88} />
            </div>

            <div
              className={`mt-4 transition-all duration-500 delay-200 ${
                subStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <h1 className="text-2xl font-extrabold tracking-tight text-[#123C2A]">
                Bahi<span className="text-[#2E9D58]">Pilot</span>
              </h1>
              <p className="text-xs text-[#2E9D58] font-medium tracking-wide mt-0.5">
                Modern Kirana & Retail Management
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================
            SCENE 2 (0.8s - 1.8s): The Shop Comes to Life
            3 simple readable icons: Inventory Box, Receipt/Rupee, Upward Chart
            =================================================================== */}
        {scene === 2 && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-400">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#2E9D58] mb-5">
              Empowering Your Dukaan
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
              {/* Icon 1: Inventory Product Box */}
              <div className="flex flex-col items-center p-3.5 bg-white rounded-2xl border border-[#2E9D58]/20 shadow-md transform transition-all duration-500 delay-75 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-[#D8F3C5] flex items-center justify-center text-[#123C2A] mb-2 shadow-2xs">
                  <Package className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-[#123C2A]">Stock</span>
                <span className="text-[10px] text-slate-500">Inventory</span>
              </div>

              {/* Icon 2: Receipt / Currency Symbol */}
              <div className="flex flex-col items-center p-3.5 bg-white rounded-2xl border border-[#2E9D58]/20 shadow-md transform transition-all duration-500 delay-150 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-[#D8F3C5] flex items-center justify-center text-[#123C2A] mb-2 shadow-2xs">
                  <Receipt className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-[#123C2A]">Billing</span>
                <span className="text-[10px] text-slate-500">POS & Udhar</span>
              </div>

              {/* Icon 3: Upward Performance Chart */}
              <div className="flex flex-col items-center p-3.5 bg-white rounded-2xl border border-[#2E9D58]/20 shadow-md transform transition-all duration-500 delay-250 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-[#D8F3C5] flex items-center justify-center text-[#2E9D58] mb-2 shadow-2xs">
                  <TrendingUp className="w-6 h-6 stroke-[2.4]" />
                </div>
                <span className="text-xs font-bold text-[#123C2A]">Profit</span>
                <span className="text-[10px] text-slate-500">Analytics</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SCENE 3 (1.8s - 2.8s): Explain the App
            Exact Heading: "Your Entire Shop. In Control."
            Underneath: "Stock • Sales • Expenses • Profit"
            =================================================================== */}
        {scene === 3 && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
            <div className="w-12 h-1.5 rounded-full bg-[#2E9D58] mb-4 opacity-80" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#123C2A] leading-tight">
              Your Entire Shop. In Control.
            </h2>

            <div className="mt-4 flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap text-xs sm:text-sm font-semibold text-[#123C2A]/90">
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#2E9D58]/30 shadow-2xs">
                Stock
              </span>
              <span className="text-[#2E9D58] font-bold">•</span>
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#2E9D58]/30 shadow-2xs">
                Sales
              </span>
              <span className="text-[#2E9D58] font-bold">•</span>
              <span className="px-2.5 py-1 bg-white rounded-lg border border-[#2E9D58]/30 shadow-2xs">
                Expenses
              </span>
              <span className="text-[#2E9D58] font-bold">•</span>
              <span className="px-2.5 py-1 bg-[#D8F3C5] text-[#123C2A] rounded-lg border border-[#2E9D58]/40 shadow-2xs font-bold">
                Profit
              </span>
            </div>

            <p className="mt-4 text-xs text-slate-600 max-w-xs">
              Simple, powerful bookkeeping built specially for Indian retailers.
            </p>
          </div>
        )}

        {/* ===================================================================
            SCENE 4 (2.8s - 3.5s): Enter the App
            BahiPilot Logo and Tagline: "Every Sale. Every Stock. Every Rupee."
            =================================================================== */}
        {scene === 4 && (
          <div className="flex flex-col items-center animate-in fade-in duration-300">
            <div className="p-3.5 bg-white rounded-3xl shadow-2xl border border-[#2E9D58]/30 mb-3">
              <BahiPilotIcon sizePx={72} />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#123C2A]">
              Bahi<span className="text-[#2E9D58]">Pilot</span>
            </h2>

            <p className="mt-2 text-sm sm:text-base font-semibold text-[#123C2A] tracking-tight">
              Every Sale. Every Stock. Every Rupee.
            </p>

            {/* Micro loading pulse for dashboard readiness */}
            <div className="mt-5 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2E9D58] animate-ping" />
              <span>Opening your shop dashboard...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Progress Bar (3.5s duration) */}
      <div className="absolute bottom-6 w-48 h-1 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2E9D58] rounded-full transition-all ease-linear"
          style={{
            width: `${Math.min(100, scene * 25)}%`,
            transitionDuration: '700ms',
          }}
        />
      </div>
    </div>
  );
};
