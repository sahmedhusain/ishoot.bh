import * as React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.98]';

    const variants = {
      primary: 'bg-[#09937F] hover:bg-[#0BB49B] text-white shadow-lg shadow-[#09937F]/20',
      secondary: 'bg-[#111C19] hover:bg-[#162521] text-[#F2F6F5] border border-white/10 hover:border-[#09937F]/40',
      ghost: 'bg-transparent hover:bg-white/5 text-[#F2F6F5] hover:text-[#09937F]',
      outline: 'bg-transparent border border-[#09937F]/40 hover:border-[#09937F] text-[#F2F6F5] hover:text-[#09937F]',
      danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30',
    };

    const sizes = {
      sm: 'text-xs px-3.5 py-1.5 gap-1.5',
      md: 'text-sm px-5 py-2.5 gap-2',
      lg: 'text-base px-7 py-3.5 gap-2.5 font-semibold',
      icon: 'w-10 h-10 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
