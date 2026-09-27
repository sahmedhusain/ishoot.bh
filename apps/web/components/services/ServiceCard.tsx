"use client";

import * as React from "react";
import { Card } from "@ishoot/ui";
import { ArrowUpRight } from "lucide-react";

interface ServiceCardProps {
  title: string;
  desc: string;
  badge?: string;
  icon?: React.ReactNode;
  bgMediaUrl?: string;
  className?: string;
}

export function ServiceCard({
  title,
  desc,
  badge,
  icon,
  bgMediaUrl,
  className = "",
}: ServiceCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Card
      className={`group relative overflow-hidden flex flex-col justify-between p-8 border border-white/10 hover:border-[#09937F]/50 transition-all duration-500 bg-[#0B1210] min-h-[320px] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {bgMediaUrl && (
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-700 pointer-events-none ${
            isHovered ? "opacity-30 scale-105" : "opacity-0 scale-100"
          }`}
        >
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-700"
            style={{ backgroundImage: `url(${bgMediaUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1210] via-[#0B1210]/60 to-transparent" />
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#09937F] group-hover:scale-110 group-hover:bg-[#09937F]/15 group-hover:border-[#09937F]/40 transition-all duration-300">
          {icon}
        </div>
        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#9EADA9] group-hover:text-[#09937F] group-hover:border-[#09937F]/40 transition-all duration-300">
          <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </div>
      </div>

      <div className="relative z-10 space-y-3 pt-6">
        {badge && (
          <span className="text-[11px] font-mono tracking-widest text-[#09937F] uppercase">
            {badge}
          </span>
        )}
        <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-[#09937F] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[#9EADA9] leading-relaxed">{desc}</p>
      </div>
    </Card>
  );
}
