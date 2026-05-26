"use client";

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        {title}
      </h3>
      {action}
    </div>
  );
}
