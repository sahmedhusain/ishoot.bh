import * as React from 'react';
import { cn } from './utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-lg bg-[#0B1210] border border-[#09937F]/30 rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <h3 className="text-lg font-semibold text-[#F2F6F5]">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#9EADA9] hover:text-[#F2F6F5] text-xl leading-none"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
