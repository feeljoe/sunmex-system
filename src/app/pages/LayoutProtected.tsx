"use client";

import "../globals.css";
import Sidebar from "@/app/components/Sidebar";
import NavBar from "@/app/components/NavBar";
import { useState } from "react";
import { Providers } from "../providers";
import Mobilebar from "../components/Mobilebar";
import { SidebarContext } from "../components/SideBarContext";
import { Bars2Icon } from "@heroicons/react/24/outline";

export default function AppLayout({children, role}: {children: React.ReactNode; role:string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isAdmin: boolean = role ==="admin";
  return (
      <div className="flex min-h-[100dvh] w-full">
        {isAdmin &&  (
        <div className="hidden lg:block">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={()=> setSidebarOpen(!sidebarOpen)} />
          </div>
          )}
          {isAdmin && (
          <div className="lg:hidden">
            <Mobilebar isOpen={mobileOpen} toggleSidebar={()=> setMobileOpen(prev => !prev)}></Mobilebar>
          </div>
          )}
        <div className={`relative flex min-h-[100dvh] min-w-0 flex-1 flex-col`}>
          <Providers>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="absolute left-2 top-[env(safe-area-inset-top)] z-40 flex h-10 w-10 items-center justify-center rounded-xl text-gray-200 transition-colors hover:bg-white/10 lg:hidden">
                  <Bars2Icon className="h-9 w-9"/>
                </button>
            )}
            <NavBar isAdmin={isAdmin}/>
            <SidebarContext.Provider value={{sidebarOpen}}>
            {children}
            </SidebarContext.Provider>
          </Providers>
        </div>
      </div>
  );
}
