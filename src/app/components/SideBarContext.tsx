"use client";

import { createContext, useContext } from "react";

interface SidebarContextType {
  sidebarOpen: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarContext.Provider");
  }
  return context;
}

export { SidebarContext };