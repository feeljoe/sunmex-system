"use client";

import "../globals.css";
import Sidebar from "@/app/components/Sidebar";
import NavBar from "@/app/components/NavBar";
import { useState } from "react";
import { Providers } from "../providers";
import Mobilebar from "../components/Mobilebar";
import GoBackButton from "@/components/ui/goBackButton";


export default function AppLayout({children, role}: {children: React.ReactNode; role:string }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const isAdmin = role ==="admin";
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex">
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
          <NavBar/>
          <Providers>{children}
          </Providers>
          <div className="flex p-3 items-end">
          <GoBackButton />
          </div>
        </div>
      </body>
    </html>
  );
}
