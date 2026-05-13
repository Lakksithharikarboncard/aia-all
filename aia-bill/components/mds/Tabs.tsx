"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// MDS Tabs: underline pattern, 2px bottom border brand-red on active
interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <nav className={cn("flex border-b border-border-default", className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative px-4 h-9 text-sm font-medium transition-colors whitespace-nowrap",
              "hover:text-text-heading",
              isActive
                ? "text-text-heading"
                : "text-text-secondary"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-red" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
