"use client";

import "../globals.css";
import Sidebar from "@/app/components/Sidebar";
import NavBar from "@/app/components/NavBar";
import { useState } from "react";
import { Providers } from "../providers";
import Mobilebar from "../components/Mobilebar";
import { SidebarContext } from "../components/SideBarContext";

export default function AppLayout({children, role}: {children: React.ReactNode; role:string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isAdmin = role ==="admin";
  return (
      <div className="h-full flex">
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
        <div className={`flex flex-col w-full min-h-screen`}>
          <Providers>
            <NavBar/>
            <SidebarContext.Provider value={{sidebarOpen}}>
            {children}
            </SidebarContext.Provider>
          </Providers>
        </div>
      </div>
  );
}
