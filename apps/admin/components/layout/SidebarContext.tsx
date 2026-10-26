"use client";

import * as React from "react";

interface SidebarContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileOpen: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(
  undefined,
);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Restore collapsed preference from localStorage on desktop
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("platform_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleMobileOpen = React.useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("platform_sidebar_collapsed", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        toggleMobileOpen,
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
