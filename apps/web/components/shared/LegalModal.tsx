"use client";

import * as React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../hooks/useTranslation";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export function LegalModal({ isOpen, onClose, title, content }: LegalModalProps) {
  const { isRTL, t } = useTranslation();

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0B1210] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#9EADA9] hover:text-white"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div
                className={`prose prose-invert max-w-none font-serif text-[#9EADA9] leading-relaxed prose-headings:text-white prose-headings:font-display prose-a:text-[#09937F] hover:prose-a:text-[#5EEAD4] ${isRTL ? "text-right" : "text-left"}`}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>

            <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-[#014842] text-white text-sm font-bold hover:bg-[#09937F] transition-colors"
              >
                {t("footer.close")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
