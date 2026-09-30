"use client";

import * as React from "react";
import { useTranslation } from "../../hooks/useTranslation";

interface BudgetSelectorProps {
  selected: string;
  onChange: (budget: string) => void;
}

export function BudgetSelector({ selected, onChange }: BudgetSelectorProps) {
  const { translations } = useTranslation();
  const defaultRanges = [
    "< 800 BHD",
    "800 – 2,000 BHD",
    "2,000 – 5,000 BHD",
    "5,000 – 10,000 BHD",
    "> 10,000 BHD",
  ];
  const ranges = Array.isArray(translations?.contact?.budgetRanges)
    ? translations.contact.budgetRanges
    : defaultRanges;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {ranges.map((range) => {
        const isSelected = selected === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            className={`p-3 rounded-xl text-xs sm:text-sm font-mono font-medium transition-all duration-300 text-center ${
              isSelected
                ? "bg-[#09937F]/20 text-[#09937F] border border-[#09937F]"
                : "bg-[#111C19] text-[#9EADA9] hover:text-white border border-white/10"
            }`}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}
