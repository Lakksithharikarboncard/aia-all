"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  color: "gray" | "green" | "orange" | "red" | "yellow" | "blue" | "purple" | "cyan";
  onClick?: () => void;
}

const valueColors = {
  gray:   "text-[#1f2328]",
  green:  "text-[#1a7f37]",
  orange: "text-[#cf222e]",
  red:    "text-[#cf222e]",
  yellow: "text-[#9a6700]",
  blue:   "text-[#0969da]",
  purple: "text-[#8250df]",
  cyan:   "text-[#0969da]",
};

export function StatCard({ label, value, color, onClick }: StatCardProps) {
  const isZero = value === 0;
  const handleClick = isZero || !onClick ? undefined : onClick;
  return (
    <button
      onClick={handleClick}
      disabled={isZero}
      className={cn(
        "bg-white rounded-[2.5px] border p-4 text-left transition-colors w-full",
        isZero
          ? "border-[#d0d7de] opacity-60 cursor-default"
          : "border-[#d0d7de] cursor-pointer hover:bg-[#f6f8fa]"
      )}
    >
      <p className={cn("text-2xl font-semibold", isZero ? "text-[#8b949e]" : valueColors[color])}>{value}</p>
      <p className="text-xs text-[#656d76] mt-1 whitespace-nowrap">{label}</p>
    </button>
  );
}
