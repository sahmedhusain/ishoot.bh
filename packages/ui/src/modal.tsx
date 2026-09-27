import * as React from "react";
import { cn } from "./utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={cn(
          "relative w-full max-w-lg bg-white border border-slate-200 text-slate-800 dark:bg-[#121B19] dark:border-white/10 dark:text-[#F2F6F5] rounded-3xl p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] overflow-y-auto transition-all",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-white/10">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-[#F2F6F5]">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 text-xl leading-none transition-colors"
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
