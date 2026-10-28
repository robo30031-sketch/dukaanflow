/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface EntrySplashProps {
  onComplete: () => void;
}

export const EntrySplash: React.FC<EntrySplashProps> = ({ onComplete }) => {
  const [animationStage, setAnimationStage] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Stage 1: Initial mount (t = 100ms) - Bars start raising
    const timer1 = setTimeout(() => {
      setAnimationStage(1);
    }, 150);

    // Stage 2: Arrow and Logo reveal (t = 800ms)
    const timer2 = setTimeout(() => {
      setAnimationStage(2);
    }, 850);

    // Stage 3: App Name & Tagline reveal (t = 1400ms)
    const timer3 = setTimeout(() => {
      setAnimationStage(3);
    }, 1450);

    // Stage 4: Fade out start (t = 2400ms)
    const timer4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2400);

    // Stage 5: Complete (t = 2800ms)
    const timer5 = setTimeout(() => {
      onComplete();
    }, 2850);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07130F] text-white transition-opacity duration-500 font-sans select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background glow ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(13,148,136,0.18),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6 max-w-sm w-full text-center">
        {/* Animated Bar Graph Raising with Arrow */}
        <div className="relative w-44 h-32 mb-6 flex items-end justify-center gap-2.5 px-4 pt-6 pb-2 bg-[#0B1E17]/80 rounded-2xl border border-teal-500/20 shadow-2xl backdrop-blur-md">
          {/* Bar 1 */}
          <div className="w-5 flex flex-col items-center justify-end h-full">
            <div
              className="w-full bg-gradient-to-t from-teal-800 to-teal-500 rounded-t-md transition-all duration-700 ease-out shadow-sm"
              style={{
                height: animationStage >= 1 ? '32%' : '0%',
                transitionDelay: '100ms',
              }}
            />
          </div>

          {/* Bar 2 */}
          <div className="w-5 flex flex-col items-center justify-end h-full">
            <div
              className="w-full bg-gradient-to-t from-teal-700 to-teal-400 rounded-t-md transition-all duration-700 ease-out shadow-sm"
              style={{
                height: animationStage >= 1 ? '50%' : '0%',
                transitionDelay: '250ms',
              }}
            />
          </div>

          {/* Bar 3 */}
          <div className="w-5 flex flex-col items-center justify-end h-full">
            <div
              className="w-full bg-gradient-to-t from-teal-600 to-emerald-400 rounded-t-md transition-all duration-700 ease-out shadow-sm"
              style={{
                height: animationStage >= 1 ? '70%' : '0%',
                transitionDelay: '400ms',
              }}
            />
          </div>

          {/* Bar 4 */}
          <div className="w-5 flex flex-col items-center justify-end h-full">
            <div
              className="w-full bg-gradient-to-t from-emerald-600 to-emerald-300 rounded-t-md transition-all duration-700 ease-out shadow-md"
              style={{
                height: animationStage >= 1 ? '92%' : '0%',
                transitionDelay: '550ms',
              }}
            />
          </div>

          {/* Upward Growth Arrow overlay */}
          <div
            className={`absolute -top-1 -right-1 transition-all duration-700 ease-out ${
              animationStage >= 2
                ? 'opacity-100 transform translate-x-0 translate-y-0 scale-100'
                : 'opacity-0 transform -translate-x-4 translate-y-4 scale-50'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/40 animate-pulse">
              <ArrowUpRight className="w-6 h-6 stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Logo Reveal */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            animationStage >= 2
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-3'
          }`}
        >
          <div className="inline-block p-1.5 bg-white/95 rounded-2xl shadow-xl shadow-teal-950/50 mb-3 border border-white/20">
            <img
              src="/assets/aistudio/Dukaanflow_Shop_Growth_Logo_9d5a1b40.png"
              alt="DukaanFlow Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
          </div>
        </div>

        {/* App Name and Tagline */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            animationStage >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">
            Dukaan<span className="text-emerald-400">Flow</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
            Track <span className="text-emerald-400 font-bold">·</span> Manage <span className="text-emerald-400 font-bold">·</span> Grow
          </p>
        </div>

        {/* Skip button for immediate entry */}
        <button
          onClick={() => {
            setIsFadingOut(true);
            setTimeout(onComplete, 300);
          }}
          className="mt-8 text-[11px] font-mono text-slate-400 hover:text-white px-3 py-1 rounded-full border border-slate-700/60 hover:border-slate-500 transition-colors"
        >
          Skip animation &rarr;
        </button>
      </div>
    </div>
  );
};
