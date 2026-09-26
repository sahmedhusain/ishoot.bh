'use client';

import * as React from 'react';

export function AnimatedText({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={`inline-block animate-fade-in ${className}`}>
      {text}
    </span>
  );
}
