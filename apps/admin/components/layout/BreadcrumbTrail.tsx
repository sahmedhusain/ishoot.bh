'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export function BreadcrumbTrail() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#9EADA9]">
      <Link href="/dashboard" className="hover:text-white transition-colors">
        ishoot
      </Link>
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const formatted = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3.5 h-3.5 text-white/20" />
            {isLast ? (
              <span className="text-[#F2F6F5] font-medium">{formatted}</span>
            ) : (
              <Link href={url} className="hover:text-white transition-colors">
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
