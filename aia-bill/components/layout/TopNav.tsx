"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";

const LOGO_URL =
  "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

export function TopNav() {
  return (
    <header className="h-12 bg-[#0A0E12] text-text-inverted flex items-center px-4 shrink-0 border-b border-[#1F2937]">
      {/* Left: brand */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={LOGO_URL}
          alt="AI Accountant"
          className="h-6 w-6 shrink-0 brightness-0 invert"
        />
        <span className="text-sm font-semibold tracking-tight truncate">
          AI Accountant
        </span>
        <span className="inline-flex items-center px-2 h-5 rounded-[2px] text-[10px] font-semibold uppercase tracking-wider bg-[#B25D00]/25 text-[#FFC266] border border-[#B25D00]/40 shrink-0">
          Sandbox
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[3px] text-xs font-medium text-text-inverted/70 hover:text-text-inverted hover:bg-white/10 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Help</span>
        </button>
        <div className="flex items-center gap-2 h-8 px-2 rounded-[3px] text-xs">
          <div className="w-6 h-6 rounded-full bg-action-primary flex items-center justify-center text-[10px] font-semibold text-white">
            C
          </div>
          <span className="hidden sm:inline text-text-inverted/85">CS User</span>
        </div>
      </div>
    </header>
  );
}
